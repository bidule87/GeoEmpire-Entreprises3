import {
    getEntreprise,
    changerNomEntreprise,
    changerPhotoEntreprise,
    calculerValeurEntreprise,
    getSiegesGPS,
    majSiegeGPS,
    SEUIL_HOLDING,
    creerHolding
} from "../entrepriseCore.js";

// Correspondance entre secteur GPS et catégories du catalogue Acheter
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

export function initEntreprise() {
    const e = getEntreprise();
    const sieges = getSiegesGPS();
    const zone = document.getElementById("entreprise");

    // Calcul du statut Holding
    const nbSieges = sieges.length;
    const peutCreerHolding = nbSieges >= SEUIL_HOLDING;
    const holding = e.holding || { active: false };

    let blocHoldingHTML = "";
    if (holding.active) {
        blocHoldingHTML = `
            <div style="margin-top:20px; padding:16px; border-radius:12px; background:rgba(251,191,36,0.15); border:1px solid #fbbf24;">
                <h3 style="margin:0 0 8px 0; color:#fbbf24;">Holding Active : ${holding.nom}</h3>
                <p style="margin:4px 0;">Fondée le <strong>${holding.dateCreation}</strong> • Bonus global de revenus : <strong style="color:#34d399;">+15 %</strong></p>
                <p style="margin:4px 0; font-size:14px; color:#d9eaff;">Toutes vos filiales locales sont consolidées sous cette société mère.</p>
            </div>
        `;
    } else if (peutCreerHolding) {
        blocHoldingHTML = `
            <div style="margin-top:20px; padding:16px; border-radius:12px; background:rgba(52,211,153,0.15); border:1px solid #34d399;">
                <h3 style="margin:0 0 8px 0; color:#34d399;">Création de Holding débloquée !</h3>
                <p style="margin:0 0 10px 0;">Vous possédez <strong>${nbSieges} entreprises</strong>. Regroupez-les en Holding pour obtenir <strong>+15 % sur tous vos loyers</strong>.</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <input type="text" id="input-nom-holding" placeholder="Nom de votre Holding..." class="input-text" style="max-width:260px;">
                    <button id="btn-creer-holding" class="premium-btn" style="margin-top:0; background:#059669;">Fonder la Holding</button>
                </div>
            </div>
        `;
    } else {
        blocHoldingHTML = `
            <div style="margin-top:20px; padding:14px; border-radius:12px; background:rgba(0,40,70,0.6); border:1px dashed rgba(126,200,255,0.4);">
                <strong style="color:#7ec8ff;">Holding verrouillée (${nbSieges} / ${SEUIL_HOLDING} entreprises)</strong>
                <p style="margin:6px 0 0 0; font-size:14px;">Achetez encore <strong>${SEUIL_HOLDING - nbSieges} établissement(s)</strong> sur la <a href="carte.html" style="color:#34d399; font-weight:bold;">Carte GPS</a> pour fonder votre Holding.</p>
            </div>
        `;
    }

    // Génération des cartes pour chaque entreprise achetée sur la carte
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
            const directeur = s.directeur || e.pdg || "Vous-même";

            const listeBiensHTML = biensLies.length > 0
                ? biensLies.map(b => `<span style="display:inline-block; background:rgba(56,189,248,0.2); border:1px solid #38bdf8; padding:4px 10px; border-radius:8px; font-size:13px; margin:3px;">${b.quantite}× ${b.style}</span>`).join("")
                : `<span style="font-size:13px; color:#94a3b8;">Aucun bien acheté dans ce secteur (allez dans l'onglet <strong>Acheter</strong>).</span>`;

            return `
                <div class="gestion-item" style="margin-top:15px; border-left: 5px solid #34d399;">
                    <div style="display:flex; gap:18px; flex-wrap:wrap; align-items:center;">
                        <div style="text-align:center;">
                            <div class="entreprise-photo-frame" style="width:100px; height:100px; margin:0 auto 6px auto;">
                                <img src="${photoSrc}" alt="${s.nom}">
                            </div>
                            <button class="premium-btn btn-photo-siege" data-id="${s.id}" style="padding:5px 10px; font-size:12px; margin-top:0;">Photo</button>
                            <input type="file" class="upload-photo-siege" data-id="${s.id}" accept="image/*" style="display:none;">
                        </div>

                        <div style="flex:1; min-width:240px;">
                            <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                                <strong style="font-size:20px; color:#fff;">${s.nom}</strong>
                                <span style="background:rgba(0,80,160,0.7); padding:4px 10px; border-radius:8px; font-size:13px; color:#7ec8ff;">${s.secteur}</span>
                            </div>
                            <p style="margin:6px 0; font-size:14px;">Valeur du siège : <strong>${(s.prixAchat || 0).toLocaleString("fr-FR")} Ø</strong> • Acquis le ${s.dateAchat || "Aujourd'hui"}</p>

                            <div style="display:flex; gap:8px; align-items:center; margin-top:8px; flex-wrap:wrap;">
                                <label style="margin:0; font-size:14px;">Directeur / Gérant :</label>
                                <input type="text" class="input-directeur-siege input-text" data-id="${s.id}" value="${directeur}" style="max-width:220px; padding:6px 10px; margin:0;">
                                <button class="premium-btn btn-save-siege" data-id="${s.id}" style="padding:6px 12px; font-size:13px; margin:0;">Valider</button>
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
        <div class="premium-panel" style="max-width:1000px;">
            <h2 class="premium-title">Direction Générale & Empire</h2>

            <div class="premium-box">
                <div style="display:flex; gap:20px; flex-wrap:wrap; align-items:center;">
                    <div class="entreprise-photo-section" style="text-align:center;">
                        <div class="entreprise-photo-frame" style="margin:0 auto 8px auto;">
                            <img src="${e.logo}" class="entreprise-photo" id="entreprise-photo">
                        </div>
                        <button id="btn-photo" class="premium-btn" style="margin-top:0; font-size:13px;">Logo du groupe</button>
                        <input type="file" id="upload-photo" accept="image/*" style="display:none;">
                    </div>

                    <div class="entreprise-infos" style="flex:1; min-width:250px;">
                        <label>Nom du groupe :</label>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="nom-entreprise" value="${e.nom}" class="input-text" style="margin-top:0;">
                            <button id="btn-save-nom" class="premium-btn" style="margin-top:0; width:auto;">Enregistrer</button>
                        </div>

                        <p style="margin:4px 0;"><strong>PDG :</strong> ${e.pdg || "Fondateur"} • <strong>Entreprises détenues :</strong> ${nbSieges}</p>
                        <p style="margin:4px 0;"><strong>Trésorerie :</strong> ${(e.argent || 0).toLocaleString("fr-FR")} Ø</p>
                        <p style="margin:4px 0;"><strong>Valeur totale de l'empire :</strong> ${calculerValeurEntreprise().toLocaleString("fr-FR")} Ø</p>
                    </div>
                </div>

                ${blocHoldingHTML}
            </div>
        </div>

        <div class="premium-panel" style="max-width:1000px; margin-top:20px;">
            <h2 class="premium-title">Mes Entreprises & Sièges (${nbSieges})</h2>
            ${siegesHTML}
        </div>
    `;

    // Événements groupe principal
    document.getElementById("btn-save-nom").onclick = () => {
        changerNomEntreprise(document.getElementById("nom-entreprise").value);
        initEntreprise();
    };

    document.getElementById("btn-photo").onclick = () => {
        document.getElementById("upload-photo").click();
    };

    document.getElementById("upload-photo").onchange = ev => {
        const file = ev.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            changerPhotoEntreprise(reader.result);
            initEntreprise();
        };
        reader.readAsDataURL(file);
    };

    // Événement création Holding
    const btnHolding = document.getElementById("btn-creer-holding");
    if (btnHolding) {
        btnHolding.onclick = () => {
            const nomH = document.getElementById("input-nom-holding").value;
            if (creerHolding(nomH)) {
                alert("Félicitations ! Votre Holding est créée (+15 % de revenus globaux).");
                initEntreprise();
            }
        };
    }

    // Événements par siège GPS (directeur + photo)
    zone.querySelectorAll(".btn-save-siege").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const input = zone.querySelector(`.input-directeur-siege[data-id="${id}"]`);
            majSiegeGPS(id, { directeur: input.value });
            alert("Directeur mis à jour !");
        };
    });

    zone.querySelectorAll(".btn-photo-siege").forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            zone.querySelector(`.upload-photo-siege[data-id="${id}"]`).click();
        };
    });

    zone.querySelectorAll(".upload-photo-siege").forEach(input => {
        input.onchange = ev => {
            const file = ev.target.files[0];
            if (!file) return;
            const id = input.dataset.id;
            const reader = new FileReader();
            reader.onload = () => {
                majSiegeGPS(id, { photo: reader.result });
                initEntreprise();
            };
            reader.readAsDataURL(file);
        };
    });
}

window.initEntreprise = initEntreprise;
