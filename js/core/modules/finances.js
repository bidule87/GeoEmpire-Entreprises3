// ============================================
//  FINANCES — TRÉSORERIE DÉTAILLÉE & RÉSULTAT
// ============================================

import { getEntreprise, calculerValeurEntreprise } from "../entrepriseCore.js";

export function initFinances() {
    const zone = document.getElementById("finances");
    if (!zone) return;

    const e = getEntreprise();
    const f = e.finances || {};

    const tresorerie = e.argent || 0;
    const valeurActifs = calculerValeurEntreprise();

    const recettesVentes = f.revenusVentes || 0;
    const recettesLocations = (f.revenusLocations || 0) + (f.revenusCommerces || 0);
    const totalRecettes = recettesVentes + recettesLocations + (f.primes || 0);

    const depensesMarketing = f.depensesMarketing || 0;
    const impotsMairie = e.caisseMairie || f.impotsVersesMairie || 0;
    const pertesSinistres = f.pertesSinistres || 0;
    const totalDebits = depensesMarketing + impotsMairie + pertesSinistres;

    const ventesProgrammeesMontant = (e.ventesEnAttente || []).reduce((acc, o) => acc + (o.gainNetEstime || 0), 0);

    zone.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Tableau Financier & Trésorerie</h2>

            <!-- BLOC 1 : TRÉSORERIE & FLUX EN COURS -->
            <div class="premium-box" style="margin-bottom:18px;">
                <h3 style="color:#7ec8ff; margin-top:0;">💳 Trésorerie & Mouvements</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
                    <div class="stat-item" style="border:1px solid #38bdf8;">
                        <div style="font-size:12px; color:#bae6fd;">Trésorerie disponible</div>
                        <strong style="font-size:20px; color:#38bdf8;">${tresorerie.toLocaleString("fr-FR")} Ø</strong>
                    </div>
                    <div class="stat-item" style="border:1px solid #34d399;">
                        <div style="font-size:12px; color:#a7f3d0;">Recettes Ventes encaissées</div>
                        <strong style="font-size:18px; color:#34d399;">+${recettesVentes.toLocaleString("fr-FR")} Ø</strong>
                    </div>
                    <div class="stat-item" style="border:1px solid #34d399;">
                        <div style="font-size:12px; color:#a7f3d0;">Recettes Locations encaissées</div>
                        <strong style="font-size:18px; color:#34d399;">+${recettesLocations.toLocaleString("fr-FR")} Ø</strong>
                    </div>
                    <div class="stat-item" style="border:1px solid #f87171;">
                        <div style="font-size:12px; color:#fecaca;">Total Débits & Impôts Mairie</div>
                        <strong style="font-size:18px; color:#f87171;">-${totalDebits.toLocaleString("fr-FR")} Ø</strong>
                    </div>
                </div>
            </div>

            <!-- BLOC 2 : COMPTE DE RÉSULTAT & BILAN -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:16px;">
                <div class="premium-box">
                    <h3 style="color:#34d399; margin-top:0;">📈 Compte de Résultat</h3>
                    <div style="display:flex; flex-direction:column; gap:8px; font-size:14px;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>Ventes réalisées :</span>
                            <strong style="color:#34d399;">+${recettesVentes.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Loyers encaissés :</span>
                            <strong style="color:#34d399;">+${recettesLocations.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Ventes programmées (prochaine clôture) :</span>
                            <strong style="color:#fbbf24;">+${ventesProgrammeesMontant.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <hr style="border-color:rgba(255,255,255,0.1);">
                        <div style="display:flex; justify-content:space-between;">
                            <span>Budget Marketing engagé :</span>
                            <strong style="color:#f87171;">-${depensesMarketing.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Impôts & Taxes versés à la Mairie :</span>
                            <strong style="color:#f87171;">-${impotsMairie.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Pertes & Sinistres :</span>
                            <strong style="color:#f87171;">-${pertesSinistres.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                    </div>
                </div>

                <div class="premium-box">
                    <h3 style="color:#fbbf24; margin-top:0;">⚖️ Bilan Patrimonial</h3>
                    <div style="display:flex; flex-direction:column; gap:8px; font-size:14px;">
                        <div style="display:flex; justify-content:space-between;">
                            <span>Liquidités en banque :</span>
                            <strong>${tresorerie.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span>Valeur des entreprises & biens :</span>
                            <strong>${valeurActifs.toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <hr style="border-color:rgba(255,255,255,0.1);">
                        <div style="display:flex; justify-content:space-between; font-size:16px;">
                            <span>Actif Net Total :</span>
                            <strong style="color:#fbbf24;">${(tresorerie + valeurActifs).toLocaleString("fr-FR")} Ø</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-top:6px;">
                            <span>Résultat d'exploitation cumulé :</span>
                            <strong style="color:${totalRecettes - totalDebits >= 0 ? "#34d399" : "#f87171"};">
                                ${(totalRecettes - totalDebits).toLocaleString("fr-FR")} Ø
                            </strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.initFinances = initFinances;
