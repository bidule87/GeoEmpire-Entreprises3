import { entreprises } from "./entreprises.js";

// Sélecteurs
const latEl = document.getElementById("lat");
const lngEl = document.getElementById("lng");
const listeEl = document.getElementById("liste-entreprises");

// Initialisation de la carte
const map = L.map("map").setView([46.8, 2.4], 6);

// Fond de carte
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19
}).addTo(map);

// Marqueur joueur
let markerJoueur = null;

// Fonction pour mettre à jour la position
export function majPosition(lat, lng) {
  latEl.textContent = lat.toFixed(6);
  lngEl.textContent = lng.toFixed(6);

  if (!markerJoueur) {
    markerJoueur = L.marker([lat, lng]).addTo(map);
  } else {
    markerJoueur.setLatLng([lat, lng]);
  }

  map.setView([lat, lng], 15);

  afficherEntreprises(lat, lng);
}

// Affichage des entreprises proches
function afficherEntreprises(lat, lng) {
  listeEl.innerHTML = "";

  entreprises.forEach((e, index) => {
    if (!e.lat || !e.lng) return;

    const distance = calcDistance(lat, lng, e.lat, e.lng);

    if (distance <= 1.5) { // 1.5 km
      const div = document.createElement("div");
      div.className = "entreprise-item";
      div.textContent = `${e.nom} – ${distance.toFixed(2)} km`;
      listeEl.appendChild(div);

      L.marker([e.lat, e.lng])
        .addTo(map)
        .bindPopup(`<b>${e.nom}</b><br>${distance.toFixed(2)} km`);
    }
  });
}

// Calcul distance (km)
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

// GPS navigateur
if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    pos => {
      majPosition(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      console.error("Erreur GPS :", err);
      alert("Impossible d'obtenir la position GPS.");
    },
    { enableHighAccuracy: true }
  );
} else {
  alert("GPS non supporté.");
}
