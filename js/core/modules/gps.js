import { getData, saveData, removeArgent, ajouterHistorique } from "../geoData.js";

const latEl = document.getElementById("lat");
const lngEl = document.getElementById("lng");
const statutEl = document.getElementById("statut-gps");
const listeEl = document.getElementById("liste-entreprises");
const compteurDispoEl = document.getElementById("compteur-dispo");
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

const VISUELS_SECTEUR = {
    "Alimentaire & Restauration": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    "Bâtiment & Immobilier": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    "Commerce & Distribution": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    "Hôtellerie & Services": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
};

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
let positionActuelle = null;

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

function classifierSecteur(tags) {
    const shop = tags.shop || "";
    const amenity = tags.amenity || "";
    const tourism = tags.tourism || "";
    const office = tags.office || "";
    const adresse = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ") || "Secteur local";

    if (["restaurant", "fast_food", "cafe", "bar", "pub"].includes(amenity) ||
        ["bakery", "butcher", "supermarket", "convenience", "greengrocer", "pastry"].includes(shop)) {
        return {
            secteur: "Alimentaire & Restauration",
            couleur: "#34d399",
            categoriesDebloquees: "Restaurants & Commerces alimentaires",
            adresse,
            prix: 15000
        };
    }

    if (["estate_agent", "architect", "construction", "company"].includes(office) ||
        ["diy", "hardware", "trade", "furniture"].includes(shop)) {
        return {
            secteur: "Bâtiment & Immobilier",
            couleur: "#fbbf24",
            categoriesDebloquees: "Appartements, Maisons & Bureaux",
            adresse,
            prix: 25000
        };
    }

    if (["hotel", "motel", "guest_house", "hostel"].includes(tourism) ||
        ["pharmacy", "hairdresser", "beauty", "laundry"].includes(shop)) {
        return {
            secteur: "Hôtellerie & Services",
            couleur: "#f43f5e",
            categoriesDebloquees: "Hôtels & Services",
            adresse,
            prix: 30000
        };
    }

    if (shop) {
        return {
            secteur: "Commerce & Distribution",
            couleur: "#a855f7",
            categoriesDebloquees: "Commerces & Entrepôts",
            adresse,
            prix: 18000
        };
    }

    return null;
}

function ouvrirFicheEtablissement(item, estDejaAcquis = false) {
    const e = getData().entreprise;
    const visuel = item.photo || VISUELS_SECTEUR[item.secteur] || VISUELS_SECTEUR["Commerce & Distribution"];
    const couleur = estDejaAcquis ? "#38bdf8" : (item.couleur || "#34d399");

    ficheBanniere.style.backgroundImage = `url('${visuel}')`;
    ficheBadgeSecteur.style.color = couleur;
    ficheBadgeSecteur.textContent = estDejaAcquis ? `★ VOTRE FILIALE • ${item.secteur}` : item.secteur;
    ficheNom.textContent = item.nom;

    if (estDejaAcquis) {
        ficheBody.innerHTML = `
            <div class="fiche-row"><span>Statut :</span><strong style="color:#38bdf8;">Entreprise acquise</strong></div>
            <div class="fiche-row"><span>Directeur Général :</span><strong>${item.directeur || e.pdg || "Fondateur"}</strong></div>
            <div class="fiche-row"><span>Valeur d'acquisition :</span><strong>${(item.prixAchat || 0).toLocaleString("fr-FR")} Ø</strong></div>
            <div class="fiche-row"><span>Date d'acquisition :</span><strong>${item.dateAchat || "Aujourd'hui"}</strong></div>
            <div class="fiche-actions">
                <a href="entreprises.html" class="btn-fiche-achat" style="text-align:center; text-decoration:none; background:linear-gradient(90deg, #0284c7, #38bdf8);">Gérer dans Entreprises →</a>
            </div>
        `;
    } else {
        const peutPayer = (e.argent || 0) >= item.prix;
        ficheBody.innerHTML = `
            <div class="fiche-row"><span>Localisation :</span><strong>${item.adresse || "Secteur local"} (${item.distance.toFixed(2)} km)</strong></div>
            <div class="fiche-row"><span>Catalogue débloqué :</span><strong style="color:#7ec8ff;">${item.categoriesDebloquees}</strong></div>
            <div class="fiche-row"><span>Coût d'implantation :</span><strong style="color:#fbbf24;">${item.prix.toLocaleString("fr-FR")} Ø</strong></div>
            <div class="fiche-row"><span>Votre trésorerie :</span><strong style="color:${peutPayer ? "#34d399" : "#f87171"};">${(e.argent || 0).toLocaleString("fr-FR")} Ø</strong></div>
            <div class="fiche-actions">
                <button id="btn-confirmer-achat-fiche" class="btn-fiche-achat" ${peutPayer ? "" : "style='opacity:0.6;'"}>
                    Acheter ce siège (${item.prix.toLocaleString("fr-FR")} Ø)
                </button>
            </div>
        `;

        document.getElementById("btn-confirmer-achat-fiche").onclick = () => {
            acheterSiege(item);
            modalFiche.classList.remove("active");
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
        color: "#00f2fe",
        fillColor: "#00f2fe",
        fillOpacity: 0.05,
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
            const infos = classifierSecteur(el.tags || {});
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
    statutEl.textContent = `${disponibles.length} opportunité(s) disponible(s) dans un rayon de ${rayonActuel} km.`;

    const spanCompteur = document.getElementById("compteur-dispo");
    if (spanCompteur) spanCompteur.textContent = disponibles.length;

    if (disponibles.length === 0) {
        listeEl.innerHTML = `<p style="font-size:13px; color:#94a3b8;">Aucune opportunité disponible avec ce filtre.</p>`;
        return;
    }

    disponibles.forEach(c => {
        const marker = L.marker([c.lat, c.lng], { icon: creerIcone(c.couleur, "dispo") }).addTo(layerDisponibles);
        marker.on("click", () => ouvrirFicheEtablissement(c, false));

        const item = document.createElement("div");
        item.className = "volet-item";
        item.style.borderLeft = `4px solid ${c.couleur}`;
        item.innerHTML = `
            <div style="font-weight:bold; color:#fff; font-size:14px;">${c.nom}</div>
            <div style="font-size:12px; color:${c.couleur}; margin-top:2px;">${c.secteur} • ${c.distance.toFixed(2)} km</div>
            <div style="font-size:13px; color:#fbbf24; font-weight:bold; margin-top:4px;">${c.prix.toLocaleString("fr-FR")} Ø</div>
            <div class="volet-item-actions">
                <button class="btn-mini-fiche">Voir fiche</button>
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
        directeur: e.pdg || "Fondateur",
        associes: [],
        dateAchat: new Date().toLocaleDateString("fr-FR")
    });

    saveData();
    ajouterHistorique(`Siège implanté (${siege.secteur}) : ${siege.nom}`, "achat");
    majTopbar();
    afficherEmpireSurCarte();
    afficherOpportunitesDisponibles(dernieresOpportunites);
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

if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(
        pos => {
            majPosition(pos.coords.latitude, pos.coords.longitude, false);
        },
        err => {
            console.error("Erreur GPS :", err);
            statutEl.textContent = "GPS indisponible. Position par défaut : Limoges.";
            majPosition(45.8336, 1.2611, true);
        },
        { enableHighAccuracy: true, maximumAge: 15000 }
    );
} else {
    statutEl.textContent = "Géolocalisation non supportée.";
    majPosition(45.8336, 1.2611, true);
}
