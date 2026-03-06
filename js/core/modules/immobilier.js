// ===============================
//  GEOEMPIRE 3 - IMMOBILIER
// ===============================

// Ajouter un bien immobilier
window.ge_ajouterBien = function (nom, valeur, revenu) {
    const bien = {
        id: Date.now(),
        nom: ge_formatNom(nom),
        valeur: valeur,
        revenu: revenu
    };

    entreprise.immobilier = entreprise.immobilier || [];
    entreprise.immobilier.push(bien);

    ge_afficherImmobilier();
    ge_notif("Bien immobilier ajouté", "success");
};

// Supprimer un bien
window.ge_supprimerBien = function (id) {
    entreprise.immobilier = entreprise.immobilier.filter(b => b.id !== id);
    ge_afficherImmobilier();
    ge_notif("Bien supprimé", "error");
};

// Revenu total immobilier
window.ge_revenuImmobilier = function () {
    if (!entreprise.immobilier) return 0;
    return entreprise.immobilier.reduce((t, b) => t + b.revenu, 0);
};

// Affichage
window.ge_afficher