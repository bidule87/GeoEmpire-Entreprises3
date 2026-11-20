// ============================================
// GEO EMPIRE — MODULE BOURSE & CESSATION D'ENTREPRISE
// ============================================

import { getEntreprise, calculerValeurSiege } from "../entrepriseCore.js";
import { getData, saveData, ajouterHistorique, recalculerTotauxBiensGlobaux } from "../geoData.js";

const FIREBASE_DB_URL = "https://geo-empire-8ca7e-default-rtdb.europe-west1.firebasedatabase.app";
const TAXE_LIQUIDATION = 0.18; // 18 % reversés à la Mairie en cas de cessation immédiate

let offresMarcheCache = [];
let idSelectionneCourbe = null;

function genererHistoriqueInitial(valeurBase) {
    const points = [];
    let courant = Math.max(5000, Math.round(valeurBase * 0.92));
    for (let i = 0; i < 12; i++) {
        const variation = 1 + (Math.random() * 0.10 - 0.045);
        courant = Math.max(2000, Math.round(courant * variation));
        points.push(courant);
    }
    return points;
}

function dessinerCourbeSVG(historique) {
    if (!Array.isArray(historique) || historique.length < 2) {
        return `<div style="color:#94a3b8; font-size:13px; padding:20px; text-align:center;">Données de cotation insuffisantes</div>`;
    }
    const min = Math.min(...historique);
    const max = Math.max(...historique);
    const amplitude = Math.max(1, max - min);
    const largeur = 520;
    const hauteur = 150;
    const padX = 16;
    const padY = 18;

    const coords = historique.map((val, idx) => {
        const x = padX + (idx / (historique.length - 1)) * (largeur - padX * 2);
        const y = hauteur - padY - ((val - min) / amplitude) * (hauteur - padY * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const premier = historique[0];
    const dernier = historique[historique.length - 1];
    const hausse = dernier >= premier;
    const couleur = hausse ? "#10b981" : "#f43f5e";
    const pct = (((dernier - premier) / Math.max(1, premier)) * 100).toFixed(2);

    return `
        <div style="background:rgba(2, 16, 34, 0.9); border:1px solid rgba(56,189,248,0.35); border-radius:10px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                <span style="font-size:12px; color:#93c5fd;">Cotations récentes (Min : ${min.toLocaleString("fr-FR")} Ø • Max : ${max.toLocaleString("fr-FR")} Ø)</span>
                <span style="font-weight:bold; font-size:13px; color:${couleur};">
                    ${hausse ? "▲ +" : "▼ "}${pct} % (${dernier.toLocaleString("fr-FR")} Ø)
                </span>
            </div>
            <svg viewBox="0 0 ${largeur} ${hauteur}" style="width:100%; height:150px; display:block;">
                <defs>
                    <linearGradient id="gradBourse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${couleur}" stop-opacity="0.35"/>
                        <stop offset="100%" stop-color="${couleur}" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
                <polygon points="${padX},${hauteur - padY} ${coords.join(" ")} ${largeur - padX},${hauteur - padY}" fill="url(#gradBourse)" />
                <polyline fill="none" stroke="${couleur}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${coords.join(" ")}" />
            </svg>
        </div>
    `;
}

function retirerSiegeDuJoueur(siegeId) {
    const e = getEntreprise();
    const index = (e.commercesGPS || []).findIndex(s => String(s.id) === String(siegeId));
    if (index === -1) return null;

    const [siegeRetire] = e.commercesGPS.splice(index, 1);

    if (e.holding?.active && Array.isArray(e.holding.filialesIds)) {
        e.holding.filialesIds = e.holding.filialesIds.filter(id => String(id) !== String(siegeId));
    }
    e.ventesEnAttente = (e.ventesEnAttente || []).filter(v => String(v.siegeId) !== String(siegeId));
    e.locationsEnAttente = (e.locationsEnAttente || []).filter(l => String(l.siegeId) !== String(siegeId));

    recalculerTotauxBiensGlobaux();
    return siegeRetire;
}

async function chargerOffresBourse() {
    try {
        const res = await fetch(`${FIREBASE_DB_URL}/bourseEntreprises.json`);
        if (!res.ok) return [];
        const raw = await res.json();
        if (!raw || typeof raw !== "object") return [];

        const maintenant = Date.now();
        const liste = [];

        for (const [key, item] of Object.entries(raw)) {
            if (!item || !item.nom) continue;
            // Actualisation légère de la cotation toutes les 5 minutes
            if (!Array.isArray(item.historiqueCotations) || item.historiqueCotations.length < 2) {
                item.historiqueCotations = genererHistoriqueInitial(item.prixDemande || 25000);
            }
            const dernierTick = item.dernierTick || 0;
            if (maintenant - dernierTick > 5 * 60 * 1000) {
                const dernierPrix = item.historiqueCotations[item.historiqueCotations.length - 1];
                const variation = 1 + (Math.random() * 0.08 - 0.038);
                const nouveauPrix = Math.max(2000, Math.round(dernierPrix * variation));
                item.historiqueCotations.push(nouveauPrix);
                if (item.historiqueCotations.length > 20) item.historiqueCotations.shift();
                item.cotationActuelle = nouveauPrix;
                item.dernierTick = maintenant;

                fetch(`${FIREBASE_DB_URL}/bourseEntreprises/${key}.json`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        historiqueCotations: item.historiqueCotations,
                        cotationActuelle: nouveauPrix,
                        dernierTick: maintenant
                    })
                }).catch(() => {});
            }

            liste.push({ firebaseKey: key, ...item });
        }

        offresMarcheCache = liste;
        return liste;
    } catch (err) {
        console.warn("Bourse hors-ligne :", err);
        return offresMarcheCache;
    }
}

export async function initBourse() {
    const container = document.getElementById("bourse");
    if (!container) return;

    const e = getEntreprise();
    const sieges = e.commercesGPS || [];

    container.innerHTML = `
        <div class="premium-panel">
            <h2 class="premium-title">📈 Bourse & Cessation d'Entreprise</h2>
            <p style="color:#cbd5e1; font-size:13px; margin-bottom:16px;">
                Introduisez vos entreprises en Bourse pour les revendre aux autres joueurs, aux Promoteurs, à la Banque ou à la Mairie, ou procédez à une cessation immédiate.
            </p>
            <div id="bourse-contenu"><p style="color:#7ec8ff;">Chargement des cotations boursières...</p></div>
        </div>
    `;

    const offres = await chargerOffresBourse();
    const zone = document.getElementById("bourse-contenu");
    if (!zone) return;

    if (!idSelectionneCourbe && offres.length > 0) {
        idSelectionneCourbe = offres[0].firebaseKey;
    }

    const offreCourbe = offres.find(o => o.firebaseKey === idSelectionneCourbe) || offres[0] || null;
    const historiqueCourbe = offreCourbe
        ? offreCourbe.historiqueCotations
        : (sieges[0] ? genererHistoriqueInitial(calculerValeurSiege(sieges[0])) : [20000, 21200, 20800, 22400, 23100, 22900, 24500]);

    const titreCourbe = offreCourbe
        ? `${offreCourbe.nom} (${offreCourbe.secteur}) — Vendeur : ${offreCourbe.vendeur}`
        : "Indice Général Geo Empire (Aucune entreprise cotée actuellement)";

    // Bloc 1 : Mes entreprises (Cessation ou Cotation)
    const mesEntreprisesHTML = sieges.length === 0
        ? `<p style="color:#94a3b8; font-size:13px;">Vous ne détenez aucune entreprise sur le terrain actuellement.</p>`
        : sieges.map(s => {
            const valEstimee = calculerValeurSiege(s);
            const netLiquidation = Math.floor(valEstimee * (1 - TAXE_LIQUIDATION));
            const taxeMairie = valEstimee - netLiquidation;

            return `
                <div class="premium-box" style="border-left:4px solid #f59e0b; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <strong style="font-size:16px; color:#fff;">🏢 ${s.nom}</strong>
                            <span style="margin-left:8px; font-size:12px; color:#38bdf8; background:rgba(56,189,248,0.15); padding:2px 8px; border-radius:6px;">${s.secteur}</span>
                            <div style="font-size:13px; color:#cbd5e1; margin-top:4px;">
                                Valeur patrimoniale estimée : <strong style="color:#34d399;">${valEstimee.toLocaleString("fr-FR")} Ø</strong>
                            </div>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-top:12px; padding-top:12px; border-top:1px dashed rgba(255,255,255,0.15);">
                        <!-- Option A : Introduction en Bourse -->
                        <div style="background:rgba(2, 132, 199, 0.14); border:1px solid rgba(56,189,248,0.4); border-radius:8px; padding:10px;">
                            <div style="font-weight:bold; color:#7ec8ff; font-size:13px; margin-bottom:6px;">📊 Introduire en Bourse</div>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <input type="number" class="input-prix-ipo" data-id="${String(s.id)}" value="${Math.round(valEstimee * 1.15)}" min="1000" style="flex:1; min-width:120px; padding:6px 8px; border-radius:6px; border:1px solid #38bdf8; background:rgba(0,20,45,0.9); color:#fff; font-size:13px;">
                                <button type="button" class="btn-introduire-bourse" data-id="${String(s.id)}" style="padding:6px 12px; border-radius:6px; border:none; background:#0284c7; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">Coter en Bourse</button>
                            </div>
                            <div style="font-size:11px; color:#93c5fd; margin-top:5px;">Visible par tous les joueurs et rachetable par Promoteurs, Banque ou Mairie.</div>
                        </div>

                        <!-- Option B : Cessation / Liquidation immédiate -->
                        <div style="background:rgba(225, 29, 72, 0.14); border:1px solid rgba(244,63,94,0.4); border-radius:8px; padding:10px;">
                            <div style="font-weight:bold; color:#fda4af; font-size:13px; margin-bottom:6px;">🛑 Cessation & Liquidation immédiate</div>
                            <div style="font-size:12px; color:#fecdd3; margin-bottom:8px;">
                                Net perçu : <strong>${netLiquidation.toLocaleString("fr-FR")} Ø</strong> (Taxe Mairie 18 % : -${taxeMairie.toLocaleString("fr-FR")} Ø)
                            </div>
                            <button type="button" class="btn-cessation-directe" data-id="${String(s.id)}" style="width:100%; padding:7px 10px; border-radius:6px; border:none; background:#e11d48; color:#fff; font-weight:bold; font-size:12px; cursor:pointer;">
                                Fermer et liquider l'entreprise
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

    // Bloc 2 : Marché Boursier en direct
    const marcheHTML = offres.length === 0
        ? `<p style="color:#94a3b8; font-size:13px;">Aucune entreprise n'est actuellement cotée sur le marché boursier.</p>`
        : offres.map(o => {
            const cotation = Number(o.cotationActuelle || o.prixDemande || 15000);
            const estMonOffre = o.vendeurId === (e.pdg || "Fondateur");
            const offrePromoteur = Math.floor(cotation * 0.92);
            const offreBanque = Math.floor(cotation * 0.85);
            const offreMairie = Math.floor(cotation * 0.80);

            return `
                <div class="premium-box" style="border-left:4px solid ${estMonOffre ? "#fbbf24" : "#10b981"}; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div>
                            <strong style="font-size:16px; color:#fff;">${o.nom}</strong>
                            <span style="font-size:12px; color:#93c5fd; margin-left:6px;">(${o.secteur})</span>
                            <div style="font-size:12px; color:#cbd5e1; margin-top:3px;">
                                Cotée par : <strong>${o.vendeur}</strong> • Cotation actuelle : <strong style="color:#34d399; font-size:14px;">${cotation.toLocaleString("fr-FR")} Ø</strong>
                            </div>
                        </div>

                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button type="button" class="btn-voir-courbe" data-key="${o.firebaseKey}" style="padding:6px 10px; border-radius:6px; border:1px solid #38bdf8; background:rgba(2,132,199,0.25); color:#bae6fd; font-size:12px; font-weight:bold; cursor:pointer;">📈 Courbe</button>
                            ${!estMonOffre ? `
                                <button type="button" class="btn-racheter-joueur" data-key="${o.firebaseKey}" style="padding:6px 12px; border-radius:6px; border:none; background:#059669; color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
                                    Acheter (${cotation.toLocaleString("fr-FR")} Ø)
                                </button>
                            ` : ""}
                        </div>
                    </div>

                    ${estMonOffre ? `
                        <div style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(251,191,36,0.35); display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                            <span style="font-size:12px; color:#fde68a; font-weight:bold;">Offres institutionnelles immédiates :</span>
                            <button type="button" class="btn-vente-instit" data-key="${o.firebaseKey}" data-acheteur="Promoteur Immobilier" data-prix="${offrePromoteur}" style="padding:5px 9px; border-radius:6px; border:1px solid #a855f7; background:rgba(168,85,247,0.2); color:#e9d5ff; font-size:11px; font-weight:bold; cursor:pointer;">
                                🏗️ Promoteur (${offrePromoteur.toLocaleString("fr-FR")} Ø)
                            </button>
                            <button type="button" class="btn-vente-instit" data-key="${o.firebaseKey}" data-acheteur="Banque Centrale" data-prix="${offreBanque}" style="padding:5px 9px; border-radius:6px; border:1px solid #38bdf8; background:rgba(56,189,248,0.2); color:#bae6fd; font-size:11px; font-weight:bold; cursor:pointer;">
                                🏦 Banque (${offreBanque.toLocaleString("fr-FR")} Ø)
                            </button>
                            <button type="button" class="btn-vente-instit" data-key="${o.firebaseKey}" data-acheteur="Mairie" data-prix="${offreMairie}" style="padding:5px 9px; border-radius:6px; border:1px solid #fbbf24; background:rgba(251,191,36,0.2); color:#fef08a; font-size:11px; font-weight:bold; cursor:pointer;">
                                🏛️ Mairie (${offreMairie.toLocaleString("fr-FR")} Ø)
                            </button>
                            <button type="button" class="btn-retirer-bourse" data-key="${o.firebaseKey}" style="padding:5px 9px; border-radius:6px; border:1px solid #94a3b8; background:transparent; color:#cbd5e1; font-size:11px; cursor:pointer;">
                                Retirer de la Bourse
                            </button>
                        </div>
                    ` : ""}
                </div>
            `;
        }).join("");

    zone.innerHTML = `
        <div class="premium-box" style="margin-bottom:18px;">
            <div style="font-weight:bold; color:#7ec8ff; font-size:14px; margin-bottom:8px;">📉 Courbe de cotation : ${titreCourbe}</div>
            ${dessinerCourbeSVG(historiqueCourbe)}
        </div>

        <h3 style="color:#34d399; margin:16px 0 10px 0;">🌐 Marché Boursier en direct (${offres.length} entreprise(s) cotée(s))</h3>
        ${marcheHTML}

        <h3 style="color:#fbbf24; margin:22px 0 10px 0;">🏢 Mes Entreprises — Introduction en Bourse ou Cessation (${sieges.length})</h3>
        ${mesEntreprisesHTML}
    `;

    // ÉVÉNEMENTS
    zone.querySelectorAll(".btn-voir-courbe").forEach(btn => {
        btn.onclick = () => {
            idSelectionneCourbe = btn.dataset.key;
            initBourse();
        };
    });

    // Introduire en Bourse
    zone.querySelectorAll(".btn-introduire-bourse").forEach(btn => {
        btn.onclick = async () => {
            const id = btn.dataset.id;
            const inp = zone.querySelector(`.input-prix-ipo[data-id="${CSS.escape(id)}"]`);
            const prixInitial = Math.max(1000, Math.floor(Number(inp?.value) || 0));
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(id));
            if (!siege) return;

            if (!confirm(`Introduire "${siege.nom}" en Bourse au prix initial de ${prixInitial.toLocaleString("fr-FR")} Ø ? Elle quittera votre gestion directe pendant sa cotation.`)) return;

            const siegeRetire = retirerSiegeDuJoueur(id);
            if (!siegeRetire) return;

            const historique = genererHistoriqueInitial(prixInitial);
            historique[historique.length - 1] = prixInitial;

            const payload = {
                nom: siegeRetire.nom,
                secteur: siegeRetire.secteur || "Commerce & Distribution",
                vendeur: e.pdg || "Fondateur",
                vendeurId: e.pdg || "Fondateur",
                prixDemande: prixInitial,
                cotationActuelle: prixInitial,
                historiqueCotations: historique,
                dernierTick: Date.now(),
                siegeData: siegeRetire
            };

            try {
                await fetch(`${FIREBASE_DB_URL}/bourseEntreprises.json`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                ajouterHistorique(`📈 Introduction en Bourse de "${siegeRetire.nom}" à ${prixInitial.toLocaleString("fr-FR")} Ø`, "prestige");
                saveData();
                initBourse();
            } catch {
                alert("Erreur réseau lors de l'envoi en Bourse.");
            }
        };
    });

    // Cessation / Liquidation directe
    zone.querySelectorAll(".btn-cessation-directe").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const siege = (e.commercesGPS || []).find(s => String(s.id) === String(id));
            if (!siege) return;

            const valEstimee = calculerValeurSiege(siege);
            const netLiquidation = Math.floor(valEstimee * (1 - TAXE_LIQUIDATION));
            const taxeMairie = valEstimee - netLiquidation;

            if (!confirm(`Confirmer la cessation définitive de "${siege.nom}" ?\nVous encaisserez ${netLiquidation.toLocaleString("fr-FR")} Ø (après 18 % de taxe Mairie).`)) return;

            retirerSiegeDuJoueur(id);
            e.argent = (e.argent || 0) + netLiquidation;
            e.caisseMairie = (e.caisseMairie || 0) + taxeMairie;
            e.finances.impotsVersesMairie = (e.finances.impotsVersesMairie || 0) + taxeMairie;

            ajouterHistorique(`🛑 Cessation & liquidation de "${siege.nom}" : +${netLiquidation.toLocaleString("fr-FR")} Ø net (Taxe Mairie : ${taxeMairie.toLocaleString("fr-FR")} Ø)`, "gain");
            saveData();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = e.argent.toLocaleString("fr-FR");
            initBourse();
        };
    });

    // Vente immédiate à Promoteur / Banque / Mairie
    zone.querySelectorAll(".btn-vente-instit").forEach(btn => {
        btn.onclick = async () => {
            const key = btn.dataset.key;
            const acheteur = btn.dataset.acheteur;
            const prix = Number(btn.dataset.prix || 0);
            const offre = offresMarcheCache.find(o => o.firebaseKey === key);
            if (!offre) return;

            if (!confirm(`Vendre "${offre.nom}" à ${acheteur} pour ${prix.toLocaleString("fr-FR")} Ø immédiats ?`)) return;

            await fetch(`${FIREBASE_DB_URL}/bourseEntreprises/${key}.json`, { method: "DELETE" });

            e.argent = (e.argent || 0) + prix;
            if (acheteur === "Mairie") {
                e.caisseMairie = (e.caisseMairie || 0) + Math.floor(prix * 0.15);
            }
            ajouterHistorique(`🤝 Vente boursière de "${offre.nom}" à ${acheteur} : +${prix.toLocaleString("fr-FR")} Ø`, "gain");
            saveData();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = e.argent.toLocaleString("fr-FR");
            initBourse();
        };
    });

    // Retirer de la Bourse (reprendre son entreprise)
    zone.querySelectorAll(".btn-retirer-bourse").forEach(btn => {
        btn.onclick = async () => {
            const key = btn.dataset.key;
            const offre = offresMarcheCache.find(o => o.firebaseKey === key);
            if (!offre) return;

            await fetch(`${FIREBASE_DB_URL}/bourseEntreprises/${key}.json`, { method: "DELETE" });
            if (offre.siegeData) {
                e.commercesGPS.push(offre.siegeData);
                recalculerTotauxBiensGlobaux();
            }
            ajouterHistorique(`↩️ Retrait de "${offre.nom}" de la Bourse`, "gestion");
            saveData();
            initBourse();
        };
    });

    // Rachat par un autre joueur
    zone.querySelectorAll(".btn-racheter-joueur").forEach(btn => {
        btn.onclick = async () => {
            const key = btn.dataset.key;
            const offre = offresMarcheCache.find(o => o.firebaseKey === key);
            if (!offre) return;

            const prix = Number(offre.cotationActuelle || offre.prixDemande || 15000);
            if ((e.argent || 0) < prix) {
                return alert(`Trésorerie insuffisante (${(e.argent || 0).toLocaleString("fr-FR")} Ø disponibles sur ${prix.toLocaleString("fr-FR")} Ø requis).`);
            }

            if (!confirm(`Racheter "${offre.nom}" en Bourse pour ${prix.toLocaleString("fr-FR")} Ø ?`)) return;

            await fetch(`${FIREBASE_DB_URL}/bourseEntreprises/${key}.json`, { method: "DELETE" });

            e.argent -= prix;
            const nouveauSiege = offre.siegeData || {
                id: `siege_bourse_${Date.now()}`,
                nom: offre.nom,
                secteur: offre.secteur,
                prixAchat: prix,
                dateAchat: new Date().toLocaleDateString("fr-FR"),
                biens: {}
            };
            nouveauSiege.pdg = e.pdg || "Fondateur";
            nouveauSiege.prixAchat = prix;
            e.commercesGPS.push(nouveauSiege);
            recalculerTotauxBiensGlobaux();

            ajouterHistorique(`📈 Rachat boursier de "${offre.nom}" auprès de ${offre.vendeur} (-${prix.toLocaleString("fr-FR")} Ø)`, "depense");
            saveData();

            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = e.argent.toLocaleString("fr-FR");
            initBourse();
        };
    });
}

window.initBourse = initBourse;
