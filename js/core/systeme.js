// ===============================
//  GEOEMPIRE ENTREPRISES 3
//  SYSTEME CENTRAL (VERSION GEO DATA)
// ===============================

import { getData, saveData, addArgent, removeArgent } from "./geoData.js";

// ===============================
//  INITIALISATION ENTREPRISE (AJOUT)
// ===============================
const data = getData();
const e = data.entreprise;

// Si l'entreprise n'a jamais été initialisée, on la crée proprement
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
