// =======================================
// GEO EMPIRE — IMMOBILIER
// Gestion des onglets + initialisation modules
// =======================================

// ------------------------------
// IMPORTS DES MODULES
// ------------------------------
import { initAcheter } from "/js/core/modules/acheter.js";
import { initAssurance } from "/js/core/modules/assurance.js";
import { initRenovation } from "/js/core/modules/renovation.js";
import { initProprietes } from "/js/core/modules/proprietes.js";
import { initImmoCore } from "/js/core/modules/immo-core.js";

// On expose les fonctions au window pour que les onglets puissent les appeler
window.initAcheter = initAcheter;
window.initAssurance = initAssurance;
window.initRenovation = initRenovation;
window.initProprietes = initProprietes;

// ------------------------------
// INITIALISATION GLOBALE
// ------------------------------
document.addEventListener("DOMContentLoaded", () => {

    // Initialisation du système immobilier (chargement des données, etc.)
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
        }
    }

    // ------------------------------
    // CHARGEMENT PAR DÉFAUT
    // ------------------------------
    chargerModule("proprietes");
});
