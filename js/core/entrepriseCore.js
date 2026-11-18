import {
    getEntreprise,
    changerNomEntreprise,
    changerNomJoueur,
    basculerUtilisateurActif,
    estPdgGeneral,
    changerPhotoEntreprise,
    calculerValeurEntreprise,
    getSiegesGPS,
    majSiegeGPS,
    ajouterAssocieSiege,
    changerDroitsAssocieSiege,
    virerAssocieSiege,
    SEUIL_HOLDING,
    PECULE_DEPART_ASSOCIE,
    creerHolding,
    synchroniserFilialesHolding,
    ajouterAssocieHolding,
    changerDroitsAssocieHolding,
    virerAssocieHolding
} from "../entrepriseCore.js";

const SECTEUR_VERS_CATEGORIES = {
    "Alimentaire & Restauration": ["Restaurants", "Commerces"],
    "Bâtiment & Immobilier": ["Appartements", "Maisons", "Bureaux"],
    "Commerce & Distribution": ["Commerces", "Entrepôts"],
    "Hôtellerie & Services": ["Hôtels", "Bureaux"]
};

function compterBiensParCategories(e, categories) {
    let liste = [];
    if (!e.biens) return liste;

    categories.forEach(cat => {
        const styles = e.biens[cat];
        if (!styles) return;
        for (const [style, info] of Object.entries(styles)) {
            if (info && info.quantite > 0) {
                liste.push({ categorie: cat, style, quantite: info.quantite });
            }
        }
    });
    return liste;
}

function renderBadgeDroits(droits) {
    if (droits === "achetee") {
        return `<span style="background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid #38bdf8; padding:2px 8px; border-radius:6px; font-size:12px;">Partie achetée</span>`;
    }
    if (droits === "louee") {
        return `<span style="background:rgba(251,191,36,0.2); color:#fbbf24; border:1px solid #fbbf24; padding:2px 8px; border-radius:6px; font-size:12px;">Partie louée</span>`;
    }
    return `<span style="background:rgba(52,211,153,0.2); color:#34d399; border:1px solid #34d399; padding:2px 8px; border-radius:6px; font-size:12px;">Accès complet</span>`;
}

export function initEntreprise() {
    const e = getEntreprise();
    const sieges = getSiegesGPS();
    const zone = document.getElementById("entreprise");

    const nbSieges = sieges.length;
    const peutCreerHolding = nbSieges >= SEUIL_HOLDING;
    const holding = e.holding || { active: false, associes: [] };
    const estPdg = estPdgGeneral();

    if (holding.active) {
        synchroniserFilialesHolding();
    }

    const nomsConnus = new Set([e.pdg]);
    (holding.associes || []).forEach(a => nomsConnus.add(a.nom));
    sieges.forEach(s => (s.associes || []).forEach(a => nomsConnus.add(a.nom)));

    const optionsSessionsHTML = Array.from(nomsConnus).map(nom =>
        `<option value="${nom}" ${e.utilisateurActif === nom ? "selected" : ""}>${nom}${nom === e.pdg ? " (PDG Général)" : " (Associé)"}</option>`
    ).join("");

    // ===============================
    // BLOC HOLDING (SEUIL 10 ENTREPRISES)
    // ===============================
    let blocHoldingHTML = "";
    if (holding.active) {
        const associesHoldingHTML = (holding.associes || []).length > 0
            ? holding.associes.map(a => `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; background:rgba(0,20,40,0.65); border:1px solid rgba(251,191,36,0.35); padding:8px 12px; border-radius:8px; margin-bottom:6px;">
                    <div><strong>👤 ${a.nom}</strong> ${renderBadgeDroits(a.droits)}</div>
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        <select class="select-droits-holding" data-nom="${a.nom}" style="padding:4px 8px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #38bdf8; font-size:13px;">
                            <option value="complet" ${a.droits === "complet" ? "selected" : ""}>Accès complet</option>
                            <option value="achetee" ${a.droits === "achetee" ? "selected" : ""}>Partie achetée uniquement</option>
                            <option value="louee" ${a.droits === "louee" ? "selected" : ""}>Partie louée uniquement</option>
                        </select>
                        <button class="btn-virer-holding" data-nom="${a.nom}" style="padding:5px 10px; border-radius:6px; border:none; background:${estPdg ? "#b91c1c" : "#475569"}; color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
                            Virer (pécule ${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø)
                        </button>
                    </div>
                </div>
            `).join("")
            : `<p style="font-size:13px; color:#cbd5e1; margin:4px 0;">Aucun associé rattaché directement à la Holding.</p>`;

        blocHoldingHTML = `
            <div style="margin-top:20px; padding:18px; border-radius:12px; background:rgba(251,191,36,0.12); border:1px solid #fbbf24;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <h3 style="margin:0; color:#fbbf24;">🏛️ Holding Active : ${holding.nom}</h3>
                    <span style="background:#fbbf24; color:#0f172a; font-weight:bold; padding:4px 10px; border-radius:8px; font-size:13px;">${nbSieges} entreprises gérées</span>
                </div>
                <p style="margin:8px 0 12px 0; font-size:14px;">Fondée le <strong>${holding.dateCreation}</strong> • Bonus global : <strong style="color:#34d399;">+20 % revenus</strong> • Pilotage centralisé.</p>
                <div style="padding:12px; border-radius:10px; background:rgba(0,15,30,0.6); border:1px solid rgba(251,191,36,0.3);">
                    <div style="font-size:14px; font-weight:bold; color:#fde68a; margin-bottom:8px;">Associés de la Holding (accès à toutes les entreprises) :</div>
                    ${associesHoldingHTML}
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
                        <input type="text" id="input-associe-holding" placeholder="Nom du nouvel associé..." class="input-text" style="max-width:220px; padding:6px 10px; margin:0;">
                        <select id="select-droits-new-holding" style="padding:6px 10px; border-radius:8px; background:#0f294a; color:#fff; border:1px solid #fbbf24;">
                            <option value="complet">Accès complet</option>
                            <option value="achetee">Partie achetée uniquement</option>
                            <option value="louee">Partie louée uniquement</option>
                        </select>
                        <button id="btn-ajouter-associe-holding" class="premium-btn" style="padding:6px 14px; font-size:13px; margin:0; background:#d97706;">+ Associer à la Holding</button>
                    </div>
                </div>
            </div>
        `;
    } else if (peutCreerHolding) {
        blocHoldingHTML = `
            <div style="margin-top:20px; padding:18px; border-radius:12px; background:rgba(52,211,153,0.15); border:1px solid #34d399;">
                <h3 style="margin:0 0 8px 0; color:#34d399;">🏛️ Création de Holding débloquée (${nbSieges} / ${SEUIL_HOLDING} entreprises) !</h3>
                <p style="margin:0 0 10px 0;">Regroupez vos <strong>${nbSieges} entreprises</strong> dans une Holding pour tout centraliser et gagner <strong>+20 % sur tous vos revenus</strong>.</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <input type="text" id="input-nom-holding" placeholder="Nom de votre Holding..." class="input-text" style="max-width:260px; margin:0;">
                    <button id="btn-creer-holding" class="premium-btn" style="margin-top:0; background:#059669;">Fonder la Holding</button>
                </div>
            </div>
        `;
    } else {
        blocHoldingHTML = `
            <div style="margin-top:20px; padding:14px; border-radius:12px; background:rgba(0,40,70,0.6); border:1px dashed rgba(126,200,255,0.4);">
                <strong style="color:#7ec8ff;">🏛️ Holding verrouillée (${nbSieges} / ${SEUIL_HOLDING} entreprises)</strong>
                <p style="margin:6px 0 0 0; font-size:14px;">Acquérez encore <strong>${SEUIL_HOLDING - nbSieges} entreprise(s)</strong> sur la <a href="carte.html" style="color:#34d399; font-weight:bold;">Carte GPS</a> pour fonder votre Holding.</p>
            </div>
        `;
    }

    // ===============================
    // LISTE DES ENTREPRISES / SIÈGES
    // ===============================
    let siegesHTML = "";
    if (sieges.length === 0) {
        siegesHTML = `
            <div style="text-align:center; padding:25px; background:rgba(0,40,70,0.6); border-radius:12px; margin-top:15px;">
                <p style="font-size:17px; margin-bottom:12px;">Vous n'avez encore acheté aucune entreprise sur la carte.</p>
                <a href="carte.html" class="premium-btn" style="display:inline-block; text-decoration:none;">Ouvrir la Carte GPS</a>
            </div>
        `;
    } else {
        siegesHTML = sieges.map(s => {
            const cats = SECTEUR_VERS_CATEGORIES[s.secteur] || [];
            const biensLies = compterBiensParCategories(e, cats);
            const photoSrc = s.photo || e.logo || "https://i.postimg.cc/Hs0s4ctB/OIG1.jpg";
            const dg = s.directeur || e.pdg || "Fondateur";
            const associes = Array.isArray(s.associes) ? s.associes : [];

            const associesHTML = associes.length > 0
                ? associes.map(a => `
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.45); padding:6px 10px; border-radius:8px; margin-bottom:6px;">
                        <div><strong>👤 ${a.nom}</strong> ${renderBadgeDroits(a.droits)}</div>
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                            <select class="select-droits-siege" data-id="${s.id}" data-nom="${a.nom}" style="padding:4px 8px; border-radius:6px; background:#0f294a; color:#fff; border:1px solid #38bdf8; font-size:12px;">
                                <option value="complet" ${a.droits === "complet" ? "selected" : ""}>Accès complet</option>
                                <option value="achetee" ${a.droits === "achetee" ? "selected" : ""}>Partie achetée</option>
                                <option value="louee" ${a.droits === "louee" ? "selected" : ""}>Partie louée</option>
                            </select>
                            <button class="btn-virer-siege" data-id="${s.id}" data-nom="${a.nom}" style="padding:4px 9px; border-radius:6px; border:none; background:${estPdg ? "#b91c1c" : "#475569"}; color:#fff; font-size:12px; font-weight:bold; cursor:pointer;">
                                Virer (${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø)
                            </button>
                        </div>
                    </div>
                `).join("")
                : `<span style="font-size:13px; color:#94a3b8;">Aucun associé ajouté sur cette entreprise.</span>`;

            const listeBiensHTML = biensLies.length > 0
                ? biensLies.map(b => `<span style="display:inline-block; background:rgba(56,189,248,0.2); border:1px solid #38bdf8; padding:4px 10px; border-radius:8px; font-size:13px; margin:3px;">${b.quantite}× ${b.style}</span>`).join("")
                : `<span style="font-size:13px; color:#94a3b8;">Aucun bien acheté dans ce secteur (onglet <strong>Acheter</strong>).</span>`;

            return `
                <div class="gestion-item" style="margin-top:18px; border-left: 5px solid ${holding.active ? "#fbbf24" : "#34d399"};">
                    <div style="display:flex; gap:18px; flex-wrap:wrap; align-items:flex-start;">
                        <div style="text-align:center;">
                            <div class="entreprise-photo-frame" style="width:105px; height:105px; margin:0 auto 6px auto;">
                                <img src="${photoSrc}" alt="${s.nom}">
                            </div>
                            <button class="premium-btn btn-photo-siege" data-id="${s.id}" style="padding:5px 10px; font-size:12px; margin-top:0;">Photo</button>
                            <input type="file" class="upload-photo-siege" data-id="${s.id}" accept="image/*" style="display:none;">
                        </div>

                        <div style="flex:1; min-width:260px;">
                            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; align-items:center;">
                                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                                    <input type="text" class="input-nom-siege input-text" data-id="${s.id}" value="${s.nom}" style="font-weight:bold; font-size:17px; max-width:260px; padding:6px 10px; margin:0;">
                                    ${holding.active ? `<span style="background:rgba(251,191,36,0.25); color:#fbbf24; border:1px solid #fbbf24; padding:3px 8px; border-radius:6px; font-size:12px;">Filiale Holding</span>` : ""}
                                </div>
                                <span style="background:rgba(0,80,160,0.7); padding:4px 10px; border-radius:8px; font-size:13px; color:#7ec8ff;">${s.secteur}</span>
                            </div>

                            <p style="margin:8px 0; font-size:14px;">Valeur du siège : <strong>${(s.prixAchat || 0).toLocaleString("fr-FR")} Ø</strong> • Acquis le ${s.dateAchat || "Aujourd'hui"}</p>

                            <div style="display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap;">
                                <label style="margin:0; font-size:14px; min-width:145px;">Directeur Général :</label>
                                <input type="text" class="input-directeur-siege input-text" data-id="${s.id}" value="${dg}" style="max-width:210px; padding:6px 10px; margin:0;">
                                <button class="premium-btn btn-moi-dg" data-id="${s.id}" style="padding:6px 10px; font-size:12px; margin:0; background:#1e40af;">Moi (${e.pdg})</button>
                                <button class="premium-btn btn-save-siege" data-id="${s.id}" style="padding:6px 12px; font-size:13px; margin:0;">Enregistrer</button>
                            </div>

                            <div style="margin-top:12px; padding:10px; border-radius:8px; background:rgba(0,20,40,0.5); border:1px solid rgba(168,85,247,0.3);">
                                <div style="font-size:13px; color:#d8b4fe; margin-bottom:6px;">
                                    <strong>Associés & Cogérants</strong> (accès modulable : complet, partie achetée ou partie louée) :
                                </div>
                                <div style="margin-bottom:8px;">${associesHTML}</div>
                                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                    <input type="text" class="input-nouvel-associe input-text" data-id="${s.id}" placeholder="Nom de l'associé..." style="max-width:190px; padding:6px 10px; margin:0;">
                                    <select class="select-droits-new-siege" data-id="${s.id}" style="padding:6px 8px; border-radius:8px; background:#0f294a; color:#fff; border:1px solid #a855f7; font-size:13px;">
                                        <option value="complet">Accès complet</option>
                                        <option value="achetee">Partie achetée</option>
                                        <option value="louee">Partie louée</option>
                                    </select>
                                    <button class="premium-btn btn-ajouter-associe" data-id="${s.id}" style="padding:6px 12px; font-size:13px; margin:0; background:#7e22ce;">+ Ajouter</button>
                                </div>
                            </div>

                            <div style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1);">
                                <div style="font-size:13px; color:#aee0ff; margin-bottom:4px;">Catalogue des biens rattachés (${cats.join(", ")}) :</div>
                                <div>${listeBiensHTML}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    zone.innerHTML = `
        <div class="premium-panel" style="max-width:1050px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:15px;">
                <h2 class="premium-title" style="margin:0;">Direction Générale & Empire</h2>
                <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
                    <span style="background:rgba(0,60,120,0.85); border:1px solid #38bdf8; padding:6px 12px; border-radius:8px; font-size:13px; color:#bae6fd;">
                        ⏱️ <strong>1 jour = 1 mois</strong> • <strong>12 jours = 1 an</strong>
                    </span>
                    <div style="background:rgba(15,41,74,0.9); border:1px solid #fbbf24; padding:5px 10px; border-radius:8px; font-size:13px;">
                        Session :
                        <select id="select-session-joueur" style="background:transparent; color:#fbbf24; font-weight:bold; border:none; cursor:pointer;">
                            ${optionsSessionsHTML}
                        </select>
                    </div>
                </div>
            </div>

            <div class="premium-box">
                <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:center;">
                    <div class="entreprise-photo-frame" style="margin:0 auto 8px auto; text-align:center;">
                        <img src="${e.logo}" class="entreprise-photo" id="entreprise-photo">
                    </div>
                    <div style="flex:1; min-width:260px;">
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
                            <div>
                                <label style="font-size:14px;">Nom du groupe :</label>
                                <input type="text" id="nom-entreprise" value="${e.nom}" class="input-text" style="margin-top:4px;">
                            </div>
                            <div>
                                <label style="font-size:14px;">PDG Général :</label>
                                <input type="text" id="nom-joueur" value="${e.pdg || "Fondateur"}" class="input-text" style="margin-top:4px;">
                            </div>
                        </div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
                            <button id="btn-save-profil-groupe" class="premium-btn" style="margin-top:0;">Enregistrer Groupe & PDG</button>
                            <button id="btn-photo" class="premium-btn" style="margin-top:0; background:#1e40af;">Logo du groupe</button>
                            <input type="file" id="upload-photo" accept="image/*" style="display:none;">
                        </div>
                        <p style="margin:4px 0;"><strong>Entreprises détenues :</strong> ${nbSieges} • <strong>Trésorerie :</strong> ${(e.argent || 0).toLocaleString("fr-FR")} Ø</p>
                        <p style="margin:4px 0;"><strong>Valeur totale de l'empire :</strong> ${calculerValeurEntreprise().toLocaleString("fr-FR")} Ø</p>
                    </div>
                </div>
                ${blocHoldingHTML}
            </div>
        </div>

        <div class="premium-panel" style="max-width:1050px; margin-top:20px;">
            <h2 class="premium-title">Mes Entreprises & Sièges (${nbSieges})</h2>
            ${siegesHTML}
        </div>
    `;

    // Événements
    document.getElementById("select-session-joueur").onchange = ev => {
        basculerUtilisateurActif(ev.target.value);
        initEntreprise();
    };

    document.getElementById("btn-save-profil-groupe").onclick = () => {
        changerNomEntreprise(document.getElementById("nom-entreprise").value);
        changerNomJoueur(document.getElementById("nom-joueur").value);
        initEntreprise();
    };

    document.getElementById("btn-photo").onclick = () => document.getElementById("upload-photo").click();
    document.getElementById("upload-photo").onchange = ev => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { changerPhotoEntreprise(reader.result); initEntreprise(); };
        reader.readAsDataURL(file);
    };

    const btnHolding = document.getElementById("btn-creer-holding");
    if (btnHolding) {
        btnHolding.onclick = () => {
            const nomH = document.getElementById("input-nom-holding").value;
            if (creerHolding(nomH)) initEntreprise();
        };
    }

    const btnAddAssocHolding = document.getElementById("btn-ajouter-associe-holding");
    if (btnAddAssocHolding) {
        btnAddAssocHolding.onclick = () => {
            const nom = document.getElementById("input-associe-holding").value;
            const droits = document.getElementById("select-droits-new-holding").value;
            if (ajouterAssocieHolding(nom, droits)) initEntreprise();
        };
    }

    zone.querySelectorAll(".select-droits-holding").forEach(sel => {
        sel.onchange = () => { changerDroitsAssocieHolding(sel.dataset.nom, sel.value); initEntreprise(); };
    });

    zone.querySelectorAll(".btn-virer-holding").forEach(btn => {
        btn.onclick = () => {
            if (!confirm(`Virer ${btn.dataset.nom} de la Holding avec un pécule de ${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø ?`)) return;
            const res = virerAssocieHolding(btn.dataset.nom);
            if (!res.ok) alert(res.message);
            initEntreprise();
        };
    });

    zone.querySelectorAll(".btn-moi-dg").forEach(btn => {
        btn.onclick = () => {
            zone.querySelector(`.input-directeur-siege[data-id="${btn.dataset.id}"]`).value = e.pdg || "Fondateur";
        };
    });

    zone.querySelectorAll(".btn-save-siege").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            majSiegeGPS(id, {
                nom: zone.querySelector(`.input-nom-siege[data-id="${id}"]`).value.trim() || "Entreprise",
                directeur: zone.querySelector(`.input-directeur-siege[data-id="${id}"]`).value.trim() || e.pdg
            });
            initEntreprise();
        };
    });

    zone.querySelectorAll(".btn-ajouter-associe").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const nom = zone.querySelector(`.input-nouvel-associe[data-id="${id}"]`).value;
            const droits = zone.querySelector(`.select-droits-new-siege[data-id="${id}"]`).value;
            if (ajouterAssocieSiege(id, nom, droits)) initEntreprise();
        };
    });

    zone.querySelectorAll(".select-droits-siege").forEach(sel => {
        sel.onchange = () => { changerDroitsAssocieSiege(sel.dataset.id, sel.dataset.nom, sel.value); initEntreprise(); };
    });

    zone.querySelectorAll(".btn-virer-siege").forEach(btn => {
        btn.onclick = () => {
            if (!confirm(`Virer ${btn.dataset.nom} avec un pécule de ${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø ?`)) return;
            const res = virerAssocieSiege(btn.dataset.id, btn.dataset.nom);
            if (!res.ok) alert(res.message);
            initEntreprise();
        };
    });

    zone.querySelectorAll(".btn-photo-siege").forEach(btn => {
        btn.onclick = () => zone.querySelector(`.upload-photo-siege[data-id="${btn.dataset.id}"]`).click();
    });

    zone.querySelectorAll(".upload-photo-siege").forEach(input => {
        input.onchange = ev => {
            const file = ev.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => { majSiegeGPS(input.dataset.id, { photo: reader.result }); initEntreprise(); };
            reader.readAsDataURL(file);
        };
    });
}

window.initEntreprise = initEntreprise;
