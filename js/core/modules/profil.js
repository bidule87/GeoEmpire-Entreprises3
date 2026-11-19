// ============================================
// PROFIL JOUEUR — CONNEXION PAR E-MAIL, SYNCHRO CLOUD & JOURNAL IP PRIVÉ
// ============================================

import { getData, saveData, loadData, ajouterHistorique } from "../geoData.js";

const REGISTRE_UNIQUE_KEY = "geoEmpireCompteUniqueVerrou";
const JOURNAL_CONNEXIONS_KEY = "geoEmpireJournalConnexions";
const CODE_MAITRE_ADMIN = "EMPIRE-MASTER-87";

// Base Firebase Realtime Database connectée
const SYNCHRO_CLOUD_CONFIG = {
    active: true,
    databaseURL: "https://geo-empire-8ca7e-default-rtdb.europe-west1.firebasedatabase.app"
};

const AVATAR_DEFAUT = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <rect width="120" height="120" rx="60" fill="#0f294a"/>
        <circle cx="60" cy="44" r="22" fill="#38bdf8"/>
        <path d="M22 104c4-22 20-34 38-34s34 12 38 34" fill="#38bdf8"/>
    </svg>`
);

let panneauAdminOuvert = false;
let clicsSecrets = 0;

function getDrapeauPays(codePays) {
    if (!codePays || codePays.length !== 2) return "🌍";
    const codePoints = codePays
        .toUpperCase()
        .split("")
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

function detecterTypeAppareil() {
    const ua = navigator.userAgent || "";
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) {
        return "Tablette";
    }
    if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
        return "Mobile";
    }
    return "PC / Ordinateur";
}

function normaliserCleEmail(email) {
    return btoa(email.trim().toLowerCase()).replace(/[^a-zA-Z0-9]/g, "");
}

// Sauvegarde & lecture Cloud (Firebase Realtime Database)
async function pousserSauvegardeCloud(email, payloadData) {
    if (!SYNCHRO_CLOUD_CONFIG.active || !SYNCHRO_CLOUD_CONFIG.databaseURL || !email) return false;
    try {
        const cle = normaliserCleEmail(email);
        const base = SYNCHRO_CLOUD_CONFIG.databaseURL.replace(/\/$/, "");
        const res = await fetch(`${base}/comptes/${cle}.json`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                maj: Date.now(),
                entreprise: payloadData.entreprise
            })
        });
        return res.ok;
    } catch {
        return false;
    }
}

async function recupererSauvegardeCloud(email) {
    if (!SYNCHRO_CLOUD_CONFIG.active || !SYNCHRO_CLOUD_CONFIG.databaseURL || !email) return null;
    try {
        const cle = normaliserCleEmail(email);
        const base = SYNCHRO_CLOUD_CONFIG.databaseURL.replace(/\/$/, "");
        const res = await fetch(`${base}/comptes/${cle}.json`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

async function enregistrerLogConnexionSilencieux(profil) {
    const entree = {
        date: new Date().toLocaleString("fr-FR"),
        timestamp: Date.now(),
        surnom: profil.surnom || "Fondateur",
        email: profil.email || "Non renseigné",
        ip: profil.ipConnexion || "Inconnue",
        pays: profil.pays || "Inconnu",
        codePays: profil.codePays || "FR",
        ville: profil.ville || "-",
        appareil: detecterTypeAppareil()
    };

    const journal = JSON.parse(localStorage.getItem(JOURNAL_CONNEXIONS_KEY) || "[]");
    const derniere = journal[0];
    if (!derniere || derniere.ip !== entree.ip || derniere.email !== entree.email || (entree.timestamp - derniere.timestamp) > 600000) {
        journal.unshift(entree);
        if (journal.length > 200) journal.pop();
        localStorage.setItem(JOURNAL_CONNEXIONS_KEY, JSON.stringify(journal));
    }

    if (SYNCHRO_CLOUD_CONFIG.active && SYNCHRO_CLOUD_CONFIG.databaseURL) {
        try {
            const base = SYNCHRO_CLOUD_CONFIG.databaseURL.replace(/\/$/, "");
            await fetch(`${base}/journalConnexions.json`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(entree)
            });
        } catch {
            // Silencieux côté joueur
        }
    }
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

            const verrouExistant = JSON.parse(localStorage.getItem(REGISTRE_UNIQUE_KEY) || "null");
            if (!verrouExistant && profil.email) {
                localStorage.setItem(REGISTRE_UNIQUE_KEY, JSON.stringify({
                    email: profil.email,
                    ip: profil.ipConnexion,
                    dateCreation: new Date().toISOString()
                }));
            }
            saveData();
            await enregistrerLogConnexionSilencieux(profil);

            const elGeo = document.getElementById("profil-geo-live");
            if (elGeo) {
                elGeo.innerHTML = `${getDrapeauPays(profil.codePays)} <strong>${profil.pays}</strong>${profil.ville ? ` (${profil.ville})` : ""} • Appareil : <strong>${detecterTypeAppareil()}</strong>`;
            }
        }
    } catch {
        await enregistrerLogConnexionSilencieux(profil);
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

async function chargerJournalAdmin() {
    let logs = JSON.parse(localStorage.getItem(JOURNAL_CONNEXIONS_KEY) || "[]");
    if (SYNCHRO_CLOUD_CONFIG.active && SYNCHRO_CLOUD_CONFIG.databaseURL) {
        try {
            const base = SYNCHRO_CLOUD_CONFIG.databaseURL.replace(/\/$/, "");
            const res = await fetch(`${base}/journalConnexions.json`);
            if (res.ok) {
                const raw = await res.json();
                if (raw && typeof raw === "object") {
                    logs = Object.values(raw).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                }
            }
        } catch {
            // Fallback local
        }
    }
    return logs;
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
                <h2 id="titre-passeport-profil" style="margin:0; color:#7ec8ff; cursor:default; user-select:none;">Passeport & Compte Unique Geo Empire</h2>
                <div id="profil-geo-live" style="font-size:13px; color:#bae6fd; margin-top:4px;">
                    ${getDrapeauPays(p.codePays)} <strong>${p.pays || "France"}</strong> • Appareil : <strong>${detecterTypeAppareil()}</strong>
                </div>
            </div>
            <span class="badge-securite">🔒 Synchro Cloud & Anti-Multicompte Actifs</span>
        </div>

        <div class="profil-grid">
            <!-- COLONNE 1 : IDENTITÉ, PHOTO & CONNEXION E-MAIL -->
            <div class="profil-card">
                <h3 style="margin-top:0; color:#7ec8ff;">👤 Identité & Connexion Multi-Appareils</h3>

                <div class="profil-avatar-zone">
                    <img id="profil-avatar-preview" src="${p.photo || AVATAR_DEFAUT}" alt="Photo de profil" class="profil-avatar-img">
                    <div>
                        <label for="input-photo-profil" class="premium-btn" style="display:inline-block; margin:0; padding:8px 13px; font-size:13px; cursor:pointer; background:#0284c7;">
                            📷 Choisir ma photo
                        </label>
                        <input type="file" id="input-photo-profil" accept="image/*" style="display:none;">
                        <div style="font-size:11px; color:#94a3b8; margin-top:5px;">JPG, PNG ou WebP</div>
                    </div>
                </div>

                <div class="profil-field">
                    <label>Surnom / Pseudo :</label>
                    <input type="text" id="profil-surnom" value="${p.surnom || ""}" placeholder="Votre surnom...">
                </div>

                <div class="profil-field">
                    <label>Âge :</label>
                    <input type="number" id="profil-age" min="13" max="110" value="${p.age || ""}" placeholder="Ex : 28">
                </div>

                <div class="profil-field">
                    <label>Adresse e-mail (identifiant unique PC / Mobile / Tablette) :</label>
                    <input type="email" id="profil-email" value="${p.email || ""}" ${p.emailVerrouille ? "readonly" : ""} placeholder="votre.email@exemple.fr">
                    <div style="font-size:11px; color:${p.emailVerrouille ? "#34d399" : "#fbbf24"}; margin-top:4px;">
                        ${p.emailVerrouille
                            ? "✓ Compte unique lié à cet e-mail. Entrez ce même e-mail sur mobile ou tablette pour retrouver votre empire."
                            : "⚠️ Une seule adresse e-mail autorisée par joueur (verrouillée après validation)."}
                    </div>
                </div>

                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                    <button type="button" id="btn-save-profil" class="premium-btn" style="flex:1; background:#059669; margin:0;">
                        💾 Enregistrer & Synchroniser
                    </button>
                    ${!p.emailVerrouille ? `
                        <button type="button" id="btn-recuperer-email" class="premium-btn" style="background:#0284c7; margin:0;">
                            🔄 Charger mon compte e-mail
                        </button>
                    ` : ""}
                </div>
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

        <!-- CARTE BANCAIRE BOUTIQUE -->
        <div class="profil-grid">
            <div class="profil-card">
                <h3 style="margin-top:0; color:#7ec8ff;">💳 Moyen de Paiement (Boutique)</h3>
                ${carteHTML}

                <div style="display:flex; flex-wrap:wrap; gap:12px;">
                    <div class="profil-field" style="flex:2; min-width:200px;">
                        <label>Titulaire de la carte :</label>
                        <input type="text" id="cb-titulaire" value="${cb?.titulaire || ""}" placeholder="Nom et prénom">
                    </div>
                    <div class="profil-field" style="flex:2; min-width:200px;">
                        <label>Numéro de carte (16 chiffres) :</label>
                        <input type="text" id="cb-numero" maxlength="19" placeholder="4970 •••• •••• 1234">
                    </div>
                    <div class="profil-field" style="flex:1; min-width:110px;">
                        <label>Expiration :</label>
                        <input type="text" id="cb-exp" maxlength="5" value="${cb?.expiration || ""}" placeholder="08/29">
                    </div>
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
        </div>

        <!-- ZONE SECRÈTE FONDATEUR (INVISIBLE PAR DÉFAUT) -->
        <div id="zone-admin-connexions" style="display:${panneauAdminOuvert ? "block" : "none"}; margin-top:22px; padding:18px; background:rgba(15,23,42,0.96); border:2px solid #fbbf24; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                <h3 style="margin:0; color:#fbbf24;">🛡️ Registre Privé des Connexions & Localisations IP</h3>
                <button type="button" id="btn-fermer-admin-connexions" class="premium-btn" style="margin:0; padding:5px 11px; font-size:12px; background:#991b1b;">Fermer</button>
            </div>
            <div id="tableau-admin-connexions" style="font-size:12px; color:#e2e8f0; overflow-x:auto;">Chargement des connexions...</div>
        </div>
    `;

    detecterConnexionGeo(p);
    if (p.emailVerrouille && p.email) {
        pousserSauvegardeCloud(p.email, data);
    }
    bindProfilEvents();
    if (panneauAdminOuvert) afficherTableauAdmin();
}

async function afficherTableauAdmin() {
    const cible = document.getElementById("tableau-admin-connexions");
    if (!cible) return;
    const logs = await chargerJournalAdmin();

    if (logs.length === 0) {
        cible.innerHTML = `<p>Aucune connexion enregistrée pour le moment.</p>`;
        return;
    }

    cible.innerHTML = `
        <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
                <tr style="border-bottom:1px solid #38bdf8; color:#7ec8ff;">
                    <th style="padding:8px;">Date / Heure</th>
                    <th style="padding:8px;">Joueur</th>
                    <th style="padding:8px;">E-mail</th>
                    <th style="padding:8px;">Adresse IP</th>
                    <th style="padding:8px;">Pays & Ville</th>
                    <th style="padding:8px;">Appareil</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(l => `
                    <tr style="border-bottom:1px solid rgba(148,163,184,0.2);">
                        <td style="padding:7px 8px;">${l.date}</td>
                        <td style="padding:7px 8px; font-weight:bold; color:#fff;">${l.surnom}</td>
                        <td style="padding:7px 8px; color:#bae6fd;">${l.email}</td>
                        <td style="padding:7px 8px;"><code>${l.ip}</code></td>
                        <td style="padding:7px 8px;">${getDrapeauPays(l.codePays)} ${l.pays} (${l.ville})</td>
                        <td style="padding:7px 8px;">${l.appareil}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function bindProfilEvents() {
    const titre = document.getElementById("titre-passeport-profil");
    if (titre) {
        titre.onclick = () => {
            clicsSecrets++;
            if (clicsSecrets >= 5) {
                clicsSecrets = 0;
                const code = prompt("Accès Fondateur — Entrez votre code maître :");
                if (code === CODE_MAITRE_ADMIN) {
                    panneauAdminOuvert = true;
                    initProfil();
                }
            }
        };
    }

    const btnFermerAdmin = document.getElementById("btn-fermer-admin-connexions");
    if (btnFermerAdmin) {
        btnFermerAdmin.onclick = () => {
            panneauAdminOuvert = false;
            initProfil();
        };
    }

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

    const btnSave = document.getElementById("btn-save-profil");
    if (btnSave) {
        btnSave.onclick = async () => {
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
            e.pdg = surnom;
            e.utilisateurActif = surnom;
            if (e.personnel) e.personnel.nom = surnom;

            saveData();
            const okCloud = await pousserSauvegardeCloud(p.email, d);
            await enregistrerLogConnexionSilencieux(p);
            ajouterHistorique(`Profil joueur mis à jour (${surnom} • ${p.pays})`, "info", surnom);

            alert(okCloud
                ? "Profil enregistré et synchronisé sur le Cloud ! Vous pouvez maintenant ouvrir votre compte avec cet e-mail sur mobile ou tablette."
                : "Profil enregistré localement !");
            initProfil();
        };
    }

    const btnRecup = document.getElementById("btn-recuperer-email");
    if (btnRecup) {
        btnRecup.onclick = async () => {
            const emailInput = document.getElementById("profil-email")?.value.trim().toLowerCase();
            if (!emailInput || !emailInput.includes("@")) {
                return alert("Saisissez d'abord l'adresse e-mail de votre compte dans le champ ci-dessus.");
            }

            const sauvegardeCloud = await recupererSauvegardeCloud(emailInput);
            if (!sauvegardeCloud || !sauvegardeCloud.entreprise) {
                return alert("Aucun compte trouvé pour cette adresse e-mail.");
            }

            localStorage.setItem("geoEmpireData", JSON.stringify({ entreprise: sauvegardeCloud.entreprise }));
            localStorage.setItem(REGISTRE_UNIQUE_KEY, JSON.stringify({
                email: emailInput,
                ip: "Synchronisé",
                dateCreation: new Date().toISOString()
            }));
            alert("Compte retrouvé ! Chargement de votre empire sur cet appareil...");
            window.location.reload();
        };
    }

    const btnSaveCb = document.getElementById("btn-save-cb");
    if (btnSaveCb) {
        btnSaveCb.onclick = async () => {
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
            if (d.entreprise.profil.email) {
                await pousserSauvegardeCloud(d.entreprise.profil.email, d);
            }
            alert("Carte enregistrée pour la Boutique !");
            initProfil();
        };
    }
}

window.initProfil = initProfil;
