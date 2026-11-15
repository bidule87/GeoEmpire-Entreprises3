import { getData, saveData, removeArgent, ajouterHistorique } from "../geoData.js";

const latEl = document.getElementById("lat");
const lngEl = document.getElementById("lng");
const statutEl = document.getElementById("statut-gps");
const listeEl = document.getElementById("liste-entreprises");
const rayonSelect = document.getElementById("rayon-select");
const btnScanner = document.getElementById("btn-scanner");
const btnReset = document.getElementById("btn-reset");

function majTopbar() {
    const e = getData().entreprise;
    const soldeEl = document.getElementById("solde");
    const tokensEl = document.getElementById("tokens");
    const crownsEl = document.getElementById("crowns");
    if (soldeEl) soldeEl.textContent = (e.argent || 0).toLocaleString("fr-FR");
    if (tokensEl) tokensEl.textContent = (e.tokens || 0).toLocaleString("fr-FR");
    if (crownsEl) crownsEl.textContent = (e.crowns || 0).toLocaleString("fr-FR");
}

majTopbar();

// Bouton pour réinitialiser l'ancienne sauvegarde à 0 Ø
btnReset.addEventListener("click", () => {
    if (confirm("Réinitialiser la partie avec le capital de départ de 50 000 Ø ?")) {
        localStorage.removeItem("geoEmpireData");
        localStorage.removeItem("immoState");
        location.reload();
    }
});

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.8, 2.4], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
}).addTo(map);

let markerJoueur = null;
let cercleRayon = null;
let layerCommerces = L.layerGroup().addTo(map);
let layerBiensImmo = L.layerGroup().addTo(map);
let positionActuelle = null;

// Icônes CSS garanties visibles sur Leaflet
function creerIcone(couleur, estJoueur = false) {
    if (estJoueur) {
        return L.divIcon({
            className: "",
            html: `<div class="geo-pin-joueur"></div>`,
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

// Filtrage selon les 4 grands secteurs du jeu (hors banques)
function classifierSecteur(tags) {
    const shop = tags.shop || "";
    const amenity = tags.amenity || "";
    const tourism = tags.tourism || "";
    const office = tags.office || "";

    // 1. Alimentaire & Restauration
    if (["restaurant", "fast_food", "cafe", "bar", "pub"].includes(amenity) ||
        ["bakery", "butcher", "supermarket", "convenience", "greengrocer", "pastry"].includes(shop)) {
        return {
            secteur: "Alimentaire & Restauration",
            couleur: "#34d399",
            categoriesDebloquees: "Restaurants & Commerces alimentaires",
            prix: 15000
        };
    }

    // 2. Bâtiment & Immobilier
    if (["estate_agent", "architect", "construction", "company"].includes(office) ||
        ["diy", "hardware", "trade", "furniture"].includes(shop)) {
        return {
            secteur: "Bâtiment & Immobilier",
            couleur: "#fbbf24",
            categoriesDebloquees: "Appartements, Maisons & Bureaux",
            prix: 25000
        };
    }

    // 3. Hôtellerie & Services
    if (["hotel", "motel", "guest_house", "hostel"].includes(tourism) ||
        ["pharmacy", "hairdresser", "beauty", "laundry"].includes(shop)) {
        return {
            secteur: "Hôtellerie & Services",
            couleur: "#f43f5e",
            categoriesDebloquees: "Hôtels & Services",
            prix: 30000
        };
    }

    // 4. Commerce & Distribution (si shop générique non bancaire)
    if (shop) {
        return {
            secteur: "Commerce & Distribution",
            couleur: "#a855f7",
            categoriesDebloquees: "Commerces & Entrepôts",
            prix: 18000
        };
    }

    return null; // Ignorer les banques, écoles, mairies, etc.
}

// Afficher les biens immobiliers déjà possédés autour de la position
function afficherBiensPossedesSurCarte(lat, lng) {
    layerBiensImmo.clearLayers();
    const e = getData().entreprise;
    const biens = e.biens || [];

    biens.forEach((b, idx) => {
        // Génère une position stable autour du joueur si le bien n'a pas encore de coordonnées
        if (!b.lat || !b.lng) {
            const angle = (idx * 137.5) * (Math.PI / 180);
            const rayonOffset = 0.005 + ((idx % 10) * 0.002);
            b.lat = lat + Math.cos(angle) * rayonOffset;
            b.lng = lng + Math.sin(angle) * rayonOffset;
        }

        const marker = L.marker([b.lat, b.lng], { icon: creerIcone("#38bdf8") }).addTo(layerBiensImmo);
        marker.bindPopup(`
            <b>Bien possédé : ${b.style || b.categorie}</b><br>
            Catégorie : ${b.categorie}<br>
            Valeur : ${(b.prixAchat || 0).toLocaleString("fr-FR")} Ø
        `);
    });
}

async function scannerCommercesReels(lat, lng, rayonKm) {
    statutEl.textContent = `Recherche des entreprises par secteur dans un rayon de ${rayonKm} km...`;
    listeEl.innerHTML = "<p>Scan satellite en cours...</p>";
    layerCommerces.clearLayers();

    if (cercleRayon) map.removeLayer(cercleRayon);
    cercleRayon = L.circle([lat, lng], {
        color: "#00f2fe",
        fillColor: "#00f2fe",
        fillOpacity: 0.06,
        radius: rayonKm * 1000
    }).addTo(map);

    const rayonMetres = rayonKm * 1000;
    const query = `
        [out:json][timeout:25];
        (
          node["name"]["shop"](around:${rayonMetres},${lat},${lng});
          node["name"]["amenity"~"restaurant|cafe|fast_food|pharmacy"](around:${rayonMetres},${lat},${lng});
          node["name"]["tourism"~"hotel|motel|guest_house"](around:${rayonMetres},${lat},${lng});
          node["name"]["office"~"estate_agent|architect|construction"](around:${rayonMetres},${lat},${lng});
        );
        out body 50;
    `;

    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });
        const result = await response.json();
        const elements = result.elements || [];

        const entreprisesDetectees = [];

        elements.forEach(el => {
            const infos = classifierSecteur(el.tags || {});
            if (!infos) return;

            const dist = calcDistance(lat, lng, el.lat, el.lon);
            entreprisesDetectees.push({
                id: String(el.id),
                nom: el.tags.name,
                lat: el.lat,
                lng: el.lon,
                distance: dist,
                ...infos
            });
        });

        entreprisesDetectees.sort((a, b) => a.distance - b.distance);

        if (entreprisesDetectees.length === 0) {
            statutEl.textContent = `Aucune entreprise détectée dans ce rayon. Passe à 20 km.`;
            listeEl.innerHTML = "<p>Aucun établissement trouvé ici. Essaie un rayon de 20 km.</p>";
            return;
        }

        statutEl.textContent = `${entreprisesDetectees.length} établissements détectés sur la carte (${rayonKm} km).`;
        afficherListeEtMarqueurs(entreprisesDetectees);

    } catch (err) {
        console.error("Erreur Overpass API :", err);
        statutEl.textContent = "Erreur réseau lors du scan. Réessaie dans quelques secondes.";
    }
}

function afficherListeEtMarqueurs(liste) {
    listeEl.innerHTML = "";
    const e = getData().entreprise;
    const possedesIds = new Set((e.commercesGPS || []).map(c => c.id));

    liste.forEach(c => {
        const estPossede = possedesIds.has(c.id);
        const couleurPin = estPossede ? "#ffffff" : c.couleur;

        // Marqueur visible sur la carte
        const marker = L.marker([c.lat, c.lng], { icon: creerIcone(couleurPin) }).addTo(layerCommerces);
        marker.bindPopup(`
            <b>${c.nom}</b><br>
            Secteur : <span style="color:${c.couleur};font-weight:bold;">${c.secteur}</span><br>
            Distance : ${c.distance.toFixed(2)} km<br>
            Coût d'implantation : <b>${c.prix.toLocaleString("fr-FR")} Ø</b><br>
            Débloque : <i>${c.categoriesDebloquees}</i>
        `);

        // Carte dans la liste en dessous
        const card = document.createElement("div");
        card.className = "commerce-card" + (estPossede ? " possede" : "");
        card.style.borderLeft = `5px solid ${c.couleur}`;
        card.innerHTML = `
            <div>
                <div style="font-size: 18px; font-weight: bold; color: #fff;">${c.nom}</div>
                <div style="font-size: 13px; color: ${c.couleur}; font-weight: bold;">${c.secteur} • à ${c.distance.toFixed(2)} km</div>
                <div style="margin-top: 8px; font-size: 14px; color: #cbd5e1;">
                    Coût du siège : <strong style="color: #fbbf24;">${c.prix.toLocaleString("fr-FR")} Ø</strong><br>
                    Permet d'investir dans : <strong>${c.categoriesDebloquees}</strong>
                </div>
            </div>
            <button class="btn-acheter-commerce" ${estPossede ? "disabled" : ""}>
                ${estPossede ? "Siège acquis" : "Implanter / Acheter ce siège"}
            </button>
        `;

        const btn = card.querySelector("button");
        if (!estPossede) {
            btn.addEventListener("click", () => acheterSiege(c, liste));
        }

        listeEl.appendChild(card);
    });
}

function acheterSiege(siege, listeComplete) {
    const e = getData().entreprise;

    if (e.argent < siege.prix) {
        alert(`Fonds insuffisants ! Il vous faut ${siege.prix.toLocaleString("fr-FR")} Ø (vous avez ${e.argent.toLocaleString("fr-FR")} Ø).`);
        return;
    }

    const ok = removeArgent(siege.prix, `Implantation siège (${siege.secteur}) : ${siege.nom}`);
    if (!ok) return;

    if (!e.commercesGPS) e.commercesGPS = [];
    e.commercesGPS.push({
        id: siege.id,
        nom: siege.nom,
        secteur: siege.secteur,
        lat: siege.lat,
        lng: siege.lng,
        prixAchat: siege.prix,
        dateAchat: new Date().toLocaleDateString("fr-FR")
    });

    saveData();
    ajouterHistorique(`Siège implanté (${siege.secteur}) : ${siege.nom}`, "achat");
    majTopbar();
    afficherListeEtMarqueurs(listeComplete);
    alert(`Siège "${siege.nom}" acquis dans le secteur ${siege.secteur} ! Rendez-vous dans Immobilier / Achats pour investir dans vos biens.`);
}

export function majPosition(lat, lng, lancerScan = false) {
    positionActuelle = { lat, lng };
    latEl.textContent = lat.toFixed(5);
    lngEl.textContent = lng.toFixed(5);

    if (!markerJoueur) {
        markerJoueur = L.marker([lat, lng], { icon: creerIcone("#00f2fe", true) })
            .addTo(map)
            .bindPopup("<b>Votre position</b>");
        map.setView([lat, lng], 12);
        lancerScan = true;
    } else {
        markerJoueur.setLatLng([lat, lng]);
    }

    afficherBiensPossedesSurCarte(lat, lng);

    if (lancerScan) {
        const rayon = Number(rayonSelect.value) || 10;
        scannerCommercesReels(lat, lng, rayon);
    }
}

btnScanner.addEventListener("click", () => {
    if (positionActuelle) {
        const rayon = Number(rayonSelect.value) || 10;
        scannerCommercesReels(positionActuelle.lat, positionActuelle.lng, rayon);
    }
});

if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
        pos => {
            majPosition(pos.coords.latitude, pos.coords.longitude, false);
        },
        err => {
            console.error("Erreur GPS :", err);
            statutEl.textContent = "GPS indisponible. Position par défaut : Bénesse-Maremne.";
            majPosition(43.6344, -1.3611, true);
        },
        { enableHighAccuracy: true, maximumAge: 15000 }
    );
} else {
    statutEl.textContent = "Géolocalisation non supportée.";
    majPosition(43.6344, -1.3611, true);
}
