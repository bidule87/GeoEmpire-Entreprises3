import { getData, saveData, removeArgent, ajouterHistorique, loadData } from "../geoData.js";

const FIREBASE_DB_URL = "https://geo-empire-8ca7e-default-rtdb.europe-west1.firebasedatabase.app";
const MS_PAR_HEURE = 60 * 60 * 1000;
const COOLDOWN_BRAQUAGE_MS = 15 * 60 * 1000; // 15 minutes entre deux braquages

const latEl = document.getElementById("lat");
const lngEl = document.getElementById("lng");
const statutEl = document.getElementById("statut-gps");
const listeEl = document.getElementById("liste-entreprises");
const rayonSelect = document.getElementById("rayon-select");
const filtreSecteurSelect = document.getElementById("filtre-secteur-map");
const btnScanner = document.getElementById("btn-scanner");
const btnVueEmpire = document.getElementById("btn-vue-empire");
const nbEmpireEl = document.getElementById("nb-empire");
const btnReset = document.getElementById("btn-reset");

const voletLateral = document.getElementById("volet-lateral");
const btnToggleVolet = document.getElementById("btn-toggle-volet");

const modalFiche = document.getElementById("modal-fiche");
const btnFermerFiche = document.getElementById("btn-fermer-fiche");
const ficheBanniere = document.getElementById("fiche-banniere");
const ficheBadgeSecteur = document.getElementById("fiche-badge-secteur");
const ficheNom = document.getElementById("fiche-nom");
const ficheBody = document.getElementById("fiche-body");

let dernieresOpportunites = [];
let positionReelleGPS = null;
let positionActuelle = null;
let enModeTeleportation = false;

const VISUELS_SECTEUR = {
    "Alimentaire & Restauration": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    "Bâtiment & Immobilier": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    "Commerce & Distribution": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    "Hôtellerie & Services": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
};

function normaliserCleVille(nomVille) {
    return (nomVille || "Limoges")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "limoges";
}

window.addEventListener("storage", () => {
    loadData();
    majTopbar();
    majBarreTeleportation();
    afficherEmpireSurCarte();
    afficherOpportunitesDisponibles(dernieresOpportunites);
});

function majTexteBoutonVolet() {
    const span = document.getElementById("compteur-dispo");
    const nb = span ? span.textContent : "0";
    const ouvert = !voletLateral.classList.contains("ferme");
    btnToggleVolet.innerHTML = ouvert
        ? `▶ Masquer (<span id="compteur-dispo">${nb}</span>)`
        : `◀ Opportunités (<span id="compteur-dispo">${nb}</span>)`;
}

btnToggleVolet.addEventListener("click", () => {
    voletLateral.classList.toggle("ferme");
    majTexteBoutonVolet();
    setTimeout(() => map.invalidateSize(), 310);
});

btnFermerFiche.addEventListener("click", () => modalFiche.classList.remove("active"));
modalFiche.addEventListener("click", ev => {
    if (ev.target === modalFiche) modalFiche.classList.remove("active");
});

function majTopbar() {
    const e = getData().entreprise;
    const soldeEl = document.getElementById("solde");
    const tokensEl = document.getElementById("tokens");
    const crownsEl = document.getElementById("crowns");
    if (soldeEl) soldeEl.textContent = (e.argent || 0).toLocaleString("fr-FR");
    if (tokensEl) tokensEl.textContent = (e.tokens || 0).toLocaleString("fr-FR");
    if (crownsEl) crownsEl.textContent = (e.crowns || 0).toLocaleString("fr-FR");
    if (nbEmpireEl) nbEmpireEl.textContent = (e.commercesGPS || []).length;
}

function majOptionsRayon() {
    const e = getData().entreprise;
    const estAutorise = e.prestigePack === true || e.betaTesteur === true;
    const opt10 = rayonSelect.querySelector('option[value="10"]');
    const opt20 = rayonSelect.querySelector('option[value="20"]');

    if (estAutorise) {
        opt10.disabled = false;
        opt10.textContent = e.betaTesteur && !e.prestigePack ? "10 km (Accès Bêta)" : "10 km (Premium)";
        opt20.disabled = false;
        opt20.textContent = e.betaTesteur && !e.prestigePack ? "20 km (Accès Bêta)" : "20 km (Premium)";
    } else {
        opt10.disabled = true;
        opt10.textContent = "10 km 🔒 (Pack Premium)";
        opt20.disabled = true;
        opt20.textContent = "20 km 🔒 (Pack Premium)";
        rayonSelect.value = "5";
    }
}

majTopbar();
majOptionsRayon();

filtreSecteurSelect.addEventListener("change", () => {
    afficherOpportunitesDisponibles(dernieresOpportunites);
});

btnReset.addEventListener("click", () => {
    if (confirm("Réinitialiser la partie avec le capital de départ de 50 000 Ø ?")) {
        localStorage.removeItem("geoEmpireData");
        localStorage.removeItem("immoState");
        localStorage.removeItem("geoEmpireVilleActuelle");
        location.reload();
    }
});

const map = L.map("map").setView([46.8, 2.4], 6);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
}).addTo(map);

let markerJoueur = null;
let cercleRayon = null;
let layerDisponibles = L.layerGroup().addTo(map);
let layerEmpire = L.layerGroup().addTo(map);
let layerCartesTP = L.layerGroup().addTo(map);

// ============================================
// BARRE DE TÉLÉPORTATION (BUS / TRAIN / AVION)
// ============================================
function injecterBarreTeleportation() {
    const wrapper = document.querySelector(".carte-wrapper");
    const legende = document.querySelector(".legende-map");
    if (!wrapper || !legende || document.getElementById("barre-teleportation")) return;

    const barre = document.createElement("div");
    barre.id = "barre-teleportation";
    barre.style.cssText = "display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:10px; margin-bottom:12px; padding:11px 15px; background:rgba(15, 23, 42, 0.88); border:1px solid rgba(251, 191, 36, 0.45); border-radius:10px; font-size:13px;";
    barre.innerHTML = `
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:10px;">
            <strong style="color:#fde68a;">🧭 Téléportation :</strong>
            <span id="compteurs-tp">🚌 Bus : 0 | 🚆 Train : 0 | ✈️ Avion : 0</span>
            <span id="timer-spawn-tp" style="color:#93c5fd; font-size:12px;"></span>
        </div>
        <div style="display:flex; flex-wrap:wrap; align-items:center; gap:7px;">
            <select id="select-type-tp" style="padding:6px 9px; border-radius:7px; background:#0f294a; color:#fff; border:1px solid #fbbf24; font-weight:bold; font-size:12px;">
                <option value="carteBus">🚌 Bus (≤ 50 km)</option>
                <option value="carteTrain">🚆 Train (≤ 500 km)</option>
                <option value="carteAvion">✈️ Avion (Monde entier)</option>
            </select>
            <input type="text" id="input-destination-tp" placeholder="Ville cible (ex: Bordeaux, Paris, Tokyo)..." style="padding:6px 10px; border-radius:7px; border:1px solid #38bdf8; background:rgba(0,20,45,0.95); color:#fff; font-size:12px; min-width:210px;">
            <button type="button" id="btn-utiliser-tp" style="padding:6px 12px; border-radius:7px; border:none; background:linear-gradient(90deg, #d97706, #fbbf24); color:#0f172a; font-weight:bold; font-size:12px; cursor:pointer;">Se téléporter</button>
            <button type="button" id="btn-retour-gps" style="display:none; padding:6px 11px; border-radius:7px; border:1px solid #38bdf8; background:rgba(2,132,199,0.3); color:#bae6fd; font-weight:bold; font-size:12px; cursor:pointer;">📍 Position réelle</button>
        </div>
    `;
    wrapper.insertBefore(barre, legende);

    document.getElementById("btn-utiliser-tp").addEventListener("click", executerTeleportation);
    document.getElementById("btn-retour-gps").addEventListener("click", () => {
        if (!positionReelleGPS) return;
        enModeTeleportation = false;
        document.getElementById("btn-retour-gps").style.display = "none";
        majPosition(positionReelleGPS.lat, positionReelleGPS.lng, true);
    });
}

function majBarreTeleportation() {
    injecterBarreTeleportation();
    const e = getData().entreprise;
    if (!e.inventaire) e.inventaire = { carteBus: 0, carteTrain: 0, carteAvion: 0 };

    const el = document.getElementById("compteurs-tp");
    if (el) {
        el.innerHTML = `
            <span style="color:#34d399; font-weight:bold;">🚌 Bus : ${e.inventaire.carteBus || 0}</span> •
            <span style="color:#38bdf8; font-weight:bold;">🚆 Train : ${e.inventaire.carteTrain || 0}</span> •
            <span style="color:#fbbf24; font-weight:bold;">✈️ Avion : ${e.inventaire.carteAvion || 0}</span>
        `;
    }

    const timerEl = document.getElementById("timer-spawn-tp");
    if (timerEl) {
        const dernier = e.inventaire.dernierSpawnCartes || Date.now();
        const resteMs = Math.max(0, (dernier + MS_PAR_HEURE) - Date.now());
        const min = Math.floor(resteMs / 60000);
        timerEl.textContent = `(Prochain largage sur carte dans ${min} min)`;
    }
}

function verifierEtGenererCartesHoraire(latCentre, lngCentre) {
    const e = getData().entreprise;
    if (!e.inventaire) e.inventaire = { carteBus: 0, carteTrain: 0, carteAvion: 0, dernierSpawnCartes: 0, cartesSurCarte: [] };

    const maintenant = Date.now();
    const dernierSpawn = e.inventaire.dernierSpawnCartes || 0;

    if (!Array.isArray(e.inventaire.cartesSurCarte) || (maintenant - dernierSpawn) >= MS_PAR_HEURE) {
        const rayonKm = Number(rayonSelect.value) || 5;
        const nouvellesCartes = [];
        const nbCartes = Math.floor(Math.random() * 2) + 3;

        for (let i = 0; i < nbCartes; i++) {
            const tirage = Math.random();
            let type = "carteBus";
            let emoji = "🚌";
            let label = "Carte Bus (50 km)";
            let couleur = "#10b981";

            if (tirage >= 0.92) {
                type = "carteAvion";
                emoji = "✈️";
                label = "Carte Avion (Monde)";
                couleur = "#fbbf24";
            } else if (tirage >= 0.65) {
                type = "carteTrain";
                emoji = "🚆";
                label = "Carte Train (500 km)";
                couleur = "#38bdf8";
            }

            const angle = Math.random() * 2 * Math.PI;
            const distKm = (0.15 + Math.random() * 0.78) * rayonKm;
            const dLat = (distKm / 111) * Math.cos(angle);
            const dLng = (distKm / (111 * Math.cos(latCentre * Math.PI / 180))) * Math.sin(angle);

            nouvellesCartes.push({
                id: `tp_${maintenant}_${i}`,
                type,
                emoji,
                label,
                couleur,
                lat: latCentre + dLat,
                lng: lngCentre + dLng
            });
        }

        e.inventaire.cartesSurCarte = nouvellesCartes;
        e.inventaire.dernierSpawnCartes = maintenant;
        saveData();
    }

    afficherCartesSurMap();
    majBarreTeleportation();
}

function afficherCartesSurMap() {
    layerCartesTP.clearLayers();
    if (enModeTeleportation) return;

    const e = getData().entreprise;
    const cartes = e.inventaire?.cartesSurCarte || [];

    cartes.forEach(c => {
        const icon = L.divIcon({
            className: "",
            html: `<div title="${c.label} — Cliquez pour ramasser" style="width:32px; height:32px; border-radius:50%; background:rgba(15,23,42,0.95); border:2px solid ${c.couleur}; box-shadow:0 0 12px ${c.couleur}; display:flex; align-items:center; justify-content:center; font-size:17px; cursor:pointer;">${c.emoji}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([c.lat, c.lng], { icon }).addTo(layerCartesTP);
        marker.on("click", () => {
            const data = getData().entreprise;
            data.inventaire[c.type] = (data.inventaire[c.type] || 0) + 1;
            data.inventaire.cartesSurCarte = (data.inventaire.cartesSurCarte || []).filter(item => item.id !== c.id);
            ajouterHistorique(`🧭 Carte ramassée sur la map : +1 ${c.label}`, "gain");
            saveData();
            afficherCartesSurMap();
            majBarreTeleportation();
            alert(`Vous avez ramassé : +1 ${c.label} !`);
        });
    });
}

async function executerTeleportation() {
    const e = getData().entreprise;
    if (!e.inventaire) e.inventaire = { carteBus: 0, carteTrain: 0, carteAvion: 0 };

    const typeCarte = document.getElementById("select-type-tp").value;
    const destination = (document.getElementById("input-destination-tp").value || "").trim();

    if (!destination) return alert("Saisissez le nom de la ville où vous voulez vous téléporter.");
    if ((e.inventaire[typeCarte] || 0) <= 0) {
        return alert("Vous n'avez aucune carte de ce type ! Ramassez-en une sur la carte ou achetez-en une dans la Boutique.");
    }

    const limites = {
        carteBus: { maxKm: 50, nom: "Carte Bus" },
        carteTrain: { maxKm: 500, nom: "Carte Train" },
        carteAvion: { maxKm: Infinity, nom: "Carte Avion" }
    };
    const infoCarte = limites[typeCarte];

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`);
        const results = await res.json();
        if (!results || results.length === 0) {
            return alert(`Ville "${destination}" introuvable.`);
        }

        const destLat = parseFloat(results[0].lat);
        const destLng = parseFloat(results[0].lon);
        const nomVillePropre = results[0].display_name.split(",")[0].trim();

        const baseLat = positionReelleGPS ? positionReelleGPS.lat : positionActuelle.lat;
        const baseLng = positionReelleGPS ? positionReelleGPS.lng : positionActuelle.lng;
        const distanceKm = calcDistance(baseLat, baseLng, destLat, destLng);

        if (distanceKm > infoCarte.maxKm) {
            return alert(`Distance trop élevée (${Math.round(distanceKm)} km) ! La ${infoCarte.nom} est limitée à ${infoCarte.maxKm} km.`);
        }

        if (!confirm(`Utiliser 1× ${infoCarte.nom} pour vous téléporter à ${nomVillePropre} (${Math.round(distanceKm)} km) ?`)) {
            return;
        }

        e.inventaire[typeCarte] -= 1;
        enModeTeleportation = true;
        localStorage.setItem("geoEmpireVilleActuelle", nomVillePropre);
        ajouterHistorique(`🧭 Téléportation (${infoCarte.nom}) vers ${nomVillePropre} (${Math.round(distanceKm)} km)`, "info");
        saveData();

        majBarreTeleportation();
        document.getElementById("btn-retour-gps").style.display = "inline-block";
        map.setView([destLat, destLng], 13);
        majPosition(destLat, destLng, true);
    } catch {
        alert("Erreur lors de la recherche de la destination.");
    }
}

// ============================================
// LOGIQUE DE BRAQUAGE & COFFRE-FORT
// ============================================
async function tenterBraquageCible(item) {
    loadData();
    const e = getData().entreprise;
    const maintenant = Date.now();
    const dernierBraquage = e.dernierBraquageTs || 0;

    if (maintenant - dernierBraquage < COOLDOWN_BRAQUAGE_MS) {
        const minRestantes = Math.ceil((COOLDOWN_BRAQUAGE_MS - (maintenant - dernierBraquage)) / 60000);
        return alert(`🚓 La police surveille le secteur ! Attendez encore ${minRestantes} minute(s) avant de tenter un nouveau braquage.`);
    }

    const villeCible = localStorage.getItem("geoEmpireVilleActuelle") || "Limoges";
    const cleVille = normaliserCleVille(villeCible);

    let aCommissariat = false;
    try {
        const resMairie = await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`);
        if (resMairie.ok) {
            const mData = await resMairie.json();
            if (mData && Array.isArray(mData.infrastructures) && mData.infrastructures.includes("commissariat")) {
                aCommissariat = true;
            }
        }
    } catch {}

    const niveauCoffreCible = Number(item.niveauCoffre || 1);
    const chanceReussite = Math.max(15, 62 - (niveauCoffreCible * 7) - (aCommissariat ? 25 : 0));
    const capitalCoffre = item.capitalCible || Math.round(item.prix * 1.25);
    const butinEstime = Math.floor(capitalCoffre * 0.45);
    const amendeEchec = Math.floor(capitalCoffre * 0.25);

    const msgConfirm =
        `🦹 BRAQUAGE DE "${item.nom}" (${villeCible})\n\n` +
        `• Capital dans le coffre : ${capitalCoffre.toLocaleString("fr-FR")} Ø\n` +
        `• Butin estimé en cas de succès : +${butinEstime.toLocaleString("fr-FR")} Ø\n` +
        `• Amende municipale en cas d'échec : -${amendeEchec.toLocaleString("fr-FR")} Ø\n` +
        `• Sécurité détectée : Coffre Niv.${niveauCoffreCible}${aCommissariat ? " + 🚓 Commissariat municipal (-25 %)" : ""}\n` +
        `• Probabilité de réussite : ${chanceReussite} %\n\n` +
        `Lancer l'opération ?`;

    if (!confirm(msgConfirm)) return;

    e.dernierBraquageTs = maintenant;
    const tirage = Math.random() * 100;

    if (tirage <= chanceReussite) {
        e.argent = (e.argent || 0) + butinEstime;
        ajouterHistorique(`🦹 Braquage réussi sur "${item.nom}" (${villeCible}) : +${butinEstime.toLocaleString("fr-FR")} Ø`, "gain");
        saveData();
        majTopbar();
        modalFiche.classList.remove("active");
        alert(`💰 BRAQUAGE RÉUSSI ! Vous avez fracturé le coffre de "${item.nom}" et empoché +${butinEstime.toLocaleString("fr-FR")} Ø !`);
    } else {
        const amendePayee = Math.min(e.argent || 0, amendeEchec);
        e.argent = Math.max(0, (e.argent || 0) - amendePayee);
        e.caisseMairie = (e.caisseMairie || 0) + amendePayee;

        try {
            const resM = await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`);
            if (resM.ok) {
                const mData = await resM.json();
                if (mData) {
                    mData.budget = (mData.budget || 0) + amendePayee;
                    await fetch(`${FIREBASE_DB_URL}/mairies/${cleVille}.json`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ budget: mData.budget })
                    });
                }
            }
        } catch {}

        ajouterHistorique(`🚓 Braquage déjoué sur "${item.nom}" (${villeCible}) : amende de -${amendePayee.toLocaleString("fr-FR")} Ø versée à la Mairie`, "depense");
        saveData();
        majTopbar();
        modalFiche.classList.remove("active");
        alert(`🚓 ALERTE POLICE ! Le coffre a résisté. Vous avez été interpellé et condamné à une amende de ${amendePayee.toLocaleString("fr-FR")} Ø reversée à la Mairie de ${villeCible}.`);
    }
}

function creerIcone(couleur, type = "dispo") {
    if (type === "joueur") {
        return L.divIcon({
            className: "",
            html: `<div class="geo-pin-joueur"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
    }
    if (type === "empire") {
        return L.divIcon({
            className: "",
            html: `<div class="geo-pin-empire"></div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
    }
    return L.divIcon({
        className: "",
        html: `<div class="geo-pin" style="background:${couleur};"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
}

function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function classifierSecteur(tags, idNum = 1) {
    const shop = tags.shop || "";
    const amenity = tags.amenity || "";
    const tourism = tags.tourism || "";
    const office = tags.office || "";
    const adresse = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ") || "Secteur local";
    const varCapital = (Number(idNum) % 7) * 4500;
    const niveauCoffre = (Number(idNum) % 3) + 1;

    if (["restaurant", "fast_food", "cafe", "bar", "pub"].includes(amenity) ||
        ["bakery", "butcher", "supermarket", "convenience", "greengrocer", "pastry"].includes(shop)) {
        return {
            secteur: "Alimentaire & Restauration",
            couleur: "#34d399",
            categoriesDebloquees: "Restaurants & Commerces alimentaires",
            adresse,
            prix: 15000,
            capitalCible: 18000 + varCapital,
            niveauCoffre
        };
    }

    if (["estate_agent", "architect", "construction", "company"].includes(office) ||
        ["diy", "hardware", "trade", "furniture"].includes(shop)) {
        return {
            secteur: "Bâtiment & Immobilier",
            couleur: "#fbbf24",
            categoriesDebloquees: "Appartements, Maisons & Bureaux",
            adresse,
            prix: 25000,
            capitalCible: 32000 + varCapital,
            niveauCoffre
        };
    }

    if (["hotel", "motel", "guest_house", "hostel"].includes(tourism) ||
        ["pharmacy", "hairdresser", "beauty", "laundry"].includes(shop)) {
        return {
            secteur: "Hôtellerie & Services",
            couleur: "#f43f5e",
            categoriesDebloquees: "Hôtels & Services",
            adresse,
            prix: 30000,
            capitalCible: 40000 + varCapital,
            niveauCoffre
        };
    }

    if (shop) {
        return {
            secteur: "Commerce & Distribution",
            couleur: "#a855f7",
            categoriesDebloquees: "Commerces & Entrepôts",
            adresse,
            prix: 18000,
            capitalCible: 22000 + varCapital,
            niveauCoffre
        };
    }

    return null;
}

function ouvrirFicheEtablissement(item, estDejaAcquis = false) {
    loadData();
    const e = getData().entreprise;
    const visuel = item.logo || item.photo || VISUELS_SECTEUR[item.secteur] || VISUELS_SECTEUR["Commerce & Distribution"];
    const couleur = estDejaAcquis ? "#38bdf8" : (item.couleur || "#34d399");

    ficheBanniere.style.backgroundImage = `url('${visuel}')`;
    ficheBadgeSecteur.style.color = couleur;
    ficheBadgeSecteur.textContent = estDejaAcquis ? `★ VOTRE FILIALE • ${item.secteur}` : item.secteur;
    ficheNom.textContent = item.nom;

    if (estDejaAcquis) {
        ficheBody.innerHTML = `
            <div class="fiche-row"><span>Statut :</span><strong style="color:#38bdf8;">Entreprise acquise</strong></div>
            <div class="fiche-row"><span>Fondateur référent :</span><strong>${item.pdg || item.directeur || e.pdg || "Fondateur"}</strong></div>
            <div class="fiche-row"><span>Coffre-fort :</span><strong style="color:#fde68a;">Niveau ${item.niveauCoffre || 0} / 5</strong></div>
            <div class="fiche-row"><span>Valeur d'acquisition :</span><strong>${(item.prixAchat || 0).toLocaleString("fr-FR")} Ø</strong></div>
            <div class="fiche-actions">
                <a href="entreprises.html" class="btn-fiche-achat" style="text-align:center; text-decoration:none; background:linear-gradient(90deg, #0284c7, #38bdf8);">Gérer dans Entreprises →</a>
            </div>
        `;
    } else {
        const peutPayer = (e.argent || 0) >= item.prix;
        const capitalCible = item.capitalCible || Math.round(item.prix * 1.25);
        ficheBody.innerHTML = `
            <div class="fiche-row"><span>Localisation :</span><strong>${item.adresse || "Secteur local"} (${item.distance.toFixed(2)} km)</strong></div>
            <div class="fiche-row"><span>Catalogue débloqué :</span><strong style="color:#7ec8ff;">${item.categoriesDebloquees}</strong></div>
            <div class="fiche-row"><span>💰 Capital du coffre :</span><strong style="color:#f43f5e;">${capitalCible.toLocaleString("fr-FR")} Ø (Coffre Niv.${item.niveauCoffre || 1})</strong></div>
            <div class="fiche-row"><span>Coût d'implantation :</span><strong style="color:#fbbf24;">${item.prix.toLocaleString("fr-FR")} Ø</strong></div>
            <div class="fiche-row"><span>Votre trésorerie :</span><strong style="color:${peutPayer ? "#34d399" : "#f87171"};">${(e.argent || 0).toLocaleString("fr-FR")} Ø</strong></div>
            <div class="fiche-actions" style="flex-wrap:wrap;">
                <button id="btn-confirmer-achat-fiche" class="btn-fiche-achat" ${peutPayer ? "" : "style='opacity:0.6;'"}>
                    Acheter (${item.prix.toLocaleString("fr-FR")} Ø)
                </button>
                <button id="btn-braquer-fiche" class="btn-fiche-achat" style="background:linear-gradient(90deg, #be123c, #f43f5e);">
                    🦹 Braquer le coffre
                </button>
            </div>
        `;

        document.getElementById("btn-confirmer-achat-fiche").onclick = () => {
            acheterSiege(item);
            modalFiche.classList.remove("active");
        };

        document.getElementById("btn-braquer-fiche").onclick = () => {
            tenterBraquageCible(item);
        };
    }

    modalFiche.classList.add("active");
}

function afficherEmpireSurCarte() {
    layerEmpire.clearLayers();
    const e = getData().entreprise;
    const sieges = e.commercesGPS || [];
    if (nbEmpireEl) nbEmpireEl.textContent = sieges.length;

    sieges.forEach(s => {
        if (!s.lat || !s.lng) return;
        const marker = L.marker([s.lat, s.lng], { icon: creerIcone("#38bdf8", "empire") }).addTo(layerEmpire);
        marker.on("click", () => ouvrirFicheEtablissement(s, true));
    });
}

btnVueEmpire.addEventListener("click", () => {
    const sieges = getData().entreprise.commercesGPS || [];
    const points = sieges.filter(s => s.lat && s.lng).map(s => [s.lat, s.lng]);
    if (positionActuelle) points.push([positionActuelle.lat, positionActuelle.lng]);

    if (points.length === 0) {
        alert("Aucune entreprise acquise pour le moment.");
        return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
});

async function scannerCommercesReels(lat, lng, rayonKm) {
    statutEl.textContent = `Recherche des opportunités dans un rayon de ${rayonKm} km...`;
    listeEl.innerHTML = "<p style='font-size:13px;'>Scan satellite en cours...</p>";
    layerDisponibles.clearLayers();

    if (cercleRayon) map.removeLayer(cercleRayon);
    cercleRayon = L.circle([lat, lng], {
        color: enModeTeleportation ? "#fbbf24" : "#00f2fe",
        fillColor: enModeTeleportation ? "#fbbf24" : "#00f2fe",
        fillOpacity: 0.05,
        radius: rayonKm * 1000
    }).addTo(map);

    if (!enModeTeleportation) {
        verifierEtGenererCartesHoraire(lat, lng);
    } else {
        layerCartesTP.clearLayers();
    }

    const rayonMetres = rayonKm * 1000;
    const query = `
        [out:json][timeout:25];
        (
          node["name"]["shop"](around:${rayonMetres},${lat},${lng});
          node["name"]["amenity"~"restaurant|cafe|fast_food|pharmacy"](around:${rayonMetres},${lat},${lng});
          node["name"]["tourism"~"hotel|motel|guest_house"](around:${rayonMetres},${lat},${lng});
          node["name"]["office"~"estate_agent|architect|construction"](around:${rayonMetres},${lat},${lng});
        );
        out body 60;
    `;

    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });
        const result = await response.json();
        const elements = result.elements || [];

        const detectees = [];
        elements.forEach(el => {
            const infos = classifierSecteur(el.tags || {}, el.id);
            if (!infos) return;

            const dist = calcDistance(lat, lng, el.lat, el.lon);
            detectees.push({
                id: String(el.id),
                nom: el.tags.name,
                lat: el.lat,
                lng: el.lon,
                distance: dist,
                ...infos
            });
        });

        detectees.sort((a, b) => a.distance - b.distance);
        dernieresOpportunites = detectees;

        afficherEmpireSurCarte();
        afficherOpportunitesDisponibles(detectees);

    } catch (err) {
        console.error("Erreur Overpass API :", err);
        statutEl.textContent = "Erreur réseau lors du scan. Réessaie dans quelques secondes.";
    }
}

function afficherOpportunitesDisponibles(liste) {
    listeEl.innerHTML = "";
    layerDisponibles.clearLayers();

    const e = getData().entreprise;
    const possedesIds = new Set((e.commercesGPS || []).map(c => String(c.id)));
    const filtre = filtreSecteurSelect.value;

    const disponibles = liste.filter(c => {
        if (possedesIds.has(c.id)) return false;
        if (filtre !== "tous" && c.secteur !== filtre) return false;
        return true;
    });

    const rayonActuel = Number(rayonSelect.value) || 5;
    statutEl.textContent = `${disponibles.length} opportunité(s) dans un rayon de ${rayonActuel} km${enModeTeleportation ? " (Mode Téléportation)" : ""}.`;

    const spanCompteur = document.getElementById("compteur-dispo");
    if (spanCompteur) spanCompteur.textContent = disponibles.length;

    if (disponibles.length === 0) {
        listeEl.innerHTML = `<p style="font-size:13px; color:#94a3b8;">Aucune opportunité disponible avec ce filtre.</p>`;
        return;
    }

    disponibles.forEach(c => {
        const marker = L.marker([c.lat, c.lng], { icon: creerIcone(c.couleur, "dispo") }).addTo(layerDisponibles);
        marker.bindTooltip(`<strong>${c.nom}</strong><br>Capital coffre : ${(c.capitalCible || c.prix).toLocaleString("fr-FR")} Ø`);
        marker.on("click", () => ouvrirFicheEtablissement(c, false));

        const item = document.createElement("div");
        item.className = "volet-item";
        item.style.borderLeft = `4px solid ${c.couleur}`;
        item.innerHTML = `
            <div style="font-weight:bold; color:#fff; font-size:14px;">${c.nom}</div>
            <div style="font-size:12px; color:${c.couleur}; margin-top:2px;">${c.secteur} • ${c.distance.toFixed(2)} km</div>
            <div style="font-size:12px; color:#fda4af; margin-top:3px;">💰 Capital coffre : <strong>${(c.capitalCible || c.prix).toLocaleString("fr-FR")} Ø</strong></div>
            <div style="font-size:12px; color:#fbbf24; font-weight:bold; margin-top:2px;">Achat : ${c.prix.toLocaleString("fr-FR")} Ø</div>
            <div class="volet-item-actions">
                <button class="btn-mini-fiche">Voir / Braquer</button>
                <button class="btn-mini-acheter">Acheter</button>
            </div>
        `;

        item.addEventListener("click", ev => {
            if (ev.target.tagName === "BUTTON") return;
            map.flyTo([c.lat, c.lng], 16, { duration: 0.7 });
        });

        item.querySelector(".btn-mini-fiche").addEventListener("click", () => ouvrirFicheEtablissement(c, false));
        item.querySelector(".btn-mini-acheter").addEventListener("click", () => acheterSiege(c));

        listeEl.appendChild(item);
    });
}

function acheterSiege(siege) {
    loadData();
    const e = getData().entreprise;

    if (e.argent < siege.prix) {
        alert(`Fonds insuffisants ! Il vous faut ${siege.prix.toLocaleString("fr-FR")} Ø (vous avez ${e.argent.toLocaleString("fr-FR")} Ø).`);
        return;
    }

    const ok = removeArgent(siege.prix, `Implantation siège (${siege.secteur}) : ${siege.nom}`);
    if (!ok) return;

    if (!e.commercesGPS) e.commercesGPS = [];
    e.commercesGPS.push({
        id: String(siege.id),
        nom: siege.nom,
        secteur: siege.secteur,
        lat: siege.lat,
        lng: siege.lng,
        prixAchat: siege.prix,
        niveauCoffre: 1,
        pdg: e.pdg || "Fondateur",
        directeur: e.pdg || "Fondateur",
        associes: [],
        biens: {},
        dateAchat: new Date().toLocaleDateString("fr-FR")
    });

    saveData();
    majTopbar();
    afficherEmpireSurCarte();
    afficherOpportunitesDisponibles(dernieresOpportunites);
    alert(`Entreprise "${siege.nom}" acquise !`);
}

export function majPosition(lat, lng, lancerScan = false) {
    positionActuelle = { lat, lng };
    latEl.textContent = lat.toFixed(5);
    lngEl.textContent = lng.toFixed(5);

    if (!markerJoueur) {
        markerJoueur = L.marker([lat, lng], { icon: creerIcone("#00f2fe", "joueur") })
            .addTo(map)
            .bindPopup("<b>Votre position</b>");
        map.setView([lat, lng], 13);
        lancerScan = true;
    } else {
        markerJoueur.setLatLng([lat, lng]);
    }

    afficherEmpireSurCarte();

    if (lancerScan) {
        const rayon = Number(rayonSelect.value) || 5;
        scannerCommercesReels(lat, lng, rayon);
    }
}

btnScanner.addEventListener("click", () => {
    if (positionActuelle) {
        const rayon = Number(rayonSelect.value) || 5;
        scannerCommercesReels(positionActuelle.lat, positionActuelle.lng, rayon);
    }
});

injecterBarreTeleportation();
majBarreTeleportation();

if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
        pos => {
            positionReelleGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (!enModeTeleportation) {
                majPosition(pos.coords.latitude, pos.coords.longitude, false);
            }
        },
        err => {
            console.error("Erreur GPS :", err);
            statutEl.textContent = "GPS indisponible. Position par défaut : Limoges.";
            positionReelleGPS = { lat: 45.8336, lng: 1.2611 };
            if (!enModeTeleportation) majPosition(45.8336, 1.2611, true);
        },
        { enableHighAccuracy: true, maximumAge: 15000 }
    );
} else {
    statutEl.textContent = "Géolocalisation non supportée.";
    positionReelleGPS = { lat: 45.8336, lng: 1.2611 };
    majPosition(45.8336, 1.2611, true);
}
