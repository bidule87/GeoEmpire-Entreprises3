// ===============================
//  GEOEMPIRE 3 - GPS
// ===============================

let ge_map = null;
let ge_marker = null;

// Initialisation de la carte
window.ge_initMap = function () {
    if (ge_map) return;

    ge_map = L.map('map').setView([46.8, 2.2], 6); // Vue France

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(ge_map);

    ge_marker = L.marker([46.8, 2.2]).addTo(ge_map);
};

// Mise à jour de la position GPS
window.ge_updateGPS = function () {
    const zone = document.getElementById("gps-status");

    if (!navigator.geolocation) {
        zone.innerText = "GPS non supporté.";
        return;
    }

    zone.innerText = "Recherche GPS...";

    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;

            entreprise.position = { lat, lon };

            zone.innerText = `Position : ${lat.toFixed(5)}, ${lon.toFixed(5)}`;

            if (ge_map && ge_marker) {
                ge_map.setView([lat, lon], 16);
                ge_marker.setLatLng([lat, lon]);
            }
        },
        err => {
            zone.innerText = "Impossible d'obtenir la position.";
        }
    );
};

// Lancement automatique
window.addEventListener("load", () => {
    ge_initMap();
    ge_updateGPS();
    setInterval(ge_updateGPS, 5000);
});
