// =======================================
// GEO EMPIRE — MODULE PERSONNEL
// =======================================

import {
    getEntreprise,
    sauvegarderEntreprise
} from "../entrepriseCore.js";

import { saveData } from "../geoData.js";

export function initPersonnel() {
    const zone = document.getElementById("personnel");
    const e = getEntreprise();

    // Création si inexistant
    if (!e.personnel) {
        e.personnel = {
            nom: "Joueur",
            poste: "Directeur Général",
            prime: 0
        };
        sauvegarderEntreprise(e);
        saveData();
    }

    const p = e.personnel;

    // 🔵 RÉCUPÉRATION DU PATRIMOINE + CALCUL DES 10 %
    const patrimoine = e.patrimoineGlobal || 0;
    const primeMax = Math.floor(patrimoine * 0.10);

    // === HTML SANS SALAIRE ===
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

            <label>Prime :</label>
            <div class="prime-ligne">
                <input type="number" id="perso-prime" class="input-text" value="${p.prime}">
                <button id="prime-max" class="action-btn btn-louer" style="margin-left:10px;">→</button>
            </div>

            <p class="prime-info">Maximum autorisé : ${primeMax} €</p>

            <button id="perso-save" class="action-btn btn-louer">Enregistrer</button>
        </div>
    `;

    // 🔵 BOUTON → POUR METTRE LE MAX
    const primeMaxBtn = document.getElementById("prime-max");
    if (primeMaxBtn) {
        primeMaxBtn.onclick = () => {
            document.getElementById("perso-prime").value = primeMax;
        };
    }

    // === SAUVEGARDE ===
    document.getElementById("perso-save").onclick = () => {
        p.nom = document.getElementById("perso-nom").value;
        p.poste = document.getElementById("perso-poste").value;
        p.prime = parseInt(document.getElementById("perso-prime").value);

        sauvegarderEntreprise(e);
        saveData();

        initPersonnel();
    };
}

window.initPersonnel = initPersonnel;
