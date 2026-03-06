// ===============================
//  GEOEMPIRE 3 - ROLES
// ===============================

// Ajouter un rôle
window.ge_ajouterRole = function (nom, salaire) {
    const role = {
        id: Date.now(),
        nom: ge_formatNom(nom),
        salaire: salaire
    };

    entreprise.roles.push(role);
    ge_afficherRoles();
    ge_notif("Rôle ajouté", "success");
};

// Supprimer un rôle
window.ge_supprimerRole = function (id) {
    entreprise.roles = entreprise.roles.filter(r => r.id !== id);
    ge_afficherRoles();
    ge_notif("Rôle supprimé", "error");
};

// Affichage
window.ge_afficherRoles = function () {
    const zone = document.getElementById("contenu-roles");
    if (!zone) return;

    if (entreprise.roles.length === 0) {
        zone.innerHTML = "<p>Aucun rôle pour le moment.</p>";
        return;
    }

    let html = `<h2>ROLES</h2>`;
    html += `<div class="roles-liste">`;

    entreprise.roles.forEach(r => {
        html += `
            <div class="role-item">
                <div class="nom">${r.nom}</div>
                <div class="salaire">${ge_formatArgent(r.salaire)}</div>
                <button onclick="ge_supprimerRole(${r.id})">Supprimer</button>
            </div>
        `;
    });

    html += `</div>`;
    zone.innerHTML = html;
};
