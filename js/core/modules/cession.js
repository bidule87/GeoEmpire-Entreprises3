// =======================================
// GEO EMPIRE — MODULE CESSION
// Compatible geoData + entrepriseCore
// =======================================

import { 
    getEntreprise, 
    calculerValeurEntreprise, 
    peutCederEntreprise, 
    vendreEntreprise, 
    mettreEnCessation 
} from "../core/entrepriseCore.js";

import { saveData } from "../geoData.js";

export function initCession() {
    const zone = document.getElementById("cession");
    const e = getEntreprise();

    const valeur = calculerValeurEntreprise();
    const dispo = peutCederEntreprise();

    let joursRestants = 0;
    if (!dispo) {
        const tempsPasse = Date.now() - e.dateCreation;
        const tempsTotal = 30 * 24 * 60 * 60 * 1000;
        joursRestants = Math.ceil((tempsTotal - tempsPasse) / (24 * 60 * 60 * 1000));
    }

    zone.innerHTML = `
        <h2>Vente / Cession de l'entreprise</h2>

        <p><strong>Valeur totale :</strong> ${valeur.toLocaleString()} €</p>

        <div class="cession-bloc">

            <button id="btn-vendre" class="action-btn btn-vendre" ${!dispo ? "disabled" : ""}>
                Vendre l'entreprise
            </button>

            <button id="btn-cessation" class="action-btn btn-vendre" ${!dispo ? "disabled" : ""}>
                Mettre en cessation
            </button>

            ${!dispo ? `<p style="color:#f87171;">Disponible dans ${joursRestants} jours</p>` : ""}
        </div>
    `;

    if (dispo) {
        document.getElementById("btn-vendre").onclick = () => {
            const gain = vendreEntreprise();
            saveData();
            alert("Entreprise vendue ! Vous récupérez " + gain.toLocaleString() + " €");
            location.reload();
        };

        document.getElementById("btn-cessation").onclick = () => {
            mettreEnCessation();
            saveData();
            alert("Entreprise mise en cessation.");
            location.reload();
        };
    }
}
