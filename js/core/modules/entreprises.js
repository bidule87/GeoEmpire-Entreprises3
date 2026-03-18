import { 
    getEntreprise, 
    sauvegarderEntreprise, 
    changerNomEntreprise, 
    changerPhotoEntreprise, 
    calculerValeurEntreprise 
} from "../entrepriseCore.js";

import { initMarketing } from "./marketing.js";
import { initGestion } from "./gestion.js";

export function initEntreprise() {
    const zone = document.getElementById("entreprise");
    const e = getEntreprise();

    zone.innerHTML = `
        <h2>Informations de l'entreprise</h2>

        <div class="entreprise-menu">
            <button id="btn-marketing" class="menu-btn">Marketing</button>
            <button id="btn-gestion" class="menu-btn">Gestion</button>
        </div>

        <div class="entreprise-bloc">

            <div class="entreprise-photo-section">

                <div class="entreprise-photo-frame">
                    <img src="${e.logo}" class="entreprise-photo" id="entreprise-photo">
                </div>

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

        <!-- ⭐ ZONE MARKETING ⭐ -->
        <div id="marketing" class="section" style="display:none;"></div>

        <!-- ⭐ ZONE GESTION ⭐ -->
        <div id="gestion" class="section" style="display:none;"></div>
    `;

    // ===============================
    //  SAUVEGARDE DU NOM
    // ===============================
    document.getElementById("btn-save-nom").onclick = () => {
        const nouveauNom = document.getElementById("nom-entreprise").value;
        changerNomEntreprise(nouveauNom);
        initEntreprise();
    };

    // ===============================
    //  PHOTO
    // ===============================
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

    // ===============================
    //  ONGLET MARKETING
    // ===============================
    document.getElementById("btn-marketing").onclick = () => {
        document.querySelectorAll(".section").forEach(sec => sec.style.display = "none");
        document.getElementById("marketing").style.display = "block";
        initMarketing();
    };

    // ===============================
    //  ONGLET GESTION
    // ===============================
    document.getElementById("btn-gestion").onclick = () => {
        document.querySelectorAll(".section").forEach(sec => sec.style.display = "none");
        document.getElementById("gestion").style.display = "block";
        initGestion();
    };
}

// ⭐ ESSENTIEL POUR L’APPEL GLOBAL ⭐
window.initEntreprise = initEntreprise;
