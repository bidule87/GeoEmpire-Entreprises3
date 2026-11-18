// ============================================
//  GESTION — LOYERS & VENTES (TRAÇABILITÉ JOUEURS + LOCATION RÉCURRENTE)
// ============================================

import { saveData, getInfosTempsJeu, traiterCloture, ajouterHistorique } from "../geoData.js";
import { getEntreprise, estPdgGeneral } from "../entrepriseCore.js";
import { migrerAnciensBiensVersSiege } from "./entreprises.js";

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

    const e = getEntreprise();
    migrerAnciensBiensVersSiege(e);

    if (traiterCloture() > 0) {
        const soldeEl = document.getElementById("solde");
        if (soldeEl) soldeEl.textContent = (e.argent || 0).toLocaleString("fr-FR");
    }

    const sieges = e.commercesGPS || [];
    const droits = getDroitsUtilisateurActif();
    const temps = getInfosTempsJeu();
    const auteurActuel = e.utilisateurActif || e.pdg || "Fondateur";

    const peutVendre = droits === "complet" || droits === "achetee";
    const peutLouer = droits === "complet" || droits === "louee";

    const siegesAvecBiens = sieges.filter(s =>
        s.biens && Object.values(s.biens).some(styles => Object.values(styles).some(b => (b.quantite || 0) > 0))
    );

    const locAttente = Array.isArray(e.locationsEnAttente) ? e.locationsEnAttente : [];
    const venAttente = Array.isArray(e.ventesEnAttente) ? e.ventesEnAttente : [];
    const labelEcheance = temps.modeBeta ? "cycle 1h" : "00h00";

    let ordresAttenteHTML = "";
    if (locAttente.length > 0 || venAttente.length > 0) {
        const lignesLoc = locAttente.map((o, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 10px; background:rgba(2,132,199,0.25); border-radius:6px; margin-bottom:5px; font-size:13px;">
                <span>🔑 <strong>Location (${labelEcheance}) :</strong> [${o.siegeNom || "Entreprise"}] ${o.quantite || 1}× ${o.style} (${(o.ajustement || 0) >= 0 ? "+" : ""}${o.ajustement || 0}%) • <em style="color:#fde68a;">Par ${o.auteur || auteurActuel}</em></span>
                <button class="btn-annuler-loc" data-idx="${idx}" style="background:#b91c1c; color:#fff; border:none; border-radius:5px; padding:4px 9px; cursor:pointer; font-size:12px;">Annuler</button>
            </div>
        `).join("");

        const lignesVen = venAttente.map((o, idx) => {
            const gainSecurise = Number(o.gainNetEstime || 0).toLocaleString("fr-FR");
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 10px; background:rgba(5,150,105,0.25); border-radius:6px; margin-bottom:5px; font-size:13px;">
                <span>💰 <strong>Vente (${labelEcheance}) :</strong> [${o.siegeNom || "Entreprise"}] ${o.quantite || 1}× ${o.style} (${(o.ajustement || 0) >= 0 ? "+" : ""}${o.ajustement || 0}%) → +${gainSecurise} Ø • <em style="color:#fde68a;">Par ${o.auteur || auteurActuel}</em></span>
                <button class="btn-annuler-ven" data-idx="${idx}" style="background:#b91c1c; color:#fff; border:none; border-radius:5px; padding:4px 9px; cursor:pointer; font-size:12px;">Annuler</button>
            </div>
            `;
        }).join("");

        ordresAttenteHTML = `
            <div style="background:rgba(15,23,42,0.9); border:1px solid #fbbf24; border-radius:10px; padding:12px; margin-bottom:16px;">
                <div style="font-weight:bold; color:#fbbf24; margin-bottom:8px;">
                    ⏳ Ordres programmés (clôture dans <span id="chrono-cloture-ordres">${temps.tempsAvantCloture}</span>) :
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
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <span style="background:rgba(0,45,85,0.85); border:1px solid #fbbf24; padding:5px 12px; border-radius:8px; font-size:13px; color:#fde68a;">
                        👤 Session : <strong>${auteurActuel}</strong>
                    </span>
                    <span style="background:rgba(0,45,85,0.85); border:1px solid ${temps.modeBeta ? "#34d399" : "#38bdf8"}; padding:5px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                        Prochaine clôture dans <strong id="chrono-cloture-header">${temps.tempsAvantCloture}</strong>
                    </span>
                </div>
            </div>

            ${ordresAttenteHTML}

            <div class="premium-box">
                ${siegesAvecBiens.length === 0 ? `
                    <p>Aucun bien rattaché à vos entreprises pour le moment. Allez dans <strong>Acheter des biens</strong>.</p>
                ` : `
                    ${siegesAvecBiens.map(siege => `
                        <div style="margin-bottom:22px; padding:14px; background:rgba(0,20,40,0.65); border-radius:12px; border:1px solid rgba(56,189,248,0.35);">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid rgba(56,189,248,0.3); padding-bottom:10px; margin-bottom:12px;">
                                <h3 style="color:#7ec8ff; margin:0;">🏢 ${siege.nom} <span style="font-size:13px; color:#94a3b8;">(${siege.secteur})</span></h3>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                    <button class="btn-tout-louer-siege premium-btn" data-siege="${siege.id}" style="margin:0; padding:7px 13px; font-size:12px; background:#0284c7;" ${peutLouer ? "" : "disabled"}>
                                        Tout louer
                                    </button>
                                    <button class="btn-tout-vendre-siege premium-btn" data-siege="${siege.id}" style="margin:0; padding:7px 13px; font-size:12px; background:#059669;" ${peutVendre ? "" : "disabled"}>
                                        Tout vendre
                                    </button>
                                </div>
                            </div>

                            ${Object.entries(siege.biens).map(([categorie, styles]) =>
                                Object.entries(styles)
                                    .filter(([, bien]) => (bien.quantite || 0) > 0)
                                    .map(([style, bien]) => {
                                        const enLoc = Math.min(bien.quantite, bien.enLocation || 0);
                                        const prixMoyen = bien.prixAchatMoyen || 15000;
                                        const loyerUnitaireNet = Math.floor(prixMoyen * 0.02 * 0.75);
                                        const prixReventeUnitaireNet = Math.floor(prixMoyen * 1.25 * 0.90);

                                        return `
                                        <div style="margin-top:12px; padding:12px; background:rgba(0,35,70,0.75); border-radius:10px; border:1px solid rgba(56,189,248,0.25);">
                                            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
                                                <div style="font-size:16px; font-weight:bold; color:#fff;">${style} <span style="font-size:12px; color:#7ec8ff;">(${categorie})</span></div>
                                                <div style="display:flex; gap:8px; align-items:center;">
                                                    <span style="background:${enLoc > 0 ? "rgba(52,211,153,0.2)" : "rgba(148,163,184,0.2)"}; color:${enLoc > 0 ? "#34d399" : "#cbd5e1"}; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                        ${enLoc > 0 ? `🔄 Location active reconduite : ${enLoc} / ${bien.quantite}` : `Disponible : ${bien.quantite} unité(s)`}
                                                    </span>
                                                    ${enLoc > 0 && peutLouer ? `
                                                        <button class="btn-stopper-loc" data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}" style="background:#475569; color:#fff; border:none; border-radius:5px; padding:3px 8px; cursor:pointer; font-size:11px;">
                                                            Retirer du bail
                                                        </button>
                                                    ` : ""}
                                                </div>
                                            </div>

                                            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:13px; color:#cbd5e1; margin-bottom:10px;">
                                                <span>Revenu locatif estimé : <strong style="color:#38bdf8;">+${loyerUnitaireNet.toLocaleString("fr-FR")} Ø/cycle</strong></span>
                                                <span>Valeur de cession estimée : <strong style="color:#34d399;">+${prixReventeUnitaireNet.toLocaleString("fr-FR")} Ø/unité</strong></span>
                                            </div>

                                            <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center;">
                                                <label style="font-size:13px;">Qté :</label>
                                                <input type="number" class="input-quantite"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                    min="1" max="${bien.quantite}" value="${bien.quantite}"
                                                    style="width:70px; padding:6px 8px; border-radius:6px; border:1px solid #38bdf8; background:#0f294a; color:#fff;">

                                                <button class="btn-tous premium-btn"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}" data-max="${bien.quantite}"
                                                    style="margin:0; padding:6px 10px; font-size:12px; background:#1e40af;">
                                                    Tous (${bien.quantite})
                                                </button>

                                                <label style="font-size:13px;">Positionnement tarifaire :</label>
                                                <input type="range" class="slider-prix"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                    min="-30" max="40" step="5" value="${bien.ajustementLoyer || 0}">

                                                <span id="prix-${siege.id}-${categorie}-${style}"
                                                    style="font-weight:bold; color:#fbbf24; min-width:45px;">
                                                    ${(bien.ajustementLoyer || 0) > 0 ? "+" : ""}${bien.ajustementLoyer || 0}%
                                                </span>

                                                <div style="display:flex; gap:8px; margin-left:auto;">
                                                    <button class="btn-louer premium-btn"
                                                        data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                        style="margin:0; padding:8px 14px; font-size:13px; background:#0284c7;"
                                                        ${peutLouer ? "" : 'disabled style="opacity:0.4;"'}>
                                                        🔑 ${enLoc > 0 ? "Mettre à jour la location" : "Louer"}
                                                    </button>
                                                    <button class="btn-vendre premium-btn"
                                                        data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                        style="margin:0; padding:8px 14px; font-size:13px; background:#059669;"
                                                        ${peutVendre ? "" : 'disabled style="opacity:0.4;"'}>
                                                        💰 Vendre
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

    document.querySelectorAll(".btn-stopper-loc").forEach(btn => {
        btn.onclick = () => {
            const { siege: siegeId, cat, style } = btn.dataset;
            const e = getEntreprise();
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            bien.enLocation = 0;
            ajouterHistorique(`[${siege.nom}] Arrêt du bail locatif sur ${style}`, "gestion");
            initGestion();
        };
    });

    document.querySelectorAll(".btn-annuler-loc").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            const ordre = e.locationsEnAttente.splice(Number(btn.dataset.idx), 1)[0];
            if (ordre) ajouterHistorique(`Annulation de l'ordre de location : [${ordre.siegeNom}] ${ordre.style}`, "gestion");
            initGestion();
        };
    });

    document.querySelectorAll(".btn-annuler-ven").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            const ordre = e.ventesEnAttente.splice(Number(btn.dataset.idx), 1)[0];
            if (ordre) ajouterHistorique(`Annulation de l'ordre de vente : [${ordre.siegeNom}] ${ordre.style}`, "gestion");
            initGestion();
        };
    });

    document.querySelectorAll(".btn-louer").forEach(btn => {
        btn.onclick = () => {
            const { siege: siegeId, cat, style } = btn.dataset;
            const e = getEntreprise();
            const auteur = e.utilisateurActif || e.pdg || "Fondateur";
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
                ajustement: ajust,
                auteur
            });

            ajouterHistorique(`[${siege.nom}] Programmation mise en location : ${qte}× ${style} (${ajust >= 0 ? "+" : ""}${ajust}%)`, "gestion", auteur);
            initGestion();
        };
    });

    document.querySelectorAll(".btn-vendre").forEach(btn => {
        btn.onclick = () => {
            const { siege: siegeId, cat, style } = btn.dataset;
            const e = getEntreprise();
            const auteur = e.utilisateurActif || e.pdg || "Fondateur";
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            const qte = Number(document.querySelector(`.input-quantite[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            const ajust = Number(document.querySelector(`.slider-prix[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            if (qte <= 0 || qte > bien.quantite) return alert("Quantité invalide.");

            const prixMoyen = bien.prixAchatMoyen || 15000;
            const gainNetEstime = Math.floor(prixMoyen * 1.25 * (1 + ajust / 100) * 0.90 * qte);

            if (!Array.isArray(e.ventesEnAttente)) e.ventesEnAttente = [];
            e.ventesEnAttente = e.ventesEnAttente.filter(o => !(String(o.siegeId) === String(siegeId) && o.categorie === cat && o.style === style));

            e.ventesEnAttente.push({
                siegeId,
                siegeNom: siege.nom,
                categorie: cat,
                style,
                quantite: qte,
                ajustement: ajust,
                gainNetEstime,
                auteur
            });

            ajouterHistorique(`[${siege.nom}] Programmation mise en vente : ${qte}× ${style} (${ajust >= 0 ? "+" : ""}${ajust}%)`, "gestion", auteur);
            initGestion();
        };
    });

    document.querySelectorAll(".btn-tout-louer-siege").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            const auteur = e.utilisateurActif || e.pdg || "Fondateur";
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
                            ajustement: 0,
                            auteur
                        });
                    }
                }
            }
            ajouterHistorique(`[${siege.nom}] Programmation location groupée de tout le parc`, "gestion", auteur);
            initGestion();
        };
    });

    document.querySelectorAll(".btn-tout-vendre-siege").forEach(btn => {
        btn.onclick = () => {
            const e = getEntreprise();
            const auteur = e.utilisateurActif || e.pdg || "Fondateur";
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(btn.dataset.siege));
            if (!siege?.biens) return;

            if (!Array.isArray(e.ventesEnAttente)) e.ventesEnAttente = [];
            e.ventesEnAttente = e.ventesEnAttente.filter(o => String(o.siegeId) !== String(siege.id));

            for (const [cat, styles] of Object.entries(siege.biens)) {
                for (const [style, bien] of Object.entries(styles)) {
                    if ((bien.quantite || 0) > 0) {
                        const prixMoyen = bien.prixAchatMoyen || 15000;
                        e.ventesEnAttente.push({
                            siegeId: siege.id,
                            siegeNom: siege.nom,
                            categorie: cat,
                            style,
                            quantite: bien.quantite,
                            ajustement: 0,
                            gainNetEstime: Math.floor(prixMoyen * 1.25 * 0.90 * bien.quantite),
                            auteur
                        });
                    }
                }
            }
            ajouterHistorique(`[${siege.nom}] Programmation vente groupée de tout le parc`, "gestion", auteur);
            initGestion();
        };
    });
}

window.initGestion = initGestion;
