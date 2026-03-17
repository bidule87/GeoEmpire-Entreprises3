// =======================================
// GEO EMPIRE — MODULE PERSONNEL
// Compatible geoData + entrepriseCore
// =======================================

import { 
    getEntreprise, 
    sauvegarderEntreprise 
} from "../entrepriseCore.js";

import { saveData } from "../geoData.js";

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
        saveData();
    }

    const p = e.personnel;

    // === HTML AVEC MENU DÉROULANT ===
    zone.innerHTML = `
        <h2>Personnel</h2>

        <div class="perso-bloc">

            <label>Nom du joueur :</label>
            <input type="text" id="perso-nom" class="input-text" value="${p.nom}">

            <label>Poste :</label>
            <select id="perso-poste" class="input-text">
                <option value="PDG" ${p.poste === "PDG" ? "selected" : ""}>PDG</option>
                <option value="Directeur Général" ${p.poste === "Directeur Général" ? "selected" : ""}>Directeur Général</option>
                <option value="Directeur Commercial" ${p.poste === "Directeur Commercial" ? "selected" : ""}>Directeur Commercial</option>
            </select>

            <label>Salaire mensuel :</label>
            <input type="number" id="perso-salaire" class="input-text" value="${p.salaire}">

            <label>Prime :</label>
            <input type="number" id="perso-prime" class="input-text" value="${p.prime}">

            <button id="perso-save" class="action-btn btn-louer">Enregistrer</button>
        </div>
    `;

    // === SAUVEGARDE ===
    document.getElementById("perso-save").onclick = () => {
        p.nom = document.getElementById("perso-nom").value;
        p.poste = document.getElementById("perso-poste").value; // <-- MENU DÉROULANT
        p.salaire = parseInt(document.getElementById("perso-salaire").value);
        p.prime = parseInt(document.getElementById("perso-prime").value);

        sauvegarderEntreprise(e);
        saveData();

        initPersonnel();
    };
}

window.initPersonnel = initPersonnel;
