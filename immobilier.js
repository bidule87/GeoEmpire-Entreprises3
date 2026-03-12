// =======================================
// GEO EMPIRE — IMMOBILIER
// Gestion des onglets + initialisation modules
// =======================================

// ------------------------------
// IMPORTS DES MODULES EXISTANTS
// ------------------------------
import { initAcheter } from "../core/modules/acheter.js";
import { initAssurance } from "../core/modules/assurance.js";
import { initRenovation } from "../core/modules/renovation.js";
import { initProprietes } from "../core/modules/proprietes.js";
import { initImmoCore } from "../core/modules/immo-core.js";

// ------------------------------
// IMPORTS DES NOUVEAUX MODULES
// ------------------------------
import { initEntreprise } from "../core/modules/entreprise.js";
import { initPersonnel } from "../core/modules/personnel.js";
import { initCession } from "../core/modules/cession.js";

// Exposer les fonctions au window
window.initAcheter = initAcheter;
window.initAssurance = initAssurance;
window.initRenovation = initRenovation;
window.initProprietes = initProprietes;
window.initEntreprise = initEntreprise;
window.initPersonnel = initPersonnel;
window.initCession = initCession;

// ------------------------------
// AFFICHAGE DU BUDGET GLOBAL
// ------------------------------
import { getEntreprise } from "../core/entrepriseCore.js";

function afficherBudget() {
    const e = getEntreprise();
    const zone = document.getElementById("budget-global");

    if (zone) {
        zone.textContent = "Budget : " + e.argent.toLocaleString() + " €";
    }
}

// Mise à jour automatique
setInterval(afficherBudget, 500);

// ------------------------------
// INITIALISATION GLOBALE
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {

    // Initialisation du système immobilier
    initImmoCore();

    // ------------------------------
    // GESTION DES ONGLETS
    // ------------------------------
    const ongletBtns = document.querySelectorAll(".onglet-btn");
    const ongletContenus = document.querySelectorAll(".onglet-contenu");

    ongletBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const cible = btn.getAttribute("data-onglet");

            // Désactiver tous les onglets
            ongletBtns.forEach(b => b.classList.remove("actif"));
            ongletContenus.forEach(c => c.classList.remove("actif"));

            // Activer l’onglet cliqué
            btn.classList.add("actif");
            document.getElementById(cible).classList.add("actif");

            // Charger le module correspondant
            chargerModule(cible);
        });
    });

    // ------------------------------
    // CHARGEMENT DES MODULES
    // ------------------------------
    function chargerModule(nom) {
        switch (nom) {
            case "proprietes":
                initProprietes();
                break;

            case "acheter":
                initAcheter();
                break;

            case "assurance":
                initAssurance();
                break;

            case "renovation":
                initRenovation();
                break;

            case "entreprise":
                initEntreprise();
                break;

            case "personnel":
                initPersonnel();
                break;

            case "cession":
                initCession();
                break;
        }
    }

    // ------------------------------
    // CHARGEMENT PAR DÉFAUT
    // ------------------------------
    chargerModule("proprietes");
});
