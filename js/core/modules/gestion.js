// ============================================
//  GESTION — MODULE ENTREPRISES
// ============================================

import { getData, saveData, removeBien } from "../geoData.js";

// ============================================
//  INITIALISATION
// ============================================
export function initGestion() {
    const zone = document.getElementById("gestion");
    const data = getData();

    if (!zone) return;

    const biens = data.entreprise.biens;

    zone.innerHTML = `
        <div class="premium-panel">
            <div class="premium-title">Gestion — Entreprises</div>

            <div class="premium-box gestion-box">
                ${Object.keys(biens).length === 0 ? `
                    <p>Aucun bien disponible.</p>
                ` : `
                    ${Object.entries(biens).map(([cat, styles]) => `
                        <div class="gestion-categorie">
                            <h3>${cat}</h3>

                            ${Object.entries(styles).map(([style, bien]) => `
                                <div class="gestion-item">
                                    <div class="gestion-info">
                                        <strong>${style}</strong><br>
                                        Quantité : ${bien.quantite}<br>
                                        Prix moyen : ${Math.floor(bien.prixAchatMoyen).toLocaleString("fr-FR")} €
                                    </div>

                                    <div class="gestion-actions">

                                        <input type="number" 
                                               class="input-quantite" 
                                               data-cat="${cat}" 
                                               data-style="${style}" 
                                               min="1" 
                                               max="${bien.quantite}" 
                                               value="1">

                                        <input type="range" 
                                               class="slider-prix" 
                                               data-cat="${cat}" 
                                               data-style="${style}" 
                                               min="-30" 
                                               max="30" 
                                               value="0">

                                        <div class="gestion-btns">
                                            <button class="btn-vendre" 
                                                    data-cat="${cat}" 
                                                    data-style="${style}">
                                                Vendre
                                            </button>

                                            <button class="btn-louer" 
                                                    data-cat="${cat}" 
                                                    data-style="${style}">
                                                Louer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `).join("")}
                        </div>
                    `).join("")}
                `}
            </div>
        </div>
    `;

    bindGestionEvents();
}

// ============================================
//  BIND DES BOUTONS
// ============================================
function bindGestionEvents() {

    // ===============================
    //  VENDRE
    // ===============================
    document.querySelectorAll(".btn-vendre").forEach(btn => {
        btn.onclick = () => {
            const cat = btn.dataset.cat;
            const style = btn.dataset.style;

            const input = document.querySelector(
                `.input-quantite[data-cat="${cat}"][data-style="${style}"]`
            );

            const slider = document.querySelector(
                `.slider-prix[data-cat="${cat}"][data-style="${style}"]`
            );

            const quantite = Number(input.value);
            const ajustement = Number(slider.value);

            const data = getData();
            const bien = data.entreprise.biens[cat][style];

            if (!bien || quantite <= 0 || quantite > bien.quantite) return;

            if (!data.entreprise.ventesEnAttente) {
                data.entreprise.ventesEnAttente = [];
            }

            data.entreprise.ventesEnAttente.push({
                categorie: cat,
                style,
                quantite,
                ajustement,
                prixAchatMoyen: bien.prixAchatMoyen,
                dateDemande: Date.now()
            });

            saveData();
            initGestion();
        };
    });

    // ===============================
    //  LOUER — VERSION FINALE
    // ===============================
    document.querySelectorAll(".btn-louer").forEach(btn => {
        btn.onclick = () => {
            const cat = btn.dataset.cat;
            const style = btn.dataset.style;

            const input = document.querySelector(
                `.input-quantite[data-cat="${cat}"][data-style="${style}"]`
            );

            const slider = document.querySelector(
                `.slider-prix[data-cat="${cat}"][data-style="${style}"]`
            );

            const quantite = Number(input.value);
            const ajustement = Number(slider.value);

            const data = getData();
            const bien = data.entreprise.biens[cat][style];

            if (!bien || quantite <= 0 || quantite > bien.quantite) return;

            const prixBase = bien.prixAchatMoyen;

            if (!data.entreprise.locationsEnAttente) {
                data.entreprise.locationsEnAttente = [];
            }

            data.entreprise.locationsEnAttente.push({
                categorie: cat,
                style,
                quantite,
                ajustement,
                prixAchatMoyen: prixBase,
                dateDemande: Date.now()
            });

            saveData();
            initGestion();
        };
    });
}

window.initGestion = initGestion;
