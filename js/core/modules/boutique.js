// ============================================
//  GESTION — LOYERS & VENTES (CONNECTÉ GOUVERNANCE)
// ============================================

import { getData, saveData } from "../geoData.js";
import { getEntreprise, estPdgGeneral } from "../entrepriseCore.js";

function getDroitsUtilisateurActif() {
    const e = getEntreprise();
    if (estPdgGeneral()) return "complet";

    const actif = e.utilisateurActif;
    if (e.holding?.active && Array.isArray(e.holding.associes)) {
        const assocH = e.holding.associes.find(a => a.nom === actif);
        if (assocH) return assocH.droits || "complet";
    }

    for (const siege of (e.commercesGPS || [])) {
        const assocS = (siege.associes || []).find(a => a.nom === actif);
        if (assocS) return assocS.droits || "complet";
    }

    return "complet";
}

export function initGestion() {
    const zone = document.getElementById("gestion");
    if (!zone) return;

    const e = getEntreprise();
    const biens = e.biens || {};
    const droits = getDroitsUtilisateurActif();

    const peutVendre = droits === "complet" || droits === "achetee";
    const peutLouer = droits === "complet" || droits === "louee";

    const categoriesActives = Object.entries(biens).filter(
        ([, styles]) => Object.values(styles).some(b => (b.quantite || 0) > 0)
    );

    zone.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                <h2 class="premium-title" style="margin:0;">Gestion des Loyers & Ventes</h2>
                <span style="background:rgba(0,45,85,0.85); border:1px solid #38bdf8; padding:5px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                    Session : <strong>${e.utilisateurActif}</strong> (${droits === "complet" ? "Accès complet" : droits === "achetee" ? "Partie achetée uniquement" : "Partie louée uniquement"})
                </span>
            </div>

            <div class="premium-box">
                ${categoriesActives.length === 0 ? `
                    <p>Aucun bien en stock pour le moment. Rendez-vous dans <strong>Acheter des biens</strong>.</p>
                ` : `
                    ${categoriesActives.map(([categorie, styles]) => `
                        <div class="gestion-categorie" style="margin-bottom:18px;">
                            <h3 style="color:#7ec8ff; border-bottom:1px solid rgba(56,189,248,0.3); padding-bottom:6px;">${categorie}</h3>

                            ${Object.entries(styles)
                                .filter(([, bien]) => (bien.quantite || 0) > 0)
                                .map(([style, bien]) => {
                                    const estAssure = bien.assurance && bien.assurance.type;
                                    const badgeAssurance = estAssure
                                        ? `<span style="color:#34d399; font-size:12px; font-weight:bold;">🛡️ Assuré (${bien.assurance.type} - ${bien.assurance.couverture}%)</span>`
                                        : `<span style="color:#f87171; font-size:12px; font-weight:bold;">⚠️ Non assuré (risque de perte)</span>`;

                                    return `
                                    <div class="gestion-item" style="margin-top:10px;">
                                        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; align-items:center;">
                                            <div class="gestion-nom" style="font-size:16px; font-weight:bold;">${style}</div>
                                            ${badgeAssurance}
                                        </div>

                                        <div class="gestion-infos" style="margin:6px 0; font-size:14px;">
                                            <div>En stock : <strong>${bien.quantite}</strong></div>
                                            <div>Valeur moyenne : <strong>${Math.floor(bien.prixAchatMoyen).toLocaleString("fr-FR")} Ø</strong></div>
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

                                            <label>Marge / Ajustement :</label>
                                            <input type="range"
                                                class="slider-prix"
                                                data-cat="${categorie}"
                                                data-style="${style}"
                                                min="-30"
                                                max="40"
                                                step="5"
                                                value="0">

                                            <span class="prix-affiche"
                                                id="prix-${categorie}-${style}"
                                                style="font-weight:bold; color:#fbbf24; min-width:48px; display:inline-block;">
                                                0%
                                            </span>

                                            <div class="gestion-boutons-double">
                                                <button class="btn-louer"
                                                    data-cat="${categorie}"
                                                    data-style="${style}"
                                                    ${peutLouer ? "" : 'disabled style="opacity:0.4; cursor:not-allowed;" title="Droits réservés à la partie achetée"'}>
                                                    Louer
                                                </button>

                                                <button class="btn-vendre"
                                                    data-cat="${categorie}"
                                                    data-style="${style}"
                                                    ${peutVendre ? "" : 'disabled style="opacity:0.4; cursor:not-allowed;" title="Droits réservés à la partie louée"'}>
                                                    Vendre
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    `;
                                }).join("")}
                        </div>
                    `).join("")}
                `}
            </div>
        </div>
    `;

    bindGestionEvents();
}

function bindGestionEvents() {
    document.querySelectorAll(".btn-tous").forEach(btn => {
        btn.onclick = () => {
            const input = document.querySelector(
                `.input-quantite[data-cat="${btn.dataset.cat}"][data-style="${btn.dataset.style}"]`
            );
            if (input) input.value = btn.dataset.max;
        };
    });

    document.querySelectorAll(".slider-prix").forEach(slider => {
        slider.oninput = () => {
            const span = document.getElementById(`prix-${slider.dataset.cat}-${slider.dataset.style}`);
            if (span) {
                const val = Number(slider.value);
                span.textContent = (val > 0 ? "+" : "") + val + "%";
                span.style.color = val > 0 ? "#34d399" : val < 0 ? "#f87171" : "#fbbf24";
            }
        };
    });

    document.querySelectorAll(".btn-louer").forEach(btn => {
        btn.onclick = () => {
            if (btn.disabled) return;
            const cat = btn.dataset.cat;
            const style = btn.dataset.style;
            const input = document.querySelector(`.input-quantite[data-cat="${cat}"][data-style="${style}"]`);
            const slider = document.querySelector(`.slider-prix[data-cat="${cat}"][data-style="${style}"]`);

            const quantite = Number(input?.value || 0);
            const ajustement = Number(slider?.value || 0);
            const data = getData();
            const bien = data.entreprise.biens?.[cat]?.[style];

            if (!bien || quantite <= 0 || quantite > bien.quantite) return;

            if (!Array.isArray(data.entreprise.locationsEnAttente)) {
                data.entreprise.locationsEnAttente = [];
            }

            data.entreprise.locationsEnAttente.push({
                categorie: cat,
                style,
                quantite,
                ajustement,
                prixAchatMoyen: bien.prixAchatMoyen,
                dateDemande: Date.now()
            });

            saveData();
            alert(`Mise en location enregistrée : ${quantite}× ${style} (${ajustement >= 0 ? "+" : ""}${ajustement}%).`);
            initGestion();
        };
    });

    document.querySelectorAll(".btn-vendre").forEach(btn => {
        btn.onclick = () => {
            if (btn.disabled) return;
            const cat = btn.dataset.cat;
            const style = btn.dataset.style;
            const input = document.querySelector(`.input-quantite[data-cat="${cat}"][data-style="${style}"]`);
            const slider = document.querySelector(`.slider-prix[data-cat="${cat}"][data-style="${style}"]`);

            const quantite = Number(input?.value || 0);
            const ajustement = Number(slider?.value || 0);
            const data = getData();
            const bien = data.entreprise.biens?.[cat]?.[style];

            if (!bien || quantite <= 0 || quantite > bien.quantite) return;

            if (!Array.isArray(data.entreprise.ventesEnAttente)) {
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
            alert(`Mise en vente enregistrée : ${quantite}× ${style} (${ajustement >= 0 ? "+" : ""}${ajustement}%).`);
            initGestion();
        };
    });
}

window.initGestion = initGestion;
