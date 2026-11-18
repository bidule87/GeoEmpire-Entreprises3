// ============================================
// ASSURANCES — COUVERTURE DES BIENS PAR ENTREPRISE
// ============================================

import { getEntreprise, sauvegarderEntreprise } from "../entrepriseCore.js";
import { ajouterHistorique, loadData } from "../geoData.js";

const ASSURANCES = {
    "Basique": {
        couverture: 30,
        braquage: false,
        coutMultiplicateur: 0.01,
        couleur: "#94a3b8",
        description: "Indemnisation minimale (30 %) en cas d'incendie ou dégât des eaux."
    },
    "Standard": {
        couverture: 50,
        braquage: false,
        coutMultiplicateur: 0.02,
        couleur: "#38bdf8",
        description: "Couverture équilibrée (50 %) sur les sinistres matériels courants."
    },
    "Premium": {
        couverture: 70,
        braquage: false,
        coutMultiplicateur: 0.05,
        couleur: "#a855f7",
        description: "Haute protection (70 %) incluant les pertes d'exploitation."
    },
    "Totale": {
        couverture: 100,
        braquage: false,
        coutMultiplicateur: 0.08,
        couleur: "#34d399",
        description: "Remboursement intégral (100 %) de la valeur d'acquisition du bien."
    },
    "Prestige Ultime": {
        couverture: 120,
        braquage: true,
        coutMultiplicateur: 0.03,
        prestigeOnly: true,
        couleur: "#fbbf24",
        description: "Indemnisation majorée (120 %) + protection complète contre les braquages."
    }
};

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
    return Math.max(100, Math.floor((bien.prixAchatMoyen || 15000) * formule.coutMultiplicateur * (bien.quantite || 1)));
}

function afficherBiensAssurables() {
    const entreprise = getEntreprise();
    const container = document.getElementById("assurances");
    if (!container) return;

    const siegesAvecBiens = (entreprise.commercesGPS || []).filter(s =>
        s.biens && Object.values(s.biens).some(styles => Object.values(styles).some(b => (b.quantite || 0) > 0))
    );

    if (siegesAvecBiens.length === 0) {
        container.innerHTML = `
            <div class="premium-panel">
                <h2 class="premium-title">Assurances & Protection du Patrimoine</h2>
                <div class="premium-box" style="text-align:center;">
                    <p>Vous ne possédez encore aucun bien à assurer. Achetez d'abord des biens dans <strong>Catalogue & Gestion</strong>.</p>
                </div>
            </div>
        `;
        return;
    }

    const estPrestige = estPassePrestigeActif(entreprise);

    // Compteurs globaux de couverture
    let totalLots = 0;
    let lotsAssures = 0;
    let valeurProtegee = 0;

    siegesAvecBiens.forEach(s => {
        Object.values(s.biens).forEach(styles => {
            Object.values(styles).forEach(b => {
                if ((b.quantite || 0) > 0) {
                    totalLots++;
                    if (b.assurance) {
                        lotsAssures++;
                        valeurProtegee += Math.floor((b.prixAchatMoyen || 15000) * b.quantite * (b.assurance.couverture / 100));
                    }
                }
            });
        });
    });

    const lotsExposes = totalLots - lotsAssures;

    container.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                <h2 class="premium-title" style="margin:0;">Assurances & Protection du Patrimoine</h2>
                <span style="background:rgba(0,45,85,0.85); border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                    👤 Souscripteur : <strong>${entreprise.utilisateurActif || entreprise.pdg || "Fondateur"}</strong>
                </span>
            </div>

            <!-- SYNTHÈSE DE COUVERTURE -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:18px;">
                <div class="stat-item" style="border:1px solid #34d399;">
                    <div style="font-size:12px; color:#a7f3d0;">Biens couverts</div>
                    <strong style="font-size:20px; color:#34d399;">${lotsAssures} / ${totalLots}</strong>
                </div>
                <div class="stat-item" style="border:1px solid ${lotsExposes > 0 ? "#f87171" : "#34d399"};">
                    <div style="font-size:12px; color:${lotsExposes > 0 ? "#fecaca" : "#a7f3d0"};">Biens exposés (non assurés)</div>
                    <strong style="font-size:20px; color:${lotsExposes > 0 ? "#f87171" : "#34d399"};">${lotsExposes}</strong>
                </div>
                <div class="stat-item" style="border:1px solid #fbbf24;">
                    <div style="font-size:12px; color:#fde68a;">Capital garanti</div>
                    <strong style="font-size:20px; color:#fbbf24;">${valeurProtegee.toLocaleString("fr-FR")} Ø</strong>
                </div>
            </div>

            <!-- LISTE DES ENTREPRISES & CONTRATS -->
            ${siegesAvecBiens.map(siege => `
                <div class="premium-box" style="margin-bottom:20px; border-left:4px solid #38bdf8;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid rgba(56,189,248,0.25); padding-bottom:10px; margin-bottom:14px;">
                        <div>
                            <h3 style="color:#7ec8ff; margin:0; font-size:18px;">🏢 ${siege.nom}</h3>
                            <span style="font-size:12px; color:#94a3b8;">${siege.secteur}</span>
                        </div>
                        <button type="button" class="btn-tout-assurer-siege premium-btn" data-siege="${siege.id}" data-type="${estPrestige ? "Prestige Ultime" : "Totale"}" style="margin:0; padding:7px 14px; font-size:12px; background:${estPrestige ? "#b45309" : "#059669"};">
                            🛡️ Tout couvrir (${estPrestige ? "Prestige Ultime" : "Totale 100 %"})
                        </button>
                    </div>

                    ${Object.entries(siege.biens).map(([categorie, styles]) =>
                        Object.entries(styles)
                            .filter(([, bien]) => (bien.quantite || 0) > 0)
                            .map(([style, bien]) => {
                                const formuleActuelle = bien.assurance ? ASSURANCES[bien.assurance.type] : null;
                                const couleurBordure = formuleActuelle ? formuleActuelle.couleur : "#f87171";

                                const statutBadge = bien.assurance
                                    ? `<span style="background:rgba(16,185,129,0.18); border:1px solid ${couleurBordure}; color:${couleurBordure}; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold;">
                                            🛡️ ${bien.assurance.type} (${bien.assurance.couverture} %${bien.assurance.braquage ? " + Anti-braquage" : ""})
                                       </span>`
                                    : `<span style="background:rgba(239,68,68,0.18); border:1px solid #f87171; color:#f87171; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold;">
                                            ⚠️ Non assuré — Risque maximal
                                       </span>`;

                                return `
                                <div class="bien-item" data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                    style="margin-top:12px; padding:14px; background:rgba(0,25,52,0.8); border-radius:10px; border:1px solid rgba(56,189,248,0.25); border-left:3px solid ${couleurBordure};">
                                    
                                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
                                        <div>
                                            <span style="font-weight:bold; font-size:16px; color:#fff;">${style}</span>
                                            <span style="font-size:12px; color:#7ec8ff; margin-left:6px;">(${categorie} • ${bien.quantite} unité(s))</span>
                                            ${bien.assurance ? `<div style="font-size:11px; color:#94a3b8; margin-top:2px;">Contrat validé par ${bien.assurance.souscritPar || entreprise.pdg}</div>` : ""}
                                        </div>
                                        <div>${statutBadge}</div>
                                    </div>

                                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(175px, 1fr)); gap:8px;">
                                        ${genererCartesFormules(bien, estPrestige)}
                                    </div>
                                </div>
                                `;
                            }).join("")
                    ).join("")}
                </div>
            `).join("")}
        </div>
    `;

    // Souscription individuelle sur un bien
    container.querySelectorAll(".assurance-card-btn").forEach(btn => {
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

            if (bien.assurance?.type === type) {
                return alert(`Ce bien est déjà couvert par la formule "${type}".`);
            }

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

    // Souscription groupée sur toute une entreprise
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

function genererCartesFormules(bien, estPrestige) {
    let html = "";
    for (const [nom, a] of Object.entries(ASSURANCES)) {
        if (a.prestigeOnly && !estPrestige) continue;
        const coutTotal = calculerCoutContrat(bien, a);
        const estActif = bien.assurance?.type === nom;

        html += `
            <button type="button" class="assurance-card-btn" data-type="${nom}"
                style="text-align:left; padding:10px; border-radius:8px; cursor:pointer; transition:transform 0.15s ease;
                       background:${estActif ? "rgba(16, 185, 129, 0.22)" : "rgba(15, 23, 42, 0.85)"};
                       border:${estActif ? `2px solid ${a.couleur}` : "1px solid rgba(148, 163, 184, 0.3)"};
                       color:#fff;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="color:${a.couleur}; font-size:13px;">${nom}</strong>
                    <span style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">
                        ${a.couverture} %
                    </span>
                </div>
                <div style="font-size:11px; color:#cbd5e1; line-height:1.35; margin-bottom:6px; min-height:30px;">
                    ${a.description}
                </div>
                <div style="font-size:13px; font-weight:bold; color:${estActif ? "#34d399" : "#fbbf24"};">
                    ${estActif ? "✓ Contrat actif" : `${coutTotal.toLocaleString("fr-FR")} Ø`}
                </div>
            </button>
        `;
    }
    return html;
}

window.initAssurances = initAssurances;
