// =======================================
// GEO EMPIRE — MODULE ENTREPRISES (HIÉRARCHIE & PHOTOS)
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
    changerPhotoSiegeGPS,
    ajouterMembreSiege,
    majMembreSiege,
    virerMembreSiege,
    creerHolding,
    synchroniserFilialesHolding,
    ajouterAssocieHolding,
    changerDroitsAssocieHolding,
    virerAssocieHolding,
    calculerValeurEntreprise
} from "../entrepriseCore.js";
import { getInfosTempsJeu, saveData } from "../geoData.js";

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

function compterBiensDuSiege(siege, e) {
    let liste = [];
    if (!siege || !siege.biens) return liste;

    for (const [cat, styles] of Object.entries(siege.biens)) {
        if (!styles) continue;
        for (const [style, info] of Object.entries(styles)) {
            if (info && info.quantite > 0) {
                const progLoc = (e.locationsEnAttente || [])
                    .filter(o => String(o.siegeId) === String(siege.id) && o.categorie === cat && o.style === style)
                    .reduce((acc, o) => acc + (o.quantite || 0), 0);
                const progVen = (e.ventesEnAttente || [])
                    .filter(o => String(o.siegeId) === String(siege.id) && o.categorie === cat && o.style === style)
                    .reduce((acc, o) => acc + (o.quantite || 0), 0);

                liste.push({
                    categorie: cat,
                    style,
                    quantite: info.quantite,
                    enLocation: info.enLocation || 0,
                    progLoc,
                    progVen
                });
            }
        }
    }
    return liste;
}

function peutGererPermissions(e, siege) {
    if (estPdgGeneral()) return true;
    const actif = e.utilisateurActif;
    if ((e.holding?.associes || []).some(a => a.nom === actif)) return true;
    return (siege?.associes || []).some(a => a.nom === actif && a.role === "dg");
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

    const comptesDisponibles = new Map();
    comptesDisponibles.set(e.pdg, "Fondateur (PDG)");
    sieges.forEach(s => (s.associes || []).forEach(a => {
        comptesDisponibles.set(a.nom, a.role === "dg" ? "Directeur Général (Associé)" : "Directeur Commercial (Joueur)");
    }));
    if (e.holding?.active) {
        (e.holding.associes || []).forEach(a => comptesDisponibles.set(a.nom, "Directeur Général Holding"));
    }

    const selectSessionHTML = Array.from(comptesDisponibles.entries()).map(([nom, roleLabel]) =>
        `<option value="${nom}" ${nom === e.utilisateurActif ? "selected" : ""}>${nom} — ${roleLabel}</option>`
    ).join("");

    // =====================================================
    // BLOC HOLDING (10 ENTREPRISES)
    // =====================================================
    let holdingHTML = "";
    if (e.holding?.active) {
        const associesHoldingHTML = (e.holding.associes || []).length === 0
            ? `<span style="color:#94a3b8; font-size:13px;">Aucun Directeur Général Holding nommé</span>`
            : e.holding.associes.map(a => `
                <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; background:rgba(245,158,11,0.12); border:1px solid rgba(251,191,36,0.4); padding:8px 10px; border-radius:8px; margin-bottom:6px;">
                    <div>
                        <strong style="color:#fde68a;">👔 ${a.nom}</strong>
                        <span style="font-size:12px; color:#cbd5e1; margin-left:6px;">(Directeur Général Associé)</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <select class="select-droits-holding" data-nom="${a.nom}" style="padding:4px 8px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #fbbf24; font-size:12px;">
                            <option value="complet" ${a.droits === "complet" ? "selected" : ""}>Tout autoriser</option>
                            <option value="achetee" ${a.droits === "achetee" ? "selected" : ""}>Vente uniquement (Location bloquée)</option>
                            <option value="louee" ${a.droits === "louee" ? "selected" : ""}>Location uniquement (Vente bloquée)</option>
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
                            Créée le ${e.holding.dateCreation} • <strong>${nbSieges} filiales rattachées</strong>
                        </p>
                    </div>
                    <button id="btn-sync-holding" class="premium-btn" style="background:#d97706; margin:0;">Synchroniser les filiales</button>
                </div>

                <div style="margin-top:14px; padding-top:12px; border-top:1px solid rgba(251,191,36,0.3);">
                    <div style="font-size:13px; color:#fde68a; font-weight:bold; margin-bottom:8px;">Directeurs Généraux (Associés Holding) :</div>
                    ${associesHoldingHTML}
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                        <input type="text" id="input-associe-holding" placeholder="Nom du Directeur Général..." style="flex:1; min-width:190px; padding:7px 10px; border-radius:6px; border:1px solid #fbbf24; background:rgba(0,20,45,0.9); color:#fff;">
                        <select id="droits-associe-holding" style="padding:7px 10px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #fbbf24;">
                            <option value="complet">Tout autoriser</option>
                            <option value="achetee">Vente uniquement (Location bloquée)</option>
                            <option value="louee">Location uniquement (Vente bloquée)</option>
                        </select>
                        <button id="btn-add-associe-holding" class="premium-btn" style="margin:0; padding:7px 14px; background:#b45309;">+ Nommer Directeur Général</button>
                    </div>
                </div>
            </div>
        `;
    } else if (nbSieges >= SEUIL_HOLDING) {
        holdingHTML = `
            <div class="premium-box" style="border: 2px solid #34d399; background: rgba(6, 78, 59, 0.35);">
                <h3 style="margin-top:0; color:#34d399;">🎉 Seuil atteint (${nbSieges}/${SEUIL_HOLDING} entreprises) : Fondez votre Holding !</h3>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <input type="text" id="input-nom-holding" class="input-text" style="max-width:320px; margin:0;" value="${e.nom} Holding">
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
                    Acquérez encore <strong>${SEUIL_HOLDING - nbSieges} entreprise(s)</strong> sur la <a href="carte.html" style="color:#38bdf8; font-weight:bold;">Carte GPS</a> pour fonder votre Holding.
                </p>
            </div>
        `;
    }

    // =====================================================
    // ENTREPRISES SUR LE TERRAIN (PHOTO + HIÉRARCHIE + VERROUS)
    // =====================================================
    const siegesHTML = nbSieges === 0
        ? `<div class="premium-box" style="text-align:center;">
               <p>Vous n'avez encore acheté aucune entreprise sur la carte GPS.</p>
               <a href="carte.html" class="premium-btn" style="display:inline-block; text-decoration:none;">Ouvrir la Carte GPS</a>
           </div>`
        : sieges.map(s => {
            const peutControler = peutGererPermissions(e, s);
            const biensDuSiege = compterBiensDuSiege(s, e);

            const biensHTML = biensDuSiege.length === 0
                ? `<span style="color:#94a3b8; font-size:13px;">Aucun bien acheté sur cette structure</span>`
                : biensDuSiege.map(b => {
                    const details = [];
                    if (b.enLocation > 0) details.push(`${b.enLocation} loué(s)`);
                    if (b.progLoc > 0) details.push(`${b.progLoc} en attente loc.`);
                    if (b.progVen > 0) details.push(`${b.progVen} en attente vente`);
                    const infoTexte = details.length > 0 ? ` — ${details.join(", ")}` : " — disponible";
                    return `<span style="display:inline-block; background:rgba(16,185,129,0.2); border:1px solid #10b981; color:#a7f3d0; padding:4px 9px; border-radius:6px; font-size:12px; margin:2px;">${b.style} : <strong>${b.quantite}</strong>${infoTexte}</span>`;
                }).join("");

            const membres = s.associes || [];
            const membresHTML = membres.length === 0
                ? `<span style="color:#94a3b8; font-size:13px;">Aucun Directeur Général ou Directeur Commercial recruté</span>`
                : membres.map(a => {
                    const estDG = a.role === "dg";
                    return `
                    <div style="display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:8px; background:${estDG ? "rgba(245,158,11,0.14)" : "rgba(59,130,246,0.14)"}; border:1px solid ${estDG ? "rgba(251,191,36,0.45)" : "rgba(59,130,246,0.45)"}; padding:8px 10px; border-radius:8px; margin-bottom:6px;">
                        <div>
                            <strong style="color:${estDG ? "#fde68a" : "#93c5fd"};">${estDG ? "👔" : "💼"} ${a.nom}</strong>
                            <span style="font-size:12px; color:#cbd5e1; margin-left:6px;">• ${estDG ? "Directeur Général (Associé)" : "Directeur Commercial (Joueur)"}</span>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                            <select class="select-droits-siege" data-id="${s.id}" data-nom="${a.nom}" ${peutControler ? "" : "disabled"} style="padding:4px 8px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #38bdf8; font-size:12px;">
                                <option value="complet" ${a.droits === "complet" ? "selected" : ""}>✅ Tout autoriser (Louer + Vendre)</option>
                                <option value="achetee" ${a.droits === "achetee" ? "selected" : ""}>🔒 Bloquer la location (Vente seule)</option>
                                <option value="louee" ${a.droits === "louee" ? "selected" : ""}>🔒 Bloquer la vente (Location seule)</option>
                                <option value="bloque" ${a.droits === "bloque" ? "selected" : ""}>⛔ Tout bloquer (Lecture seule)</option>
                            </select>
                            ${estPdg ? `
                                <button class="btn-virer-siege" data-id="${s.id}" data-nom="${a.nom}" style="background:#b91c1c; color:#fff; border:none; border-radius:6px; padding:4px 9px; cursor:pointer; font-size:12px; font-weight:bold;">
                                    Licencier (-${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø)
                                </button>
                            ` : ""}
                        </div>
                    </div>
                    `;
                }).join("");

            const photoSiegeHTML = s.logo
                ? `<img src="${s.logo}" alt="Logo ${s.nom}" style="width:74px; height:74px; min-width:74px; object-fit:cover; border-radius:12px; border:2px solid #38bdf8;">`
                : `<div style="width:74px; height:74px; min-width:74px; border-radius:12px; border:1px dashed #38bdf8; background:rgba(0,30,65,0.8); display:flex; align-items:center; justify-content:center; font-size:26px;">🏢</div>`;

            return `
            <div class="premium-box" data-siege-id="${s.id}" style="border-left: 4px solid #38bdf8;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        ${photoSiegeHTML}
                        <div>
                            <span style="background:rgba(56,189,248,0.2); color:#38bdf8; padding:3px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${s.secteur}</span>
                            <div style="color:#94a3b8; font-size:12px; margin-top:4px;">Acquis le ${s.dateAchat || "Aujourd'hui"} • ${(s.prixAchat || 0).toLocaleString("fr-FR")} Ø</div>
                            <label for="logo-siege-${s.id}" style="display:inline-block; margin-top:5px; font-size:12px; color:#38bdf8; cursor:pointer; text-decoration:underline;">
                                📷 Changer la photo de cette entreprise
                            </label>
                            <input type="file" id="logo-siege-${s.id}" class="input-logo-siege" data-id="${s.id}" accept="image/*" style="display:none;">
                        </div>
                    </div>
                    <a href="carte.html" style="color:#7ec8ff; font-size:13px; text-decoration:none; font-weight:bold;">📍 Voir sur la carte</a>
                </div>

                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px; margin-bottom:12px;">
                    <div>
                        <label style="font-size:12px; color:#7ec8ff; display:block; margin-bottom:4px;">Nom de l'entreprise :</label>
                        <input type="text" class="siege-nom-input" value="${s.nom}" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(56,189,248,0.4); background:rgba(0,20,45,0.85); color:#fff;">
                    </div>
                    <div>
                        <label style="font-size:12px; color:#7ec8ff; display:block; margin-bottom:4px;">Fondateur référent :</label>
                        <input type="text" class="siege-pdg-input" value="${s.pdg || e.pdg}" style="width:100%; padding:8px; border-radius:6px; border:1px solid rgba(56,189,248,0.4); background:rgba(0,20,45,0.85); color:#fff;">
                    </div>
                </div>

                <div style="margin-bottom:12px;">
                    <div style="font-size:12px; color:#7ec8ff; font-weight:bold; margin-bottom:6px;">
                        Équipe & Verrous d'action (Fondateur / Directeur Général Associé / Directeur Commercial) :
                    </div>
                    ${membresHTML}
                    ${peutControler ? `
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                            <input type="text" class="siege-associe-input" placeholder="Nom du joueur ou associé..." style="flex:1; min-width:160px; padding:6px 10px; border-radius:6px; border:1px solid rgba(56,189,248,0.4); background:rgba(0,20,45,0.85); color:#fff;">
                            <select class="siege-associe-role" style="padding:6px 10px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #38bdf8;">
                                <option value="commercial">Directeur Commercial (Joueur)</option>
                                <option value="dg">Directeur Général (Associé)</option>
                            </select>
                            <select class="siege-associe-droits" style="padding:6px 10px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #38bdf8;">
                                <option value="complet">Tout autoriser</option>
                                <option value="achetee">Bloquer la location</option>
                                <option value="louee">Bloquer la vente</option>
                                <option value="bloque">Tout bloquer</option>
                            </select>
                            <button class="btn-add-associe-siege premium-btn" style="margin:0; padding:6px 12px; font-size:13px;">+ Recruter dans l'équipe</button>
                        </div>
                    ` : ""}
                </div>

                <div style="margin-bottom:12px;">
                    <div style="font-size:12px; color:#7ec8ff; margin-bottom:4px;">Biens rattachés exclusivement à cette entreprise :</div>
                    <div>${biensHTML}</div>
                </div>

                <button class="btn-save-siege premium-btn" style="margin:0; padding:8px 16px; font-size:13px; background:#0284c7;">Enregistrer cette entreprise</button>
            </div>
            `;
        }).join("");

    const logoGroupeHTML = e.logo
        ? `<img id="entreprise-logo" src="${e.logo}" alt="Logo" style="width:90px; height:90px; min-width:90px; object-fit:cover; border-radius:14px; border:2px solid #38bdf8; box-shadow:0 4px 12px rgba(0,0,0,0.5);">`
        : `<div style="width:90px; height:90px; min-width:90px; border-radius:14px; border:2px dashed #38bdf8; background:rgba(0,30,65,0.8); display:flex; align-items:center; justify-content:center; font-size:32px;">🏛️</div>`;

    container.innerHTML = `
        <div class="premium-panel">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                <h2 class="premium-title" style="margin:0;">Mon Empire & Holding</h2>
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
                    ${logoGroupeHTML}

                    <div style="flex:1; min-width:240px;">
                        <label style="font-size:12px; color:#7ec8ff;">Nom du Groupe / Holding :</label>
                        <input id="entreprise-nom-input" class="input-text" value="${e.nom}" style="margin-bottom:8px;">

                        <label style="font-size:12px; color:#7ec8ff;">Fondateur (PDG Général) :</label>
                        <input id="joueur-nom-input" class="input-text" value="${e.pdg}" style="margin-bottom:10px;">

                        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                            <button id="btn-save-nom" class="premium-btn" style="margin:0;">Enregistrer le groupe</button>
                            <label for="input-logo" class="premium-btn" style="cursor:pointer; margin:0; background:#0369a1;">Changer le logo du groupe</label>
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

    // ÉVÉNEMENTS GROUPE
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
            if (creerHolding(document.getElementById("input-nom-holding").value)) initEntreprise();
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
            if (!confirm(`Virer ${nom} de la Holding (-${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø) ?`)) return;
            const res = virerAssocieHolding(nom);
            if (!res.ok) return alert(res.message);
            const soldeEl = document.getElementById("solde");
            if (soldeEl) soldeEl.textContent = getEntreprise().argent.toLocaleString("fr-FR");
            initEntreprise();
        };
    });

    // ÉVÉNEMENTS ENTREPRISES INDIVIDUELLES
    container.querySelectorAll(".input-logo-siege").forEach(inp => {
        inp.onchange = ev => {
            const file = ev.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                changerPhotoSiegeGPS(inp.dataset.id, reader.result);
                initEntreprise();
            };
            reader.readAsDataURL(file);
        };
    });

    container.querySelectorAll("[data-siege-id]").forEach(bloc => {
        const id = bloc.dataset.siegeId;

        const btnAdd = bloc.querySelector(".btn-add-associe-siege");
        if (btnAdd) {
            btnAdd.onclick = () => {
                const nom = bloc.querySelector(".siege-associe-input").value;
                const role = bloc.querySelector(".siege-associe-role").value;
                const droits = bloc.querySelector(".siege-associe-droits").value;
                if (ajouterMembreSiege(id, nom, role, droits)) initEntreprise();
            };
        }

        bloc.querySelectorAll(".select-droits-siege").forEach(sel => {
            sel.onchange = () => {
                majMembreSiege(id, sel.dataset.nom, { droits: sel.value });
                initEntreprise();
            };
        });

        bloc.querySelectorAll(".btn-virer-siege").forEach(btn => {
            btn.onclick = () => {
                const nom = btn.dataset.nom;
                if (!confirm(`Licencier ${nom} (-${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø) ?`)) return;
                const res = virerMembreSiege(id, nom);
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
