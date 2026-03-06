// ===============================
//  GEOEMPIRE 3 - SAUVEGARDE
// ===============================

const GE_KEY = "geoempire3_save";

// Sauvegarde complète
window.ge_sauvegarder = function () {
    try {
        const data = JSON.stringify(entreprise);
        localStorage.setItem(GE_KEY, data);
        console.log("✔ Sauvegarde effectuée");
    } catch (e) {
        console.error("Erreur sauvegarde :", e);
    }
};

// Chargement
window.ge_charger = function () {
    try {
        const data = localStorage.getItem(GE_KEY);
        if (!data) return false;

        const obj = JSON.parse(data);
        Object.assign(entreprise, obj);

        console.log("✔ Données chargées");
        return true;
    } catch (e) {
        console.error("Erreur chargement :", e);
        return false;
    }
};

// Reset complet
window.ge_reset = function () {
    localStorage.removeItem(GE_KEY);
    location.reload();
};

// Sauvegarde auto toutes les 10 secondes
setInterval(() => {
    ge_sauvegarder();
}, 10000);
