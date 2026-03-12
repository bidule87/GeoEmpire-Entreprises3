// ======================================================
//  GEO EMPIRE — ENTREPRISE (API SIMPLE POUR LES MODULES)
//  Connecté à geoData.js
// ======================================================

import { getData, saveData, setNom, setLogo } from "./geoData.js";

// ===============================
//  ACCÈS ENTREPRISE
// ===============================
export function getEntreprise() {
    return getData().entreprise;
}

export function sauvegarderEntreprise() {
    saveData();
}

// ===============================
//  NOM + LOGO
// ===============================
export function changerNomEntreprise(nom) {
    setNom(nom);
}

export function changerPhotoEntreprise(base64) {
    setLogo(base64);
}

// ===============================
//  VALEUR TOTALE
// ===============================
export function calculerValeurEntreprise() {
    const e = getData().entreprise;
    let total = 0;

    Object.values(e.biens).forEach(styles => {
        Object.values(styles).forEach(bien => {
            total += (bien.prixAchatMoyen || 0) * (bien.quantite || 0);
        });
    });

    return total;
}
