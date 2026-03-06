// ===============================
//  GEOEMPIRE 3 - ASSURANCES
// ===============================

// Ajouter une assurance
window.ge_ajouterAssurance = function (nom, prime, couverture) {
    const a = {
        id: Date.now(),
        nom: ge_formatNom(nom),
        prime: prime,
        couverture: couverture
    };

    entreprise.assurances = entreprise.assurances || [];
    entreprise.assurances.push(a);

    ge_afficherAssurances();
    ge_notif("Assurance ajoutée", "success");
};

// Supprimer une assurance
window.ge_supprimerAssurance = function (id) {
    entreprise.assurances = entreprise.assurances.filter(a => a.id !== id);
    ge_afficherAssurances();
    ge_notif("Assurance supprimée", "error");
};

// Coût total des primes
window.ge_totalPrimes = function () {
    if (!entreprise.assurances) return 0;
    return entreprise.assurances.reduce((t, a) => t + a.prime, 0);
};

// Affichage
window.ge_afficherAssurances = function () {
    const zone = document.getElementById("contenu-patrimoine");
    if (!zone) return;

    if (!entreprise.assurances || entreprise.assurances.length === 0) {
        zone.innerHTML += "<p>Aucune assurance.</p>";
        return;
    }

    let html = `<h2>ASSURANCES</h2>`;
    html += `<p>Primes totales : <strong>${ge_formatArgent(ge_totalPrimes())}</strong></p>`;

    html += `<div class="assurances-liste">`;

    entreprise.assurances.forEach(a => {
        html += `
            <div class="assurance-item">
                <div class="nom">${a.nom}</div>
                <div class="prime">${ge_formatArgent(a.prime)}</div>
                <div class="couv">${ge_formatArgent(a.couverture)} couverts</div>
                <button onclick="ge_supprimerAssurance(${a.id})">Supprimer</button>
            </div>
        `;
    });

    html += `</div>`;

    zone.innerHTML += html;
};
