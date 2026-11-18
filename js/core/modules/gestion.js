// ============================================
//  GESTION — LOYERS & VENTES (1H EN BÊTA / 00H00 EN NORMAL)
// ============================================

import { saveData, getInfosTempsJeu, traiterCloture } from "../geoData.js";
import { getEntreprise, estPdgGeneral } from "../entrepriseCore.js";

let timerClotureId = null;

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

    // Vérifier immédiatement si un cycle de 1h (Bêta) ou minuit (Normal) vient de passer
    if (traiterCloture() > 0) {
        const eMaj = getEntreprise();
        const soldeEl = document.getElementById("solde");
        if (soldeEl) soldeEl.textContent = (eMaj.argent || 0).toLocaleString("fr-FR");
    }

    const e = getEntreprise();
    const sieges = e.commercesGPS || [];
    const droits = getDroitsUtilisateurActif();
    const temps = getInfosTempsJeu();

    const peutVendre = droits === "complet" || droits === "achetee";
    const peutLouer = droits === "complet" || droits === "louee";

    const siegesAvecBiens = sieges.filter(s =>
        s.biens && Object.values(s.biens).some(styles => Object.values(styles).some(b => (b.quantite || 0) > 0))
    );

    const locAttente = e.locationsEnAttente || [];
    const venAttente = e.ventesEnAttente || [];
    const labelEcheance = temps.modeBeta ? "dans 1h" : "00h00";

    let ordresAttenteHTML = "";
    if (locAttente.length > 0 || venAttente.length > 0) {
        const lignesLoc = locAttente.map((o, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 10px; background:rgba(2,132,199,0.2); border-radius:6px; margin-bottom:5px; font-size:13px;">
                <span>🔑 <strong>Location (${labelEcheance}) :</strong> [${o.siegeNom}] ${o.quantite}× ${o.style} (${o.ajustement >= 0 ? "+" : ""}${o.ajustement}%)</span>
                <button class="btn-annuler-loc" data-idx="${idx}" style="background:#b91c1c; color:#fff; border:none; border-radius:5px; padding:3px 8px; cursor:pointer; font-size:12px;">Annuler</button>
            </div>
        `).join("");

        const lignesVen = venAttente.map((o, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 10px; background:rgba(5,150,105,0.2); border-radius:6px; margin-bottom:5px; font-size:13px;">
                <span>💰 <strong>Vente (${labelEcheance}) :</strong> [${o.siegeNom}] ${o.quantite}× ${o.style} (${o.ajustement >= 0 ? "+" : ""}${o.ajustement}%) → Net estimé : <strong>+${o.gainNetEstime.toLocaleString("fr-FR")} Ø</strong></span>
                <button class="btn-annuler-ven" data-idx="${idx}" style="background:#b91c1c; color:#fff; border:none; border-radius:5px; padding:3px 8px; cursor:pointer; font-size:12px;">Annuler</button>
            </div>
        `).join("");

        ordresAttenteHTML = `
            <div style="background:rgba(15,23,42,0.85); border:1px solid #fbbf24; border-radius:10px; padding:12px; margin-bottom:16px;">
                <div style="font-weight:bold; color:#fbbf24; margin-bottom:8px;">
                    ⏳ Ordres en attente de validation (clôture dans <span id="chrono-cloture-ordres">${temps.tempsAvantCloture}</span>) :
                </div>
                ${lignesLoc}
                ${lignesVen}
            </div>
        `;
    }

    zone.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                <h2 class="premium-title" style="margin:0;">Loyers & Ventes par Entreprise</h2>
                <span style="background:rgba(0,45,85,0.85); border:1px solid ${temps.modeBeta ? "#34d399" : "#38bdf8"}; padding:5px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                    ${temps.modeBeta ? "🧪 Mode Bêta (Cycle 1h)" : "🕛 Mode Normal (00h00)"} • Prochaine clôture dans <strong id="chrono-cloture-header">${temps.tempsAvantCloture}</strong>
                </span>
            </div>

            <div style="background:rgba(0,35,70,0.75); border:1px solid rgba(56,189,248,0.35); border-radius:10px; padding:12px; margin-bottom:16px; font-size:13px; color:#e2f1ff;">
                <strong>Règlement différé :</strong>
                ${temps.modeBeta
                    ? "En <strong>version Bêta</strong>, vos ventes et locations sont validées toutes les <strong>1 heure</strong> pour tester le cycle complet."
                    : "En <strong>jeu normal</strong>, toutes les ventes et locations sont validées chaque nuit à <strong>minuit pile (00h00)</strong>."}
                <br>• <strong>Impôts & Taxes Mairie :</strong> 15 % sur les loyers et 10 % sur les ventes partent directement dans la <strong>caisse de la Mairie</strong> (actuellement : <strong>${(e.caisseMairie || 0).toLocaleString("fr-FR")} Ø</strong>).
            </div>

            ${ordresAttenteHTML}

            <div class="premium-box">
                ${siegesAvecBiens.length === 0 ? `
                    <p>Aucun bien rattaché à vos entreprises pour le moment. Allez dans <strong>Acheter des biens</strong>.</p>
                ` : `
                    ${siegesAvecBiens.map(siege => `
                        <div class="gestion-categorie" style="margin-bottom:22px; padding:14px; background:rgba(0,20,40,0.55); border-radius:12px; border:1px solid rgba(56,189,248,0.3);">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid rgba(56,189,248,0.3); padding-bottom:10px; margin-bottom:12px;">
                                <h3 style="color:#7ec8ff; margin:0;">🏢 ${siege.nom} <span style="font-size:13px; color:#94a3b8;">(${siege.secteur})</span></h3>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                    <button class="btn-tout-louer-siege premium-btn" data-siege="${siege.id}" style="margin:0; padding:6px 12px; font-size:12px; background:#0284c7;" ${peutLouer ? "" : "disabled"}>
                                        Tout mettre en location (${labelEcheance})
                                    </button>
                                    <button class="btn-tout-vendre-siege premium-btn" data-siege="${siege.id}" style="margin:0; padding:6px 12px; font-size:12px; background:#059669;" ${peutVendre ? "" : "disabled"}>
                                        Tout mettre en vente (${labelEcheance})
                                    </button>
                                </div>
                            </div>

                            ${Object.entries(siege.biens).map(([categorie, styles]) =>
                                Object.entries(styles)
                                    .filter(([, bien]) => (bien.quantite || 0) > 0)
                                    .map(([style, bien]) => {
                                        const enLoc = bien.enLocation || 0;
                                        const loyerUnitaireNet = Math.floor(bien.prixAchatMoyen * 0.02 * 0.75);
                                        const prixReventeUnitaireNet = Math.floor(bien.prixAchatMoyen * 1.25 * 0.90);

                                        return `
                                        <div class="gestion-item" style="margin-top:10px;">
                                            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                                                <div class="gestion-nom" style="font-size:16px; font-weight:bold;">${style} <span style="font-size:12px; color:#7ec8ff;">(${categorie})</span></div>
                                                <div>
                                                    <span style="background:rgba(52,211,153,0.2); color:#34d399; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                        Actuellement loués : ${enLoc} / ${bien.quantite}
                                                    </span>
                                                </div>
                                            </div>

                                            <div class="gestion-infos" style="margin:6px 0; font-size:13px; color:#cbd5e1;">
                                                <div>Loyer net estimé : <strong style="color:#38bdf8;">+${loyerUnitaireNet.toLocaleString("fr-FR")} Ø/cycle</strong></div>
                                                <div>Revente nette estimée : <strong style="color:#34d399;">+${prixReventeUnitaireNet.toLocaleString("fr-FR")} Ø/unité</strong></div>
                                            </div>

                                            <div class="gestion-actions">
                                                <label>Qté :</label>
                                                <input type="number" class="input-quantite"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                    min="1" max="${bien.quantite}" value="${bien.quantite}">

                                                <button class="btn-tous"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}" data-max="${bien.quantite}">
                                                    Tous (${bien.quantite})
                                                </button>

                                                <label>Ajustement :</label>
                                                <input type="range" class="slider-prix"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                    min="-30" max="40" step="5" value="${bien.ajustementLoyer || 0}">

                                                <span class="prix-affiche"
                                                    id="prix-${siege.id}-${categorie}-${style}"
                                                    style="font-weight:bold; color:#fbbf24; min-width:48px; display:inline-block;">
                                                    ${(bien.ajustementLoyer || 0) > 0 ? "+" : ""}${bien.ajustementLoyer || 0}%
                                                </span>

                                                <div class="gestion-boutons-double">
                                                    <button class="btn-louer"
                                                        data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                        ${peutLouer ? "" : 'disabled style="opacity:0.4;"'}>
                                                        Louer (${labelEcheance})
                                                    </button>
                                                    <button class="btn-vendre"
                                                        data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                        ${peutVendre ? "" : 'disabled style="opacity:0.4;"'}>
                                                        Vendre (${labelEcheance})
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        `;
                                    }).join("")
                            ).join("")}
                        </div>
                    `).join("")}
                `}
            </div>
        </div>
    `;

    bindGestionEvents();
    demarrerChronoCloture();
}

function demarrerChronoCloture() {
    if (timerClotureId) clearInterval(timerClotureId);
    timerClotureId = setInterval(() => {
        if (traiterCloture() > 0) {
            const e = getEntreprise();
            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = (e.argent || 0).toLocaleString("fr-FR");
            initGestion();
            return;
        }
        const t = getInfosTempsJeu();
        const el1 = document.getElementById("chrono-cloture-header");
        const el2 = document.getElementById("chrono-cloture-ordres");
        if (el1) el1.textContent = t.tempsAvantCloture;
        if (el2) el2.textContent = t.tempsAvantCloture;
    }, 1000);
}

function bindGestionEvents() {
    document.querySelectorAll(".btn-tous").forEach(btn => {
        btn.onclick = () => {
            const input = document.querySelector(`.input-quantite[data-siege="${btn.dataset.siege}"][data-cat="${btn.dataset.cat}"][data-style="${btn.dataset.style}"]`);
            if (input) input.value = btn.dataset.max;
        };
    });

    document.querySelectorAll(".slider-prix").forEach(slider => {
        slider.oninput = () => {
            const span = document.getElementById(`prix-${slider.dataset.siege}-${slider.dataset.cat}-${slider.dataset.style}`);
            if (span) {
                const val = Number(slider.value);
                span.textContent = (val > 0 ? "+" : "") + val + "%";
            }
        };
    });

    document.querySelectorAll(".btn-annuler-loc").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            e.locationsEnAttente.splice(Number(btn.dataset.idx), 1);
            saveData();
            initGestion();
        };
    });

    document.querySelectorAll(".btn-annuler-ven").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            e.ventesEnAttente.splice(Number(btn.dataset.idx), 1);
            saveData();
            initGestion();
        };
    });

    document.querySelectorAll(".btn-louer").forEach(btn => {
        btn.onclick = () => {
            const { siege: siegeId, cat, style } = btn.dataset;
            const e = getEntreprise();
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            const qte = Number(document.querySelector(`.input-quantite[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            const ajust = Number(document.querySelector(`.slider-prix[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            if (qte <= 0 || qte > bien.quantite) return alert("Quantité invalide.");

            if (!Array.isArray(e.locationsEnAttente)) e.locationsEnAttente = [];
            e.locationsEnAttente = e.locationsEnAttente.filter(o => !(String(o.siegeId) === String(siegeId) && o.categorie === cat && o.style === style));

            e.locationsEnAttente.push({
                siegeId,
                siegeNom: siege.nom,
                categorie: cat,
                style,
                quantite: qte,
                ajustement: ajust
            });

            saveData();
            initGestion();
        };
    });

    document.querySelectorAll(".btn-vendre").forEach(btn => {
        btn.onclick = () => {
            const { siege: siegeId, cat, style } = btn.dataset;
            const e = getEntreprise();
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            const qte = Number(document.querySelector(`.input-quantite[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            const ajust = Number(document.querySelector(`.slider-prix[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            if (qte <= 0 || qte > bien.quantite) return alert("Quantité invalide.");

            const gainNetEstime = Math.floor(bien.prixAchatMoyen * 1.25 * (1 + ajust / 100) * 0.90 * qte);

            if (!Array.isArray(e.ventesEnAttente)) e.ventesEnAttente = [];
            e.ventesEnAttente = e.ventesEnAttente.filter(o => !(String(o.siegeId) === String(siegeId) && o.categorie === cat && o.style === style));

            e.ventesEnAttente.push({
                siegeId,
                siegeNom: siege.nom,
                categorie: cat,
                style,
                quantite: qte,
                ajustement: ajust,
                gainNetEstime
            });

            saveData();
            initGestion();
        };
    });

    document.querySelectorAll(".btn-tout-louer-siege").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(btn.dataset.siege));
            if (!siege?.biens) return;

            if (!Array.isArray(e.locationsEnAttente)) e.locationsEnAttente = [];
            e.locationsEnAttente = e.locationsEnAttente.filter(o => String(o.siegeId) !== String(siege.id));

            for (const [cat, styles] of Object.entries(siege.biens)) {
                for (const [style, bien] of Object.entries(styles)) {
                    if ((bien.quantite || 0) > 0) {
                        e.locationsEnAttente.push({
                            siegeId: siege.id,
                            siegeNom: siege.nom,
                            categorie: cat,
                            style,
                            quantite: bien.quantite,
                            ajustement: 0
                        });
                    }
                }
            }
            saveData();
            initGestion();
        };
    });

    document.querySelectorAll(".btn-tout-vendre-siege").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(btn.dataset.siege));
            if (!siege?.biens) return;

            if (!Array.isArray(e.ventesEnAttente)) e.ventesEnAttente = [];
            e.ventesEnAttente = e.ventesEnAttente.filter(o => String(o.siegeId) !== String(siege.id));

            for (const [cat, styles] of Object.entries(siege.biens)) {
                for (const [style, bien] of Object.entries(styles)) {
                    if ((bien.quantite || 0) > 0) {
                        e.ventesEnAttente.push({
                            siegeId: siege.id,
                            siegeNom: siege.nom,
                            categorie: cat,
                            style,
                            quantite: bien.quantite,
                            ajustement: 0,
                            gainNetEstime: Math.floor(bien.prixAchatMoyen * 1.25 * 0.90 * bien.quantite)
                        });
                    }
                }
            }
            saveData();
            initGestion();
        };
    });
}

window.initGestion = initGestion;
