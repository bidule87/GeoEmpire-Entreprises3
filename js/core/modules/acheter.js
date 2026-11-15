// =======================================
// GEO EMPIRE — MODULE ACHETER (OPTION C)
// Lié aux sièges achetés sur la Carte GPS
// =======================================

import { getEntreprise } from "../entrepriseCore.js";
import { getData, saveData, addBien } from "../geoData.js";
import { immoState, refreshSiNecessaire } from "./immo-core.js";

let filtreCategorie = "tous";

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
    refreshSiNecessaire();

    const select = document.getElementById("filtre-acheter");
    select.style.display = "block";

    select.innerHTML = `<option value="tous">Tous</option>`;
    for (const categorie in immoState.styles) {
        select.innerHTML += `<option value="${categorie}">${categorie}</option>`;
    }

    select.onchange = () => {
        filtreCategorie = select.value;
        afficherBiensDisponibles();
    };

    const btnExport = document.getElementById("export-acheter");
    const data = getData();
    const prestige = data.entreprise?.prestigePack === true;

    btnExport.style.display = prestige ? "block" : "none";
    btnExport.onclick = () => exporterAcheter();

    afficherBiensDisponibles();
}

function afficherBiensDisponibles() {
    const container = document.getElementById("acheter");
    container.innerHTML = "";

    const data = getData();
    const debloquees = getCategoriesDebloquees();

    const prixMarche = data.entreprise.prixMarche || {
        "Appartements": 200000,
        "Maisons": 300000,
        "Commerces": 150000,
        "Bureaux": 250000,
        "Entrepôts": 180000,
        "Hôtels": 400000,
        "Restaurants": 220000
    };

    const chargesTable = data.entreprise.charges || {};
    const impots = data.entreprise.impotsVente || 0.05;

    for (const categorie in immoState.styles) {
        if (filtreCategorie !== "tous" && filtreCategorie !== categorie) continue;

        const estDebloquee = debloquees.has(categorie);
        const secteurRequis = CATEGORIE_VERS_SECTEUR[categorie] || "un secteur adapté";

        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc";
        bloc.innerHTML = `<h2>${categorie} ${estDebloquee ? "" : "🔒"}</h2>`;

        if (!estDebloquee) {
            bloc.innerHTML += `
                <div style="text-align:center; padding:15px; background:rgba(0,0,0,0.35); border-radius:10px;">
                    <p style="margin:0 0 10px 0; color:#fbbf24;">Secteur requis : <strong>${secteurRequis}</strong></p>
                    <a href="carte.html" class="premium-btn" style="display:inline-block; text-decoration:none;">Acheter un siège sur la Carte GPS</a>
                </div>
            `;
            container.appendChild(bloc);
            continue;
        }

        const prixBase = prixMarche[categorie];
        if (!prixBase) continue;

        const coef = [0.8, 1, 1.2, 1.5, 2];

        immoState.styles[categorie].forEach((style, index) => {
            const quantite = immoState.quantites[categorie][style];
            const multiplicateur = coef[index] || coef[coef.length - 1];
            const prix = Math.floor(prixBase * multiplicateur);

            const loyer = Math.floor(prix * 0.015);
            const charges = Math.floor(prix * (chargesTable[categorie] || 0));
            const impotsMois = Math.floor((prix * impots) / 12);
            const rentabilite = loyer - charges - impotsMois;

            const item = document.createElement("div");
            item.className = "bien-item";

            item.innerHTML = `
                <div class="bien-nom">${style}</div>
                <div class="bien-quantite">Stock : ${quantite.toLocaleString()}</div>
                <div class="bien-prix">Prix : ${prix.toLocaleString()} Ø</div>

                <div class="bien-loyer">Loyer : ${loyer.toLocaleString()} Ø / mois</div>
                <div class="bien-charges">Charges : ${charges.toLocaleString()} Ø / mois</div>
                <div class="bien-impots">Impôts : ${impotsMois.toLocaleString()} Ø / mois</div>
                <div class="bien-rentabilite">Rentabilité nette : ${rentabilite.toLocaleString()} Ø / mois</div>

                <div class="achat-zone">
                    <input type="number" class="achat-input" min="1" placeholder="Quantité">
                    <button class="achat-max-btn">MAX</button>
                    <button class="achat-valider-btn">Acheter</button>
                </div>
            `;

            const input = item.querySelector(".achat-input");
            const btnMax = item.querySelector(".achat-max-btn");
            const btnValider = item.querySelector(".achat-valider-btn");

            btnMax.addEventListener("click", () => {
                const argent = data.entreprise.argent;
                const maxArgent = Math.floor(argent / prix);
                const maxPossible = Math.min(maxArgent, quantite);
                input.value = maxPossible;
            });

            btnValider.addEventListener("click", () => {
                const qte = parseInt(input.value);
                if (isNaN(qte) || qte <= 0) return;

                gererAchat(categorie, style, prix, quantite, qte);
            });

            bloc.appendChild(item);
        });

        container.appendChild(bloc);
    }
}

function gererAchat(categorie, style, prix, quantiteDisponible, quantiteAchetee) {
    const data = getData();
    const entreprise = data.entreprise;

    quantiteAchetee = Math.min(quantiteAchetee, quantiteDisponible);
    if (quantiteAchetee <= 0) return;

    const coutTotal = quantiteAchetee * prix;

    if (entreprise.argent < coutTotal) {
        alert("Fonds insuffisants !");
        return;
    }

    entreprise.argent -= coutTotal;

    for (let i = 0; i < quantiteAchetee; i++) {
        addBien(categorie, style, prix);
    }

    immoState.quantites[categorie][style] -= quantiteAchetee;
    localStorage.setItem("immoState", JSON.stringify(immoState));

    saveData();
    afficherBiensDisponibles();

    if (window.ge_afficherBilan) window.ge_afficherBilan();
}

function exporterAcheter() {
    let lignes = [];
    const data = getData();
    const prixMarche = data.entreprise.prixMarche || {};
    const coef = [0.8, 1, 1.2, 1.5, 2];

    for (const categorie in immoState.styles) {
        const prixBase = prixMarche[categorie] || 0;

        immoState.styles[categorie].forEach((style, index) => {
            const quantite = immoState.quantites[categorie][style];
            const multiplicateur = coef[index] || coef[coef.length - 1];
            const prix = Math.floor(prixBase * multiplicateur);

            lignes.push({ categorie, style, quantite, prix });
        });
    }

    let csv = "Catégorie;Style;Stock;Prix\n";
    lignes.forEach(l => {
        csv += `${l.categorie};${l.style};${l.quantite};${l.prix}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "geo_empire_achat_export.csv";
    a.click();

    URL.revokeObjectURL(url);
}

window.initAcheter = initAcheter;
