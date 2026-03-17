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

    // Afficher le select
    const select = document.getElementById("filtre-acheter");
    select.style.display = "block";

    // Remplir le select avec les catégories réelles
    select.innerHTML = `<option value="tous">Tous</option>`;
    for (const categorie in immoState.styles) {
        select.innerHTML += `<option value="${categorie}">${categorie}</option>`;
    }

    // Gestion du filtre
    select.onchange = () => {
        filtreCategorie = select.value;
        afficherBiensDisponibles();
    };

    afficherBiensDisponibles();
}

function afficherBiensDisponibles() {
    const container = document.getElementById("acheter");
    container.innerHTML = "";

    for (const categorie in immoState.styles) {

        // Filtre actif
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

window.initAcheter = initAcheter;
