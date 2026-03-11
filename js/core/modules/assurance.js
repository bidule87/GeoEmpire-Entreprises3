import { 
    getEntreprise, 
    sauvegarderEntreprise 
} from "./entreprises.js";

const ASSURANCES = {
    "Basique": { couverture: 0, braquage: false, coutMultiplicateur: 0.01 },
    "Standard": { couverture: 0, braquage: false, coutMultiplicateur: 0.02 },
    "Premium": { couverture: 70, braquage: false, coutMultiplicateur: 0.05 },
    "Totale": { couverture: 100, braquage: false, coutMultiplicateur: 0.08 },
    "Prestige Ultime": { couverture: 120, braquage: true, coutMultiplicateur: 0.03, prestigeOnly: true }
};

export function initAssurance() {
    afficherBiensAssurables();
}

function afficherBiensAssurables() {
    const entreprise = getEntreprise();
    const container = document.getElementById("assurance"); // ✔ corrigé
    container.innerHTML = "";

    for (const categorie in entreprise.biens) {
        const bloc = document.createElement("div");
        bloc.className = "categorie-bloc";
        bloc.innerHTML = `<h2>${categorie}</h2>`;

        for (const style in entreprise.biens[categorie]) {
            const bien = entreprise.biens[categorie][style];

            const item = document.createElement("div");
            item.className = "bien-item";

            item.innerHTML = `
                <div class="bien-nom">${style}</div>
                <div class="bien-quantite">Quantité : ${bien.quantite}</div>
                <div class="bien-prix">Prix moyen : ${bien.prixAchatMoyen.toLocaleString()} €</div>

                <div class="assurance-options">
                    ${genererBoutonsAssurance()}
                </div>
            `;

            bloc.appendChild(item);
        }

        container.appendChild(bloc);
    }
}

function genererBoutonsAssurance() {
    let html = "";

    for (const nom in ASSURANCES) {
        const a = ASSURANCES[nom];

        if (a.prestigeOnly && !localStorage.getItem("prestigePack")) continue;

        html += `
            <button class="assurance-btn" data-type="${nom}">
                ${nom} (${a.couverture}%)
            </button>
        `;
    }

    return html;
}

document.addEventListener("click", e => {
    if (!e.target.classList.contains("assurance-btn")) return;

    const type = e.target.dataset.type;
    const a = ASSURANCES[type];

    const entreprise = getEntreprise();

    const item = e.target.closest(".bien-item");
    const style = item.querySelector(".bien-nom").textContent;
    const categorie = item.closest(".categorie-bloc").querySelector("h2").textContent;

    const bien = entreprise.biens[categorie][style];

    const coutUnitaire = Math.floor(bien.prixAchatMoyen * a.coutMultiplicateur);

    if (entreprise.argent < coutUnitaire) {
        alert("Fonds insuffisants !");
        return;
    }

    entreprise.argent -= coutUnitaire;

    bien.assurance = {
        type: type,
        couverture: a.couverture,
        braquage: a.braquage
    };

    sauvegarderEntreprise(entreprise);

    alert(`Assurance "${type}" appliquée à ${style}`);
});
