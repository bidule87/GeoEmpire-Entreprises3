import { 
    getEntreprise, 
    sauvegarderEntreprise, 
    changerNomEntreprise, 
    changerPhotoEntreprise, 
    calculerValeurEntreprise 
} from "../core/entrepriseCore.js";

// AJOUT — Import des modules Marketing + Gestion
import { initMarketing } from "./marketing.js";
import { initGestion } from "./gestion.js";

export function initEntreprise() {
    const zone = document.getElementById("entreprise");
    const e = getEntreprise();

    zone.innerHTML = `
        <h2>Informations de l'entreprise</h2>

        <div class="entreprise-bloc">

            <div class="entreprise-photo-section">
                <img src="${e.logo}" class="entreprise-photo" id="entreprise-photo">
                <button id="btn-photo" class="action-btn">Changer la photo</button>
                <input type="file" id="upload-photo" accept="image/*" style="display:none;">
            </div>

            <div class="entreprise-infos">
                <label>Nom de l'entreprise :</label>
                <input type="text" id="nom-entreprise" value="${e.nom}" class="input-text">

                <p><strong>Type :</strong> ${e.type}</p>
                <p><strong>Budget :</strong> ${e.argent.toLocaleString()} €</p>
                <p><strong>Valeur totale :</strong> ${calculerValeurEntreprise().toLocaleString()} €</p>

                <p><strong>Date de création :</strong> 
                    ${new Date(e.dateCreation).toLocaleDateString()}
                </p>

                <button id="btn-save-nom" class="action-btn btn-louer">Enregistrer le nom</button>
            </div>

        </div>
    `;

    // --- Changer le nom ---
    document.getElementById("btn-save-nom").onclick = () => {
        const nouveauNom = document.getElementById("nom-entreprise").value;
        changerNomEntreprise(nouveauNom);
        initEntreprise();
    };

    // --- Changer la photo ---
    document.getElementById("btn-photo").onclick = () => {
        document.getElementById("upload-photo").click();
    };

    document.getElementById("upload-photo").onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = () => {
            changerPhotoEntreprise(reader.result);
            initEntreprise();
        };

        reader.readAsDataURL(file);
    };

    // AJOUT — Initialisation automatique des modules Marketing + Gestion
    if (document.getElementById("marketing")) {
        initMarketing();
    }

    if (document.getElementById("gestion")) {
        initGestion();
    }
}
