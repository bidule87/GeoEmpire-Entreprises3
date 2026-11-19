// =======================================
// GEO EMPIRE — MODULE RÉNOVATION (TARIF DÉGRESSIF & STANDING)
// =======================================

import { getEntreprise, sauvegarderEntreprise } from "../entrepriseCore.js";
import { ajouterHistorique, loadData } from "../geoData.js";

const STANDINGS = {
    1: { nom: "Rénové", bonus: 0.10, cout: 0.05 },
    2: { nom: "Amélioré", bonus: 0.25, cout: 0.12 },
    3: { nom: "Premium", bonus: 0.50, cout: 0.20 },
    4: { nom: "Luxe", bonus: 0.80, cout: 0.35 },
    5: { nom: "Ultime", bonus: 1.20, cout: 0.50, prestigeOnly: true }
};

export function initRenovation() {
    loadData();
    afficherBiensARenover();
}

// Coût dégressif : plus le bien est endommagé, plus la remise de chantier est élevée (jusqu'à -35 %)
export function calculerCoutReparationDegressif(bien) {
    const etat = typeof bien.etat === "number" ? bien.etat : 100;
    const degats = Math.max(0, 100 - etat);
    if (degats === 0) return { cout: 0, remisePct: 0, degats: 0 };

    const valeurLot = (bien.prixAchatMoyen || 15000) * (bien.quantite || 1);
    const coutBrut = valeurLot * 0.45 * (degats / 100);

    // Remise dégressive selon l'ampleur des travaux (de 5 % à 35 %)
    const remise = Math.min(0.35, 0.05 + (degats / 100) * 0.30);
    const coutFinal = Math.max(200, Math.floor(coutBrut * (1 - remise)));

    return {
        cout: coutFinal,
        remisePct: Math.round(remise * 100),
        degats
    };
}

function afficherBiensARenover() {
    const entreprise = getEntreprise();
    const container = document.getElementById("renovation");
    if (!container) return;

    const estPrestige = entreprise.prestigePack === true || entreprise.betaTesteur === true || localStorage.getItem("prestigePack") === "true";
    const siegesAvecBiens = (entreprise.commercesGPS || []).filter(s =>
        s.biens && Object.values(s.biens).some(styles => Object.values(styles).some(b => (b.quantite || 0) > 0))
    );

    if (siegesAvecBiens.length === 0) {
        container.innerHTML = `
            <div class="premium-panel">
                <h2 class="premium-title">Rénovation & Remise en État</h2>
                <div class="premium-box" style="text-align:center;">
                    <p>Vous ne possédez encore aucun bien à entretenir ou rénover.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                <h2 class="premium-title" style="margin:0;">Rénovation & Remise en État</h2>
                <span style="background:rgba(0,45,85,0.85); border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                    Tarif dégressif appliqué automatiquement sur les gros chantiers
                </span>
            </div>

            ${siegesAvecBiens.map(siege => `
                <div class="premium-box" style="margin-bottom:20px; border-left:4px solid #38bdf8;">
                    <h3 style="color:#7ec8ff; margin-top:0; border-bottom:1px solid rgba(56,189,248,0.25); padding-bottom:8px;">
                        🏢 ${siege.nom} <span style="font-size:12px; color:#94a3b8;">(${siege.secteur})</span>
                    </h3>

                    ${Object.entries(siege.biens).map(([categorie, styles]) =>
                        Object.entries(styles)
                            .filter(([, bien]) => (bien.quantite || 0) > 0)
                            .map(([style, bien]) => {
                                if (typeof bien.etat !== "number") bien.etat = 100;
                                if (!bien.renovation) bien.renovation = { niveau: 0, bonusValeur: 0 };

                                const etat = bien.etat;
                                const couleurEtat = etat >= 80 ? "#34d399" : (etat >= 45 ? "#fbbf24" : "#f87171");
                                const devis = calculerCoutReparationDegressif(bien);
                                const niveauActuel = bien.renovation.niveau || 0;

                                return `
                                <div class="bien-item" data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}"
                                    style="margin-top:12px; padding:14px; background:rgba(0,22,48,0.85); border-radius:10px; border:1px solid rgba(56,189,248,0.25); border-left:4px solid ${couleurEtat};">
                                    
                                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
                                        <div>
                                            <strong style="font-size:16px; color:#fff;">${style}</strong>
                                            <span style="font-size:12px; color:#7ec8ff; margin-left:6px;">(${categorie} • ${bien.quantite} unité(s))</span>
                                        </div>
                                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                            <span style="background:rgba(0,0,0,0.4); border:1px solid ${couleurEtat}; color:${couleurEtat}; padding:3px 9px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                État structurel : ${etat} %
                                            </span>
                                            <span style="background:rgba(56,189,248,0.18); color:#bae6fd; padding:3px 9px; border-radius:6px; font-size:12px; font-weight:bold;">
                                                Standing : Niveau ${niveauActuel} ${niveauActuel > 0 ? `(+${Math.round(bien.renovation.bonusValeur * 100)} % loyers)` : ""}
                                            </span>
                                        </div>
                                    </div>

                                    <div style="width:100%; height:8px; background:rgba(0,0,0,0.5); border-radius:5px; overflow:hidden; margin-bottom:10px;">
                                        <div style="width:${etat}%; height:100%; background:${couleurEtat};"></div>
                                    </div>

                                    ${devis.degats > 0 ? `
                                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(239,68,68,0.15); border:1px solid #f87171; border-radius:8px; margin-bottom:10px;">
                                            <div style="font-size:13px; color:#fecaca;">
                                                ⚠️ <strong>Sinistre détecté (${devis.degats} % de dégâts)</strong> — Remise chantier dégressive : <strong style="color:#34d399;">-${devis.remisePct} %</strong>
                                            </div>
                                            <button type="button" class="btn-reparer-sinistre premium-btn" style="margin:0; padding:7px 14px; font-size:13px; background:#059669;">
                                                🔧 Remettre à neuf (${devis.cout.toLocaleString("fr-FR")} Ø)
                                            </button>
                                        </div>
                                    ` : ""}

                                    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
                                        <span style="font-size:12px; color:#94a3b8;">Améliorer le standing :</span>
                                        ${genererBoutonsStanding(bien, estPrestige)}
                                    </div>
                                </div>
                                `;
                            }).join("")
                    ).join("")}
                </div>
            `).join("")}
        </div>
    `;

    bindRenovationEvents();
}

function genererBoutonsStanding(bien, estPrestige) {
    let html = "";
    const niveauActuel = bien.renovation?.niveau || 0;

    for (const [nivStr, r] of Object.entries(STANDINGS)) {
        const niv = Number(nivStr);
        if (r.prestigeOnly && !estPrestige) continue;
        if (niveauActuel >= niv) continue;

        const cout = Math.floor((bien.prixAchatMoyen || 15000) * r.cout * (bien.quantite || 1));
        html += `
            <button type="button" class="btn-standing premium-btn" data-niveau="${niv}" style="margin:0; padding:6px 12px; font-size:12px; background:#0284c7;">
                Niv.${niv} ${r.nom} (+${Math.round(r.bonus * 100)} % revenus) — ${cout.toLocaleString("fr-FR")} Ø
            </button>
        `;
    }

    return html || `<span style="font-size:12px; color:#34d399; font-weight:bold;">✓ Standing maximal atteint</span>`;
}

function bindRenovationEvents() {
    const container = document.getElementById("renovation");
    if (!container) return;

    // Réparation dégressive suite à sinistre / catastrophe naturelle
    container.querySelectorAll(".btn-reparer-sinistre").forEach(btn => {
        btn.onclick = () => {
            const item = btn.closest(".bien-item");
            const siegeId = item.dataset.siege;
            const cat = item.dataset.cat;
            const style = item.dataset.style;

            const ent = getEntreprise();
            const auteur = ent.utilisateurActif || ent.pdg || "Fondateur";
            const siege = (ent.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            const devis = calculerCoutReparationDegressif(bien);
            if ((ent.argent || 0) < devis.cout) {
                return alert(`Fonds insuffisants ! Coût des travaux : ${devis.cout.toLocaleString("fr-FR")} Ø.`);
            }

            ent.argent -= devis.cout;
            bien.etat = 100;

            ajouterHistorique(`[${siege.nom}] Remise à neuf de ${style} (remise dégressive -${devis.remisePct} %) : -${devis.cout.toLocaleString("fr-FR")} Ø`, "depense", auteur);
            sauvegarderEntreprise();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = ent.argent.toLocaleString("fr-FR");

            afficherBiensARenover();
        };
    });

    // Montée en gamme / standing
    container.querySelectorAll(".btn-standing").forEach(btn => {
        btn.onclick = () => {
            const niv = Number(btn.dataset.niveau);
            const r = STANDINGS[niv];
            const item = btn.closest(".bien-item");
            const siegeId = item.dataset.siege;
            const cat = item.dataset.cat;
            const style = item.dataset.style;

            const ent = getEntreprise();
            const auteur = ent.utilisateurActif || ent.pdg || "Fondateur";
            const siege = (ent.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[cat]?.[style];
            if (!bien) return;

            const cout = Math.floor((bien.prixAchatMoyen || 15000) * r.cout * (bien.quantite || 1));
            if ((ent.argent || 0) < cout) {
                return alert(`Fonds insuffisants ! Il vous faut ${cout.toLocaleString("fr-FR")} Ø.`);
            }

            ent.argent -= cout;
            bien.renovation = { niveau: niv, bonusValeur: r.bonus };

            ajouterHistorique(`[${siege.nom}] Rénovation standing "${r.nom}" sur ${style} (-${cout.toLocaleString("fr-FR")} Ø)`, "depense", auteur);
            sauvegarderEntreprise();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = ent.argent.toLocaleString("fr-FR");

            afficherBiensARenover();
        };
    });
}

window.initRenovation = initRenovation;
