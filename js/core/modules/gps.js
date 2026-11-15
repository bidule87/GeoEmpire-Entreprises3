import { getData, removeArgent, ajouterHistorique } from "../geoData.js";

const latEl = document.getElementById("lat");
const lngEl = document.getElementById("lng");
const statutEl = document.getElementById("statut-gps");
const listeEl = document.getElementById("liste-entreprises");
const rayonSelect = document.getElementById("rayon-select");
const btnScanner = document.getElementById("btn-scanner");

// Actualisation de la barre des monnaies en haut à droite
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

// Initialisation de la carte Leaflet
const map = L.map("map").setView([46.8, 2.4], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
}).addTo(map);

let markerJoueur = null;
let cercleRayon = null;
let layerCommerces = L.layerGroup().addTo(map);
let positionActuelle = null;

// Calcul de distance en km (formule de Haversine)
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

// Déterminer le prix et le revenu journalier selon le type de commerce réel
function calculerStatsCommerce(tags) {
    const type = tags.shop || tags.amenity || "commerce";
    let categorie = "Commerce local";
    let prix = 15000;
    let revenu = 650;

    if (type === "bank") {
        categorie = "Banque / Finance";
        prix = 85000;
        revenu = 4200;
    } else if (type === "supermarket" || type === "mall") {
        categorie = "Grande surface";
        prix = 60000;
        revenu = 2900;
    } else if (type === "hotel") {
        categorie = "Hôtellerie";
        prix = 45000;
        revenu = 2100;
    } else if (type === "restaurant" || type === "fast_food" || type === "cafe") {
        categorie = "Restauration";
        prix = 25000;
        revenu = 1150;
    } else if (type === "bakery" || type === "butcher" || type === "pharmacy") {
        categorie = "Commerce de proximité";
        prix = 18000;
        revenu = 850;
    }

    return { categorie, prix, revenu };
}

// Récupérer les vrais commerces autour du joueur via OpenStreetMap (gratuit)
async function scannerCommercesReels(lat, lng, rayonKm) {
    statutEl.textContent = `Recherche des commerces réels dans un rayon de ${rayonKm} km...`;
    listeEl.innerHTML = "<p>Scan satellite en cours...</p>";
    layerCommerces.clearLayers();

    // Dessiner le cercle du rayon sur la carte
    if (cercleRayon) map.removeLayer(cercleRayon);
    cercleRayon = L.circle([lat, lng], {
        color: "#00f2fe",
        fillColor: "#00f2fe",
        fillOpacity: 0.08,
        radius: rayonKm * 1000
    }).addTo(map);

    const rayonMetres = rayonKm * 1000;
    const query = `
        [out:json][timeout:25];
        (
          node["name"]["shop"](around:${rayonMetres},${lat},${lng});
          node["name"]["amenity"~"bank|restaurant|cafe|fast_food|pharmacy|hotel"](around:${rayonMetres},${lat},${lng});
        );
        out body 40;
    `;

    try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: query
        });
        const result = await response.json();
        const elements = result.elements || [];

        if (elements.length === 0) {
            statutEl.textContent = `Aucun commerce trouvé dans ce rayon. Essaie d'augmenter à 20 km.`;
            listeEl.innerHTML = "<p>Aucun commerce répertorié ici. Augmente le rayon de recherche !</p>";
            return;
        }

        // Trier par distance croissante
        const commerces = elements.map(el => {
            const dist = calcDistance(lat, lng, el.lat, el.lon);
            const stats = calculerStatsCommerce(el.tags || {});
            return {
                id: String(el.id),
                nom: el.tags.name,
                lat: el.lat,
                lng: el.lon,
                distance: dist,
                ...stats
            };
        }).sort((a, b) => a.distance - b.distance);

        statutEl.textContent = `${commerces.length} commerces réels détectés dans un rayon de ${rayonKm} km.`;
        afficherListeEtMarqueurs(commerces);

    } catch (err) {
        console.error("Erreur Overpass API :", err);
        statutEl.textContent = "Erreur réseau lors du scan des commerces. Réessaie dans quelques secondes.";
    }
}

function afficherListeEtMarqueurs(commerces) {
    listeEl.innerHTML = "";
    const e = getData().entreprise;
    const possedesIds = new Set((e.commercesGPS || []).map(c => c.id));

    commerces.forEach(c => {
        const estPossede = possedesIds.has(c.id);

        // Marqueur sur la carte
        const marker = L.marker([c.lat, c.lng]).addTo(layerCommerces);
        marker.bindPopup(`
            <b>${c.nom}</b><br>
            ${c.categorie} (${c.distance.toFixed(2)} km)<br>
            Prix : <b>${c.prix.toLocaleString("fr-FR")} Ø</b><br>
            Revenu : +${c.revenu.toLocaleString("fr-FR")} Ø / jour
        `);

        // Carte dans la liste
        const card = document.createElement("div");
        card.className = "commerce-card" + (estPossede ? " possede" : "");
        card.innerHTML = `
            <div>
                <div style="font-size: 18px; font-weight: bold; color: #fff;">${c.nom}</div>
                <div style="font-size: 13px; color: #7ec8ff;">${c.categorie} • à ${c.distance.toFixed(2)} km</div>
                <div style="margin-top: 8px; font-size: 15px;">
                    Prix : <strong style="color: #fbbf24;">${c.prix.toLocaleString("fr-FR")} Ø</strong><br>
                    Revenu estimé : <strong style="color: #34d399;">+${c.revenu.toLocaleString("fr-FR")} Ø / jour</strong>
                </div>
            </div>
            <button class="btn-acheter-commerce" ${estPossede ? "disabled" : ""}>
                ${estPossede ? "Déjà dans votre empire" : "Acheter ce commerce"}
            </button>
        `;

        const btn = card.querySelector("button");
        if (!estPossede) {
            btn.addEventListener("click", () => acheterCommerce(c, commerces));
        }

        listeEl.appendChild(card);
    });
}

function acheterCommerce(commerce, listeComplete) {
    const e = getData().entreprise;

    if (e.argent < commerce.prix) {
        alert(`Fonds insuffisants ! Il vous faut ${commerce.prix.toLocaleString("fr-FR")} Ø (vous avez ${e.argent.toLocaleString("fr-FR")} Ø).`);
        return;
    }

    const ok = removeArgent(commerce.prix, `Achat du commerce réel : ${commerce.nom}`);
    if (!ok) return;

    if (!e.commercesGPS) e.commercesGPS = [];
    e.commercesGPS.push({
        id: commerce.id,
        nom: commerce.nom,
        categorie: commerce.categorie,
        lat: commerce.lat,
        lng: commerce.lng,
        prixAchat: commerce.prix,
        revenuJour: commerce.revenu,
        directeur: "Aucun (Vous-même)",
        dateAchat: new Date().toLocaleDateString("fr-FR")
    });

    ajouterHistorique(`Nouvelle acquisition GPS : ${commerce.nom} (+${commerce.revenu} Ø/jour)`, "achat");
    majTopbar();
    afficherListeEtMarqueurs(listeComplete);
    alert(`Félicitations ! Vous êtes désormais propriétaire de "${commerce.nom}".`);
}

// Mise à jour de la position GPS du joueur
export function majPosition(lat, lng, lancerScan = false) {
    positionActuelle = { lat, lng };
    latEl.textContent = lat.toFixed(5);
    lngEl.textContent = lng.toFixed(5);

    if (!markerJoueur) {
        markerJoueur = L.marker([lat, lng]).addTo(map).bindPopup("<b>Vous êtes ici</b>").openPopup();
        map.setView([lat, lng], 12);
        lancerScan = true;
    } else {
        markerJoueur.setLatLng([lat, lng]);
    }

    if (lancerScan) {
        const rayon = Number(rayonSelect.value) || 10;
        scannerCommercesReels(lat, lng, rayon);
    }
}

btnScanner.addEventListener("click", () => {
    if (positionActuelle) {
        const rayon = Number(rayonSelect.value) || 10;
        scannerCommercesReels(positionActuelle.lat, positionActuelle.lng, rayon);
    } else {
        alert("Position GPS pas encore détectée.");
    }
});

// Lancement du GPS navigateur
if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
        pos => {
            majPosition(pos.coords.latitude, pos.coords.longitude, false);
        },
        err => {
            console.error("Erreur GPS :", err);
            statutEl.textContent = "GPS bloqué ou indisponible. Position par défaut : Paris.";
            majPosition(48.8566, 2.3522, true);
        },
        { enableHighAccuracy: true, maximumAge: 15000 }
    );
} else {
    statutEl.textContent = "Géolocalisation non supportée par ce navigateur.";
    majPosition(48.8566, 2.3522, true);
}
