// =======================================
// GEO EMPIRE — MODULE ENTREPRISES (GROUPES, ASSOCIÉS & HOLDING)
// =======================================

import {
    SEUIL_HOLDING,
    PECULE_DEPART_ASSOCIE,
    getEntreprise,
    changerNomEntreprise,
    changerNomJoueur,
    basculerUtilisateurActif,
    estPdgGeneral,
    changerPhotoEntreprise,
    getSiegesGPS,
    majSiegeGPS,
    ajouterAssocieSiege,
    changerDroitsAssocieSiege,
    virerAssocieSiege,
    creerHolding,
    synchroniserFilialesHolding,
    ajouterAssocieHolding,
    changerDroitsAssocieHolding,
    virerAssocieHolding,
    calculerValeurEntreprise
} from "../entrepriseCore.js";
import { getInfosTempsJeu, saveData } from "../geoData.js";

// Rattache automatiquement les anciens biens achetés avant la mise à jour au 1er siège
export function migrerAnciensBiensVersSiege(e) {
    const sieges = e.commercesGPS || [];
    if (sieges.length === 0 || !e.biens) return;

    const aDejaDesBiensParSiege = sieges.some(s =>
        s.biens && Object.values(s.biens).some(styles => Object.values(styles).some(b => (b.quantite || 0) > 0))
    );
    if (aDejaDesBiensParSiege) return;

    let migre = false;
    const premierSiege = sieges[0];
    if (!premierSiege.biens) premierSiege.biens = {};

    for (const [cat, styles] of Object.entries(e.biens)) {
        for (const [style, info] of Object.entries(styles)) {
            if ((info.quantite || 0) > 0) {
                if (!premierSiege.biens[cat]) premierSiege.biens[cat] = {};
                premierSiege.biens[cat][style] = {
                    quantite: info.quantite,
                    prixAchatMoyen: info.prixAchatMoyen || 15000,
                    enLocation: 0,
                    ajustementLoyer: 0
                };
                migre = true;
            }
        }
    }
    if (migre) saveData();
}

function compterBiensDuSiege(siege) {
    let liste = [];
    if (!siege || !siege.biens) return liste;

    for (const [cat, styles] of Object.entries(siege.biens)) {
        if (!styles) continue;
        for (const [style, info] of Object.entries(styles)) {
            if (info && info.quantite > 0) {
                liste.push({
                    categorie: cat,
                    style,
                    quantite: info.quantite,
                    enLocation: info.enLocation || 0
                });
            }
        }
    }
    return liste;
}

function libelleDroits(code) {
    if (code === "achetee") return "Partie achetée uniquement";
    if (code === "louee") return "Partie louée uniquement";
    return "Accès complet (Achetée + Louée)";
}

export function initEntreprise() {
    const e = getEntreprise();
    const container = document.getElementById("entreprise");
    if (!container) return;

    migrerAnciensBiensVersSiege(e);

    const valeur = calculerValeurEntreprise();
    const sieges = getSiegesGPS();
    const nbSieges = sieges.length;
    const estPdg = estPdgGeneral();
    const temps = getInfosTempsJeu();

    const comptesDisponibles = new Set([e.pdg]);
    sieges.forEach(s => (s.associes || []).forEach(a => comptesDisponibles.add(a.nom)));
    if (e.holding?.active) {
        (e.holding.associes || []).forEach(a => comptesDisponibles.add(a.nom));
    }

    const selectSessionHTML = Array.from(comptesDisponibles).map(nom => {
        const role = nom === e.pdg ? " (PDG Général)" : " (Associé)";
        return `<option value="${nom}" ${nom === e.utilisateurActif ? "selected" : ""}>${nom}${role}</option>`;
    }).join("");

    // =====================================================
    // BLOC HOLDING (DÉBLOQUÉE À 10 ENTREPRISES)
    // =====================================================
    let holdingHTML = "";
    if (e.holding?.active) {
        const associesHoldingHTML = (e.holding.associes || []).length === 0
            ? `<span style="color:#94a3b8; font-size:13px;">Aucun associé au niveau de la Holding</span>`
            : e.holding.associes.map(a => `
                <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; background:rgba(245,158,11,0.12); border:1px solid rgba(251,191,36,0.4); padding:8px 10px; border-radius:8px; margin-bottom:6px;">
                    <div>
                        <strong style="color:#fde68a;">🤝 ${a.nom}</strong>
                        <span style="font-size:12px; color:#cbd5e1; margin-left:6px;">(${libelleDroits(a.droits)})</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <select class="select-droits-holding" data-nom="${a.nom}" style="padding:4px 8px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #fbbf24; font-size:12px;">
                            <option value="complet" ${a.droits === "complet" ? "selected" : ""}>Accès complet</option>
                            <option value="achetee" ${a.droits === "achetee" ? "selected" : ""}>Partie achetée</option>
                            <option value="louee" ${a.droits === "louee" ? "selected" : ""}>Partie louée</option>
                        </select>
                        ${estPdg ? `
                            <button class="btn-virer-holding" data-nom="${a.nom}" style="background:#b91c1c; color:#fff; border:none; border-radius:6px; padding:4px 9px; cursor:pointer; font-size:12px; font-weight:bold;">
                                Virer (-${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø)
                            </button>
                        ` : ""}
                    </div>
                </div>
            `).join("");

        holdingHTML = `
            <div class="premium-box" style="border: 2px solid #fbbf24; background: linear-gradient(135deg, rgba(245,158,11,0.16), rgba(0,25,55,0.85));">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div>
                        <span style="background:#fbbf24; color:#0f172a; font-weight:bold; padding:3px 10px; border-radius:6px; font-size:12px;">HOLDING ACTIVE</span>
                        <h3 style="margin:6px 0 2px 0; color:#fde68a; font-size:20px;">🏛️ ${e.holding.nom}</h3>
                        <p style="margin:0; font-size:13px; color:#fef3c7;">
                            Créée le ${e.holding.dateCreation} • <strong>${nbSieges} filiales rattachées</strong> • Bonus revenus : <strong>+20 %</strong>
                        </p>
                    </div>
                    <button id="btn-sync-holding" class="premium-btn" style="background:#d97706; margin:0;">Synchroniser les filiales</button>
                </div>

                <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(251,191,36,0.3);">
                    <div style="font-size:13px; color:#fde68a; font-weight:bold; margin-bottom:8px;">Associés de la Holding :</div>
                    ${associesHoldingHTML}
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                        <input type="text" id="input-associe-holding" placeholder="Nom du nouvel associé Holding..." style="flex:1; min-width:190px; padding:7px 10px; border-radius:6px; border:1px solid #fbbf24; background:rgba(0,20,45,0.9); color:#fff;">
                        <select id="droits-associe-holding" style="padding:7px 10px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #fbbf24;">
                            <option value="complet">Accès complet (Achetée + Louée)</option>
                            <option value="achetee">Partie achetée uniquement</option>
                            <option value="louee">Partie louée uniquement</option>
                        </select>
                        <button id="btn-add-associe-holding" class="premium-btn" style="margin:0; padding:7px 14px; background:#b45309;">+ Ajouter à la Holding</button>
                    </div>
                </div>
            </div>
        `;
    } else if (nbSieges >= SEUIL_HOLDING) {
        holdingHTML = `
            <div class="premium-box" style="border: 2px solid #34d399; background: rgba(6, 78, 59, 0.35);">
                <h3 style="margin-top:0; color:#34d399;">🎉 Seuil atteint (${nbSieges}/${SEUIL_HOLDING} entreprises) : Créez votre Holding !</h3>
                <p style="font-size:14px; margin-bottom:12px;">
                    Regroupez vos <strong>${nbSieges} entreprises</strong> sous une Holding unique pour débloquer un bonus de <strong>+20 % sur vos revenus</strong> et nommer des associés globaux.
                </p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <input type="text" id="input-nom-holding" class="input-text" style="max-width:320px; margin:0;" placeholder="Nom de votre Holding..." value="${e.nom} Holding">
                    <button id="btn-creer-holding" class="premium-btn" style="margin:0; background:#059669;">Fonder la Holding</button>
                </div>
            </div>
        `;
    } else {
        const pct = Math.min(100, Math.round((nbSieges / SEUIL_HOLDING) * 100));
        holdingHTML = `
            <div class="premium-box" style="border: 1px dashed rgba(126, 200, 255, 0.4);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <strong style="color:#7ec8ff;">🏛️ Progression vers la Holding</strong>
                    <span style="font-weight:bold; color:#38bdf8;">${nbSieges} / ${SEUIL_HOLDING} entreprises</span>
                </div>
                <div style="width:100%; height:10px; background:rgba(0,0,0,0.45); border-radius:6px; overflow:hidden; margin-bottom:8px;">
                    <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, #0284c7, #38bdf8);"></div>
                </div>
                <p style="margin:0; font-size:13px; color:#cbd5e1;">
                    Acquérez encore <strong>${SEUIL_HOLDING - nbSieges} entreprise(s)</strong> sur la <a href="carte.html" style="color:#38bdf8; font-weight:bold;">Carte GPS</a> pour fonder votre Holding (+20 % de revenus).
                </p>
            </div>
        `;
    }

    // =====================================================
    // LISTE DES ENTREPRISES ACHETÉES SUR LA CARTE GPS
    // =====================================================
    const siegesHTML = nbSieges === 0
        ? `<div class="premium-box" style="text-align:center;">
               <p>Vous n'avez encore acheté aucune entreprise sur la carte GPS.</p>
               <a href="carte.html" class="premium-btn" style="display:inline-block; text-decoration:none;">Ouvrir la Carte GPS</a>
           </div>`
        : sieges.map(s => {
            const biensDuSiege = compterBiensDuSiege(s);
            const biensHTML = biensDuSiege.length === 0
                ? `<span style="color:#94a3b8; font-size:13px;">Aucun bien acheté sur cette structure (allez dans Catalogue & Gestion)</span>`
                : biensDuSiege.map(b => `<span style="display:inline-block; background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#a7f3d0; padding:3px 8px; border-radius:6px; font-size:12px; margin:2px;">${b.style} ×${b.quantite} (${b.enLocation} loués)</span>`).join("");

            const associes = s.associes || [];
            const associesHTML = associes.length === 0
                ? `<span style="color:#94a3b8; font-size:13px;">Aucun associé sur cette entreprise</span>`
                : associes.map(a => `
                    <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; background:rgba(59,130,246,0.14); border:1px solid rgba(59,130,246,0.45); padding:7px 10px; border-radius:8px; margin-bottom:6px;">
                        <div>
                            <strong style="color:#93c5fd;">🤝 ${a.nom}</strong>
                            <span style="font-size:12px; color:#cbd5e1; margin-left:6px;">(${libelleDroits(a.droits)})</span>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <select class="select-droits-siege" data-id="${s.id}" data-nom="${a.nom}" style="padding:4px 8px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #38bdf8; font-size:12px;">
                                <option value="complet" ${a.droits === "complet" ? "selected" : ""}>Accès complet</option>
                                <option value="achetee" ${a.droits === "achetee" ? "selected" : ""}>Partie achetée</option>
                                <option value="louee" ${a.droits === "louee" ? "selected" : ""}>Partie louée</option>
                            </select>
                            ${estPdg ? `
                                <button class="btn-virer-siege" data-id="${s.id}" data-nom="${a.nom}" style="background:#b91c1c; color:#fff; border:none; border-radius:6px; padding:4px 9px; cursor:pointer; font-size:12px; font-weight:bold;">
                                    Virer (-${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø)
                                </button>
                            ` : ""}
                        </div>
                    </div>
                `).join("");

            return `
            <div class="premium-box" data-siege-id="${s.id}" style="border-left: 4px solid #38bdf8;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:10px;">
                    <div>
                        <span style="background:rgba(56,189,248,0.2); color:#38bdf8; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${s.secteur}</span>
                        <span style="color:#94a3b8; font-size:12px; margin-left:8px;">Acquis le ${s.dateAchat || "Aujourd'hui"} • ${(s.prixAchat || 0).toLocaleString("fr-FR")} Ø</span>
                    </div>
                    <a href="carte.html" style="color:#7ec8ff; font-size:13px; text-decoration:none; font-weight:bold;">📍 Voir sur la carte</a>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-bottom:12px;">
                    <div>
                        <label style="font-size:12px; color:#7ec8ff; display:block; margin-bottom:4px;">Nom de l'entreprise :</label>
                        <input type="text" class="siege-nom-input" value="${s.nom}" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(56,189,248,0.4); background:rgba(0,20,45,0.85); color:#fff;">
                    </div>
                    <div>
                        <label style="font-size:12px; color:#7ec8ff; display:block; margin-bottom:4px;">PDG / Directeur local :</label>
                        <input type="text" class="siege-pdg-input" value="${s.pdg || e.pdg}" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(56,189,248,0.4); background:rgba(0,20,45,0.85); color:#fff;">
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="font-size:12px; color:#7ec8ff; margin-bottom:6px;">Associés sur cette entreprise & répartition des droits :</div>
                    ${associesHTML}
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:6px;">
                        <input type="text" class="siege-associe-input" placeholder="Nom d'un associé..." style="flex:1; min-width:170px; padding:6px 10px; border-radius:6px; border:1px solid rgba(56,189,248,0.4); background:rgba(0,20,45,0.85); color:#fff;">
                        <select class="siege-associe-droits" style="padding:6px 10px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #38bdf8;">
                            <option value="complet">Accès complet (Achetée + Louée)</option>
                            <option value="achetee">Partie achetée uniquement</option>
                            <option value="louee">Partie louée uniquement</option>
                        </select>
                        <button class="btn-add-associe-siege premium-btn" style="margin:0; padding:6px 12px; font-size:13px;">+ Ajouter</button>
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="font-size:12px; color:#7ec8ff; margin-bottom:4px;">Biens rattachés exclusivement à cette entreprise :</div>
                    <div>${biensHTML}</div>
                </div>

                <button class="btn-save-siege premium-btn" style="margin:0; padding:8px 16px; font-size:13px; background:#0284c7;">Enregistrer cette entreprise</button>
            </div>
            `;
        }).join("");

    // Format carré strict pour le logo (évite qu'une photo prenne tout l'écran)
    const logoHTML = e.logo
        ? `<img id="entreprise-logo" src="${e.logo}" alt="Logo" style="width:90px; height:90px; min-width:90px; object-fit:cover; border-radius:14px; border:2px solid #38bdf8; box-shadow:0 4px 12px rgba(0,0,0,0.5);">`
        : `<div style="width:90px; height:90px; min-width:90px; border-radius:14px; border:2px dashed #38bdf8; background:rgba(0,30,65,0.8); display:flex; align-items:center; justify-content:center; font-size:32px;">🏛️</div>`;

    container.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                <h2 class="premium-title" style="margin:0;">Mon Empire & Gouvernance</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <span style="background:rgba(0,40,80,0.85); border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-size:12px; color:#bae6fd;">
                        🕒 ${temps.heureLocale} (${temps.fuseauLocal}) • An ${temps.anneeJeu}, Mois ${temps.moisDansAnnee}
                    </span>
                    <div style="background:rgba(0,40,80,0.85); border:1px solid #38bdf8; padding:5px 10px; border-radius:8px; font-size:13px;">
                        <label style="color:#7ec8ff; margin-right:6px;">Session :</label>
                        <select id="select-session-utilisateur" style="background:#0f294a; color:#fff; border:1px solid #38bdf8; border-radius:5px; padding:3px 7px; font-weight:bold;">
                            ${selectSessionHTML}
                        </select>
                    </div>
                </div>
            </div>

            <div class="premium-box">
                <div style="display:flex; align-items:center; gap:18px; flex-wrap:wrap;">
                    ${logoHTML}

                    <div style="flex:1; min-width:240px;">
                        <label style="font-size:12px; color:#7ec8ff;">Nom du Groupe :</label>
                        <input id="entreprise-nom-input" class="input-text" value="${e.nom}" style="margin-bottom:8px;">

                        <label style="font-size:12px; color:#7ec8ff;">PDG Général (seul habilité à virer un associé) :</label>
                        <input id="joueur-nom-input" class="input-text" value="${e.pdg}" style="margin-bottom:10px;">

                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <button id="btn-save-nom" class="premium-btn" style="margin:0;">Enregistrer le groupe</button>
                            <label for="input-logo" class="premium-btn" style="cursor:pointer; margin:0; background:#0369a1;">Changer le logo (format carré 90×90)</label>
                            <input id="input-logo" type="file" accept="image/*" style="display:none;">
                        </div>
                    </div>
                </div>
            </div>

            ${holdingHTML}

            <div class="premium-box">
                <h3 style="margin-top:0; color:#7ec8ff;">Statistiques Globales</h3>
                <div class="entreprise-stats">
                    <div class="stat-item">Trésorerie disponible : <strong>${(e.argent || 0).toLocaleString("fr-FR")} Ø</strong></div>
                    <div class="stat-item">Entreprises détenues : <strong>${nbSieges}</strong></div>
                    <div class="stat-item">Valeur totale du patrimoine : <strong>${valeur.toLocaleString("fr-FR")} Ø</strong></div>
                    <div class="stat-item">Caisse Mairie (impôts versés) : <strong>${(e.caisseMairie || 0).toLocaleString("fr-FR")} Ø</strong></div>
                </div>
            </div>

            <h3 style="color:#7ec8ff; margin: 20px 0 10px 0;">Mes Entreprises sur le terrain (${nbSieges})</h3>
            ${siegesHTML}
        </div>
    `;

    // ÉVÉNEMENTS GROUPE & SESSION
    document.getElementById("select-session-utilisateur").onchange = ev => {
        basculerUtilisateurActif(ev.target.value);
        initEntreprise();
    };

    document.getElementById("btn-save-nom").onclick = () => {
        changerNomEntreprise(document.getElementById("entreprise-nom-input").value);
        changerNomJoueur(document.getElementById("joueur-nom-input").value);
        initEntreprise();
    };

    document.getElementById("input-logo").onchange = ev => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            changerPhotoEntreprise(reader.result);
            initEntreprise();
        };
        reader.readAsDataURL(file);
    };

    // ÉVÉNEMENTS HOLDING
    const btnCreerH = document.getElementById("btn-creer-holding");
    if (btnCreerH) {
        btnCreerH.onclick = () => {
            const nomH = document.getElementById("input-nom-holding").value;
            if (creerHolding(nomH)) initEntreprise();
        };
    }

    const btnSyncH = document.getElementById("btn-sync-holding");
    if (btnSyncH) {
        btnSyncH.onclick = () => {
            synchroniserFilialesHolding();
            initEntreprise();
        };
    }

    const btnAddH = document.getElementById("btn-add-associe-holding");
    if (btnAddH) {
        btnAddH.onclick = () => {
            const nom = document.getElementById("input-associe-holding").value;
            const droits = document.getElementById("droits-associe-holding").value;
            if (ajouterAssocieHolding(nom, droits)) initEntreprise();
        };
    }

    container.querySelectorAll(".select-droits-holding").forEach(sel => {
        sel.onchange = () => {
            changerDroitsAssocieHolding(sel.dataset.nom, sel.value);
            initEntreprise();
        };
    });

    container.querySelectorAll(".btn-virer-holding").forEach(btn => {
        btn.onclick = () => {
            const nom = btn.dataset.nom;
            if (!confirm(`Virer ${nom} de la Holding et lui verser un pécule de ${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø ?`)) return;
            const res = virerAssocieHolding(nom);
            if (!res.ok) return alert(res.message);
            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = getEntreprise().argent.toLocaleString("fr-FR");
            initEntreprise();
        };
    });

    // ÉVÉNEMENTS ENTREPRISES GPS
    container.querySelectorAll("[data-siege-id]").forEach(bloc => {
        const id = bloc.dataset.siegeId;

        bloc.querySelector(".btn-add-associe-siege").onclick = () => {
            const inputAssoc = bloc.querySelector(".siege-associe-input");
            const selectDroits = bloc.querySelector(".siege-associe-droits");
            if (ajouterAssocieSiege(id, inputAssoc.value, selectDroits.value)) {
                initEntreprise();
            }
        };

        bloc.querySelectorAll(".select-droits-siege").forEach(sel => {
            sel.onchange = () => {
                changerDroitsAssocieSiege(id, sel.dataset.nom, sel.value);
                initEntreprise();
            };
        });

        bloc.querySelectorAll(".btn-virer-siege").forEach(btn => {
            btn.onclick = () => {
                const nom = btn.dataset.nom;
                if (!confirm(`Virer ${nom} de cette entreprise et lui verser un pécule de ${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø ?`)) return;
                const res = virerAssocieSiege(id, nom);
                if (!res.ok) return alert(res.message);
                const soldeEl = document.getElementById("solde");
                if (soldeEl) soldeEl.textContent = getEntreprise().argent.toLocaleString("fr-FR");
                initEntreprise();
            };
        });

        bloc.querySelector(".btn-save-siege").onclick = () => {
            const nom = bloc.querySelector(".siege-nom-input").value.trim();
            const pdg = bloc.querySelector(".siege-pdg-input").value.trim();
            majSiegeGPS(id, { nom: nom || "Entreprise", pdg: pdg || e.pdg });
            alert("Entreprise enregistrée !");
            initEntreprise();
        };
    });
}

window.initEntreprise = initEntreprise;
