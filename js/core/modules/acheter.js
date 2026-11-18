// =======================================
// GEO EMPIRE — MODULE ACHETER (CIBLÉ PAR ENTREPRISE)
// =======================================

import { getEntreprise } from "../entrepriseCore.js";
import { getData, saveData, loadData } from "../geoData.js";

let filtreCategorie = "tous";
let siegeSelectionneId = null;

const CATALOGUE_DEFAUT = {
    "Restaurants": {
        secteur: "Alimentaire & Restauration",
        prixBase: 18000,
        styles: ["Food-Truck Équipé", "Bistrot de Quartier", "Brasserie Traditionnelle", "Restaurant Gastronomique", "Chaîne de Restauration"]
    },
    "Commerces": {
        secteur: "Alimentaire & Restauration",
        secteurAlt: "Commerce & Distribution",
        prixBase: 15000,
        styles: ["Kiosque Urbain", "Épicerie Fine", "Boutique Prêt-à-Porter", "Supérette de Proximité", "Hypermarché Régional"]
    },
    "Appartements": {
        secteur: "Bâtiment & Immobilier",
        prixBase: 25000,
        styles: ["Studio Étudiant", "T2 Centre-Ville", "T3 Familial", "Duplex Standing", "Penthouse Panoramique"]
    },
    "Maisons": {
        secteur: "Bâtiment & Immobilier",
        prixBase: 45000,
        styles: ["Pavillon de Banlieue", "Maison de Ville", "Villa Contemporaine", "Propriété avec Parc", "Domaine Prestige"]
    },
    "Bureaux": {
        secteur: "Bâtiment & Immobilier",
        secteurAlt: "Hôtellerie & Services",
        prixBase: 30000,
        styles: ["Espace Coworking", "Plateau Bureaux 150 m²", "Cabinet d'Affaires", "Immeuble Tertiaire", "Tour Siège Social"]
    },
    "Entrepôts": {
        secteur: "Commerce & Distribution",
        prixBase: 22000,
        styles: ["Box de Stockage", "Dépôt Artisanal", "Entrepôt Logistique", "Plateforme Frigorifique", "Hub Distribution"]
    },
    "Hôtels": {
        secteur: "Hôtellerie & Services",
        prixBase: 60000,
        styles: ["Auberge de Charme", "Hôtel 2 Étoiles", "Hôtel 3 Étoiles Affaires", "Hôtel 4 Étoiles Spa", "Palace 5 Étoiles"]
    }
};

function siegeAutoriseCategorie(siege, config) {
    if (!siege) return false;
    return siege.secteur === config.secteur || (config.secteurAlt && siege.secteur === config.secteurAlt);
}

export function initAcheter() {
    loadData();
    const e = getEntreprise();
    const sieges = e.commercesGPS || [];

    sieges.forEach((s, idx) => {
        if (s.id === undefined || s.id === null || s.id === "") {
            s.id = `siege_${Date.now()}_${idx}`;
        }
    });

    if (sieges.length > 0 && !sieges.some(s => String(s.id) === String(siegeSelectionneId))) {
        siegeSelectionneId = String(sieges[0].id);
    }

    const select = document.getElementById("filtre-acheter");
    if (select) {
        select.style.display = "block";
        select.innerHTML = `<option value="tous">Toutes les catégories</option>`;
        for (const categorie of Object.keys(CATALOGUE_DEFAUT)) {
            select.innerHTML += `<option value="${categorie}">${categorie}</option>`;
        }
        select.value = filtreCategorie;
        select.onchange = () => {
            filtreCategorie = select.value;
            afficherBiensDisponibles();
        };
    }

    afficherBiensDisponibles();
}

function afficherBiensDisponibles() {
    const container = document.getElementById("acheter");
    if (!container) return;
    container.innerHTML = "";

    const data = getData();
    const e = getEntreprise();
    const sieges = e.commercesGPS || [];
    const coef = [0.8, 1, 1.3, 1.7, 2.2];

    const panel = document.createElement("div");
    panel.className = "premium-panel";

    if (sieges.length === 0) {
        panel.innerHTML = `
            <h2 class="premium-title">Catalogue d'Acquisition des Biens</h2>
            <div class="premium-box" style="text-align:center;">
                <p>Vous devez d'abord acheter une entreprise sur la carte GPS pour y rattacher des biens.</p>
                <a href="carte.html" class="premium-btn" style="display:inline-block; text-decoration:none;">Ouvrir la Carte GPS</a>
            </div>
        `;
        container.appendChild(panel);
        return;
    }

    const siegeActif = sieges.find(s => String(s.id) === String(siegeSelectionneId)) || sieges[0];
    siegeSelectionneId = String(siegeActif.id);

    const optionsSiegesHTML = sieges.map(s =>
        `<option value="${String(s.id)}" ${String(s.id) === siegeSelectionneId ? "selected" : ""}>${s.nom} (${s.secteur})</option>`
    ).join("");

    panel.innerHTML = `
        <h2 class="premium-title">Catalogue d'Acquisition des Biens</h2>
        <div class="premium-box" style="margin-bottom:16px; border:1px solid #38bdf8;">
            <label style="font-weight:bold; color:#7ec8ff; display:block; margin-bottom:6px;">
                📍 Entreprise destinataire de l'achat :
            </label>
            <select id="select-siege-achat" style="width:100%; max-width:460px; padding:9px 12px; border-radius:8px; background:#0f294a; color:#fff; border:1px solid #38bdf8; font-weight:bold;">
                ${optionsSiegesHTML}
            </select>
        </div>
    `;

    for (const [categorie, config] of Object.entries(CATALOGUE_DEFAUT)) {
        if (filtreCategorie !== "tous" && filtreCategorie !== categorie) continue;

        const estDebloquee = siegeAutoriseCategorie(siegeActif, config);
        const secteurRequis = config.secteurAlt ? `${config.secteur} ou ${config.secteurAlt}` : config.secteur;

        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc premium-box";
        bloc.style.marginBottom = "18px";
        bloc.innerHTML = `<h3 style="color:#7ec8ff; margin-top:0;">${categorie} ${estDebloquee ? "✅" : "🔒"}</h3>`;

        if (!estDebloquee) {
            bloc.innerHTML += `
                <div style="padding:12px; background:rgba(0,0,0,0.35); border-radius:10px; font-size:14px;">
                    <span style="color:#fbbf24;">Non disponible pour <strong>${siegeActif.nom}</strong> (${siegeActif.secteur}).</span><br>
                    Secteur requis : <strong>${secteurRequis}</strong>.
                </div>
            `;
            panel.appendChild(bloc);
            continue;
        }

        config.styles.forEach((style, index) => {
            const multiplicateur = coef[index] || 1;
            const prix = Math.floor(config.prixBase * multiplicateur);

            const loyerBrut = Math.floor(prix * 0.02);
            const charges = Math.floor(loyerBrut * 0.10);
            const impotsMois = Math.floor(loyerBrut * 0.15);
            const rentabiliteNette = loyerBrut - charges - impotsMois;

            const stockActuel = siegeActif.biens?.[categorie]?.[style]?.quantite || 0;

            const item = document.createElement("div");
            item.className = "bien-item gestion-item";
            item.style.marginTop = "10px";

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <div class="bien-nom" style="font-weight:bold; font-size:16px; color:#fff;">
                        ${style}
                        ${stockActuel > 0 ? `<span style="background:rgba(52,211,153,0.2); color:#34d399; padding:2px 8px; border-radius:5px; font-size:12px; margin-left:8px;">Détenus ici : ${stockActuel}</span>` : ""}
                    </div>
                    <div class="bien-prix" style="font-weight:bold; color:#fbbf24;">Prix d'achat : ${prix.toLocaleString("fr-FR")} Ø</div>
                </div>

                <div style="display:flex; flex-wrap:wrap; gap:14px; font-size:13px; color:#cbd5e1; margin:6px 0 10px 0;">
                    <span>Revenu locatif estimé : <strong style="color:#38bdf8;">+${rentabiliteNette.toLocaleString("fr-FR")} Ø/cycle</strong></span>
                </div>

                <div class="achat-zone" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <input type="number" class="achat-input input-text" min="1" value="1" style="max-width:90px; padding:6px 10px; margin:0;">
                    <button type="button" class="achat-max-btn premium-btn" style="margin:0; padding:6px 12px; font-size:13px; background:#1e40af;">MAX</button>
                    <button type="button" class="achat-valider-btn premium-btn" style="margin:0; padding:6px 14px; font-size:13px; background:#059669;">Acheter pour ${siegeActif.nom}</button>
                </div>
            `;

            const input = item.querySelector(".achat-input");
            const btnMax = item.querySelector(".achat-max-btn");
            const btnValider = item.querySelector(".achat-valider-btn");

            btnMax.addEventListener("click", () => {
                const maxArgent = Math.max(1, Math.floor((data.entreprise.argent || 0) / prix));
                input.value = maxArgent;
            });

            btnValider.addEventListener("click", () => {
                const qte = parseInt(input.value, 10);
                if (isNaN(qte) || qte <= 0) return;
                const idActuel = document.getElementById("select-siege-achat")?.value || siegeSelectionneId;
                gererAchatCible(idActuel, categorie, style, prix, qte);
            });

            bloc.appendChild(item);
        });

        panel.appendChild(bloc);
    }

    container.appendChild(panel);

    document.getElementById("select-siege-achat").onchange = ev => {
        siegeSelectionneId = ev.target.value;
        afficherBiensDisponibles();
    };
}

function gererAchatCible(siegeId, categorie, style, prix, quantiteAchetee) {
    loadData();
    const data = getData();
    const entreprise = data.entreprise;
    const siege = (entreprise.commercesGPS || []).find(s => String(s.id) === String(siegeId));

    if (!siege) {
        alert("Erreur : entreprise introuvable.");
        return;
    }

    const coutTotal = quantiteAchetee * prix;
    if ((entreprise.argent || 0) < coutTotal) {
        alert(`Fonds insuffisants ! Il vous faut ${coutTotal.toLocaleString("fr-FR")} Ø.`);
        return;
    }

    entreprise.argent -= coutTotal;

    if (!siege.biens || typeof siege.biens !== "object") siege.biens = {};
    if (!siege.biens[categorie] || typeof siege.biens[categorie] !== "object") siege.biens[categorie] = {};
    if (!siege.biens[categorie][style]) {
        siege.biens[categorie][style] = { quantite: 0, prixAchatMoyen: 0, enLocation: 0, ajustementLoyer: 0 };
    }

    const bienSiege = siege.biens[categorie][style];
    const totalAncienS = (bienSiege.prixAchatMoyen || 0) * (bienSiege.quantite || 0);
    bienSiege.quantite = (bienSiege.quantite || 0) + quantiteAchetee;
    bienSiege.prixAchatMoyen = (totalAncienS + coutTotal) / bienSiege.quantite;

    if (!entreprise.biens || typeof entreprise.biens !== "object") entreprise.biens = {};
    if (!entreprise.biens[categorie]) entreprise.biens[categorie] = {};
    if (!entreprise.biens[categorie][style]) {
        entreprise.biens[categorie][style] = { quantite: 0, prixAchatMoyen: 0 };
    }
    const bienGlobal = entreprise.biens[categorie][style];
    const totalAncienG = (bienGlobal.prixAchatMoyen || 0) * (bienGlobal.quantite || 0);
    bienGlobal.quantite = (bienGlobal.quantite || 0) + quantiteAchetee;
    bienGlobal.prixAchatMoyen = (totalAncienG + coutTotal) / bienGlobal.quantite;

    const auteur = entreprise.utilisateurActif || entreprise.pdg || "Fondateur";
    if (!Array.isArray(entreprise.historique)) entreprise.historique = [];
    entreprise.historique.unshift({
        date: new Date().toLocaleString("fr-FR"),
        auteur,
        message: `[${siege.nom}] Achat de ${quantiteAchetee}× ${style} (${categorie}) pour ${coutTotal.toLocaleString("fr-FR")} Ø`,
        type: "achat"
    });

    saveData();

    const soldeEl = document.getElementById("solde");
    if (soldeEl) soldeEl.textContent = entreprise.argent.toLocaleString("fr-FR");

    alert(`Achat confirmé pour "${siege.nom}" : ${quantiteAchetee}× ${style} (-${coutTotal.toLocaleString("fr-FR")} Ø) !`);
    afficherBiensDisponibles();
}

window.initAcheter = initAcheter;
