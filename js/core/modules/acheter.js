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

    // --- FILTRE ---
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

    // --- EXPORT (Pack Prestige) ---
    const btnExport = document.getElementById("export-acheter");
    const data = getData();
    const prestige = data.entreprise?.prestigePack === true;

    btnExport.style.display = prestige ? "block" : "none";

    btnExport.onclick = () => {
        exporterAcheter();
    };

    afficherBiensDisponibles();
}

function afficherBiensDisponibles() {
    const container = document.getElementById("acheter");
    container.innerHTML = "";

    for (const categorie in immoState.styles) {

        if (filtreCategorie !== "tous" && filtreCategorie !== categorie) continue;

        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        immoState.styles[categorie].forEach(style => {
            const quantite = immoState.quantites[categorie][style];
            const prix = genererPrix(style);

            const item = document.createElement("div");
            item.className = "bien-item";

            item.innerHTML = `
                <div class="bien-nom">${style}</div>
                <div class="bien-quantite">Stock : ${quantite.toLocaleString()}</div>
                <div class="bien-prix">Prix : ${prix.toLocaleString()} €</div>

                <div class="achat-boutons">
                    <button data-qte="1">1</button>
                    <button data-qte="10">10</button>
                    <button data-qte="100">100</button>
                    <button data-qte="1000">1000</button>
                    <button data-qte="max-stock">MAX STOCK</button>
                    <button data-qte="max-argent">MAX ARGENT</button>
                </div>
            `;

            item.querySelectorAll("button").forEach(btn => {
                btn.addEventListener("click", () => {
                    gererAchat(categorie, style, prix, quantite, btn.dataset.qte);
                });
            });

            bloc.appendChild(item);
        });

        container.appendChild(bloc);
    }
}

function genererPrix(style) {
    if (style.includes("Penthouse")) return 500000;
    if (style.includes("Luxe")) return 300000;
    if (style.includes("Moderne")) return 200000;
    return 150000;
}

function gererAchat(categorie, style, prix, quantiteDisponible, typeAchat) {
    const data = getData();
    const entreprise = data.entreprise;

    let quantiteAchetee = 0;

    if (typeAchat === "max-stock") {
        quantiteAchetee = quantiteDisponible;
    } else if (typeAchat === "max-argent") {
        quantiteAchetee = Math.floor(entreprise.argent / prix);
    } else {
        quantiteAchetee = parseInt(typeAchat);
    }

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

// --- EXPORT CSV ---
function exporterAcheter() {
    let lignes = [];

    for (const categorie in immoState.styles) {
        immoState.styles[categorie].forEach(style => {
            const quantite = immoState.quantites[categorie][style];
            const prix = genererPrix(style);

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
