// ============================================
//  PATRIMOINE & DOUBLE CLASSEMENT ANTI-PAY-TO-WIN (GLOBAL + HOLDINGS)
// ============================================

import { getEntreprise, calculerValeurEntreprise } from "../entrepriseCore.js";

const JOUEURS_SIMULES = [
    { nom: "Alexandre_Lyon", groupe: "Rhône Invest", patrimoine: 1850000, holding: "Rhône Capital Holding", nbEntreprises: 14 },
    { nom: "Sophie_Bordeaux", groupe: "Aquitaine Immo", patrimoine: 1240000, holding: "Aquitaine Holding", nbEntreprises: 11 },
    { nom: "Marc_Bruxelles", groupe: "Benelux Trade", patrimoine: 890000, holding: "Benelux Group Holding", nbEntreprises: 10 },
    { nom: "Ines_Montreal", groupe: "Saint-Laurent Co", patrimoine: 420000, holding: null, nbEntreprises: 6 },
    { nom: "Lucas_Reunion", groupe: "Bourbon Services", patrimoine: 210000, holding: null, nbEntreprises: 4 },
    { nom: "Chloe_Nantes", groupe: "Atlantique Food", patrimoine: 95000, holding: null, nbEntreprises: 2 }
];

export function initPatrimoine() {
    const zone = document.getElementById("patrimoine");
    if (!zone) return;

    const e = getEntreprise();
    const valeurActifs = calculerValeurEntreprise();
    const tresorerie = e.argent || 0;
    const patrimoineBrut = tresorerie + valeurActifs;
    const capitalBoutique = Number(e.capitalInjecteBoutique || 0);
    const scoreClassement = Math.max(0, patrimoineBrut - capitalBoutique);
    const nbEntreprises = (e.commercesGPS || []).length;

    const joueurActuel = {
        nom: `${e.pdg} (Vous)`,
        groupe: e.nom,
        patrimoine: scoreClassement,
        holding: e.holding?.active ? e.holding.nom : null,
        nbEntreprises,
        estMoi: true
    };

    // 1. Classement Général — Mérite en jeu (hors injections boutique)
    const classementGlobal = [...JOUEURS_SIMULES, joueurActuel]
        .sort((a, b) => b.patrimoine - a.patrimoine);

    // 2. Classement Général — Holdings
    const classementHoldings = [...JOUEURS_SIMULES, joueurActuel]
        .filter(j => Boolean(j.holding))
        .sort((a, b) => b.patrimoine - a.patrimoine);

    zone.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Patrimoine & Classements Généraux</h2>

            <div class="premium-box" style="margin-bottom:18px;">
                <h3 style="color:#7ec8ff; margin-top:0;">Synthèse de votre Patrimoine</h3>
                <div class="entreprise-stats">
                    <div class="stat-item">Trésorerie liquide : <strong>${tresorerie.toLocaleString("fr-FR")} Ø</strong></div>
                    <div class="stat-item">Valeur des entreprises & biens : <strong>${valeurActifs.toLocaleString("fr-FR")} Ø</strong></div>
                    <div class="stat-item">Patrimoine Brut : <strong>${patrimoineBrut.toLocaleString("fr-FR")} Ø</strong></div>
                    <div class="stat-item" style="border:1px solid #34d399;">
                        Score Classement (Mérite en jeu) :
                        <strong style="color:#34d399; font-size:18px;">${scoreClassement.toLocaleString("fr-FR")} Ø</strong>
                    </div>
                    <div class="stat-item">Statut Holding : <strong>${e.holding?.active ? `🏛️ ${e.holding.nom}` : `Non fondée (${nbEntreprises}/10 entreprises)`}</strong></div>
                </div>
                <p style="margin:10px 0 0 0; font-size:12px; color:#94a3b8;">
                    ⚖️ <strong>Équité du classement :</strong> les fonds convertis depuis la Boutique ne sont pas comptabilisés dans le Score Classement. Seuls vos revenus et actifs bâtis en jeu comptent.
                </p>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px, 1fr)); gap:16px;">
                <!-- CLASSEMENT 1 : PATRIMOINE MÉRITE -->
                <div class="premium-box">
                    <h3 style="color:#38bdf8; margin-top:0;">🌍 Classement Général — Mérite en Jeu</h3>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${classementGlobal.map((j, index) => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-radius:8px; background:${j.estMoi ? "rgba(56,189,248,0.25)" : "rgba(0,20,45,0.7)"}; border:${j.estMoi ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.08)"};">
                                <div>
                                    <strong style="color:#fbbf24; margin-right:6px;">#${index + 1}</strong>
                                    <strong>${j.nom}</strong>
                                    <div style="font-size:12px; color:#94a3b8;">${j.groupe} • ${j.nbEntreprises} entreprise(s)</div>
                                </div>
                                <strong style="color:#34d399;">${j.patrimoine.toLocaleString("fr-FR")} Ø</strong>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <!-- CLASSEMENT 2 : HOLDINGS -->
                <div class="premium-box" style="border:1px solid rgba(251,191,36,0.45);">
                    <h3 style="color:#fbbf24; margin-top:0;">🏛️ Classement Général — Holdings</h3>
                    ${!e.holding?.active ? `
                        <p style="font-size:12px; color:#fde68a; background:rgba(245,158,11,0.15); padding:8px; border-radius:6px;">
                            Atteignez <strong>10 entreprises</strong> pour fonder votre Holding et entrer dans ce classement !
                        </p>
                    ` : ""}
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${classementHoldings.map((j, index) => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-radius:8px; background:${j.estMoi ? "rgba(251,191,36,0.22)" : "rgba(0,20,45,0.7)"}; border:${j.estMoi ? "1px solid #fbbf24" : "1px solid rgba(255,255,255,0.08)"};">
                                <div>
                                    <strong style="color:#fbbf24; margin-right:6px;">#${index + 1}</strong>
                                    <strong style="color:#fde68a;">${j.holding}</strong>
                                    <div style="font-size:12px; color:#cbd5e1;">PDG : ${j.nom} • ${j.nbEntreprises} filiales</div>
                                </div>
                                <strong style="color:#fbbf24;">${j.patrimoine.toLocaleString("fr-FR")} Ø</strong>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.initPatrimoine = initPatrimoine;
