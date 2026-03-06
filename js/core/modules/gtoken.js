// ===============================
//  GEOEMPIRE 3 - GTOKEN
// ===============================

// Ajouter des GT
window.ge_ajouterGT = function (n) {
    entreprise.tokens += n;
    ge_afficherBilan();
    ge_notif("+" + n + " GT ajoutés", "success");
};

// Retirer des GT
window.ge_retirerGT = function (n) {
    if (entreprise.tokens < n) {
        ge_notif("Pas assez de GT", "error");
        return false;
    }
    entreprise.tokens -= n;
    ge_afficherBilan();
    return true;
};

// Conversion GT → Argent
window.ge_convertirGT = function (n) {
    if (!ge_retirerGT(n)) return;

    const gain = n * 100; // 1 GT = 100 Ø
    ge_ajouterArgent(gain);

    ge_notif(`${n} GT convertis en ${gain} Ø`, "success");
};

// Affichage (si besoin dans le futur)
window.ge_afficherGT = function () {
    console.log("GT :", entreprise.tokens);
};
