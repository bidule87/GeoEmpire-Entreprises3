// ===============================
//  GEOEMPIRE ENTREPRISES 3
//  SYSTEME CENTRAL (VERSION GEO DATA)
// ===============================

import { getData, saveData, addArgent, removeArgent } from "./geoData.js";

// ===============================
//  BARRE DU HAUT
// ===============================
export function ge_afficherBilan() {
    const e = getData().entreprise;

    document.getElementById("solde").innerText = e.argent.toLocaleString();
    document.getElementById("tokens").innerText = e.tokens || 0;
    document.getElementById("crowns").innerText = e.crowns || 0;
}

// ===============================
//  AJOUTER ARGENT
// ===============================
export function ge_ajouterArgent(montant) {
    addArgent(montant);
    ge_afficherBilan();
}

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
    ge_afficherBilan();
    console.log("GeoEmpire 3 initialisé (version geoData).");
}

window.onload = ge_initialiser;
