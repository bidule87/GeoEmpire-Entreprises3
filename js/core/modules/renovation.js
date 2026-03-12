// =======================================
// GEO EMPIRE — MODULE RENOVATION
// Compatible geoData + entrepriseCore
// =======================================

import { 
    getEntreprise, 
    sauvegarderEntreprise 
} from "../core/entrepriseCore.js";

import { saveData } from "../geoData.js";

const RENOVATIONS = {
    1: { nom: "Rénové", bonus: 0.10, cout: 0.05 },
    2: { nom: "Amélioré", bonus: 0.25, cout: 0.12 },
    3: { nom: "Premium", bonus: 0.50, cout: 0.20 },
    4: { nom: "Luxe", bonus: 0.80, cout: 0.35 },
    5: { nom: "Ultime", bonus: 1.20, cout: 0.50, prestigeOnly: true }
};

export function initRenovation() {
    afficherBiensARenover();
}

function afficherBiensARenover() {
    const entreprise = getEntreprise();
    const container = document.getElementById("renovation");
    container.innerHTML = "";

    for (const categorie in entreprise.biens) {
        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        for (const style in entreprise.biens[categorie]) {
            const bien = entreprise.biens[categorie][style];

            if (!bien.renovation) {
                bien.renovation = { niveau: 0, bonusValeur: 0 };
            }

            const item = document.createElement("div");
            item.className = "bien-item";

            item.innerHTML = `
                <div class="bien-nom">${style}</div>
                <div class="bien-quantite">Quantité : ${bien.quantite}</div>
                <div class="bien-prix">Prix moyen : ${bien.prixAchatMoyen.toLocaleString()} €</div>
                <div class="bien-renovation">Niveau actuel : ${bien.renovation.niveau}</div>

                <div class="renovation-options">
                    ${genererBoutonsRenovation(bien)}
                </div>
            `;

            bloc.appendChild(item);
        }

        container.appendChild(bloc);
    }

    sauvegarderEntreprise(entreprise);
    saveData();
}

function genererBoutonsRenovation(bien) {
    let html = "";

    for (const niveau in RENOVATIONS) {
        const r = RENOVATIONS[niveau];

        if (r.prestigeOnly && !localStorage.getItem("prestigePack")) continue;
        if (bien.renovation.niveau >= niveau) continue;

        html += `
            <button class="renovation-btn" data-niveau="${niveau}">
                Niveau ${niveau} - ${r.nom}
            </button>
        `;
    }

    return html;
}

document.addEventListener("click", e => {
    if (!e.target.classList.contains("renovation-btn")) return;

    const niveau = parseInt(e.target.dataset.niveau);
    const r = RENOVATIONS[niveau];

    const entreprise = getEntreprise();

    const item = e.target.closest(".bien-item");
    const style = item.querySelector(".bien-nom").textContent;
    const categorie = item.closest(".categorie-bloc").querySelector("h2").textContent;

    const bien = entreprise.biens[categorie][style];

    const coutUnitaire = Math.floor(bien.prixAchatMoyen * r.cout);

    if (entreprise.argent < coutUnitaire) {
        alert("Fonds insuffisants !");
        return;
    }

    entreprise.argent -= coutUnitaire;

    bien.renovation = {
        niveau: niveau,
        bonusValeur: r.bonus
    };

    sauvegarderEntreprise(entreprise);
    saveData();

    alert(`Rénovation niveau ${niveau} appliquée à ${style}`);
});
