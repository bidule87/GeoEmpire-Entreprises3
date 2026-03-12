import { getEntreprise, sauvegarderEntreprise } from "../entreprises.js";

export function initPersonnel() {
    const zone = document.getElementById("personnel");
    const e = getEntreprise();

    // Si le joueur n'existe pas encore, on le crée
    if (!e.personnel) {
        e.personnel = {
            nom: "Joueur",
            poste: "Directeur Général",
            salaire: 5000,
            prime: 0
        };
        sauvegarderEntreprise(e);
    }

    const p = e.personnel;

    zone.innerHTML = `
        <h2>Personnel</h2>

        <div class="perso-bloc">

            <label>Nom du joueur :</label>
            <input type="text" id="perso-nom" class="input-text" value="${p.nom}">

            <label>Poste :</label>
            <input type="text" id="perso-poste" class="input-text" value="${p.poste}">

            <label>Salaire mensuel :</label>
            <input type="number" id="perso-salaire" class="input-text" value="${p.salaire}">

            <label>Prime :</label>
            <input type="number" id="perso-prime" class="input-text" value="${p.prime}">

            <button id="perso-save" class="action-btn btn-louer">Enregistrer</button>
        </div>
    `;

    document.getElementById("perso-save").onclick = () => {
        p.nom = document.getElementById("perso-nom").value;
        p.poste = document.getElementById("perso-poste").value;
        p.salaire = parseInt(document.getElementById("perso-salaire").value);
        p.prime = parseInt(document.getElementById("perso-prime").value);

        sauvegarderEntreprise(e);
        initPersonnel();
    };
}
