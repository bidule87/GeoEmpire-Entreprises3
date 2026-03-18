import { getData, saveData, removeBien } from "../geoData.js";

export function initGestion() {
    const zone = document.getElementById("gestion");
    const data = getData();
    const biens = data.entreprise.biens;

    zone.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Gestion des biens</h2>

            <div class="premium-box">
                ${biens.length === 0 ? `
                    <p>Aucun bien pour le moment.</p>
                ` : `
                    ${biens.map(b => `
                        <div class="bien-item">
                            <h3>${b.nom}</h3>
                            <p>Valeur : ${b.valeur.toLocaleString()} €</p>

                            <button class="premium-btn" onclick="removeBien('${b.id}'); initGestion();">
                                Supprimer
                            </button>
                        </div>
                    `).join("")}
                `}
            </div>
        </div>
    `;
}

window.initGestion = initGestion;
