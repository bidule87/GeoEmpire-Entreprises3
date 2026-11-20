// ============================================
// GEO EMPIRE — MODULE MAIRIE (ÉLECTIONS, TAUX ENCADRÉS, HOLDING MUNICIPALE & TCHAT)
// ============================================

import { getData, saveData, ajouterHistorique, estModeBetaActif } from "../geoData.js";

const FIREBASE_DB_URL = "https://geo-empire-8ca7e-default-rtdb.europe-west1.firebasedatabase.app";
const CAUTION_CANDIDATURE = 25000;
const MS_PAR_HEURE = 60 * 60 * 1000;
const MS_PAR_JOUR = 24 * MS_PAR_HEURE;

// Bornes anti-abus des taux municipaux
const BORNES_TAUX = {
    taxeMunicipale: { min: 5, max: 25, defaut: 15 },
    subventionEntreprises: { min: 0, max: 15, defaut: 5 },
    permisConstruire: { min: 2, max: 15, defaut: 6 },
    taxeFonciere: { min: 5, max: 20, defaut: 10 }
};

let canalActif = "general";
let ongletMairie = "conseil"; // "conseil", "finances", "urbanisme", "supervision"
let villeActuelle = localStorage.getItem("geoEmpireVilleActuelle") || "";
let mairieDataCache = null;
let intervalleRefresh = null;

const CATALOGUE_ENTREPRISES_MAIRIE = [
    { id: "regie_eau", nom: "Régie Municipale des Eaux", secteur: "Service Public", prix: 40000, revenuCycle: 4500 },
    { id: "transports_urbains", nom: "Réseau Bus & Tramway", secteur: "Transport", prix: 75000, revenuCycle: 9000 },
    { id: "marche_couvert", nom: "Halles & Marché Municipal", secteur: "Commerce", prix: 55000, revenuCycle: 6500 },
    { id: "parc_solaire", nom: "Centrale Solaire Communale", secteur: "Énergie", prix: 110000, revenuCycle: 14500 }
];

const PROJETS_URBANISME = [
    { id: "commissariat", nom: "Commissariat & Caméras", cout: 50000, effet: "-25 % risque de braquage en ville" },
    { id: "pole_gare", nom: "Pôle Multimodal & Gare", cout: 80000, effet: "+15 % revenus des commerces locaux" },
    { id: "eco_quartier", nom: "Éco-Quartier & Voirie", cout: 65000, effet: "+20 % rendement locatif municipal" },
    { id: "parc_public", nom: "Grand Parc & Attractivité", cout: 35000, effet: "+10 % visibilité marketing locale" }
];

function borner(val, min, max) {
    const n = Number(val);
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
}

function normaliserCleVille(nomVille) {
    return (nomVille || "Limoges")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "limoges";
}

function getPseudoJoueur() {
    const e = getData().entreprise;
    return (e.profil?.surnom || e.pdg || "Fondateur").trim();
}

function getDureeUnMoisJeuMs() {
    return estModeBetaActif() ? MS_PAR_HEURE : MS_PAR_JOUR;
}

async function detecterVilleJoueur() {
    if (villeActuelle) return villeActuelle;

    if ("geolocation" in navigator) {
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
            if (res.ok) {
                const json = await res.json();
                const addr = json.address || {};
                const commune = addr.city || addr.town || addr.village || addr.municipality;
                if (commune) {
                    villeActuelle = commune;
                    localStorage.setItem("geoEmpireVilleActuelle", villeActuelle);
                    return villeActuelle;
                }
            }
        } catch {}
    }

    try {
        const resIp = await fetch("https://ipwho.is/");
        if (resIp.ok) {
            const info = await resIp.json();
            if (info && info.city) {
                villeActuelle = info.city;
                localStorage.setItem("geoEmpireVilleActuelle", villeActuelle);
                return villeActuelle;
            }
        }
    } catch {}

    villeActuelle = "Limoges";
    localStorage.setItem("geoEmpireVilleActuelle", villeActuelle);
    return villeActuelle;
}

async function sauvegarderMairieFirebase(cleVille, mairieObj) {
    mairieDataCache = mairieObj;
    await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mairieObj)
    });
}

function ajouterJournalMairie(mairie, auteur, role, action) {
    if (!Array.isArray(mairie.journal)) mairie.journal = [];
    mairie.journal.unshift({
        date: new Date().toLocaleString("fr-FR"),
        auteur,
        role,
        action
    });
    if (mairie.journal.length > 80) mairie.journal.pop();
}

async function chargerEtActualiserMairie(cleVille) {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`);
        const raw = res.ok ? await res.json() : null;
        const maintenant = Date.now();
        const dureeMoisMs = getDureeUnMoisJeuMs();

        const mairie = raw || {
            nomVille: villeActuelle,
            maire: null,
            mandatDebutTs: 0,
            mandatFinTs: 0,
            mandatsConsecutifs: 0,
            ancienMaire: "",
            candidats: {},
            conseillerFinancier: "",
            conseillerUrbanisme: "",
            tauxTaxe: BORNES_TAUX.taxeMunicipale.defaut,
            tauxSubvention: BORNES_TAUX.subventionEntreprises.defaut,
            tauxPermisConstruire: BORNES_TAUX.permisConstruire.defaut,
            tauxTaxeFonciere: BORNES_TAUX.taxeFonciere.defaut,
            budget: 80000,
            holdingMunicipale: {
                active: false,
                nom: `Holding Municipale de ${villeActuelle}`,
                entreprises: [],
                personnel: 0
            },
            infrastructures: [],
            dernierRevenuTs: maintenant,
            journal: []
        };

        if (typeof mairie.tauxTaxe !== "number") mairie.tauxTaxe = BORNES_TAUX.taxeMunicipale.defaut;
        if (typeof mairie.tauxSubvention !== "number") mairie.tauxSubvention = BORNES_TAUX.subventionEntreprises.defaut;
        if (typeof mairie.tauxPermisConstruire !== "number") mairie.tauxPermisConstruire = BORNES_TAUX.permisConstruire.defaut;
        if (typeof mairie.tauxTaxeFonciere !== "number") mairie.tauxTaxeFonciere = BORNES_TAUX.taxeFonciere.defaut;

        if (!mairie.holdingMunicipale) {
            mairie.holdingMunicipale = { active: false, nom: `Holding Municipale de ${villeActuelle}`, entreprises: [], personnel: 0 };
        }
        if (!Array.isArray(mairie.holdingMunicipale.entreprises)) mairie.holdingMunicipale.entreprises = [];
        if (!Array.isArray(mairie.infrastructures)) mairie.infrastructures = [];
        if (!Array.isArray(mairie.journal)) mairie.journal = [];
        if (!mairie.candidats) mairie.candidats = {};

        let modifie = false;

        // Expiration automatique du mandat (1 mois jeu = 1h en bêta / 24h en normal)
        if (mairie.maire && mairie.mandatFinTs && maintenant >= mairie.mandatFinTs) {
            const sortant = mairie.maire;
            const nbMandats = mairie.mandatsConsecutifs || 1;
            ajouterJournalMairie(mairie, "Système Électoral", "Système", `Fin du mandat de ${sortant} (${nbMandats}/3 mois consécutifs).`);
            mairie.ancienMaire = sortant;
            mairie.maire = null;
            mairie.mandatDebutTs = 0;
            mairie.mandatFinTs = 0;
            if (nbMandats >= 3) {
                ajouterJournalMairie(mairie, "Système Électoral", "Système", `${sortant} a atteint le plafond de 3 mois de mandat consécutifs.`);
            }
            modifie = true;
        }

        // Revenus de la Holding Municipale
        const cyclesRevenus = Math.floor((maintenant - (mairie.dernierRevenuTs || maintenant)) / dureeMoisMs);
        if (cyclesRevenus > 0) {
            const entList = mairie.holdingMunicipale.entreprises || [];
            if (entList.length > 0) {
                const brutEnt = entList.reduce((acc, item) => acc + (item.revenuCycle || 0), 0);
                const bonusHolding = mairie.holdingMunicipale.active ? 1.20 : 1.0;
                const bonusPersonnel = 1 + ((mairie.holdingMunicipale.personnel || 0) * 0.05);
                const gainTotal = Math.floor(brutEnt * bonusHolding * bonusPersonnel * cyclesRevenus);

                mairie.budget = (mairie.budget || 0) + gainTotal;
                ajouterJournalMairie(
                    mairie,
                    "Holding Municipale",
                    "Finances",
                    `Revenus publics sur ${cyclesRevenus} cycle(s) : +${gainTotal.toLocaleString("fr-FR")} Ø`
                );
            }
            mairie.dernierRevenuTs = maintenant;
            modifie = true;
        }

        if (modifie || !raw) {
            await sauvegarderMairieFirebase(cleVille, mairie);
        } else {
            mairieDataCache = mairie;
        }

        return mairie;
    } catch {
        return mairieDataCache;
    }
}

async function chargerMessagesTchat(cheminFirebase) {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/${cheminFirebase}.json`);
        if (!res.ok) return [];
        const raw = await res.json();
        if (!raw || typeof raw !== "object") return [];
        return Object.values(raw)
            .filter(m => m && m.texte)
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
            .slice(-60);
    } catch {
        return [];
    }
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function rafraichirTchatSeul() {
    const zoneMessages = document.getElementById("tchat-messages");
    if (!zoneMessages) return;

    const cleVille = normaliserCleVille(villeActuelle);
    const chemin = canalActif === "general" ? "tchat/general" : `tchat/villes/${cleVille}`;
    const messages = await chargerMessagesTchat(chemin);
    const maireActuel = mairieDataCache?.maire || "";
    const cFin = mairieDataCache?.conseillerFinancier || "";
    const cUrb = mairieDataCache?.conseillerUrbanisme || "";

    if (messages.length === 0) {
        zoneMessages.innerHTML = `<div style="color:#94a3b8; text-align:center; padding:25px; font-size:13px;">Aucun message dans ce canal. Lancez la discussion !</div>`;
        return;
    }

    const etaitEnBas = zoneMessages.scrollHeight - zoneMessages.scrollTop - zoneMessages.clientHeight < 60;

    zoneMessages.innerHTML = messages.map(m => {
        let badgeRole = "";
        if (maireActuel && m.auteur === maireActuel) {
            badgeRole = `<span style="background:#fbbf24; color:#0f172a; font-size:10px; font-weight:bold; padding:1px 6px; border-radius:4px; margin-left:5px;">👑 MAIRE</span>`;
        } else if (cFin && m.auteur === cFin) {
            badgeRole = `<span style="background:#10b981; color:#0f172a; font-size:10px; font-weight:bold; padding:1px 6px; border-radius:4px; margin-left:5px;">💰 FINANCES</span>`;
        } else if (cUrb && m.auteur === cUrb) {
            badgeRole = `<span style="background:#38bdf8; color:#0f172a; font-size:10px; font-weight:bold; padding:1px 6px; border-radius:4px; margin-left:5px;">🏗️ URBANISME</span>`;
        }

        const badgeVille = canalActif === "general" && m.ville
            ? `<span style="color:#7ec8ff; font-size:11px; margin-left:6px;">(${m.ville})</span>`
            : "";

        return `
            <div style="background:rgba(0, 38, 72, 0.72); border:1px solid rgba(56,189,248,0.22); border-radius:9px; padding:8px 12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; font-size:12px;">
                    <div>
                        <strong style="color:#38bdf8;">${m.auteur}</strong>
                        ${badgeRole}
                        ${badgeVille}
                    </div>
                    <span style="color:#94a3b8; font-size:11px;">${m.heure || ""}</span>
                </div>
                <div style="color:#f1f5f9; font-size:14px; line-height:1.4; word-break:break-word;">${escapeHTML(m.texte)}</div>
            </div>
        `;
    }).join("");

    if (etaitEnBas) {
        zoneMessages.scrollTop = zoneMessages.scrollHeight;
    }
}

export async function initMairie() {
    const container = document.getElementById("mairie-container");
    if (!container) return;

    container.innerHTML = `<p style="color:#7ec8ff; text-align:center; padding:20px;">Connexion à l'Hôtel de Ville...</p>`;

    await detecterVilleJoueur();
    const cleVille = normaliserCleVille(villeActuelle);
    const e = getData().entreprise;
    const pseudo = getPseudoJoueur();
    const modeBeta = estModeBetaActif();

    const mairie = await chargerEtActualiserMairie(cleVille);
    if (!mairie) return;

    const estMaire = mairie.maire === pseudo;
    const estConseillerFin = mairie.conseillerFinancier === pseudo;
    const estConseillerUrb = mairie.conseillerUrbanisme === pseudo;
    const peutGererFinances = estMaire || estConseillerFin;
    const peutGererUrbanisme = estMaire || estConseillerUrb;

    const tempsRestantMandatMin = mairie.mandatFinTs
        ? Math.max(0, Math.ceil((mairie.mandatFinTs - Date.now()) / 60000))
        : 0;

    const candidatsEntries = Object.entries(mairie.candidats || {});
    const dejaCandidat = Boolean(mairie.candidats?.[pseudo]);
    const bloqueLimite3Mois = mairie.ancienMaire === pseudo && (mairie.mandatsConsecutifs || 0) >= 3;

    // ============================================
    // SOUS-ONGLETS DE LA MAIRIE
    // ============================================
    let contenuOngletHTML = "";

    if (ongletMairie === "conseil") {
        const listeCandidatsHTML = candidatsEntries.length === 0
            ? `<div style="color:#94a3b8; font-size:12px;">Aucun candidat déclaré pour le prochain scrutin.</div>`
            : candidatsEntries.map(([nomCand, info]) => {
                const nbVotes = Array.isArray(info.votants) ? info.votants.length : 0;
                const aVotePourLui = Array.isArray(info.votants) && info.votants.includes(pseudo);
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(0,25,52,0.85); border:1px solid rgba(251,191,36,0.35); padding:8px 10px; border-radius:8px; margin-bottom:6px;">
                        <div>
                            <strong style="color:#fde68a;">🗳️ ${nomCand}</strong>
                            <span style="font-size:12px; color:#34d399; margin-left:8px;">${nbVotes} voix</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <button type="button" class="btn-voter-candidat" data-candidat="${nomCand}" style="padding:5px 10px; border-radius:6px; border:none; background:${aVotePourLui ? "#059669" : "#0284c7"}; color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
                                ${aVotePourLui ? "✓ Voté" : "Voter"}
                            </button>
                            ${!mairie.maire && nbVotes >= 1 ? `
                                <button type="button" class="btn-proclamer-maire" data-candidat="${nomCand}" style="padding:5px 10px; border-radius:6px; border:none; background:#fbbf24; color:#0f172a; font-size:12px; font-weight:bold; cursor:pointer;">
                                    Investir Maire
                                </button>
                            ` : ""}
                        </div>
                    </div>
                `;
            }).join("");

        contenuOngletHTML = `
            <div style="background:rgba(0,20,42,0.8); border-radius:10px; padding:12px; border:1px solid rgba(56,189,248,0.3); margin-bottom:12px; font-size:13px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:#93c5fd;">👑 Maire en exercice :</span>
                    <strong style="color:#fbbf24;">${mairie.maire ? `${mairie.maire} (Mandat ${mairie.mandatsConsecutifs || 1}/3 — ${tempsRestantMandatMin} min rest.)` : "Poste vacant"}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:#93c5fd;">💰 Conseiller Financier :</span>
                    <strong style="color:#34d399;">${mairie.conseillerFinancier || "Non nommé"}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span style="color:#93c5fd;">🏗️ Conseiller Urbanisme :</span>
                    <strong style="color:#38bdf8;">${mairie.conseillerUrbanisme || "Non nommé"}</strong>
                </div>
            </div>

            ${estMaire ? `
                <div style="background:rgba(245,158,11,0.14); border:1px solid #fbbf24; border-radius:10px; padding:12px; margin-bottom:12px;">
                    <div style="font-weight:bold; color:#fde68a; font-size:13px; margin-bottom:8px;">👑 Nominations du Conseil Municipal</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                        <div>
                            <label style="font-size:11px; color:#fde68a;">Conseiller Financier :</label>
                            <input type="text" id="input-nom-cfin" value="${mairie.conseillerFinancier || ""}" placeholder="Pseudo du joueur..." style="width:100%; box-sizing:border-box; padding:6px; border-radius:6px; border:1px solid #fbbf24; background:#0f294a; color:#fff; font-size:12px;">
                        </div>
                        <div>
                            <label style="font-size:11px; color:#fde68a;">Conseiller Urbanisme :</label>
                            <input type="text" id="input-nom-curb" value="${mairie.conseillerUrbanisme || ""}" placeholder="Pseudo du joueur..." style="width:100%; box-sizing:border-box; padding:6px; border-radius:6px; border:1px solid #fbbf24; background:#0f294a; color:#fff; font-size:12px;">
                        </div>
                    </div>
                    <button type="button" id="btn-sauver-equipe-maire" style="width:100%; padding:7px; border-radius:6px; border:none; background:#059669; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">Enregistrer les nominations</button>
                </div>
            ` : ""}

            <div style="background:rgba(0,25,52,0.75); border:1px solid rgba(56,189,248,0.3); border-radius:10px; padding:12px;">
                <div style="font-weight:bold; color:#7ec8ff; font-size:13px; margin-bottom:6px;">
                    🗳️ Élections Municipales (${modeBeta ? "1 mandat = 1 mois jeu / 1h bêta" : "1 mandat = 1 mois jeu"} • Max 3 mois consécutifs)
                </div>
                ${listeCandidatsHTML}
                ${!dejaCandidat && !bloqueLimite3Mois ? `
                    <button type="button" id="btn-candidater-maire" style="width:100%; margin-top:8px; padding:9px; border-radius:8px; border:none; background:linear-gradient(90deg, #d97706, #fbbf24); color:#0f172a; font-weight:bold; font-size:12px; cursor:pointer;">
                        Se porter candidat (${CAUTION_CANDIDATURE.toLocaleString("fr-FR")} Ø)
                    </button>
                ` : bloqueLimite3Mois ? `
                    <div style="color:#fda4af; font-size:12px; margin-top:6px;">Vous avez atteint la limite de 3 mois de mandat consécutifs dans cette ville.</div>
                ` : ""}
            </div>
        `;
    } else if (ongletMairie === "finances") {
        const hm = mairie.holdingMunicipale;
        const entMairieHTML = hm.entreprises.length === 0
            ? `<div style="color:#94a3b8; font-size:12px;">Aucune entreprise publique acquise par la commune.</div>`
            : hm.entreprises.map(ent => `
                <div style="display:flex; justify-content:space-between; background:rgba(16,185,129,0.12); border:1px solid #10b981; padding:6px 10px; border-radius:6px; font-size:12px; margin-bottom:5px;">
                    <span>🏢 <strong>${ent.nom}</strong> (${ent.secteur})</span>
                    <span style="color:#34d399;">+${ent.revenuCycle.toLocaleString("fr-FR")} Ø / cycle</span>
                </div>
            `).join("");

        contenuOngletHTML = `
            <!-- RÉGLAGE DES TAUX FINANCIERS (ENCADRÉS MIN/MAX) -->
            <div style="background:rgba(16,185,129,0.12); border:1px solid #10b981; border-radius:10px; padding:12px; margin-bottom:12px;">
                <div style="font-weight:bold; color:#34d399; font-size:13px; margin-bottom:8px;">
                    📊 Politique Fiscale & Subventions (Conseiller Financier)
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
                    <div>
                        <label style="color:#a7f3d0; display:block; margin-bottom:3px;">
                            Taxe commerciale (${BORNES_TAUX.taxeMunicipale.min}% – ${BORNES_TAUX.taxeMunicipale.max}%) :
                        </label>
                        <input type="number" id="input-taux-taxe-fin" min="${BORNES_TAUX.taxeMunicipale.min}" max="${BORNES_TAUX.taxeMunicipale.max}" value="${mairie.tauxTaxe}" ${peutGererFinances ? "" : "disabled"} style="width:100%; box-sizing:border-box; padding:6px; border-radius:6px; border:1px solid #34d399; background:#0f294a; color:#fff; font-weight:bold;">
                    </div>
                    <div>
                        <label style="color:#a7f3d0; display:block; margin-bottom:3px;">
                            Subvention entreprises (${BORNES_TAUX.subventionEntreprises.min}% – ${BORNES_TAUX.subventionEntreprises.max}%) :
                        </label>
                        <input type="number" id="input-taux-subv-fin" min="${BORNES_TAUX.subventionEntreprises.min}" max="${BORNES_TAUX.subventionEntreprises.max}" value="${mairie.tauxSubvention}" ${peutGererFinances ? "" : "disabled"} style="width:100%; box-sizing:border-box; padding:6px; border-radius:6px; border:1px solid #34d399; background:#0f294a; color:#fff; font-weight:bold;">
                    </div>
                </div>
                ${peutGererFinances ? `
                    <button type="button" id="btn-sauver-taux-finances" style="width:100%; margin-top:8px; padding:7px; border-radius:6px; border:none; background:#059669; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">
                        Appliquer les taux financiers
                    </button>
                ` : `<div style="color:#94a3b8; font-size:11px; margin-top:6px;">Seuls le Conseiller Financier et le Maire peuvent modifier ces taux.</div>`}
            </div>

            <!-- HOLDING MUNICIPALE -->
            <div style="background:rgba(0,20,42,0.85); border:1px solid rgba(56,189,248,0.4); border-radius:10px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="color:#7ec8ff; font-size:13px;">🏛️ ${hm.nom} ${hm.active ? "(HOLDING +20 %)" : ""}</strong>
                    <span style="font-size:12px; color:#fde68a;">Agents : ${hm.personnel || 0}</span>
                </div>
                ${entMairieHTML}
                ${peutGererFinances ? `
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                        ${!hm.active && hm.entreprises.length >= 2 ? `
                            <button type="button" id="btn-activer-holding-mairie" style="padding:6px 10px; border-radius:6px; border:none; background:#fbbf24; color:#0f172a; font-weight:bold; font-size:12px; cursor:pointer;">Fonder la Holding Municipale</button>
                        ` : ""}
                        <button type="button" id="btn-embaucher-mairie" style="padding:6px 10px; border-radius:6px; border:none; background:#0284c7; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">+ Embaucher agent (15 000 Ø)</button>
                    </div>
                ` : ""}
            </div>

            <div style="font-weight:bold; color:#7ec8ff; font-size:13px; margin-bottom:6px;">Acquérir une entreprise publique :</div>
            ${CATALOGUE_ENTREPRISES_MAIRIE.map(item => `
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,30,60,0.8); border:1px solid rgba(56,189,248,0.3); padding:7px 10px; border-radius:8px; margin-bottom:5px; font-size:12px;">
                    <div>
                        <strong style="color:#fff;">${item.nom}</strong>
                        <div style="color:#93c5fd;">+${item.revenuCycle.toLocaleString("fr-FR")} Ø/cycle</div>
                    </div>
                    ${peutGererFinances ? `
                        <button type="button" class="btn-acheter-ent-mairie" data-id="${item.id}" style="padding:5px 9px; border-radius:6px; border:none; background:#059669; color:#fff; font-weight:bold; cursor:pointer;">
                            Acheter (${item.prix.toLocaleString("fr-FR")} Ø)
                        </button>
                    ` : `<span style="color:#fbbf24;">${item.prix.toLocaleString("fr-FR")} Ø</span>`}
                </div>
            `).join("")}
        `;
    } else if (ongletMairie === "urbanisme") {
        contenuOngletHTML = `
            <!-- RÉGLAGE DES TAUX D'URBANISME (ENCADRÉS MIN/MAX) -->
            <div style="background:rgba(2,132,199,0.15); border:1px solid #38bdf8; border-radius:10px; padding:12px; margin-bottom:12px;">
                <div style="font-weight:bold; color:#7ec8ff; font-size:13px; margin-bottom:8px;">
                    📐 Fiscalité Foncière & Permis (Conseiller Urbanisme)
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
                    <div>
                        <label style="color:#bae6fd; display:block; margin-bottom:3px;">
                            Permis construire/rénov. (${BORNES_TAUX.permisConstruire.min}% – ${BORNES_TAUX.permisConstruire.max}%) :
                        </label>
                        <input type="number" id="input-taux-permis-urb" min="${BORNES_TAUX.permisConstruire.min}" max="${BORNES_TAUX.permisConstruire.max}" value="${mairie.tauxPermisConstruire}" ${peutGererUrbanisme ? "" : "disabled"} style="width:100%; box-sizing:border-box; padding:6px; border-radius:6px; border:1px solid #38bdf8; background:#0f294a; color:#fff; font-weight:bold;">
                    </div>
                    <div>
                        <label style="color:#bae6fd; display:block; margin-bottom:3px;">
                            Taxe foncière locale (${BORNES_TAUX.taxeFonciere.min}% – ${BORNES_TAUX.taxeFonciere.max}%) :
                        </label>
                        <input type="number" id="input-taux-foncier-urb" min="${BORNES_TAUX.taxeFonciere.min}" max="${BORNES_TAUX.taxeFonciere.max}" value="${mairie.tauxTaxeFonciere}" ${peutGererUrbanisme ? "" : "disabled"} style="width:100%; box-sizing:border-box; padding:6px; border-radius:6px; border:1px solid #38bdf8; background:#0f294a; color:#fff; font-weight:bold;">
                    </div>
                </div>
                ${peutGererUrbanisme ? `
                    <button type="button" id="btn-sauver-taux-urbanisme" style="width:100%; margin-top:8px; padding:7px; border-radius:6px; border:none; background:#0284c7; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">
                        Appliquer les taux d'urbanisme
                    </button>
                ` : `<div style="color:#94a3b8; font-size:11px; margin-top:6px;">Seuls le Conseiller de l'Urbanisme et le Maire peuvent modifier ces taux.</div>`}
            </div>

            <div style="font-weight:bold; color:#7ec8ff; font-size:13px; margin-bottom:6px;">Infrastructures communales :</div>
            ${PROJETS_URBANISME.map(p => {
                const dejaConstruit = (mairie.infrastructures || []).includes(p.id);
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; background:rgba(0,30,60,0.8); border:1px solid ${dejaConstruit ? "#10b981" : "rgba(56,189,248,0.3)"}; padding:8px 10px; border-radius:8px; margin-bottom:6px; font-size:12px;">
                        <div>
                            <strong style="color:#fff;">🏗️ ${p.nom}</strong>
                            <div style="color:#34d399;">${p.effet}</div>
                        </div>
                        ${dejaConstruit
                            ? `<span style="color:#34d399; font-weight:bold;">✓ Construit</span>`
                            : peutGererUrbanisme
                                ? `<button type="button" class="btn-construire-infra" data-id="${p.id}" style="padding:5px 9px; border-radius:6px; border:none; background:#0284c7; color:#fff; font-weight:bold; cursor:pointer;">Construire (${p.cout.toLocaleString("fr-FR")} Ø)</button>`
                                : `<span style="color:#fbbf24;">${p.cout.toLocaleString("fr-FR")} Ø</span>`
                        }
                    </div>
                `;
            }).join("")}
        `;
    } else if (ongletMairie === "supervision") {
        const logs = mairie.journal || [];
        contenuOngletHTML = `
            <div style="font-weight:bold; color:#fde68a; font-size:13px; margin-bottom:8px;">
                👁️ Supervision du Maire — Journal des Conseillers (${logs.length} entrée(s))
            </div>
            <div style="max-height:330px; overflow-y:auto; background:rgba(2,16,34,0.85); border-radius:8px; padding:10px; border:1px solid rgba(251,191,36,0.3);">
                ${logs.length === 0
                    ? `<div style="color:#94a3b8; font-size:12px;">Aucune action enregistrée par les conseillers pour le moment.</div>`
                    : logs.map(l => `
                        <div style="border-bottom:1px solid rgba(255,255,255,0.08); padding:6px 0; font-size:12px;">
                            <span style="color:#94a3b8;">[${l.date}]</span>
                            <strong style="color:#38bdf8;">${l.auteur}</strong>
                            <span style="color:#fbbf24;">(${l.role})</span> :
                            <span style="color:#f1f5f9;">${l.action}</span>
                        </div>
                    `).join("")
                }
            </div>
        `;
    }

    container.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:18px;">

            <!-- COLONNE 1 : HOTEL DE VILLE & CONSEIL MUNICIPAL -->
            <div style="background:rgba(0, 35, 68, 0.85); border:1px solid rgba(56,189,248,0.4); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                    <h2 style="margin:0; color:#fde68a; font-size:19px;">🏛️ Mairie de ${villeActuelle}</h2>
                    <span style="background:rgba(16,185,129,0.2); border:1px solid #34d399; color:#34d399; padding:4px 10px; border-radius:8px; font-size:13px; font-weight:bold;">
                        Banque Mairie : ${(mairie.budget || 0).toLocaleString("fr-FR")} Ø
                    </span>
                </div>

                <div style="background:rgba(0, 20, 42, 0.75); border-radius:8px; padding:8px 11px; border:1px solid rgba(56,189,248,0.25); margin-bottom:12px; font-size:11px; color:#93c5fd;">
                    🔒 Commune verrouillée sur votre position actuelle. Utilisez une carte de téléportation (🚌/🚆/✈️) sur la <a href="carte.html" style="color:#fbbf24; font-weight:bold;">Carte GPS</a> pour changer de ville.
                </div>

                <div style="display:flex; gap:5px; flex-wrap:wrap; margin-bottom:12px;">
                    <button type="button" class="tab-mairie-btn" data-tab="conseil" style="flex:1; padding:7px 6px; border-radius:7px; border:1px solid #38bdf8; background:${ongletMairie === "conseil" ? "#0284c7" : "rgba(0,25,50,0.8)"}; color:#fff; font-weight:bold; font-size:11px; cursor:pointer;">🗳️ Conseil</button>
                    <button type="button" class="tab-mairie-btn" data-tab="finances" style="flex:1; padding:7px 6px; border-radius:7px; border:1px solid #10b981; background:${ongletMairie === "finances" ? "#059669" : "rgba(0,25,50,0.8)"}; color:#fff; font-weight:bold; font-size:11px; cursor:pointer;">💰 Finances</button>
                    <button type="button" class="tab-mairie-btn" data-tab="urbanisme" style="flex:1; padding:7px 6px; border-radius:7px; border:1px solid #38bdf8; background:${ongletMairie === "urbanisme" ? "#0284c7" : "rgba(0,25,50,0.8)"}; color:#fff; font-weight:bold; font-size:11px; cursor:pointer;">🏗️ Urbanisme</button>
                    <button type="button" class="tab-mairie-btn" data-tab="supervision" style="flex:1; padding:7px 6px; border-radius:7px; border:1px solid #fbbf24; background:${ongletMairie === "supervision" ? "#b45309" : "rgba(0,25,50,0.8)"}; color:#fff; font-weight:bold; font-size:11px; cursor:pointer;">👁️ Supervision</button>
                </div>

                ${contenuOngletHTML}
            </div>

            <!-- COLONNE 2 : TCHAT GÉNÉRAL & TCHAT DE LA VILLE -->
            <div style="background:rgba(0, 35, 68, 0.85); border:1px solid rgba(56,189,248,0.4); border-radius:14px; padding:18px; display:flex; flex-direction:column; height:580px;">
                <div style="display:flex; gap:8px; margin-bottom:12px;">
                    <button type="button" id="tab-tchat-general" style="flex:1; padding:9px; border-radius:8px; border:1px solid #38bdf8; background:${canalActif === "general" ? "#0284c7" : "rgba(0,25,50,0.8)"}; color:#fff; font-weight:bold; font-size:13px; cursor:pointer;">
                        🌍 Tchat Général
                    </button>
                    <button type="button" id="tab-tchat-ville" style="flex:1; padding:9px; border-radius:8px; border:1px solid #fbbf24; background:${canalActif === "ville" ? "#b45309" : "rgba(0,25,50,0.8)"}; color:#fff; font-weight:bold; font-size:13px; cursor:pointer;">
                        🏙️ Ville : ${villeActuelle}
                    </button>
                </div>

                <div id="tchat-messages" style="flex:1; overflow-y:auto; background:rgba(2, 16, 34, 0.88); border:1px solid rgba(56,189,248,0.25); border-radius:10px; padding:10px; margin-bottom:10px;">
                    <p style="color:#7ec8ff; font-size:13px;">Chargement des messages...</p>
                </div>

                <form id="form-envoi-tchat" style="display:flex; gap:8px;">
                    <input type="text" id="input-message-tchat" maxlength="240" placeholder="Écrire un message en tant que ${pseudo}..." style="flex:1; padding:10px 12px; border-radius:8px; border:1px solid #38bdf8; background:rgba(0,20,45,0.95); color:#fff; font-size:13px;">
                    <button type="submit" style="padding:10px 16px; border-radius:8px; border:none; background:linear-gradient(90deg, #059669, #10b981); color:#fff; font-weight:bold; font-size:13px; cursor:pointer;">Envoyer</button>
                </form>
            </div>

        </div>
    `;

    // ============================================
    // ÉVÉNEMENTS ONGLETS & ÉLECTIONS
    // ============================================
    container.querySelectorAll(".tab-mairie-btn").forEach(btn => {
        btn.onclick = () => {
            ongletMairie = btn.dataset.tab;
            initMairie();
        };
    });

    const btnCandidater = document.getElementById("btn-candidater-maire");
    if (btnCandidater) {
        btnCandidater.onclick = async () => {
            if ((e.argent || 0) < CAUTION_CANDIDATURE) {
                return alert(`Fonds insuffisants (${CAUTION_CANDIDATURE.toLocaleString("fr-FR")} Ø requis).`);
            }
            if (!confirm(`Déposer votre candidature à la Mairie de ${villeActuelle} pour ${CAUTION_CANDIDATURE.toLocaleString("fr-FR")} Ø ?`)) return;

            e.argent -= CAUTION_CANDIDATURE;
            saveData();
            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = e.argent.toLocaleString("fr-FR");

            mairie.budget = (mairie.budget || 0) + CAUTION_CANDIDATURE;
            if (!mairie.candidats) mairie.candidats = {};
            mairie.candidats[pseudo] = { votants: [pseudo], date: Date.now() };
            ajouterJournalMairie(mairie, pseudo, "Candidat", "Dépôt de candidature aux élections municipales.");

            await sauvegarderMairieFirebase(cleVille, mairie);
            ajouterHistorique(`🗳️ Candidature déposée à la Mairie de ${villeActuelle} (-${CAUTION_CANDIDATURE.toLocaleString("fr-FR")} Ø)`, "prestige");
            initMairie();
        };
    }

    container.querySelectorAll(".btn-voter-candidat").forEach(btn => {
        btn.onclick = async () => {
            const cible = btn.dataset.candidat;
            if (!mairie.candidats?.[cible]) return;
            Object.values(mairie.candidats).forEach(c => {
                c.votants = (c.votants || []).filter(v => v !== pseudo);
            });
            mairie.candidats[cible].votants.push(pseudo);
            await sauvegarderMairieFirebase(cleVille, mairie);
            initMairie();
        };
    });

    container.querySelectorAll(".btn-proclamer-maire").forEach(btn => {
        btn.onclick = async () => {
            const elu = btn.dataset.candidat;
            const dureeMois = getDureeUnMoisJeuMs();
            const precedentsMandats = mairie.ancienMaire === elu ? (mairie.mandatsConsecutifs || 0) : 0;

            if (precedentsMandats >= 3) {
                return alert(`${elu} a déjà effectué 3 mois de mandat consécutifs et ne peut pas être réélu immédiatement.`);
            }

            mairie.maire = elu;
            mairie.mandatDebutTs = Date.now();
            mairie.mandatFinTs = Date.now() + dureeMois;
            mairie.mandatsConsecutifs = precedentsMandats + 1;
            mairie.candidats = {};
            ajouterJournalMairie(mairie, elu, "Maire", `Investiture en tant que Maire (Mandat ${mairie.mandatsConsecutifs}/3).`);

            await sauvegarderMairieFirebase(cleVille, mairie);
            initMairie();
        };
    });

    const btnSauverEquipe = document.getElementById("btn-sauver-equipe-maire");
    if (btnSauverEquipe) {
        btnSauverEquipe.onclick = async () => {
            const cFin = (document.getElementById("input-nom-cfin")?.value || "").trim();
            const cUrb = (document.getElementById("input-nom-curb")?.value || "").trim();

            mairie.conseillerFinancier = cFin;
            mairie.conseillerUrbanisme = cUrb;
            ajouterJournalMairie(mairie, pseudo, "Maire", `Nominations : Finances = ${cFin || "Aucun"}, Urbanisme = ${cUrb || "Aucun"}.`);

            await sauvegarderMairieFirebase(cleVille, mairie);
            alert("Nominations du Conseil Municipal enregistrées !");
            initMairie();
        };
    }

    // ÉVÉNEMENTS TAUX CONSEILLER FINANCIER
    const btnTauxFin = document.getElementById("btn-sauver-taux-finances");
    if (btnTauxFin) {
        btnTauxFin.onclick = async () => {
            const taxe = borner(document.getElementById("input-taux-taxe-fin")?.value, BORNES_TAUX.taxeMunicipale.min, BORNES_TAUX.taxeMunicipale.max);
            const subv = borner(document.getElementById("input-taux-subv-fin")?.value, BORNES_TAUX.subventionEntreprises.min, BORNES_TAUX.subventionEntreprises.max);

            mairie.tauxTaxe = taxe;
            mairie.tauxSubvention = subv;
            ajouterJournalMairie(mairie, pseudo, estMaire ? "Maire" : "Conseiller Financier", `Réglage taux financiers : Taxe commerciale = ${taxe} %, Subventions = ${subv} %.`);

            await sauvegarderMairieFirebase(cleVille, mairie);
            alert(`Taux financiers mis à jour (Taxe : ${taxe} %, Subventions : ${subv} %).`);
            initMairie();
        };
    }

    container.querySelectorAll(".btn-acheter-ent-mairie").forEach(btn => {
        btn.onclick = async () => {
            const item = CATALOGUE_ENTREPRISES_MAIRIE.find(x => x.id === btn.dataset.id);
            if (!item) return;
            if ((mairie.budget || 0) < item.prix) {
                return alert("Budget de la Mairie insuffisant.");
            }
            mairie.budget -= item.prix;
            mairie.holdingMunicipale.entreprises.push(item);
            ajouterJournalMairie(mairie, pseudo, estMaire ? "Maire" : "Conseiller Financier", `Achat entreprise publique : ${item.nom} (-${item.prix.toLocaleString("fr-FR")} Ø).`);
            await sauvegarderMairieFirebase(cleVille, mairie);
            initMairie();
        };
    });

    const btnHoldingMairie = document.getElementById("btn-activer-holding-mairie");
    if (btnHoldingMairie) {
        btnHoldingMairie.onclick = async () => {
            mairie.holdingMunicipale.active = true;
            ajouterJournalMairie(mairie, pseudo, estMaire ? "Maire" : "Conseiller Financier", "Création officielle de la Holding Municipale (+20 % revenus publics).");
            await sauvegarderMairieFirebase(cleVille, mairie);
            initMairie();
        };
    }

    const btnEmbaucherMairie = document.getElementById("btn-embaucher-mairie");
    if (btnEmbaucherMairie) {
        btnEmbaucherMairie.onclick = async () => {
            if ((mairie.budget || 0) < 15000) return alert("Budget municipal insuffisant (15 000 Ø requis).");
            mairie.budget -= 15000;
            mairie.holdingMunicipale.personnel = (mairie.holdingMunicipale.personnel || 0) + 1;
            ajouterJournalMairie(mairie, pseudo, estMaire ? "Maire" : "Conseiller Financier", `Recrutement d'un agent municipal (Total : ${mairie.holdingMunicipale.personnel}).`);
            await sauvegarderMairieFirebase(cleVille, mairie);
            initMairie();
        };
    }

    // ÉVÉNEMENTS TAUX & PROJETS CONSEILLER URBANISME
    const btnTauxUrb = document.getElementById("btn-sauver-taux-urbanisme");
    if (btnTauxUrb) {
        btnTauxUrb.onclick = async () => {
            const permis = borner(document.getElementById("input-taux-permis-urb")?.value, BORNES_TAUX.permisConstruire.min, BORNES_TAUX.permisConstruire.max);
            const foncier = borner(document.getElementById("input-taux-foncier-urb")?.value, BORNES_TAUX.taxeFonciere.min, BORNES_TAUX.taxeFonciere.max);

            mairie.tauxPermisConstruire = permis;
            mairie.tauxTaxeFonciere = foncier;
            ajouterJournalMairie(mairie, pseudo, estMaire ? "Maire" : "Conseiller Urbanisme", `Réglage taux urbanisme : Permis construire = ${permis} %, Taxe foncière = ${foncier} %.`);

            await sauvegarderMairieFirebase(cleVille, mairie);
            alert(`Taux d'urbanisme mis à jour (Permis : ${permis} %, Taxe foncière : ${foncier} %).`);
            initMairie();
        };
    }

    container.querySelectorAll(".btn-construire-infra").forEach(btn => {
        btn.onclick = async () => {
            const proj = PROJETS_URBANISME.find(x => x.id === btn.dataset.id);
            if (!proj) return;
            if ((mairie.budget || 0) < proj.cout) return alert("Budget municipal insuffisant.");
            mairie.budget -= proj.cout;
            mairie.infrastructures.push(proj.id);
            ajouterJournalMairie(mairie, pseudo, estMaire ? "Maire" : "Conseiller Urbanisme", `Construction infrastructure : ${proj.nom} (-${proj.cout.toLocaleString("fr-FR")} Ø).`);
            await sauvegarderMairieFirebase(cleVille, mairie);
            initMairie();
        };
    });

    // ÉVÉNEMENTS TCHAT
    document.getElementById("tab-tchat-general").onclick = () => {
        canalActif = "general";
        initMairie();
    };

    document.getElementById("tab-tchat-ville").onclick = () => {
        canalActif = "ville";
        initMairie();
    };

    document.getElementById("form-envoi-tchat").onsubmit = async ev => {
        ev.preventDefault();
        const inp = document.getElementById("input-message-tchat");
        const texte = (inp.value || "").trim();
        if (!texte) return;

        inp.value = "";
        const chemin = canalActif === "general" ? "tchat/general" : `tchat/villes/${cleVille}`;
        const msg = {
            auteur: pseudo,
            ville: villeActuelle,
            texte,
            heure: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            timestamp: Date.now()
        };

        await fetch(`${FIREBASE_DB_URL}/${chemin}.json`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(msg)
        });

        await rafraichirTchatSeul();
    };

    await rafraichirTchatSeul();
    if (intervalleRefresh) clearInterval(intervalleRefresh);
    intervalleRefresh = setInterval(rafraichirTchatSeul, 4000);
}

window.initMairie = initMairie;
