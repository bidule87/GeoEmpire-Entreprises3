// ============================================
//  HISTORIQUE — COMPTABILITÉ ENTREPRISES (AVEC AUTEUR)
// ============================================

import { getData } from "../geoData.js";

export function initHistorique() {
    const zone = document.getElementById("historique");
    if (!zone) return;

    const e = getData().entreprise;
    const liste = e.historique || [];

    const badgesType = {
        achat: { label: "ACHAT", couleur: "#38bdf8" },
        gain: { label: "RECETTE", couleur: "#34d399" },
        depense: { label: "DÉPENSE", couleur: "#f87171" },
        gestion: { label: "GOUVERNANCE / ORDRES", couleur: "#fbbf24" },
        prestige: { label: "HOLDING / PRESTIGE", couleur: "#c084fc" },
        boutique: { label: "BOUTIQUE", couleur: "#f472b6" },
        info: { label: "INFO", couleur: "#94a3b8" }
    };

    zone.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Journal Comptable & Traçabilité (${liste.length})</h2>
            <div class="premium-box">
                ${liste.length === 0 ? `
                    <p style="color:#94a3b8;">Aucune écriture comptable enregistrée pour le moment.</p>
                ` : `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${liste.map(item => {
                            const texte = item.message || item.texte || "Opération enregistrée";
                            const auteur = item.auteur || e.pdg || "Fondateur";
                            const cfg = badgesType[item.type] || badgesType.info;
                            return `
                                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding:10px 12px; background:rgba(0,25,55,0.75); border-left:4px solid ${cfg.couleur}; border-radius:8px;">
                                    <div>
                                        <span style="background:rgba(255,255,255,0.1); color:${cfg.couleur}; padding:2px 7px; border-radius:5px; font-size:11px; font-weight:bold; margin-right:6px;">${cfg.label}</span>
                                        <span style="background:rgba(251,191,36,0.15); color:#fde68a; border:1px solid rgba(251,191,36,0.4); padding:2px 7px; border-radius:5px; font-size:11px; font-weight:bold; margin-right:8px;">👤 ${auteur}</span>
                                        <span style="font-size:14px; color:#f1f5f9;">${texte}</span>
                                    </div>
                                    <span style="font-size:12px; color:#94a3b8;">${item.date || ""}</span>
                                </div>
                            `;
                        }).join("")}
                    </div>
                `}
            </div>
        </div>
    `;
}

window.initHistorique = initHistorique;
