// =======================================
// GEO EMPIRE — MODULE CARTES
// Jump / Déménagement / Crown / Cadenas
// Compatible Boutique + GPS + Braquage
// =======================================

import { boutiqueState } from "./boutique.js";
import { gpsState, setPositionTemporaire, setVilleBase } from "./gps.js";

// ======================================================
// 1. CARTE JUMP
// - Téléportation mondiale
// - Ne change PAS l'IP (ville de base)
// - Permet d'acheter / braquer / trouver des cartes
//   sur la zone Jump
// ======================================================
export function utiliserCarteJump(lat, lon) {
  if (boutiqueState.jumpCharges <= 0) {
    return "Aucune carte Jump disponible.";
  }

  boutiqueState.jumpCharges -= 1;

  // Position temporaire = zone Jump
  setPositionTemporaire({ lat, lon });

  return "Téléportation Jump effectuée.";
}

// ======================================================
// 2. CARTE DÉMÉNAGEMENT
// - Change l'adresse IP (ville de base)
// - Déplace la position réelle du joueur
// - Le joueur garde toutes ses entreprises
// - Une taxe globale doit être payée
// ======================================================
export function utiliserCarteDemenagement(nouvelleVille, coords, taxe, payerTaxeCallback) {
  if (boutiqueState.moveCards <= 0) {
    return "Aucune carte Déménagement disponible.";
  }

  const ok = payerTaxeCallback(taxe);
  if (!ok) {
    return "Fonds insuffisants pour payer la taxe de déménagement.";
  }

  boutiqueState.moveCards -= 1;

  // Nouvelle ville de base
  setVilleBase(nouvelleVille, coords);

  return `Déménagement effectué vers ${nouvelleVille}. Taxe payée : ${taxe} Ø.`;
}

// ======================================================
// 3. CARTE CROWN
// - Permet d'accéder à la Loterie Royale
// - crownCards ≠ Crowns (monnaie)
// ======================================================
export function utiliserCarteCrown(ouvrirLoterieCallback) {
  if (boutiqueState.crownCards <= 0) {
    return "Aucune carte Crown disponible.";
  }

  boutiqueState.crownCards -= 1;

  ouvrirLoterieCallback();

  return "Accès à la Loterie Royale accordé.";
}

// ======================================================
// 4. CARTE CADENAS
// - Ajoute un cadenas supplémentaire sur une entreprise
// - Sans avoir le pack Cadenas
// ======================================================
export function utiliserCarteCadenas(idEntreprise, appliquerCadenasCallback) {
  if (boutiqueState.lockCards <= 0) {
    return "Aucune carte Cadenas disponible.";
  }

  const ok = appliquerCadenasCallback(idEntreprise);
  if (!ok) {
    return "Impossible d'appliquer un cadenas sur cette entreprise.";
  }

  boutiqueState.lockCards -= 1;

  return "Cadenas supplémentaire appliqué.";
}
