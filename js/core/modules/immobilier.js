import { entreprises } from "./entreprises.js";
import { vendreBiens, louerBiensAuto } from "./immobilier_etape3.js";

// ID entreprise (temporaire)
const id = 0;

// Sélecteurs vente
const venteQuantite = document.getElementById("vente-quantite");
const venteSlider = document.getElementById("vente-molette");
const venteMoletteVal = document.getElementById("vente-molette-val");
const ventePrixBaseEl = document.getElementById("vente-prix-base");
const ventePrixFinalEl = document.getElementById("vente-prix-final");
const venteResultat = document.getElementById("vente-resultat");

// Sélecteurs location
const locQuantite = document.getElementById("loc-quantite");
const locSlider = document.getElementById("loc-molette");
const locMoletteVal = document.getElementById("loc-molette-val");
const locPrixBaseEl = document.getElementById("loc-prix-base");
const locPrixFinalEl = document.getElementById("loc-prix-final");
const locResultat = document.getElementById("loc-resultat");

// Historique
const historiqueEl = document.getElementById("historique");

// Prix de base = prix d'achat de l'entreprise
const prixBase = entreprises[id].prixAchat;

// Affichage initial
ventePrixBaseEl.textContent = prixBase;
locPrixBaseEl.textContent = prixBase;

// Fonction de calcul du prix final
function calculPrixFinal(percent) {
  return Math.round(prixBase * (1 + percent / 100));
}

// Slider vente
venteSlider.oninput = () => {
  const percent = Number(venteSlider.value);
  venteMoletteVal.textContent = percent + "%";
  ventePrixFinalEl.textContent = calculPrixFinal(percent);
};

// Slider location
locSlider.oninput = () => {
  const percent = Number(locSlider.value);
  locMoletteVal.textContent = percent + "%";
  locPrixFinalEl.textContent = calculPrixFinal(percent);
};

// Bouton vendre
document.getElementById("btn-vendre").onclick = () => {
  const q = Number(venteQuantite.value);
  const m = Number(venteSlider.value);

  const r = vendreBiens(id, q, m, true, gain => {
    console.log("Argent +", gain);
  });

  venteResultat.textContent = JSON.stringify(r, null, 2);

  // Historique
  historiqueEl.textContent += `Vente : ${q} biens à ${m}% → ${JSON.stringify(r)}\n`;
};

// Bouton louer
document.getElementById("btn-louer").onclick = () => {
  const q = Number(locQuantite.value);
  const m = Number(locSlider.value);

  const r = louerBiensAuto(id, q, m, true, gain => {
    console.log("Argent +", gain);
  });

  locResultat.textContent = JSON.stringify(r, null, 2);

  // Historique
  historiqueEl.textContent += `Location : ${q} biens à ${m}% → ${JSON.stringify(r)}\n`;
};
