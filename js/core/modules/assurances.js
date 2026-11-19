// ============================================
// ASSURANCES — COUVERTURE PROGRESSIVE & GUIDE DES RÈGLES
// ============================================

import { getEntreprise, sauvegarderEntreprise } from "../entrepriseCore.js";
import { ajouterHistorique, loadData } from "../geoData.js";

const ASSURANCES = {
    "Basique": {
        couverture: 30,
        braquage: false,
        tauxPrix: 0.01,
        couleur: "#94a3b8",
        garanties: "Dégâts légers (incendie mineur, fuite d'eau). Indemnise 30 % du coût des réparations."
    },
    "Standard": {
        couverture: 50,
        braquage: false,
        tauxPrix: 0.025,
        couleur: "#38bdf8",
        garanties: "Sinistres courants et tempêtes modérées. Indemnise 50 % des dégâts subis."
    },
    "Premium": {
        couverture: 75,
        braquage: false,
        tauxPrix: 0.045,
        couleur: "#a855f7",
        garanties: "Catastrophes naturelles (inondation, séisme, tempête) + perte d'exploitation. Indemnise 75 %."
    },
    "Totale": {
        couverture: 100,
        braquage: false,
        tauxPrix: 0.07,
        couleur: "#34d399",
        garanties: "Couverture intégrale (100 %) de tous les dégâts matériels et catastrophes naturelles."
    },
    "Prestige Ultime": {
        couverture: 120,
        braquage: true,
        tauxPrix: 0.10,
        prestigeOnly: true,
        couleur: "#fbbf24",
        garanties: "Indemnisation majorée à 120 % (prime de reconstruction) + bouclier intégral contre les braquages."
    }
};

let guideOuvert = false;

export function initAssurances() {
    loadData();
    afficherBiensAssurables();
}

function estPassePrestigeActif(entreprise) {
    return (
        entreprise.prestigePack === true ||
        entreprise.betaTesteur === true ||
        localStorage.getItem("prestigePack") === "true" ||
        localStorage.getItem("geoEmpireBeta") === "1"
    );
}

function calculerCoutContrat(bien, formule) {
    const valeurLot = (bien.prixAchatMoyen || 15000) * (bien.quantite || 1);
    return Math.max(150, Math.floor(valeurLot * formule.tauxPrix));
}

function afficherBiensAssurables() {
    const entreprise = getEntreprise();
    const container = document.getElementById("assurances");
    if (!container) return;

    const estPrestige = estPassePrestigeActif(entreprise);
    const siegesAvecBiens = (entreprise.commercesGPS || []).filter(s =>
        s.biens && Object.values(s.biens).some(styles => Object.values(styles).some(b => (b.quantite || 0) > 0))
    );

    let totalLots = 0;
    let lotsAssures = 0;
    let capitalGaranti = 0;

    siegesAvecBiens.forEach(s => {
        Object.values(s.biens).forEach(styles => {
            Object.values(styles).forEach(b => {
                if ((b.quantite || 0) > 0) {
                    totalLots++;
                    if (b.assurance) {
                        lotsAssures++;
                        capitalGaranti += Math.floor((b.prixAchatMoyen || 15000) * b.quantite * (b.assurance.couverture / 100));
                    }
                }
            });
        });
    });

    const guideHTML = `
        <div style="margin-bottom:16px; background:rgba(0,30,60,0.9); border:1px solid #38bdf8; border-radius:10px; overflow:hidden;">
            <button type="button" id="btn-toggle-guide-assurances"
                style="width:100%; text-align:left; padding:12px 16px; background:rgba(2,132,199,0.25); border:none; color:#7ec8ff; font-weight:bold; font-size:14px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                <span>📖 Règles du jeu & Guide des Garanties d'Assurance</span>
                <span>${guideOuvert ? "▲ Masquer le guide" : "▼ Consulter les règles"}</span>
            </button>
            ${guideOuvert ? `
                <div style="padding:14px 16px; font-size:13px; color:#e2e8f0; line-height:1.6; border-top:1px solid rgba(56,189,248,0.25);">
                    <p style="margin-top:0;">
                        Vos établissements et biens sont exposés aux <strong>catastrophes naturelles</strong> (tempêtes, inondations, incendies, séismes) ainsi qu'aux <strong>braquages</strong>. Lorsqu'un sinistre frappe un bien, son état général diminue, ce qui réduit ses revenus locatifs jusqu'à sa remise en état dans l'onglet <strong>Rénovation</strong>.
                    </p>
                    <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                        ${Object.entries(ASSURANCES).map(([nom, a]) => `
                            <div style="padding:8px 12px; background:rgba(0,15,35,0.7); border-left:3px solid ${a.couleur}; border-radius:6px;">
                                <strong style="color:${a.couleur};">${nom}</strong> (Tarif : ${(a.tauxPrix * 100).toFixed(1)} % de la valeur du bien • Indemnisation : ${a.couverture} %) — ${a.garanties}
                            </div>
                        `).join("")}
                    </div>
                </div>
            ` : ""}
        </div>
    `;

    if (siegesAvecBiens.length === 0) {
        container.innerHTML = `
            <div class="premium-panel">
                <h2 class="premium-title">Assurances & Protection du Patrimoine</h2>
                ${guideHTML}
                <div class="premium-box" style="text-align:center;">
                    <p>Vous ne possédez encore aucun bien à assurer. Achetez d'abord des biens dans <strong>Catalogue & Gestion</strong>.</p>
                </div>
            </div>
        `;
        bindToggleGuide();
        return;
    }

    container.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                <h2 class="premium-title" style="margin:0;">Assurances & Protection du Patrimoine</h2>
                <span style="background:rgba(0,45,85,0.85); border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                    👤 Souscripteur : <strong>${entreprise.utilisateurActif || entreprise.pdg || "Fondateur"}</strong>
                </span>
            </div>

            ${guideHTML}

            <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:18px;">
                <div style="flex:1; min-width:180px; padding:12px; background:rgba(0,30,60,0.85); border:1px solid #34d399; border-radius:10px;">
                    <div style="font-size:12px; color:#a7f3d0;">Lots assurés</div>
                    <strong style="font-size:20px; color:#34d399;">${lotsAssures} / ${totalLots}</strong>
                </div>
                <div style="flex:1; min-width:180px; padding:12px; background:rgba(0,30,60,0.85); border:1px solid ${totalLots - lotsAssures > 0 ? "#f87171" : "#34d399"}; border-radius:10px;">
                    <div style="font-size:12px; color:#fecaca;">Lots non couverts</div>
                    <strong style="font-size:20px; color:${totalLots - lotsAssures > 0 ? "#f87171" : "#34d399"};">${totalLots - lotsAssures}</strong>
                </div>
                <div style="flex:1; min-width:180px; padding:12px; background:rgba(0,30,60,0.85); border:1px solid #fbbf24; border-radius:10px;">
                    <div style="font-size:12px; color:#fde68a;">Capital garanti</div>
                    <strong style="font-size:20px; color:#fbbf24;">${capitalGaranti.toLocaleString("fr-FR")} Ø</strong>
                </div>
            </div>

            ${siegesAvecBiens.map(siege => `
                <div class="premium-box" style="margin-bottom:20px; border-left:4px solid #38bdf8;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid rgba(56,189,248,0.25); padding-bottom:10px; margin-bottom:14px;">
                        <div>
                            <h3 style="color:#7ec8ff; margin:0; font-size:18px;">🏢 ${siege.nom}</h3>
                            <span style="font-size:12px; color:#94a3b8;">${siege.secteur}</span>
                        </div>
                        <button type="button" class="btn-tout-assurer-siege premium-btn" data-siege="${siege.id}" data-type="${estPrestige ? "Prestige Ultime" : "Totale"}" style="margin:0; padding:8px 14px; font-size:13px; background:${estPrestige ? "#b45309" : "#059669"};">
                            🛡️ Tout couvrir (${estPrestige ? "Prestige Ultime" : "Totale 100 %"})
                        </button>
                    </div>

                    ${Object.entries(siege.biens).map(([categorie, styles]) =>
                        Object.entries(styles)
                            .filter(([, bien]) => (bien.quantite || 0) > 0)
                            .map(([style, bien]) => {
                                const formuleActuelle = bien.assurance ? ASSURANCES[bien.assurance.type] : null;
                                const couleurBordure = formuleActuelle ? formuleActuelle.couleur : "#f87171";

                                return `
                                <div class="bien-item" data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                    style="margin-top:12px; padding:14px; background:rgba(0,22,48,0.85); border-radius:10px; border:1px solid rgba(56,189,248,0.25); border-left:4px solid ${couleurBordure};">
                                    
                                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
                                        <div>
                                            <span style="font-weight:bold; font-size:16px; color:#fff;">${style}</span>
                                            <span style="font-size:12px; color:#7ec8ff; margin-left:6px;">(${categorie} • ${bien.quantite} unité(s))</span>
                                        </div>
                                        <div>
                                            ${bien.assurance
                                                ? `<span style="background:rgba(16,185,129,0.18); border:1px solid ${couleurBordure}; color:${couleurBordure}; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                        🛡️ Couvert : ${bien.assurance.type} (${bien.assurance.couverture} %)
                                                   </span>`
                                                : `<span style="background:rgba(239,68,68,0.18); border:1px solid #f87171; color:#f87171; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                        ⚠️ Non assuré
                                                   </span>`
                                            }
                                        </div>
                                    </div>

                                    <div style="display:flex; flex-direction:column; gap:8px;">
                                        ${genererLignesFormules(bien, estPrestige)}
                                    </div>
                                </div>
                                `;
                            }).join("")
                    ).join("")}
                </div>
            `).join("")}
        </div>
    `;

    bindToggleGuide();
    bindAssuranceEvents();
}

function genererLignesFormules(bien, estPrestige) {
    let html = "";
    for (const [nom, a] of Object.entries(ASSURANCES)) {
        if (a.prestigeOnly && !estPrestige) continue;
        const coutTotal = calculerCoutContrat(bien, a);
        const estActif = bien.assurance?.type === nom;

        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:9px 12px; border-radius:8px; background:${estActif ? "rgba(16,185,129,0.15)" : "rgba(15,23,42,0.8)"}; border:1px solid ${estActif ? a.couleur : "rgba(148,163,184,0.22)"};">
                <div style="flex:1; min-width:220px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <strong style="color:${a.couleur}; font-size:14px;">${nom}</strong>
                        <span style="background:rgba(255,255,255,0.1); color:#fff; padding:2px 7px; border-radius:4px; font-size:11px; font-weight:bold;">
                            Indemnisation ${a.couverture} %
                        </span>
                    </div>
                    <div style="font-size:12px; color:#cbd5e1; margin-top:3px;">${a.garanties}</div>
                </div>
                <div>
                    ${estActif
                        ? `<span style="color:#34d399; font-weight:bold; font-size:13px; padding:6px 12px; display:inline-block;">✓ Contrat actif</span>`
                        : `<button type="button" class="assurance-line-btn premium-btn" data-type="${nom}" style="margin:0; padding:7px 14px; font-size:13px; background:#0284c7;">
                                Souscrire (${coutTotal.toLocaleString("fr-FR")} Ø)
                           </button>`
                    }
                </div>
            </div>
        `;
    }
    return html;
}

function bindToggleGuide() {
    const btnGuide = document.getElementById("btn-toggle-guide-assurances");
    if (btnGuide) {
        btnGuide.onclick = () => {
            guideOuvert = !guideOuvert;
            afficherBiensAssurables();
        };
    }
}

function bindAssuranceEvents() {
    const container = document.getElementById("assurances");
    if (!container) return;

    container.querySelectorAll(".assurance-line-btn").forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            const formule = ASSURANCES[type];
            const item = btn.closest(".bien-item");
            const siegeId = item.dataset.siege;
            const categorie = item.dataset.cat;
            const style = item.dataset.style;

            const ent = getEntreprise();
            const auteur = ent.utilisateurActif || ent.pdg || "Fondateur";
            const siege = (ent.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[categorie]?.[style];
            if (!bien) return;

            const coutTotal = calculerCoutContrat(bien, formule);
            if ((ent.argent || 0) < coutTotal) {
                alert(`Fonds insuffisants ! Coût du contrat : ${coutTotal.toLocaleString("fr-FR")} Ø.`);
                return;
            }

            ent.argent -= coutTotal;
            bien.assurance = {
                type,
                couverture: formule.couverture,
                braquage: formule.braquage,
                souscritPar: auteur
            };

            ajouterHistorique(`[${siege.nom}] Souscription assurance "${type}" sur ${style} (-${coutTotal.toLocaleString("fr-FR")} Ø)`, "depense", auteur);
            sauvegarderEntreprise();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = ent.argent.toLocaleString("fr-FR");

            afficherBiensAssurables();
        };
    });

    container.querySelectorAll(".btn-tout-assurer-siege").forEach(btn => {
        btn.onclick = () => {
            const siegeId = btn.dataset.siege;
            const type = btn.dataset.type;
            const formule = ASSURANCES[type];

            const ent = getEntreprise();
            const auteur = ent.utilisateurActif || ent.pdg || "Fondateur";
            const siege = (ent.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            if (!siege?.biens) return;

            let coutGlobal = 0;
            const aAssurer = [];

            for (const [cat, styles] of Object.entries(siege.biens)) {
                for (const [style, bien] of Object.entries(styles)) {
                    if ((bien.quantite || 0) > 0 && bien.assurance?.type !== type) {
                        coutGlobal += calculerCoutContrat(bien, formule);
                        aAssurer.push({ cat, style, bien });
                    }
                }
            }

            if (aAssurer.length === 0) {
                return alert(`Tous les biens de "${siege.nom}" disposent déjà de la formule "${type}".`);
            }

            if ((ent.argent || 0) < coutGlobal) {
                return alert(`Fonds insuffisants ! Il vous faut ${coutGlobal.toLocaleString("fr-FR")} Ø pour assurer l'ensemble de cette entreprise.`);
            }

            ent.argent -= coutGlobal;
            aAssurer.forEach(({ bien }) => {
                bien.assurance = {
                    type,
                    couverture: formule.couverture,
                    braquage: formule.braquage,
                    souscritPar: auteur
                };
            });

            ajouterHistorique(`[${siege.nom}] Couverture intégrale "${type}" sur ${aAssurer.length} lot(s) (-${coutGlobal.toLocaleString("fr-FR")} Ø)`, "depense", auteur);
            sauvegarderEntreprise();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = ent.argent.toLocaleString("fr-FR");

            afficherBiensAssurables();
        };
    });
}

window.initAssurances = initAssurances;
