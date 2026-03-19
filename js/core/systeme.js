// ===============================
//  GEOEMPIRE ENTREPRISES 3
//  SYSTEME CENTRAL (VERSION GEO DATA)
// ===============================

import { 
    getData, 
    saveData, 
    addArgent, 
    removeArgent, 
    appliquerVentesAutomatiques 
} from "./geoData.js";

import { initImmoCore } from "./modules/immo-core.js"; // AJOUT

// ===============================
//  INITIALISATION ENTREPRISE (AJOUT)
// ===============================
const data = getData();
const e = data.entreprise;

if (!e.dateCreation) {
    e.dateCreation = Date.now();
    e.nom = e.nom || "Nouvelle Entreprise";
    e.type = e.type || "Société Générale";
    e.logo = e.logo || "";
    saveData();
}

// ===============================
//  BARRE DU HAUT
// ===============================
export function ge_afficherBilan() {
    const e = getData().entreprise;

    const solde = document.getElementById("solde");
    const tokens = document.getElementById("tokens");
    const crowns = document.getElementById("crowns");

    if (solde) solde.innerText = e.argent.toLocaleString();
    if (tokens) tokens.innerText = e.tokens || 0;
    if (crowns) crowns.innerText = e.crowns || 0;
}

// ===============================
//  AJOUTER ARGENT
// ===============================
export function ge_ajouterArgent(montant) {
    addArgent(montant);
    ge_afficherBilan();
}
window.ge_ajouterArgent = ge_ajouterArgent;

// ===============================
//  AJOUTER TOKENS
// ===============================
export function ge_ajouterTokens(montant) {
    const e = getData().entreprise;
    e.tokens = (e.tokens || 0) + montant;
    saveData();
    ge_afficherBilan();
}
window.ge_ajouterTokens = ge_ajouterTokens;

// ===============================
//  AJOUTER CROWNS
// ===============================
export function ge_ajouterCrowns(montant) {
    const e = getData().entreprise;
    e.crowns = (e.crowns || 0) + montant;
    saveData();
    ge_afficherBilan();
}
window.ge_ajouterCrowns = ge_ajouterCrowns;

// ===============================
//  RETIRER ARGENT
// ===============================
export function ge_retirerArgent(montant) {
    const e = getData().entreprise;

    if (e.argent < montant) return false;

    removeArgent(montant);
    ge_afficherBilan();
    return true;
}

// ===============================
//  INITIALISATION
// ===============================
export function ge_initialiser() {

    // 🔥 Mise à jour du solde
    ge_afficherBilan();

    // 🔥 Activation du cycle marketing 24h
    appliquerVentesAutomatiques();

    // 🔥 Initialisation du module immobilier
    initImmoCore();

    console.log("GeoEmpire 3 initialisé (version geoData).");
}

window.onload = ge_initialiser;
