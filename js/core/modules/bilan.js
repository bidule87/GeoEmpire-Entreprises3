// ===============================
//  GEOEMPIRE 3 - BILAN COMPLET
// ===============================

// Calcul du total de l'empire
window.ge_totalEmpire = function () {
    let total = 0;

    // Trésorerie
    total += entreprise.tresorerie;

    // Valeur patrimoine
    if (entreprise.patrimoine)
        total += entreprise.patrimoine.reduce((t, e) => t + e.valeur, 0);

    // Immobilier
    if (entreprise.immobilier)
        total += entreprise.immobilier.reduce((t, b) => t + b.valeur, 0);

    // Assurances (couverture)
    if (entreprise.assurances)
        total += entreprise.assurances.reduce((t, a) => t + a.couverture, 0);

    return total;
};

// Affichage du bilan
window.ge_afficherBilanComplet = function () {
    const zone = document.getElementById("bilan-complet");
    if (!zone) return;

    const total = ge_totalEmpire();

    let html = `
        <h2>BILAN COMPLET</h2>

        <p><strong>Trésorerie :</strong> ${ge_formatArgent(entreprise.tresorerie)}</p>
        <p><strong>Tokens :</strong> ${ge_formatTokens(entreprise.tokens)}</p>
        <p><strong>Crowns :</strong> ${ge_formatCrowns(entreprise.crowns)}</p>

        <hr>

        <p><strong>Valeur patrimoine :</strong> ${
            entreprise.patrimoine ? ge_formatArgent(
                entreprise.patrimoine.reduce((t, e) => t + e.valeur, 0)
            ) : "0 Ø"
        }</p>

        <p><strong>Valeur immobilier :</strong> ${
            entreprise.immobilier ? ge_formatArgent(
                entreprise.immobilier.reduce((t, b) => t + b.valeur, 0)
            ) : "0 Ø"
        }</p>

        <p><strong>Couverture assurances :</strong> ${
            entreprise.assurances ? ge_formatArgent(
                entreprise.assurances.reduce((t, a) => t + a.couverture, 0)
            ) : "0 Ø"
        }</p>

        <hr>

        <p><strong>VALEUR TOTALE DE L'EMPIRE :</strong> ${ge_formatArgent(total)}</p>
    `;

    zone.innerHTML = html;
};

// Auto-affichage si la zone existe
window.addEventListener("load", ge_afficherBilanComplet);
