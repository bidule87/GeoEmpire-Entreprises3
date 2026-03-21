// =======================================
// GEO EMPIRE — MODULE ACHETER
// Compatible geoData + entrepriseCore
// =======================================

import { getEntreprise } from "../entrepriseCore.js";
import { getData, saveData, addBien } from "../geoData.js";
import { immoState, refreshSiNecessaire } from "./immo-core.js";

let filtreCategorie = "tous";

export function initAcheter() {
    refreshSiNecessaire();

    const select = document.getElementById("filtre-acheter");
    if (!select) return;

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

    if (btnExport) {
        btnExport.style.display = prestige ? "block" : "none";
        btnExport.onclick = () => exporterAcheter();
    }

    afficherBiensDisponibles();
}

function afficherBiensDisponibles() {
    const container = document.getElementById("acheter");
    container.innerHTML = "";

    const data = getData();

    // 🔥 Sécurisation prixMarche
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

        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        const prixCategorie = prixMarche[categorie];
        if (!prixCategorie) continue; // sécurité

        const coefParIndex = [0.8, 1, 1.2, 1.5, 2];

        immoState.styles[categorie].forEach((style, index) => {
            const quantite = immoState.quantites[categorie][style];

            const coef = coefParIndex[index] || coefParIndex[coefParIndex.length - 1];
            const prix = Math.floor(prixCategorie * coef);

            const loyer = Math.floor(prix * 0.015);
            const charges = Math.floor(prix * (chargesTable[categorie] || 0));
            const impotsMois = Math.floor((prix * impots) / 12);
            const rentabilite = loyer - charges - impotsMois;

            const item = document.createElement("div");
            item.className = "bien-item";

            item.innerHTML = `
                <div class="bien-nom">${style}</div>
                <div class="bien-quantite">Stock : ${quantite.toLocaleString()}</div>
                <div class="bien-prix">Prix : ${prix.toLocaleString()} €</div>

                <div class="bien-loyer">Loyer : ${loyer.toLocaleString()} € / mois</div>
                <div class="bien-charges">Charges : ${charges.toLocaleString()} € / mois</div>
                <div class="bien-impots">Impôts : ${impotsMois.toLocaleString()} € / mois</div>
                <div class="bien-rentabilite">Rentabilité nette : ${rentabilite.toLocaleString()} € / mois</div>

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

    for (const categorie in immoState.styles) {
        const prixBase = prixMarche[categorie] || 0;
        const coefParIndex = [0.8, 1, 1.2, 1.5, 2];

        immoState.styles[categorie].forEach((style, index) => {
            const quantite = immoState.quantites[categorie][style];
            const coef = coefParIndex[index] || coefParIndex[coefParIndex.length - 1];
            const prix = Math.floor(prixBase * coef);

            lignes.push({
                categorie,
                style,
                quantite,
                prix
            });
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
