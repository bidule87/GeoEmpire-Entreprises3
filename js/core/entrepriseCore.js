// ======================================================
//  GEO EMPIRE — ENTREPRISE & HOLDING (API CENTRALE)
//  Connecté à geoData.js et au module GPS
// ======================================================

import { getData, saveData, setNom, setLogo, ajouterHistorique } from "./geoData.js";

// ===============================
//  ACCÈS ENTREPRISE / EMPIRE
// ===============================
export function getEntreprise() {
    const data = getData();
    const e = data.entreprise;
    if (!Array.isArray(e.commercesGPS)) e.commercesGPS = [];
    if (!e.holding) {
        e.holding = {
            active: false,
            nom: "Ma Holding",
            dateCreation: null,
            bonusRevenus: 0.15 // +15 % de revenus une fois la Holding créée
        };
    }
    return e;
}

export function sauvegarderEntreprise() {
    saveData();
}

// ===============================
//  NOM + LOGO DU GROUPE / JOUEUR
// ===============================
export function changerNomEntreprise(nom) {
    setNom(nom);
}

export function changerPhotoEntreprise(base64) {
    setLogo(base64);
}

// ===============================
//  GESTION DES SIÈGES ACHETÉS (GPS)
// ===============================
export function getSiegesGPS() {
    return getEntreprise().commercesGPS || [];
}

export function majSiegeGPS(id, updates) {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege) return false;
    Object.assign(siege, updates);
    saveData();
    return true;
}

// ===============================
//  HOLDING (DÉBLOQUÉE DÈS 3 SIÈGES)
// ===============================
export const SEUIL_HOLDING = 3;

export function creerHolding(nomHolding) {
    const e = getEntreprise();
    if (e.commercesGPS.length < SEUIL_HOLDING) return false;

    e.holding.active = true;
    e.holding.nom = (nomHolding || "").trim() || `${e.nom} Holding`;
    e.holding.dateCreation = new Date().toLocaleDateString("fr-FR");
    e.holding.bonusRevenus = 0.15;

    saveData();
    ajouterHistorique(`Création de la Holding : ${e.holding.nom} (+15 % revenus)`, "prestige");
    return true;
}

// ===============================
//  VALEUR TOTALE (SIÈGES + BIENS)
// ===============================
export function calculerValeurEntreprise() {
    const e = getEntreprise();
    let total = 0;

    // Valeur des biens immobiliers / commerciaux
    if (e.biens) {
        Object.values(e.biens).forEach(styles => {
            Object.values(styles).forEach(bien => {
                total += (bien.prixAchatMoyen || 0) * (bien.quantite || 0);
            });
        });
    }

    // Valeur des sièges achetés sur la carte
    (e.commercesGPS || []).forEach(siege => {
        total += siege.prixAchat || 0;
    });

    return total;
}
