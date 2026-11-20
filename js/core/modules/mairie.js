// ============================================
// GEO EMPIRE — MODULE MAIRIE & TCHAT (GÉNÉRAL + VILLE)
// ============================================

import { getData, saveData, ajouterHistorique } from "../geoData.js";

const FIREBASE_DB_URL = "https://geo-empire-8ca7e-default-rtdb.europe-west1.firebasedatabase.app";
const CAUTION_MAIRE = 25000;

let canalActif = "general"; // "general" ou "ville"
let villeActuelle = localStorage.getItem("geoEmpireVilleActuelle") || "";
let mairieDataCache = null;
let intervalleRefresh = null;

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

async function detecterVilleJoueur() {
    if (villeActuelle) return villeActuelle;

    // 1. Géolocalisation GPS + géocodage inverse OpenStreetMap
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

    // 2. Repli via localisation IP
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

async function chargerMairie(cleVille) {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`);
        if (!res.ok) return null;
        const data = await res.json();
        mairieDataCache = data || {
            nomVille: villeActuelle,
            maire: null,
            tauxTaxe: 15,
            budget: 50000,
            dateElection: null
        };
        return mairieDataCache;
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

async function rafraichirTchatSeul() {
    const zoneMessages = document.getElementById("tchat-messages");
    if (!zoneMessages) return;

    const cleVille = normaliserCleVille(villeActuelle);
    const chemin = canalActif === "general" ? "tchat/general" : `tchat/villes/${cleVille}`;
    const messages = await chargerMessagesTchat(chemin);
    const maireActuel = mairieDataCache?.maire || "";

    if (messages.length === 0) {
        zoneMessages.innerHTML = `<div style="color:#94a3b8; text-align:center; padding:25px; font-size:13px;">Aucun message dans ce canal pour le moment. Soyez le premier à écrire !</div>`;
        return;
    }

    const etaitEnBas = zoneMessages.scrollHeight - zoneMessages.scrollTop - zoneMessages.clientHeight < 60;

    zoneMessages.innerHTML = messages.map(m => {
        const estMaire = maireActuel && m.auteur === maireActuel;
        const badgeMaire = estMaire
            ? `<span style="background:#fbbf24; color:#0f172a; font-size:10px; font-weight:bold; padding:1px 6px; border-radius:4px; margin-left:5px;">🏛️ MAIRE</span>`
            : "";
        const badgeVille = canalActif === "general" && m.ville
            ? `<span style="color:#7ec8ff; font-size:11px; margin-left:6px;">(${m.ville})</span>`
            : "";

        return `
            <div style="background:rgba(0, 38, 72, 0.72); border:1px solid ${estMaire ? "rgba(251,191,36,0.45)" : "rgba(56,189,248,0.22)"}; border-radius:9px; padding:8px 12px; margin-bottom:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; font-size:12px;">
                    <div>
                        <strong style="color:${estMaire ? "#fde68a" : "#38bdf8"};">${m.auteur}</strong>
                        ${badgeMaire}
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

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export async function initMairie() {
    const container = document.getElementById("mairie-container");
    if (!container) return;

    container.innerHTML = `<p style="color:#7ec8ff; text-align:center; padding:20px;">Localisation de votre commune et connexion à la Mairie...</p>`;

    await detecterVilleJoueur();
    const cleVille = normaliserCleVille(villeActuelle);
    const e = getData().entreprise;
    const pseudo = getPseudoJoueur();

    const mairie = await chargerMairie(cleVille) || {
        nomVille: villeActuelle,
        maire: null,
        tauxTaxe: 15,
        budget: 50000
    };

    const estMaireDeCetteVille = mairie.maire === pseudo;
    const budgetTotal = (mairie.budget || 0) + (e.caisseMairie || 0);

    container.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:18px;">

            <!-- COLONNE 1 : HOTEL DE VILLE & GOUVERNANCE -->
            <div style="background:rgba(0, 35, 68, 0.85); border:1px solid rgba(56,189,248,0.4); border-radius:14px; padding:18px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
                    <h2 style="margin:0; color:#fde68a; font-size:20px;">🏛️ Mairie de ${villeActuelle}</h2>
                </div>

                <div style="display:flex; gap:8px; margin-bottom:14px;">
                    <input type="text" id="input-changer-ville" value="${villeActuelle}" placeholder="Nom de la commune..." style="flex:1; padding:8px 10px; border-radius:8px; border:1px solid #38bdf8; background:rgba(0,20,45,0.9); color:#fff; font-size:13px;">
                    <button type="button" id="btn-changer-ville" style="padding:8px 12px; border-radius:8px; border:none; background:#0284c7; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">Changer de ville</button>
                </div>

                <div style="background:rgba(0, 20, 42, 0.8); border-radius:10px; padding:14px; border:1px solid rgba(251,191,36,0.35); margin-bottom:14px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
                        <span style="color:#93c5fd;">Maire en exercice :</span>
                        <strong style="color:${mairie.maire ? "#fbbf24" : "#94a3b8"};">${mairie.maire ? `👑 ${mairie.maire}` : "Poste vacant"}</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:14px;">
                        <span style="color:#93c5fd;">Budget municipal :</span>
                        <strong style="color:#34d399;">${budgetTotal.toLocaleString("fr-FR")} Ø</strong>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:14px;">
                        <span style="color:#93c5fd;">Taxe municipale locale :</span>
                        <strong style="color:#38bdf8;">${mairie.tauxTaxe || 15} %</strong>
                    </div>
                </div>

                ${!estMaireDeCetteVille ? `
                    <div style="background:rgba(245,158,11,0.14); border:1px solid rgba(251,191,36,0.45); border-radius:10px; padding:12px;">
                        <div style="font-weight:bold; color:#fde68a; font-size:13px; margin-bottom:6px;">🗳️ Briguer le mandat de Maire</div>
                        <p style="font-size:12px; color:#fef3c7; margin:0 0 10px 0;">
                            Déposez une caution électorale de <strong>${CAUTION_MAIRE.toLocaleString("fr-FR")} Ø</strong> pour devenir Maire de <strong>${villeActuelle}</strong> et piloter la fiscalité et le tchat local.
                        </p>
                        <button type="button" id="btn-devenir-maire" style="width:100%; padding:10px; border-radius:8px; border:none; background:linear-gradient(90deg, #d97706, #fbbf24); color:#0f172a; font-weight:bold; font-size:13px; cursor:pointer;">
                            Se faire élire Maire (${CAUTION_MAIRE.toLocaleString("fr-FR")} Ø)
                        </button>
                    </div>
                ` : `
                    <div style="background:rgba(16,185,129,0.14); border:1px solid #10b981; border-radius:10px; padding:12px;">
                        <div style="font-weight:bold; color:#34d399; font-size:14px; margin-bottom:10px;">👑 Cabinet du Maire — Administration</div>
                        <label style="font-size:12px; color:#a7f3d0; display:block; margin-bottom:4px;">Taux d'imposition communal (5 % à 25 %) :</label>
                        <div style="display:flex; gap:8px; margin-bottom:10px;">
                            <input type="number" id="input-taxe-maire" min="5" max="25" value="${mairie.tauxTaxe || 15}" style="width:90px; padding:6px 8px; border-radius:6px; border:1px solid #34d399; background:#0f294a; color:#fff;">
                            <button type="button" id="btn-sauver-taxe" style="flex:1; padding:6px 10px; border-radius:6px; border:none; background:#059669; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">Appliquer le taux</button>
                        </div>
                        <button type="button" id="btn-demission-maire" style="width:100%; padding:7px; border-radius:6px; border:1px solid #f87171; background:rgba(185,28,28,0.35); color:#fecaca; font-size:12px; cursor:pointer;">
                            Quitter le mandat de Maire
                        </button>
                    </div>
                `}
            </div>

            <!-- COLONNE 2 : TCHAT GÉNÉRAL & TCHAT DE LA VILLE -->
            <div style="background:rgba(0, 35, 68, 0.85); border:1px solid rgba(56,189,248,0.4); border-radius:14px; padding:18px; display:flex; flex-direction:column; height:520px;">
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

    // ÉVÉNEMENTS
    document.getElementById("btn-changer-ville").onclick = () => {
        const val = document.getElementById("input-changer-ville").value.trim();
        if (!val) return;
        villeActuelle = val;
        localStorage.setItem("geoEmpireVilleActuelle", villeActuelle);
        initMairie();
    };

    const btnDevenirMaire = document.getElementById("btn-devenir-maire");
    if (btnDevenirMaire) {
        btnDevenirMaire.onclick = async () => {
            if ((e.argent || 0) < CAUTION_MAIRE) {
                return alert(`Trésorerie insuffisante (${(e.argent || 0).toLocaleString("fr-FR")} Ø disponibles sur ${CAUTION_MAIRE.toLocaleString("fr-FR")} Ø requis).`);
            }
            if (!confirm(`Verser ${CAUTION_MAIRE.toLocaleString("fr-FR")} Ø pour devenir Maire de ${villeActuelle} ?`)) return;

            e.argent -= CAUTION_MAIRE;
            saveData();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = e.argent.toLocaleString("fr-FR");

            const nouvelleMairie = {
                nomVille: villeActuelle,
                maire: pseudo,
                tauxTaxe: mairie.tauxTaxe || 15,
                budget: (mairie.budget || 50000) + CAUTION_MAIRE,
                dateElection: new Date().toLocaleDateString("fr-FR")
            };

            await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(nouvelleMairie)
            });

            ajouterHistorique(`👑 Élu Maire de ${villeActuelle} (-${CAUTION_MAIRE.toLocaleString("fr-FR")} Ø)`, "prestige");
            initMairie();
        };
    }

    const btnSauverTaxe = document.getElementById("btn-sauver-taxe");
    if (btnSauverTaxe) {
        btnSauverTaxe.onclick = async () => {
            const taux = Math.min(25, Math.max(5, Number(document.getElementById("input-taxe-maire").value) || 15));
            await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tauxTaxe: taux })
            });
            alert(`Taxe municipale de ${villeActuelle} fixée à ${taux} % !`);
            initMairie();
        };
    }

    const btnDemission = document.getElementById("btn-demission-maire");
    if (btnDemission) {
        btnDemission.onclick = async () => {
            if (!confirm(`Démissionner de votre poste de Maire de ${villeActuelle} ?`)) return;
            await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ maire: null })
            });
            initMairie();
        };
    }

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
