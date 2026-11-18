// ============================================
// MARKETING — AGENCES SPÉCIALISÉES & JAUGE IA
// ============================================

import { getData, saveData, ajouterHistorique } from "../geoData.js";

export const AGENCES_DEFAUT = {
    "GastroPub Régie": {
        categories: ["Restaurants"],
        description: "Campagnes locales, influence culinaire et visibilité des enseignes de restauration.",
        coutPalier: 5000,
        visibilite: 20
    },
    "RetailBoost Média": {
        categories: ["Commerces"],
        description: "Affichage urbain, promotions en vitrine et trafic clientèle en zone commerciale.",
        coutPalier: 4500,
        visibilite: 20
    },
    "ImmoPrestige Diffusion": {
        categories: ["Appartements", "Maisons"],
        description: "Portails immobiliers nationaux, visites virtuelles et ciblage acquéreurs/locataires.",
        coutPalier: 8000,
        visibilite: 20
    },
    "CorpSpace Advisory": {
        categories: ["Bureaux", "Entrepôts"],
        description: "Réseau B2B, prospection grands comptes et commercialisation de surfaces professionnelles.",
        coutPalier: 7000,
        visibilite: 20
    },
    "Hôtelia & Luxe Network": {
        categories: ["Hôtels"],
        description: "Plateformes internationales de réservation, tourisme d'affaires et clientèle prestige.",
        coutPalier: 12000,
        visibilite: 20
    }
};

export function initialiserAgencesMarketing(entreprise) {
    if (!entreprise.marketing) {
        entreprise.marketing = { totalInvestissements: 0, clients: {} };
    }
    if (!entreprise.marketing.clients || typeof entreprise.marketing.clients !== "object") {
        entreprise.marketing.clients = {};
    }

    let modifie = false;
    for (const [nomAgence, cfg] of Object.entries(AGENCES_DEFAUT)) {
        const existant = entreprise.marketing.clients[nomAgence];
        if (!existant || !Array.isArray(existant.categories)) {
            entreprise.marketing.clients[nomAgence] = {
                categories: cfg.categories,
                description: cfg.description,
                coutPalier: cfg.coutPalier,
                visibilite: typeof existant?.visibilite === "number" ? existant.visibilite : cfg.visibilite,
                totalVerse: existant?.totalVerse || 0
            };
            modifie = true;
        }
    }
    if (modifie) saveData();
}

export function getVisibilitePourCategorie(entreprise, categorie) {
    initialiserAgencesMarketing(entreprise);
    for (const agence of Object.values(entreprise.marketing.clients)) {
        if (Array.isArray(agence.categories) && agence.categories.includes(categorie)) {
            return Math.max(0, Math.min(100, Math.round(agence.visibilite || 0)));
        }
    }
    return 20;
}

function getEtatJauge(visibilite) {
    if (visibilite >= 75) {
        return {
            label: "VERT — Saturation maximale (100 % des ventes & locations validées)",
            couleur: "#34d399",
            fond: "rgba(16, 185, 129, 0.18)"
        };
    }
    if (visibilite >= 35) {
        return {
            label: "ORANGE — Demande modérée (50 % à 75 % écoulés par cycle)",
            couleur: "#fbbf24",
            fond: "rgba(245, 158, 11, 0.18)"
        };
    }
    return {
        label: "ROUGE — Visibilité faible (20 % à 35 % écoulés par cycle)",
        couleur: "#f87171",
        fond: "rgba(239, 68, 68, 0.18)"
    };
}

export function initMarketing() {
    const zone = document.getElementById("marketing-contenu") || document.getElementById("marketing");
    if (!zone) return;

    const data = getData();
    const e = data.entreprise;
    initialiserAgencesMarketing(e);

    const agences = e.marketing.clients;

    zone.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                <h2 class="premium-title" style="margin:0;">Agences Marketing & Diffusion Commerciale</h2>
                <span style="background:rgba(0,45,85,0.85); border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                    Budget cumulé investi : <strong>${(e.marketing.totalInvestissements || 0).toLocaleString("fr-FR")} Ø</strong>
                </span>
            </div>

            <div class="premium-box" style="margin-bottom:16px; font-size:13px; color:#cbd5e1;">
                Subventionnez chaque agence spécialisée pour pousser sa jauge dans le <strong style="color:#34d399;">VERT (75 % à 100 %)</strong> : l'IA commerciale écoulera alors <strong>100 %</strong> de vos ventes et locations dès la clôture.
            </div>

            <div style="display:flex; flex-direction:column; gap:14px;">
                ${Object.entries(agences).map(([nom, ag]) => {
                    const vis = Math.max(0, Math.min(100, Math.round(ag.visibilite || 0)));
                    const etat = getEtatJauge(vis);
                    const palier1 = ag.coutPalier || 5000;
                    const palierMax = Math.max(palier1, Math.ceil((100 - vis) / 25) * palier1);

                    return `
                    <div class="premium-box" style="border-left: 4px solid ${etat.couleur}; margin-bottom:0;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
                            <div>
                                <div style="font-size:17px; font-weight:bold; color:#fff;">📢 ${nom}</div>
                                <div style="font-size:12px; color:#7ec8ff; margin-top:2px;">
                                    Secteurs couverts : <strong>${ag.categories.join(" & ")}</strong>
                                </div>
                                <div style="font-size:13px; color:#cbd5e1; margin-top:4px;">${ag.description}</div>
                            </div>
                            <span style="background:${etat.fond}; color:${etat.couleur}; border:1px solid ${etat.couleur}; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:bold;">
                                ${etat.label}
                            </span>
                        </div>

                        <div style="margin:10px 0;">
                            <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:4px;">
                                <span>Indice de visibilité marché :</span>
                                <strong style="color:${etat.couleur};">${vis} % / 100 %</strong>
                            </div>
                            <div style="width:100%; height:12px; background:rgba(0,0,0,0.5); border-radius:6px; overflow:hidden; border:1px solid rgba(255,255,255,0.12);">
                                <div style="width:${vis}%; height:100%; background:${etat.couleur}; transition:width 0.3s ease;"></div>
                            </div>
                        </div>

                        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:10px;">
                            <button type="button" class="btn-subvention-agence premium-btn" data-agence="${nom}" data-montant="${palier1}" data-gain="25" style="margin:0; padding:7px 13px; font-size:13px; background:#0284c7;">
                                +25 % visibilité (${palier1.toLocaleString("fr-FR")} Ø)
                            </button>
                            ${vis < 100 ? `
                                <button type="button" class="btn-subvention-agence premium-btn" data-agence="${nom}" data-montant="${palierMax}" data-gain="${100 - vis}" style="margin:0; padding:7px 13px; font-size:13px; background:#059669;">
                                    Mettre au taquet 100 % (${palierMax.toLocaleString("fr-FR")} Ø)
                                </button>
                            ` : `
                                <span style="color:#34d399; font-weight:bold; font-size:13px;">✓ Visibilité au maximum (100 %)</span>
                            `}
                        </div>
                    </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;

    zone.querySelectorAll(".btn-subvention-agence").forEach(btn => {
        btn.onclick = () => {
            const nomAgence = btn.dataset.agence;
            const montant = Number(btn.dataset.montant);
            const gain = Number(btn.dataset.gain);

            const d = getData();
            const ent = d.entreprise;
            const agence = ent.marketing?.clients?.[nomAgence];
            if (!agence) return;

            if ((ent.argent || 0) < montant) {
                alert(`Fonds insuffisants ! Il vous faut ${montant.toLocaleString("fr-FR")} Ø pour financer cette campagne.`);
                return;
            }

            ent.argent -= montant;
            agence.visibilite = Math.min(100, (agence.visibilite || 0) + gain);
            agence.totalVerse = (agence.totalVerse || 0) + montant;

            ent.marketing.totalInvestissements = (ent.marketing.totalInvestissements || 0) + montant;
            ent.finances.depensesMarketing = (ent.finances.depensesMarketing || 0) + montant;

            const auteur = ent.utilisateurActif || ent.pdg || "Fondateur";
            ajouterHistorique(`[Marketing — ${nomAgence}] Subvention de ${montant.toLocaleString("fr-FR")} Ø (visibilité : ${agence.visibilite} %)`, "depense", auteur);

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = ent.argent.toLocaleString("fr-FR");

            initMarketing();
        };
    });
}

window.initMarketing = initMarketing;
