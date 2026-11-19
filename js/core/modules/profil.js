// ============================================
// PROFIL JOUEUR — COMPTE UNIQUE, PAYS/IP, SYNCHRO & CARTE BOUTIQUE
// ============================================

import { getData, saveData, loadData, ajouterHistorique } from "../geoData.js";

const REGISTRE_UNIQUE_KEY = "geoEmpireCompteUniqueVerrou";

const AVATAR_DEFAUT = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <rect width="120" height="120" rx="60" fill="#0f294a"/>
        <circle cx="60" cy="44" r="22" fill="#38bdf8"/>
        <path d="M22 104c4-22 20-34 38-34s34 12 38 34" fill="#38bdf8"/>
    </svg>`
);

function getDrapeauPays(codePays) {
    if (!codePays || codePays.length !== 2) return "🌍";
    const codePoints = codePays
        .toUpperCase()
        .split("")
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

async function detecterConnexionGeo(profil) {
    try {
        const res = await fetch("https://ipwho.is/");
        if (!res.ok) return;
        const info = await res.json();
        if (info && info.success !== false) {
            profil.ipConnexion = info.ip || profil.ipConnexion || "Masquée";
            profil.pays = info.country || profil.pays || "France";
            profil.codePays = info.country_code || profil.codePays || "FR";
            profil.ville = info.city || profil.ville || "";

            // Verrou anti-multicompte lié à l'IP + appareil
            const verrouExistant = JSON.parse(localStorage.getItem(REGISTRE_UNIQUE_KEY) || "null");
            if (!verrouExistant && profil.email) {
                localStorage.setItem(REGISTRE_UNIQUE_KEY, JSON.stringify({
                    email: profil.email,
                    ip: profil.ipConnexion,
                    dateCreation: new Date().toISOString()
                }));
            }
            saveData();
            const elGeo = document.getElementById("profil-geo-live");
            if (elGeo) {
                elGeo.innerHTML = `${getDrapeauPays(profil.codePays)} <strong>${profil.pays}</strong>${profil.ville ? ` (${profil.ville})` : ""} • IP enregistrée : <code>${profil.ipConnexion}</code>`;
            }
        }
    } catch {
        // Mode hors-ligne ou bloqueur : on garde les dernières infos connues
    }
}

function calculerClassementJoueur(entreprise) {
    const patrimoine = (entreprise.argent || 0) + (entreprise.capital || 0) + ((entreprise.commercesGPS || []).length * 25000);
    if (patrimoine >= 5000000) return { rang: "Top 1 % • Magnat Mondial", titre: "Magnat International", couleur: "#fbbf24" };
    if (patrimoine >= 1000000) return { rang: "Top 5 % • Capitaine d'Industrie", titre: "Grand Dirigeant", couleur: "#a855f7" };
    if (patrimoine >= 250000) return { rang: "Top 18 % • Entrepreneur Confirmé", titre: "Directeur de Groupe", couleur: "#34d399" };
    if (patrimoine >= 80000) return { rang: "Top 42 % • Commerçant Actif", titre: "Entrepreneur", couleur: "#38bdf8" };
    return { rang: "Nouveau Fondateur", titre: "Créateur d'Entreprise", couleur: "#94a3b8" };
}

function compresserImageAvatar(file, callback) {
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const max = 180;
            canvas.width = max;
            canvas.height = max;
            const ctx = canvas.getContext("2d");
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, max, max);
            callback(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}

export function initProfil() {
    loadData();
    const zone = document.getElementById("profil-container");
    if (!zone) return;

    const data = getData();
    const e = data.entreprise;

    if (!e.profil) {
        e.profil = {
            surnom: e.pdg || "Fondateur",
            age: "",
            email: "",
            emailVerrouille: false,
            photo: "",
            pays: "France",
            codePays: "FR",
            ville: "",
            ipConnexion: "Détection...",
            carteBancaire: null
        };
        saveData();
    }

    const p = e.profil;
    const classement = calculerClassementJoueur(e);
    const sieges = e.commercesGPS || [];
    const holdingActive = e.holding?.active === true;

    const cb = p.carteBancaire;
    const carteHTML = cb
        ? `<div style="padding:12px; background:rgba(16,185,129,0.14); border:1px solid #34d399; border-radius:9px; margin-bottom:10px;">
                <div style="font-weight:bold; color:#34d399;">💳 Carte enregistrée (${cb.reseau || "CB"})</div>
                <div style="font-size:14px; letter-spacing:1px; margin:4px 0;">•••• •••• •••• ${cb.derniersChiffres}</div>
                <div style="font-size:12px; color:#cbd5e1;">Titulaire : ${cb.titulaire} • Exp. ${cb.expiration}</div>
           </div>`
        : `<div style="padding:10px; background:rgba(245,158,11,0.14); border:1px solid #fbbf24; border-radius:9px; font-size:13px; color:#fde68a; margin-bottom:10px;">
                Aucune carte enregistrée pour vos achats en Boutique.
           </div>`;

    zone.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-bottom:1px solid rgba(56,189,248,0.25); padding-bottom:14px;">
            <div>
                <h2 style="margin:0; color:#7ec8ff;">Passeport & Compte Unique Geo Empire</h2>
                <div id="profil-geo-live" style="font-size:13px; color:#bae6fd; margin-top:4px;">
                    ${getDrapeauPays(p.codePays)} <strong>${p.pays || "France"}</strong> • IP enregistrée : <code>${p.ipConnexion || "Vérification..."}</code>
                </div>
            </div>
            <span class="badge-securite">🔒 Protection Anti-Multicompte Active</span>
        </div>

        <div class="profil-grid">
            <!-- COLONNE 1 : IDENTITÉ, PHOTO & COMPTE UNIQUE -->
            <div class="profil-card">
                <h3 style="margin-top:0; color:#7ec8ff;">👤 Identité & Connexion Unique</h3>

                <div class="profil-avatar-zone">
                    <img id="profil-avatar-preview" src="${p.photo || AVATAR_DEFAUT}" alt="Photo de profil" class="profil-avatar-img">
                    <div>
                        <label for="input-photo-profil" class="premium-btn" style="display:inline-block; margin:0; padding:8px 13px; font-size:13px; cursor:pointer; background:#0284c7;">
                            📷 Choisir ma photo
                        </label>
                        <input type="file" id="input-photo-profil" accept="image/*" style="display:none;">
                        <div style="font-size:11px; color:#94a3b8; margin-top:5px;">JPG, PNG ou WebP (appareil ou PC)</div>
                    </div>
                </div>

                <div class="profil-field">
                    <label>Surnom / Pseudo (affiché dans vos entreprises) :</label>
                    <input type="text" id="profil-surnom" value="${p.surnom || ""}" placeholder="Votre surnom...">
                </div>

                <div class="profil-field">
                    <label>Âge :</label>
                    <input type="number" id="profil-age" min="13" max="110" value="${p.age || ""}" placeholder="Ex : 28">
                </div>

                <div class="profil-field">
                    <label>Adresse e-mail unique (verrouillée après validation) :</label>
                    <input type="email" id="profil-email" value="${p.email || ""}" ${p.emailVerrouille ? "readonly" : ""} placeholder="votre.email@exemple.fr">
                    <div style="font-size:11px; color:${p.emailVerrouille ? "#34d399" : "#fbbf24"}; margin-top:4px;">
                        ${p.emailVerrouille
                            ? "✓ Compte unique lié à cet e-mail et à votre adresse IP."
                            : "⚠️ Une seule adresse e-mail autorisée par joueur (empêche la création de doubles comptes)."}
                    </div>
                </div>

                <button type="button" id="btn-save-profil" class="premium-btn" style="width:100%; background:#059669; margin-top:6px;">
                    💾 Enregistrer mon profil
                </button>
            </div>

            <!-- COLONNE 2 : CLASSEMENT, HOLDINGS & ENTREPRISES (SANS LES BIENS) -->
            <div class="profil-card">
                <h3 style="margin-top:0; color:#7ec8ff;">🏆 Classement & Structure de l'Empire</h3>

                <div style="padding:12px; background:rgba(15,23,42,0.85); border:1px solid ${classement.couleur}; border-radius:10px; margin-bottom:14px;">
                    <div style="font-size:12px; color:#94a3b8;">Position au classement</div>
                    <div style="font-size:18px; font-weight:bold; color:${classement.couleur}; margin-top:2px;">${classement.rang}</div>
                    <div style="font-size:12px; color:#cbd5e1; margin-top:2px;">Statut : ${classement.titre}</div>
                </div>

                <div style="margin-bottom:14px;">
                    <div style="font-size:13px; font-weight:bold; color:#fde68a; margin-bottom:6px;">🏛️ Holding(s) :</div>
                    ${holdingActive
                        ? `<div style="padding:9px 12px; background:rgba(245,158,11,0.15); border:1px solid #fbbf24; border-radius:8px; font-size:13px;">
                                <strong>${e.holding.nom}</strong> — Groupe actif (${sieges.length} filiale(s))
                           </div>`
                        : `<div style="font-size:13px; color:#94a3b8;">Aucune holding constituée pour le moment.</div>`
                    }
                </div>

                <div>
                    <div style="font-size:13px; font-weight:bold; color:#7ec8ff; margin-bottom:6px;">🏢 Entreprises détenues (${sieges.length}) :</div>
                    ${sieges.length === 0
                        ? `<div style="font-size:13px; color:#94a3b8;">Aucune entreprise acquise sur la carte GPS.</div>`
                        : `<div style="display:flex; flex-direction:column; gap:6px; max-height:190px; overflow-y:auto;">
                            ${sieges.map(s => `
                                <div style="padding:8px 11px; background:rgba(15,23,42,0.75); border:1px solid rgba(56,189,248,0.25); border-radius:7px; display:flex; justify-content:space-between; align-items:center;">
                                    <strong style="font-size:13px; color:#fff;">${s.nom}</strong>
                                    <span style="font-size:11px; color:#7ec8ff;">${s.secteur}</span>
                                </div>
                            `).join("")}
                           </div>`
                    }
                </div>
            </div>
        </div>

        <div class="profil-grid">
            <!-- COLONNE 3 : CARTE BOUTIQUE -->
            <div class="profil-card">
                <h3 style="margin-top:0; color:#7ec8ff;">💳 Moyen de Paiement (Boutique)</h3>
                ${carteHTML}

                <div class="profil-field">
                    <label>Titulaire de la carte :</label>
                    <input type="text" id="cb-titulaire" value="${cb?.titulaire || ""}" placeholder="Nom et prénom">
                </div>
                <div class="profil-field">
                    <label>Numéro de carte (16 chiffres) :</label>
                    <input type="text" id="cb-numero" maxlength="19" placeholder="4970 •••• •••• 1234">
                </div>
                <div class="profil-field" style="max-width:160px;">
                    <label>Expiration (MM/AA) :</label>
                    <input type="text" id="cb-exp" maxlength="5" value="${cb?.expiration || ""}" placeholder="08/29">
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" id="btn-save-cb" class="premium-btn" style="margin:0; padding:8px 14px; font-size:13px; background:#0284c7;">
                        Enregistrer la carte
                    </button>
                    <a href="boutique.html" class="premium-btn" style="margin:0; padding:8px 14px; font-size:13px; background:#d97706; text-decoration:none; display:inline-block;">
                        Ouvrir la Boutique →
                    </a>
                </div>
            </div>

            <!-- COLONNE 4 : SYNCHRONISATION MULTI-APPAREILS (PC / MOBILE / TABLETTE) -->
            <div class="profil-card">
                <h3 style="margin-top:0; color:#7ec8ff;">📱 Synchro PC / Mobile / Tablette</h3>
                <p style="font-size:13px; color:#cbd5e1; margin-top:0; line-height:1.5;">
                    Utilisez votre <strong>code de transfert lié à votre e-mail</strong> pour retrouver exactement votre profil et vos entreprises sur votre téléphone ou votre tablette.
                </p>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">
                    <button type="button" id="btn-export-synchro" class="premium-btn" style="margin:0; padding:8px 13px; font-size:13px; background:#0284c7;">
                        📤 Copier mon code de synchro
                    </button>
                </div>

                <div class="profil-field">
                    <label>Importer un code de synchro sur cet appareil :</label>
                    <input type="text" id="input-import-synchro" placeholder="Collez ici le code généré depuis votre autre appareil...">
                </div>
                <button type="button" id="btn-import-synchro" class="premium-btn" style="margin:0; padding:8px 14px; font-size:13px; background:#059669;">
                    📥 Charger ma partie sur cet appareil
                </button>
            </div>
        </div>
    `;

    detecterConnexionGeo(p);
    bindProfilEvents();
}

function bindProfilEvents() {
    // Upload & aperçu photo de profil
    const inputPhoto = document.getElementById("input-photo-profil");
    if (inputPhoto) {
        inputPhoto.onchange = ev => {
            const file = ev.target.files?.[0];
            if (!file) return;
            compresserImageAvatar(file, base64 => {
                const d = getData();
                d.entreprise.profil.photo = base64;
                saveData();
                const preview = document.getElementById("profil-avatar-preview");
                if (preview) preview.src = base64;
            });
        };
    }

    // Sauvegarde identité & e-mail unique
    const btnSave = document.getElementById("btn-save-profil");
    if (btnSave) {
        btnSave.onclick = () => {
            const d = getData();
            const e = d.entreprise;
            const p = e.profil;

            const surnom = document.getElementById("profil-surnom")?.value.trim();
            const age = document.getElementById("profil-age")?.value.trim();
            const emailInput = document.getElementById("profil-email")?.value.trim().toLowerCase();

            if (!surnom) return alert("Veuillez renseigner un surnom.");

            if (!p.emailVerrouille) {
                if (!emailInput || !emailInput.includes("@")) {
                    return alert("Veuillez saisir une adresse e-mail valide pour verrouiller votre compte unique.");
                }
                const verrouExistant = JSON.parse(localStorage.getItem(REGISTRE_UNIQUE_KEY) || "null");
                if (verrouExistant && verrouExistant.email && verrouExistant.email !== emailInput) {
                    return alert(`Un compte unique (${verrouExistant.email}) est déjà enregistré sur cet appareil/IP.`);
                }
                p.email = emailInput;
                p.emailVerrouille = true;
                localStorage.setItem(REGISTRE_UNIQUE_KEY, JSON.stringify({
                    email: p.email,
                    ip: p.ipConnexion || "Locale",
                    dateCreation: new Date().toISOString()
                }));
            }

            p.surnom = surnom;
            p.age = age;

            // Synchronisation avec le dirigeant et l'onglet Personnel des entreprises
            e.pdg = surnom;
            e.utilisateurActif = surnom;
            if (e.personnel) e.personnel.nom = surnom;

            saveData();
            ajouterHistorique(`Profil joueur mis à jour (${surnom} • ${p.pays})`, "info", surnom);
            alert("Profil enregistré et synchronisé avec vos entreprises !");
            initProfil();
        };
    }

    // Enregistrement carte bancaire masquée pour la Boutique
    const btnSaveCb = document.getElementById("btn-save-cb");
    if (btnSaveCb) {
        btnSaveCb.onclick = () => {
            const titulaire = document.getElementById("cb-titulaire")?.value.trim();
            const numBrut = (document.getElementById("cb-numero")?.value || "").replace(/\s+/g, "");
            const exp = document.getElementById("cb-exp")?.value.trim();

            if (!titulaire || numBrut.length < 12 || !exp) {
                return alert("Veuillez renseigner le titulaire, un numéro de carte valide et la date d'expiration.");
            }

            const d = getData();
            d.entreprise.profil.carteBancaire = {
                titulaire,
                derniersChiffres: numBrut.slice(-4),
                expiration: exp,
                reseau: numBrut.startsWith("4") ? "Visa" : (numBrut.startsWith("5") ? "Mastercard" : "CB")
            };
            saveData();
            alert("Carte enregistrée de façon sécurisée pour la Boutique !");
            initProfil();
        };
    }

    // Exportation code de synchro multi-appareils
    const btnExport = document.getElementById("btn-export-synchro");
    if (btnExport) {
        btnExport.onclick = async () => {
            const d = getData();
            if (!d.entreprise.profil?.emailVerrouille) {
                return alert("Enregistrez d'abord votre adresse e-mail unique avant d'exporter votre code de synchro.");
            }
            const payload = btoa(unescape(encodeURIComponent(JSON.stringify(d))));
            try {
                await navigator.clipboard.writeText(payload);
                alert("Code de synchronisation copié ! Collez-le sur votre téléphone ou tablette dans Profil → Importer.");
            } catch {
                prompt("Copiez ce code de synchronisation :", payload);
            }
        };
    }

    // Importation code de synchro sur un autre appareil
    const btnImport = document.getElementById("btn-import-synchro");
    if (btnImport) {
        btnImport.onclick = () => {
            const code = document.getElementById("input-import-synchro")?.value.trim();
            if (!code) return alert("Collez d'abord votre code de synchronisation.");

            try {
                const decoded = JSON.parse(decodeURIComponent(escape(atob(code))));
                if (!decoded || !decoded.entreprise) throw new Error("Format invalide");

                localStorage.setItem("geoEmpireData", JSON.stringify(decoded));
                if (decoded.entreprise.profil?.email) {
                    localStorage.setItem(REGISTRE_UNIQUE_KEY, JSON.stringify({
                        email: decoded.entreprise.profil.email,
                        ip: "Synchronisé",
                        dateCreation: new Date().toISOString()
                    }));
                }
                alert("Partie synchronisée avec succès sur cet appareil !");
                window.location.reload();
            } catch {
                alert("Code de synchronisation invalide ou corrompu.");
            }
        };
    }
}

window.initProfil = initProfil;
