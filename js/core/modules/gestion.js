import { getData, saveData, removeBien } from "../geoData.js";

export function initGestion() {
    const zone = document.getElementById("gestion");
    const data = getData();
    const biens = data.entreprise.biens;

    zone.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Gestion des biens</h2>

            <div class="premium-box">

                ${Object.keys(biens).length === 0 ? `
                    <p>Aucun bien pour le moment.</p>
                ` : `
                    ${Object.entries(biens)
                        .filter(([categorie, styles]) => Object.keys(styles).length > 0)
                        .map(([categorie, styles]) => `
                        <div class="gestion-categorie">
                            <h3>${categorie}</h3>

                            ${Object.entries(styles).map(([style, bien]) => `
                                <div class="gestion-item">

                                    <div class="gestion-nom">${style}</div>

                                    <div class="gestion-infos">
                                        <div>Quantité : ${bien.quantite}</div>
                                        <div>Prix moyen : ${bien.prixAchatMoyen.toLocaleString()} €</div>
                                    </div>

                                    <div class="gestion-actions">

                                        <label>Quantité :</label>
                                        <input type="number"
                                            class="input-quantite"
                                            data-cat="${categorie}"
                                            data-style="${style}"
                                            min="1"
                                            max="${bien.quantite}"
                                            value="1">

                                        <button class="btn-tous"
                                            data-cat="${categorie}"
                                            data-style="${style}"
                                            data-max="${bien.quantite}">
                                            Tous
                                        </button>

                                        <label>Ajustement :</label>
                                        <input type="range"
                                            class="slider-prix"
                                            data-cat="${categorie}"
                                            data-style="${style}"
                                            min="-30"
                                            max="30"
                                            value="0">

                                        <span class="prix-affiche"
                                            id="prix-${categorie}-${style}">
                                            0%
                                        </span>

                                        <div class="gestion-boutons-double">
                                            <button class="btn-louer"
                                                data-cat="${categorie}"
                                                data-style="${style}">
                                                Louer
                                            </button>

                                            <button class="btn-vendre"
                                                data-cat="${categorie}"
                                                data-style="${style}">
                                                Vendre
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

    // ===============================
    //  BOUTON "TOUS"
    // ===============================
    document.querySelectorAll(".btn-tous").forEach(btn => {
        btn.onclick = () => {
            const cat = btn.dataset.cat;
            const style = btn.dataset.style;
            const max = Number(btn.dataset.max);

            const input = document.querySelector(
                `.input-quantite[data-cat="${cat}"][data-style="${style}"]`
            );

            input.value = max;
        };
    });

    // ===============================
    //  SLIDER PRIX
    // ===============================
    document.querySelectorAll(".slider-prix").forEach(slider => {
        slider.oninput = () => {
            const cat = slider.dataset.cat;
            const style = slider.dataset.style;

            const val = Number(slider.value);

            document.getElementById(`prix-${cat}-${style}`).textContent =
                (val > 0 ? "+" : "") + val + "%";
        };
    });

    // ===============================
    //  LOUER
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

            if (!data.entreprise.locationsEnAttente) {
                data.entreprise.locationsEnAttente = [];
            }

            data.entreprise.locationsEnAttente.push({
                categorie: cat,
                style,
                quantite,
                ajustement,
                dateDemande: Date.now()
            });

            saveData();
            initGestion();
        };
    });

    // ===============================
    //  VENDRE — VERSION CORRIGÉE (NON INSTANTANÉE)
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

            // ⭐ Nouvelle logique : on met en attente
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
}

window.initGestion = initGestion;
