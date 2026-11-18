import { getEntreprise, sauvegarderEntreprise } from "../entrepriseCore.js";
import { ajouterHistorique } from "../geoData.js";

const ASSURANCES = {
    "Basique": { couverture: 30, braquage: false, coutMultiplicateur: 0.01 },
    "Standard": { couverture: 50, braquage: false, coutMultiplicateur: 0.02 },
    "Premium": { couverture: 70, braquage: false, coutMultiplicateur: 0.05 },
    "Totale": { couverture: 100, braquage: false, coutMultiplicateur: 0.08 },
    "Prestige Ultime": { couverture: 120, braquage: true, coutMultiplicateur: 0.03, prestigeOnly: true }
};

export function initAssurances() {
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
                <h2 class="premium-title">Assurances des Biens</h2>
                <div class="premium-box">
                    <p>Vous ne possédez encore aucun bien à assurer. Achetez d'abord des biens dans <strong>Catalogue & Gestion</strong>.</p>
                </div>
            </div>
        `;
        return;
    }

    const estPrestige = estPassePrestigeActif(entreprise);

    container.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">Assurances des Biens par Entreprise</h2>
            <div class="premium-box">
                ${siegesAvecBiens.map(siege => `
                    <div class="categorie-bloc" style="margin-bottom:20px; padding:12px; background:rgba(0,20,40,0.6); border-radius:10px;">
                        <h3 style="color:#7ec8ff; margin-top:0;">🏢 ${siege.nom}</h3>
                        ${Object.entries(siege.biens).map(([categorie, styles]) =>
                            Object.entries(styles)
                                .filter(([, bien]) => (bien.quantite || 0) > 0)
                                .map(([style, bien]) => {
                                    const contratActuel = bien.assurance
                                        ? `<span style="color:#34d399; font-weight:bold;">✓ Couvert par ${bien.assurance.type} (souscrit par ${bien.assurance.souscritPar || entreprise.pdg})</span>`
                                        : `<span style="color:#f87171; font-weight:bold;">⚠️ Non assuré</span>`;

                                    return `
                                    <div class="bien-item gestion-item" data-siege="${siege.id}" data-cat="${categorie}" data-style="${style}" style="margin-top:10px;">
                                        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                                            <div class="bien-nom" style="font-weight:bold; font-size:16px;">${style} (${bien.quantite} en stock)</div>
                                            <div>${contratActuel}</div>
                                        </div>
                                        <div class="assurance-options" style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
                                            ${genererBoutonsAssurance(bien, estPrestige)}
                                        </div>
                                    </div>
                                    `;
                                }).join("")
                        ).join("")}
                    </div>
                `).join("")}
            </div>
        </div>
    `;

    container.querySelectorAll(".assurance-btn").forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            const a = ASSURANCES[type];
            const item = btn.closest(".bien-item");
            const siegeId = item.dataset.siege;
            const categorie = item.dataset.cat;
            const style = item.dataset.style;

            const ent = getEntreprise();
            const auteur = ent.utilisateurActif || ent.pdg || "Fondateur";
            const siege = (ent.commercesGPS || []).find(s => String(s.id) === String(siegeId));
            const bien = siege?.biens?.[categorie]?.[style];
            if (!bien) return;

            const coutTotal = Math.max(100, Math.floor((bien.prixAchatMoyen || 15000) * a.coutMultiplicateur * (bien.quantite || 1)));

            if ((ent.argent || 0) < coutTotal) {
                alert(`Fonds insuffisants ! Coût du contrat : ${coutTotal.toLocaleString("fr-FR")} Ø.`);
                return;
            }

            ent.argent -= coutTotal;
            bien.assurance = {
                type,
                couverture: a.couverture,
                braquage: a.braquage,
                souscritPar: auteur
            };

            ajouterHistorique(`[${siege.nom}] Souscription assurance "${type}" sur ${style} (-${coutTotal.toLocaleString("fr-FR")} Ø)`, "depense", auteur);
            sauvegarderEntreprise();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = ent.argent.toLocaleString("fr-FR");

            alert(`Assurance "${type}" activée sur ${style} par ${auteur} !`);
            afficherBiensAssurables();
        };
    });
}

function genererBoutonsAssurance(bien, estPrestige) {
    let html = "";
    for (const [nom, a] of Object.entries(ASSURANCES)) {
        if (a.prestigeOnly && !estPrestige) continue;
        const coutTotal = Math.max(100, Math.floor((bien.prixAchatMoyen || 15000) * a.coutMultiplicateur * (bien.quantite || 1)));
        const estActif = bien.assurance?.type === nom;
        html += `
            <button class="assurance-btn premium-btn" data-type="${nom}" style="margin:0; padding:7px 12px; font-size:13px; ${estActif ? "background:#059669; border:1px solid #fff;" : ""}">
                ${nom} — ${coutTotal.toLocaleString("fr-FR")} Ø
            </button>
        `;
    }
    return html;
}

window.initAssurances = initAssurances;
