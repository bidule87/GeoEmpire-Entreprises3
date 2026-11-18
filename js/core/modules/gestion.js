// ============================================
//  GESTION — LOYERS & VENTES (CUMUL D'ORDRES + BAUX TEMPORAIRES)
// ============================================

import { saveData, getInfosTempsJeu, traiterCloture, ajouterHistorique, loadData } from "../geoData.js";
import { getEntreprise, estPdgGeneral } from "../entrepriseCore.js";
import { migrerAnciensBiensVersSiege } from "./entreprises.js";
import { getVisibilitePourCategorie } from "./marketing.js";

let timerClotureId = null;

function getDroitsUtilisateurActif(siege = null) {
    const e = getEntreprise();
    if (estPdgGeneral()) return "complet";

    const actif = e.utilisateurActif;
    if (e.holding?.active && Array.isArray(e.holding.associes)) {
        const assocH = e.holding.associes.find(a => a.nom === actif);
        if (assocH) return assocH.droits || "complet";
    }
    if (siege && Array.isArray(siege.associes)) {
        const assocS = siege.associes.find(a => a.nom === actif);
        if (assocS) return assocS.droits || "complet";
    }
    return "complet";
}

function getStockDisponiblePourOrdre(e, siege, cat, style, bien) {
    const total = Number(bien.quantite || 0);
    const enLoc = Math.min(total, Number(bien.enLocation || 0));
    const progLoc = (e.locationsEnAttente || [])
        .filter(o => String(o.siegeId) === String(siege.id) && o.categorie === cat && o.style === style)
        .reduce((acc, o) => acc + Number(o.quantite || 0), 0);
    const progVen = (e.ventesEnAttente || [])
        .filter(o => String(o.siegeId) === String(siege.id) && o.categorie === cat && o.style === style)
        .reduce((acc, o) => acc + Number(o.quantite || 0), 0);

    return {
        total,
        enLoc,
        progLoc,
        progVen,
        libre: Math.max(0, total - enLoc - progLoc - progVen)
    };
}

export function initGestion() {
    const zone = document.getElementById("gestion");
    if (!zone) return;

    loadData();
    const e = getEntreprise();
    migrerAnciensBiensVersSiege(e);

    if (traiterCloture() > 0) {
        const soldeEl = document.getElementById("solde");
        if (soldeEl) soldeEl.textContent = (e.argent || 0).toLocaleString("fr-FR");
    }

    const sieges = e.commercesGPS || [];
    const temps = getInfosTempsJeu();
    const auteurActuel = e.utilisateurActif || e.pdg || "Fondateur";

    const siegesAvecBiens = sieges.filter(s =>
        s.biens && Object.values(s.biens).some(styles => Object.values(styles).some(b => Number(b.quantite || 0) > 0))
    );

    const locAttente = Array.isArray(e.locationsEnAttente) ? e.locationsEnAttente : [];
    const venAttente = Array.isArray(e.ventesEnAttente) ? e.ventesEnAttente : [];
    const labelEcheance = temps.modeBeta ? "cycle 1h" : "00h00";

    let ordresAttenteHTML = "";
    if (locAttente.length > 0 || venAttente.length > 0) {
        const lignesLoc = locAttente.map((o, idx) => `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 10px; background:rgba(2,132,199,0.25); border-radius:6px; margin-bottom:5px; font-size:13px;">
                <span>🔑 <strong>Location (${labelEcheance}) :</strong> [${o.siegeNom || "Entreprise"}] ${o.quantite || 1}× ${o.style} (${(o.ajustement || 0) >= 0 ? "+" : ""}${o.ajustement || 0}%) • <em style="color:#fde68a;">Par ${o.auteur || auteurActuel}</em></span>
                <button type="button" class="btn-annuler-loc" data-idx="${idx}" style="background:#b91c1c; color:#fff; border:none; border-radius:5px; padding:4px 9px; cursor:pointer; font-size:12px;">Annuler</button>
            </div>
        `).join("");

        const lignesVen = venAttente.map((o, idx) => {
            const gainSecurise = Number(o.gainNetEstime || 0).toLocaleString("fr-FR");
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 10px; background:rgba(5,150,105,0.25); border-radius:6px; margin-bottom:5px; font-size:13px;">
                <span>💰 <strong>Vente (${labelEcheance}) :</strong> [${o.siegeNom || "Entreprise"}] ${o.quantite || 1}× ${o.style} (${(o.ajustement || 0) >= 0 ? "+" : ""}${o.ajustement || 0}%) → +${gainSecurise} Ø • <em style="color:#fde68a;">Par ${o.auteur || auteurActuel}</em></span>
                <button type="button" class="btn-annuler-ven" data-idx="${idx}" style="background:#b91c1c; color:#fff; border:none; border-radius:5px; padding:4px 9px; cursor:pointer; font-size:12px;">Annuler</button>
            </div>
            `;
        }).join("");

        ordresAttenteHTML = `
            <div style="background:rgba(15,23,42,0.9); border:1px solid #fbbf24; border-radius:10px; padding:12px; margin-bottom:16px;">
                <div style="font-weight:bold; color:#fbbf24; margin-bottom:8px;">
                    ⏳ Ordres programmés (prochaine clôture dans <span id="chrono-cloture-ordres">${temps.tempsAvantCloture}</span>) :
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
                    ${siegesAvecBiens.map(siege => {
                        const droits = getDroitsUtilisateurActif(siege);
                        const peutVendre = droits === "complet" || droits === "achetee";
                        const peutLouer = droits === "complet" || droits === "louee";

                        return `
                        <div style="margin-bottom:22px; padding:14px; background:rgba(0,20,40,0.65); border-radius:12px; border:1px solid rgba(56,189,248,0.35);">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid rgba(56,189,248,0.3); padding-bottom:10px; margin-bottom:12px;">
                                <h3 style="color:#7ec8ff; margin:0;">🏢 ${siege.nom} <span style="font-size:13px; color:#94a3b8;">(${siege.secteur})</span></h3>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                    <button type="button" class="btn-tout-louer-siege premium-btn" data-siege="${siege.id}" style="margin:0; padding:7px 13px; font-size:12px; background:#0284c7; ${peutLouer ? "" : "opacity:0.4; cursor:not-allowed;"}" ${peutLouer ? "" : "disabled"}>
                                        Tout louer (libres)
                                    </button>
                                    <button type="button" class="btn-tout-vendre-siege premium-btn" data-siege="${siege.id}" style="margin:0; padding:7px 13px; font-size:12px; background:#059669; ${peutVendre ? "" : "opacity:0.4; cursor:not-allowed;"}" ${peutVendre ? "" : "disabled"}>
                                        Tout vendre (libres)
                                    </button>
                                </div>
                            </div>

                            ${Object.entries(siege.biens).map(([categorie, styles]) =>
                                Object.entries(styles)
                                    .filter(([, bien]) => Number(bien.quantite || 0) > 0)
                                    .map(([style, bien]) => {
                                        const stock = getStockDisponiblePourOrdre(e, siege, categorie, style, bien);
                                        const prixMoyen = bien.prixAchatMoyen || 15000;
                                        const loyerUnitaireNet = Math.floor(prixMoyen * 0.02 * 0.75);
                                        const prixReventeUnitaireNet = Math.floor(prixMoyen * 1.25 * 0.90);

                                        const visibilite = getVisibilitePourCategorie(e, categorie);
                                        const labelPub = visibilite >= 75 ? "Pub maximale" : (visibilite >= 35 ? "Pub active" : "Pub faible");
                                        const couleurPub = visibilite >= 75 ? "#34d399" : (visibilite >= 35 ? "#fbbf24" : "#f87171");
                                        const cyclesRestants = bien.cyclesRestantsBail || 0;

                                        return `
                                        <div style="margin-top:12px; padding:12px; background:rgba(0,35,70,0.75); border-radius:10px; border:1px solid rgba(56,189,248,0.25);">
                                            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:6px;">
                                                <div style="font-size:16px; font-weight:bold; color:#fff;">
                                                    ${style} <span style="font-size:12px; color:#7ec8ff;">(${categorie})</span>
                                                    <span style="background:rgba(0,0,0,0.4); color:${couleurPub}; border:1px solid ${couleurPub}; padding:2px 7px; border-radius:5px; font-size:11px; margin-left:6px;">
                                                        📢 ${labelPub}
                                                    </span>
                                                </div>
                                                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                                                    <span style="background:rgba(56,189,248,0.2); color:#bae6fd; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                        Total : ${stock.total} | Libres : ${stock.libre}
                                                    </span>
                                                    ${stock.enLoc > 0 ? `
                                                        <span style="background:rgba(52,211,153,0.2); color:#34d399; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                            🔑 Loués : ${stock.enLoc} • Fin du bail dans ${cyclesRestants} cycle(s)
                                                        </span>
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
                                                    min="1" max="${Math.max(1, stock.libre)}" value="${Math.max(1, stock.libre)}"
                                                    style="width:70px; padding:6px 8px; border-radius:6px; border:1px solid #38bdf8; background:#0f294a; color:#fff;">

                                                <button type="button" class="btn-tous premium-btn"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}" data-max="${stock.libre}"
                                                    style="margin:0; padding:6px 10px; font-size:12px; background:#1e40af;">
                                                    Max (${stock.libre})
                                                </button>

                                                <label style="font-size:13px;">Tarif :</label>
                                                <input type="range" class="slider-prix"
                                                    data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                    min="-30" max="40" step="5" value="${bien.ajustementLoyer || 0}">

                                                <span id="prix-${siege.id}-${categorie}-${style}"
                                                    style="font-weight:bold; color:#fbbf24; min-width:45px;">
                                                    ${(bien.ajustementLoyer || 0) > 0 ? "+" : ""}${bien.ajustementLoyer || 0}%
                                                </span>

                                                <div style="display:flex; gap:8px; margin-left:auto;">
                                                    <button type="button" class="btn-louer premium-btn"
                                                        data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                        style="margin:0; padding:8px 14px; font-size:13px; background:#0284c7; ${peutLouer && stock.libre > 0 ? "" : "opacity:0.45;"}"
                                                        ${peutLouer ? "" : "disabled"}>
                                                        🔑 Louer
                                                    </button>
                                                    <button type="button" class="btn-vendre premium-btn"
                                                        data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                                        style="margin:0; padding:8px 14px; font-size:13px; background:#059669; ${peutVendre && stock.libre > 0 ? "" : "opacity:0.45;"}"
                                                        ${peutVendre ? "" : "disabled"}>
                                                        💰 Vendre
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        `;
                                    }).join("")
                            ).join("")}
                        </div>
                        `;
                    }).join("")}
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
            if (input) input.value = Math.max(1, Number(btn.dataset.max || 1));
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

    // CUMUL DES ORDRES DE LOCATION (MÊME SI D'AUTRES SONT DÉJÀ EN COURS)
    document.querySelectorAll(".btn-louer").forEach(btn => {
        btn.onclick = () => {
            const { siege: siegeId, cat, style } = btn.dataset;
            const e = getEntreprise();
            const auteur = e.utilisateurActif || e.pdg || "Fondateur";
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            const stock = getStockDisponiblePourOrdre(e, siege, cat, style, bien);
            if (stock.libre <= 0) {
                return alert(`Tous vos ${style} sur ${siege.nom} sont déjà loués ou programmés. Rachetez-en un nouveau dans "Acheter des biens" pour l'ajouter !`);
            }

            const qte = Number(document.querySelector(`.input-quantite[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            const ajust = Number(document.querySelector(`.slider-prix[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);

            if (qte <= 0 || qte > stock.libre) {
                return alert(`Quantité maximale libre sur cette structure : ${stock.libre}.`);
            }

            if (!Array.isArray(e.locationsEnAttente)) e.locationsEnAttente = [];
            const existant = e.locationsEnAttente.find(o => String(o.siegeId) === String(siegeId) && o.categorie === cat && o.style === style && o.ajustement === ajust);

            if (existant) {
                existant.quantite += qte;
                existant.auteur = auteur;
            } else {
                e.locationsEnAttente.push({
                    siegeId,
                    siegeNom: siege.nom,
                    categorie: cat,
                    style,
                    quantite: qte,
                    ajustement: ajust,
                    auteur
                });
            }

            ajouterHistorique(`[${siege.nom}] Ajout mise en location : +${qte}× ${style} (${ajust >= 0 ? "+" : ""}${ajust}%)`, "gestion", auteur);
            initGestion();
        };
    });

    // CUMUL DES ORDRES DE VENTE (MÊME SI D'AUTRES SONT DÉJÀ EN COURS)
    document.querySelectorAll(".btn-vendre").forEach(btn => {
        btn.onclick = () => {
            const { siege: siegeId, cat, style } = btn.dataset;
            const e = getEntreprise();
            const auteur = e.utilisateurActif || e.pdg || "Fondateur";
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            const stock = getStockDisponiblePourOrdre(e, siege, cat, style, bien);
            if (stock.libre <= 0) {
                return alert(`Tous vos ${style} sur ${siege.nom} sont déjà loués ou en vente. Rachetez-en un nouveau dans "Acheter des biens" pour le vendre !`);
            }

            const qte = Number(document.querySelector(`.input-quantite[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);
            const ajust = Number(document.querySelector(`.slider-prix[data-siege="${siegeId}"][data-cat="${cat}"][data-style="${style}"]`)?.value || 0);

            if (qte <= 0 || qte > stock.libre) {
                return alert(`Quantité maximale libre sur cette structure : ${stock.libre}.`);
            }

            const prixMoyen = bien.prixAchatMoyen || 15000;
            const gainNetEstime = Math.floor(prixMoyen * 1.25 * (1 + ajust / 100) * 0.90 * qte);

            if (!Array.isArray(e.ventesEnAttente)) e.ventesEnAttente = [];
            const existant = e.ventesEnAttente.find(o => String(o.siegeId) === String(siegeId) && o.categorie === cat && o.style === style && o.ajustement === ajust);

            if (existant) {
                existant.quantite += qte;
                existant.gainNetEstime += gainNetEstime;
                existant.auteur = auteur;
            } else {
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
            }

            ajouterHistorique(`[${siege.nom}] Ajout mise en vente : +${qte}× ${style} (${ajust >= 0 ? "+" : ""}${ajust}%)`, "gestion", auteur);
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
            for (const [cat, styles] of Object.entries(siege.biens)) {
                for (const [style, bien] of Object.entries(styles)) {
                    const stock = getStockDisponiblePourOrdre(e, siege, cat, style, bien);
                    if (stock.libre > 0) {
                        e.locationsEnAttente.push({
                            siegeId: siege.id,
                            siegeNom: siege.nom,
                            categorie: cat,
                            style,
                            quantite: stock.libre,
                            ajustement: 0,
                            auteur
                        });
                    }
                }
            }
            ajouterHistorique(`[${siege.nom}] Programmation location groupée des biens libres`, "gestion", auteur);
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
            for (const [cat, styles] of Object.entries(siege.biens)) {
                for (const [style, bien] of Object.entries(styles)) {
                    const stock = getStockDisponiblePourOrdre(e, siege, cat, style, bien);
                    if (stock.libre > 0) {
                        const prixMoyen = bien.prixAchatMoyen || 15000;
                        e.ventesEnAttente.push({
                            siegeId: siege.id,
                            siegeNom: siege.nom,
                            categorie: cat,
                            style,
                            quantite: stock.libre,
                            ajustement: 0,
                            gainNetEstime: Math.floor(prixMoyen * 1.25 * 0.90 * stock.libre),
                            auteur
                        });
                    }
                }
            }
            ajouterHistorique(`[${siege.nom}] Programmation vente groupée des biens libres`, "gestion", auteur);
            initGestion();
        };
    });
}

window.initGestion = initGestion;
