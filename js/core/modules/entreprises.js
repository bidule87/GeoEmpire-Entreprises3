import { 
    getEntreprise, 
    changerNomEntreprise, 
    changerPhotoEntreprise, 
    calculerValeurEntreprise 
} from "../entrepriseCore.js";

export function initEntreprise() {
    const e = getEntreprise();
    const zone = document.getElementById("entreprise");

    zone.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Entreprise</h2>

            <div class="premium-box">

                <div class="entreprise-photo-section">
                    <img src="${e.logo}" class="entreprise-photo" id="entreprise-photo">
                    <button id="btn-photo" class="premium-btn">Changer la photo</button>
                    <input type="file" id="upload-photo" accept="image/*" style="display:none;">
                </div>

                <div class="entreprise-infos">
                    <label>Nom :</label>
                    <input type="text" id="nom-entreprise" value="${e.nom}" class="input-text">

                    <p><strong>Type :</strong> ${e.type}</p>
                    <p><strong>Budget :</strong> ${e.argent.toLocaleString()} €</p>
                    <p><strong>Valeur totale :</strong> ${calculerValeurEntreprise().toLocaleString()} €</p>

                    <button id="btn-save-nom" class="premium-btn">Enregistrer</button>
                </div>

            </div>
        </div>
    `;

    document.getElementById("btn-save-nom").onclick = () => {
        changerNomEntreprise(document.getElementById("nom-entreprise").value);
        initEntreprise();
    };

    document.getElementById("btn-photo").onclick = () => {
        document.getElementById("upload-photo").click();
    };

    document.getElementById("upload-photo").onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            changerPhotoEntreprise(reader.result);
            initEntreprise();
        };
        reader.readAsDataURL(file);
    };
}

window.initEntreprise = initEntreprise;
