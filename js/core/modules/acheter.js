// =======================================
// GEO EMPIRE — MODULE ACHETER (CATALOGUE LIÉ AU GPS)
// =======================================

import { getEntreprise } from "../entrepriseCore.js";
import { getData, saveData, addBien } from "../geoData.js";

let filtreCategorie = "tous";

const CATALOGUE_DEFAUT = {
    "Restaurants": {
        prixBase: 18000,
        styles: ["Food-Truck Équipé", "Bistrot de Quartier", "Brasserie Traditionnelle", "Restaurant Gastronomique", "Chaîne de Restauration"]
    },
    "Commerces": {
        prixBase: 15000,
        styles: ["Kiosque Urbain", "Épicerie Fine", "Boutique Prêt-à-Porter", "Supérette de Proximité", "Hypermarché Régional"]
    },
    "Appartements": {
        prixBase: 25000,
        styles: ["Studio Étudiant", "T2 Centre-Ville", "T3 Familial", "Duplex Standing", "Penthouse Panoramique"]
    },
    "Maisons": {
        prixBase: 45000,
        styles: ["Pavillon de Banlieue", "Maison de Ville", "Villa Contemporaine", "Propriété avec Parc", "Domaine Prestige"]
    },
    "Bureaux": {
        prixBase: 30000,
        styles: ["Espace Coworking", "Plateau Bureaux 150 m²", "Cabinet d'Affaires", "Immeuble Tertiaire", "Tour Siège Social"]
    },
    "Entrepôts": {
        prixBase: 22000,
        styles: ["Box de Stockage", "Dépôt Artisanal", "Entrepôt Logistique", "Plateforme Frigorifique", "Hub Distribution"]
    },
    "Hôtels": {
        prixBase: 60000,
        styles: ["Auberge de Charme", "Hôtel 2 Étoiles", "Hôtel 3 Étoiles Affaires", "Hôtel 4 Étoiles Spa", "Palace 5 Étoiles"]
    }
};

const CATEGORIE_VERS_SECTEUR = {
    "Restaurants": "Alimentaire & Restauration",
    "Commerces": "Alimentaire & Restauration ou Commerce & Distribution",
    "Appartements": "Bâtiment & Immobilier",
    "Maisons": "Bâtiment & Immobilier",
    "Bureaux": "Bâtiment & Immobilier ou Hôtellerie & Services",
    "Entrepôts": "Commerce & Distribution",
    "Hôtels": "Hôtellerie & Services"
};

function getCategoriesDebloquees() {
    const sieges = getEntreprise().commercesGPS || [];
    const secteurs = new Set(sieges.map(s => s.secteur));
    const autorisees = new Set();

    if (secteurs.has("Alimentaire & Restauration")) {
        autorisees.add("Restaurants");
        autorisees.add("Commerces");
    }
    if (secteurs.has("Bâtiment & Immobilier")) {
        autorisees.add("Appartements");
        autorisees.add("Maisons");
        autorisees.add("Bureaux");
    }
    if (secteurs.has("Commerce & Distribution")) {
        autorisees.add("Commerces");
        autorisees.add("Entrepôts");
    }
    if (secteurs.has("Hôtellerie & Services")) {
        autorisees.add("Hôtels");
        autorisees.add("Bureaux");
    }
    return autorisees;
}

export function initAcheter() {
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
    const debloquees = getCategoriesDebloquees();
    const chargesTable = data.entreprise.charges || {};
    const impots = data.entreprise.impotsVente || 0.05;
    const coef = [0.8, 1, 1.3, 1.7, 2.2];

    const panel = document.createElement("div");
    panel.className = "premium-panel";
    panel.innerHTML = `
        <h2 class="premium-title">Catalogue d'Acquisition des Biens</h2>
        <p style="font-size:14px; color:#bae6fd; margin-bottom:14px;">
            Les catégories disponibles dépendent des secteurs de vos entreprises achetées sur la Carte GPS.
        </p>
    `;

    for (const [categorie, config] of Object.entries(CATALOGUE_DEFAUT)) {
        if (filtreCategorie !== "tous" && filtreCategorie !== categorie) continue;

        const estDebloquee = debloquees.has(categorie);
        const secteurRequis = CATEGORIE_VERS_SECTEUR[categorie] || "un secteur adapté";

        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc premium-box";
        bloc.style.marginBottom = "18px";
        bloc.innerHTML = `<h3 style="color:#7ec8ff; margin-top:0;">${categorie} ${estDebloquee ? "✅" : "🔒"}</h3>`;

        if (!estDebloquee) {
            bloc.innerHTML += `
                <div style="text-align:center; padding:14px; background:rgba(0,0,0,0.35); border-radius:10px;">
                    <p style="margin:0 0 10px 0; color:#fbbf24;">Secteur requis : <strong>${secteurRequis}</strong></p>
                    <a href="carte.html" class="premium-btn" style="display:inline-block; text-decoration:none; margin:0;">Acquérir un siège sur la Carte GPS</a>
                </div>
            `;
            panel.appendChild(bloc);
            continue;
        }

        config.styles.forEach((style, index) => {
            const multiplicateur = coef[index] || 1;
            const prix = Math.floor(config.prixBase * multiplicateur);

            const loyer = Math.floor(prix * 0.02);
            const charges = Math.floor(prix * (chargesTable[categorie] || 0.002));
            const impotsMois = Math.floor((prix * impots) / 12);
            const rentabilite = loyer - charges - impotsMois;

            const item = document.createElement("div");
            item.className = "bien-item gestion-item";
            item.style.marginTop = "10px";

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                    <div class="bien-nom" style="font-weight:bold; font-size:16px; color:#fff;">${style}</div>
                    <div class="bien-prix" style="font-weight:bold; color:#fbbf24;">Prix unitaire : ${prix.toLocaleString("fr-FR")} Ø</div>
                </div>

                <div style="display:flex; flex-wrap:wrap; gap:14px; font-size:13px; color:#cbd5e1; margin:6px 0 10px 0;">
                    <span>Loyer : <strong style="color:#34d399;">+${loyer.toLocaleString("fr-FR")} Ø/mois</strong></span>
                    <span>Charges & impôts : -${(charges + impotsMois).toLocaleString("fr-FR")} Ø/mois</span>
                    <span>Net : <strong style="color:#38bdf8;">+${rentabilite.toLocaleString("fr-FR")} Ø/mois</strong></span>
                </div>

                <div class="achat-zone" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <input type="number" class="achat-input input-text" min="1" value="1" style="max-width:90px; padding:6px 10px; margin:0;">
                    <button class="achat-max-btn premium-btn" style="margin:0; padding:6px 12px; font-size:13px; background:#1e40af;">MAX</button>
                    <button class="achat-valider-btn premium-btn" style="margin:0; padding:6px 14px; font-size:13px; background:#059669;">Acheter</button>
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
                gererAchat(categorie, style, prix, qte);
            });

            bloc.appendChild(item);
        });

        panel.appendChild(bloc);
    }

    container.appendChild(panel);
}

function gererAchat(categorie, style, prix, quantiteAchetee) {
    const data = getData();
    const entreprise = data.entreprise;
    const coutTotal = quantiteAchetee * prix;

    if ((entreprise.argent || 0) < coutTotal) {
        alert(`Fonds insuffisants ! Il vous faut ${coutTotal.toLocaleString("fr-FR")} Ø.`);
        return;
    }

    entreprise.argent -= coutTotal;

    for (let i = 0; i < quantiteAchetee; i++) {
        addBien(categorie, style, prix);
    }

    saveData();

    const soldeEl = document.getElementById("solde");
    if (soldeEl) soldeEl.textContent = entreprise.argent.toLocaleString("fr-FR");

    alert(`Achat confirmé : ${quantiteAchetee}× ${style} pour ${coutTotal.toLocaleString("fr-FR")} Ø !`);
    afficherBiensDisponibles();
}

window.initAcheter = initAcheter;
