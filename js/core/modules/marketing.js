// ============================================
// MARKETING — AGENCES COMMERCIALES & REGISTRE SECRET
// ============================================

import { getData, saveData, ajouterHistorique } from "../geoData.js";

// Code secret réservé uniquement au créateur (différent de GEO-BETA-2026)
const CODE_SECRET_CREATEUR = "EMPIRE-MASTER-87";

export const AGENCES_DEFAUT = {
    "GastroPub Régie": {
        categories: ["Restaurants"],
        description: "Campagnes locales, influence culinaire et visibilité des enseignes de restauration.",
        investissementMin: 2500,
        montantTaquet: 18000,
        visibilite: 20,
        cyclesMaintien: 0
    },
    "RetailBoost Média": {
        categories: ["Commerces"],
        description: "Affichage urbain, promotions en vitrine et trafic clientèle en zone commerciale.",
        investissementMin: 2000,
        montantTaquet: 15000,
        visibilite: 20,
        cyclesMaintien: 0
    },
    "ImmoPrestige Diffusion": {
        categories: ["Appartements", "Maisons"],
        description: "Portails immobiliers nationaux, visites virtuelles et ciblage acquéreurs/locataires.",
        investissementMin: 4000,
        montantTaquet: 25000,
        visibilite: 20,
        cyclesMaintien: 0
    },
    "CorpSpace Advisory": {
        categories: ["Bureaux", "Entrepôts"],
        description: "Réseau B2B, prospection grands comptes et commercialisation de surfaces professionnelles.",
        investissementMin: 3500,
        montantTaquet: 22000,
        visibilite: 20,
        cyclesMaintien: 0
    },
    "Hôtelia & Luxe Network": {
        categories: ["Hôtels"],
        description: "Plateformes internationales de réservation, tourisme d'affaires et clientèle prestige.",
        investissementMin: 6000,
        montantTaquet: 35000,
        visibilite: 20,
        cyclesMaintien: 0
    }
};

export function initialiserAgencesMarketing(entreprise) {
    if (!entreprise.marketing) {
        entreprise.marketing = { totalInvestissements: 0, clients: {} };
    }
    if (!entreprise.marketing.clients || typeof entreprise.marketing.clients !== "object") {
        entreprise.marketing.clients = {};
    }

    let modifie = false;

    // Nettoyage des éventuelles anciennes agences obsolètes de la sauvegarde
    for (const cleExistante of Object.keys(entreprise.marketing.clients)) {
        if (!AGENCES_DEFAUT[cleExistante]) {
            delete entreprise.marketing.clients[cleExistante];
            modifie = true;
        }
    }

    for (const [nomAgence, cfg] of Object.entries(AGENCES_DEFAUT)) {
        const existant = entreprise.marketing.clients[nomAgence];
        if (!existant || !Array.isArray(existant.categories)) {
            entreprise.marketing.clients[nomAgence] = {
                categories: cfg.categories,
                description: cfg.description,
                investissementMin: cfg.investissementMin,
                montantTaquet: cfg.montantTaquet,
                visibilite: typeof existant?.visibilite === "number" ? existant.visibilite : cfg.visibilite,
                cyclesMaintien: existant?.cyclesMaintien || 0,
                totalVerse: existant?.totalVerse || 0
            };
            modifie = true;
        }
    }
    if (modifie) saveData();
}

export function getVisibilitePourCategorie(entreprise, categorie) {
    initialiserAgencesMarketing(entreprise);
    for (const agence of Object.values(entreprise.marketing.clients)) {
        if (Array.isArray(agence.categories) && agence.categories.includes(categorie)) {
            return Math.max(0, Math.min(100, Math.round(agence.visibilite || 0)));
        }
    }
    return 20;
}

function getNiveauDiffusionJoueur(visibilite) {
    if (visibilite >= 75) {
        return {
            badge: "Diffusion maximale",
            couleur: "#34d399",
            fond: "rgba(16, 185, 129, 0.18)"
        };
    }
    if (visibilite >= 35) {
        return {
            badge: "Diffusion active",
            couleur: "#fbbf24",
            fond: "rgba(245, 158, 11, 0.18)"
        };
    }
    return {
        badge: "Audience limitée",
        couleur: "#f87171",
        fond: "rgba(239, 68, 68, 0.18)"
    };
}

function calculerEffetCampagne(agence, montantInvesti) {
    const taquet = agence.montantTaquet || 18000;
    const ratio = montantInvesti / taquet;

    const gainVisibilite = Math.min(100, Math.round(ratio * 85));
    const nouvelleVisibilite = Math.min(100, Math.max(agence.visibilite || 0, (agence.visibilite || 0) + gainVisibilite));

    let dureeMaintien = 0;
    if (ratio >= 1.0) {
        const surplus = ratio - 1.0;
        const aleaDuree = Math.floor(Math.random() * 4) + 1;
        const bonusSurplus = Math.min(14, Math.floor(surplus * 5));
        dureeMaintien = Math.max(agence.cyclesMaintien || 0, aleaDuree + bonusSurplus);
    } else if (ratio >= 0.5) {
        dureeMaintien = Math.max(agence.cyclesMaintien || 0, Math.floor(Math.random() * 2) + 1);
    }

    return { nouvelleVisibilite, dureeMaintien };
}

export function initMarketing() {
    const zone = document.getElementById("marketing-contenu") || document.getElementById("marketing");
    if (!zone) return;

    const data = getData();
    const e = data.entreprise;
    initialiserAgencesMarketing(e);

    const agences = e.marketing.clients;
    const registreOuvert = sessionStorage.getItem("geoRegistreCreateur") === "1";

    let registreSecretHTML = "";
    if (registreOuvert) {
        registreSecretHTML = `
            <div class="premium-box" style="border:2px solid #c084fc; background:rgba(30, 10, 50, 0.9); margin-bottom:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <strong style="color:#e9d5ff; font-size:15px;">🔐 REGISTRE INTERNE CRÉATEUR (Données masquées aux joueurs)</strong>
                    <button type="button" id="btn-fermer-registre" style="background:#7e22ce; color:#fff; border:none; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12px;">Verrouiller</button>
                </div>
                <div style="font-size:12px; color:#ddd6fe; line-height:1.6; margin-bottom:10px;">
                    • <strong>Règle de conversion :</strong> Investissement / Montant Taquet = ratio de portée. Au-delà du taquet, le surplus prolonge la durée de maintien (1 à 18 cycles).<br>
                    • <strong>Taux d'écoulement à la clôture :</strong> Vert (≥ 75 %) = 100 % des ordres | Orange (35-74 %) = 65 % | Rouge (&lt; 35 %) = 30 %.<br>
                    • <strong>Usure naturelle :</strong> -6 % par cycle une fois la durée de maintien écoulée.
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:12px; color:#f3e8ff;">
                    <thead>
                        <tr style="border-bottom:1px solid rgba(192,132,252,0.4); text-align:left;">
                            <th style="padding:5px;">Agence</th>
                            <th style="padding:5px;">Portée réelle</th>
                            <th style="padding:5px;">Maintien restant</th>
                            <th style="padding:5px;">Cumul investi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(agences).map(([nom, ag]) => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
                                <td style="padding:5px;">${nom}</td>
                                <td style="padding:5px;"><strong>${ag.visibilite || 0} %</strong></td>
                                <td style="padding:5px;">${ag.cyclesMaintien || 0} cycle(s)</td>
                                <td style="padding:5px;">${(ag.totalVerse || 0).toLocaleString("fr-FR")} Ø</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }

    zone.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                <h2 class="premium-title" style="margin:0;">Agences Marketing & Communication</h2>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <span style="background:rgba(0,45,85,0.85); border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                        Budget publicitaire cumulé : <strong>${(e.marketing.totalInvestissements || 0).toLocaleString("fr-FR")} Ø</strong>
                    </span>
                    ${!registreOuvert ? `
                        <button type="button" id="btn-acces-registre" style="background:rgba(15,23,42,0.8); color:#94a3b8; border:1px solid rgba(148,163,184,0.3); border-radius:8px; padding:6px 10px; font-size:12px; cursor:pointer;">
                            Registre interne
                        </button>
                    ` : ""}
                </div>
            </div>

            ${registreSecretHTML}

            <div class="premium-box" style="margin-bottom:16px; font-size:13px; color:#cbd5e1;">
                Financez vos agences partenaires pour accroître la visibilité de vos offres auprès des acheteurs et locataires. Plus votre budget est élevé, plus votre campagne reste active dans la durée.
            </div>

            <div style="display:flex; flex-direction:column; gap:14px;">
                ${Object.entries(agences).map(([nom, ag]) => {
                    const vis = Math.max(0, Math.min(100, Math.round(ag.visibilite || 0)));
                    const etat = getNiveauDiffusionJoueur(vis);
                    const minInv = ag.investissementMin || 2500;
                    const taquet = ag.montantTaquet || 18000;
                    const secteursLabel = Array.isArray(ag.categories) ? ag.categories.join(" & ") : "Tous secteurs";

                    return `
                    <div class="premium-box" style="border-left: 4px solid ${etat.couleur}; margin-bottom:0;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
                            <div>
                                <div style="font-size:17px; font-weight:bold; color:#fff;">📢 ${nom}</div>
                                <div style="font-size:12px; color:#7ec8ff; margin-top:2px;">
                                    Secteurs couverts : <strong>${secteursLabel}</strong>
                                </div>
                                <div style="font-size:13px; color:#cbd5e1; margin-top:4px;">${ag.description || ""}</div>
                            </div>
                            <span style="background:${etat.fond}; color:${etat.couleur}; border:1px solid ${etat.couleur}; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold;">
                                ${etat.badge}
                            </span>
                        </div>

                        <div style="margin:10px 0;">
                            <div style="width:100%; height:10px; background:rgba(0,0,0,0.5); border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.12);">
                                <div style="width:${vis}%; height:100%; background:${etat.couleur}; transition:width 0.3s ease;"></div>
                            </div>
                        </div>

                        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px;">
                            <input type="number" class="input-budget-agence" data-agence="${nom}"
                                min="${minInv}" step="500" value="${minInv}"
                                style="width:130px; padding:7px 10px; border-radius:6px; border:1px solid #38bdf8; background:#0f294a; color:#fff; font-weight:bold;">

                            <button type="button" class="btn-investir-libre premium-btn" data-agence="${nom}" data-min="${minInv}"
                                style="margin:0; padding:7px 13px; font-size:13px; background:#0284c7;">
                                Lancer la campagne (min. ${minInv.toLocaleString("fr-FR")} Ø)
                            </button>

                            <button type="button" class="btn-mettre-taquet premium-btn" data-agence="${nom}" data-montant="${taquet}"
                                style="margin:0; padding:7px 13px; font-size:13px; background:#059669;">
                                Mettre au taquet (${taquet.toLocaleString("fr-FR")} Ø)
                            </button>
                        </div>
                    </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;

    // Accès registre secret créateur
    const btnAcces = document.getElementById("btn-acces-registre");
    if (btnAcces) {
        btnAcces.onclick = () => {
            const code = prompt("Entrez le code maître du registre interne :");
            if (code === CODE_SECRET_CREATEUR) {
                sessionStorage.setItem("geoRegistreCreateur", "1");
                initMarketing();
            } else if (code !== null) {
                alert("Code incorrect.");
            }
        };
    }

    const btnFermer = document.getElementById("btn-fermer-registre");
    if (btnFermer) {
        btnFermer.onclick = () => {
            sessionStorage.removeItem("geoRegistreCreateur");
            initMarketing();
        };
    }

    function executerInvestissement(nomAgence, montant) {
        const d = getData();
        const ent = d.entreprise;
        const agence = ent.marketing?.clients?.[nomAgence];
        if (!agence) return;

        const minInv = agence.investissementMin || 2500;
        if (isNaN(montant) || montant < minInv) {
            alert(`L'investissement minimum pour ${nomAgence} est de ${minInv.toLocaleString("fr-FR")} Ø.`);
            return;
        }

        if ((ent.argent || 0) < montant) {
            alert(`Fonds insuffisants ! Il vous faut ${montant.toLocaleString("fr-FR")} Ø.`);
            return;
        }

        ent.argent -= montant;
        const resultat = calculerEffetCampagne(agence, montant);
        agence.visibilite = resultat.nouvelleVisibilite;
        agence.cyclesMaintien = resultat.dureeMaintien;
        agence.totalVerse = (agence.totalVerse || 0) + montant;

        ent.marketing.totalInvestissements = (ent.marketing.totalInvestissements || 0) + montant;
        if (!ent.finances) ent.finances = {};
        ent.finances.depensesMarketing = (ent.finances.depensesMarketing || 0) + montant;

        const auteur = ent.utilisateurActif || ent.pdg || "Fondateur";
        ajouterHistorique(`[Marketing — ${nomAgence}] Campagne publicitaire financée : -${montant.toLocaleString("fr-FR")} Ø`, "depense", auteur);

        const soldeEl = document.getElementById("solde");
        if (soldeEl) soldeEl.textContent = ent.argent.toLocaleString("fr-FR");

        initMarketing();
    }

    zone.querySelectorAll(".btn-investir-libre").forEach(btn => {
        btn.onclick = () => {
            const nomAgence = btn.dataset.agence;
            const input = zone.querySelector(`.input-budget-agence[data-agence="${nomAgence}"]`);
            const montant = Number(input?.value || 0);
            executerInvestissement(nomAgence, montant);
        };
    });

    zone.querySelectorAll(".btn-mettre-taquet").forEach(btn => {
        btn.onclick = () => {
            executerInvestissement(btn.dataset.agence, Number(btn.dataset.montant));
        };
    });
}

window.initMarketing = initMarketing;
