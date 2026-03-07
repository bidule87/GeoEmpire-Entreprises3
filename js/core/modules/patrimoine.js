// ===============================
//  GEO EMPIRE — MODULE PATRIMOINE
//  Version Finale (V3)
// ===============================

// --- MONNAIES ---
let geo = 0;            // Monnaie principale
let gtoken = 0;         // Monnaie premium patrimoniale
let crowns = 0;         // Monnaie de la loterie

// --- PATRIMOINE ---
let patrimoineReel = 0;        // Utilisé pour le classement
let bonusGToken = 0;           // Boost patrimonial (n'influence PAS le classement)

// --- STRUCTURE EMPIRE ---
let structureEmpire = {
    holding: 0,
    filiales: {} // Exemple : { "GPS": 350000, "Immo": 250000 }
};

// ===============================
//  TAUX DE CONVERSION G-TOKEN
//  (placeholder — formule DOX à intégrer)
// ===============================
function tauxConversionActuel() {
    // Pour l'instant : 1 G‑Token = 1 Geo
    // On mettra ta formule logarithmique plus tard
    return 1;
}

// ===============================
//  CALCUL BONUS G-TOKEN
// ===============================
function calculerBonusGToken() {
    bonusGToken = gtoken * tauxConversionActuel();
}

// ===============================
//  PATRIMOINE BOOSTÉ (primes, découvert, conversion)
// ===============================
function getPatrimoineBoosté() {
    return patrimoineReel + bonusGToken;
}

// ===============================
//  PATRIMOINE POUR CLASSEMENT
// ===============================
function getPatrimoineClassement() {
    return patrimoineReel;
}

// ===============================
//  AFFICHAGE COMPLET
// ===============================
function afficherPatrimoine() {

    calculerBonusGToken();

    // --- MONNAIES ---
    document.getElementById("patrimoine-monnaies").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>MONNAIES</h3>
            <p>GEO : ${geo.toLocaleString()} Ø</p>
            <p>G‑TOKEN : ${gtoken.toLocaleString()}</p>
            <p>CROWNS : ${crowns.toLocaleString()}</p>
        </div>
    `;

    // --- PATRIMOINE GLOBAL ---
    document.getElementById("patrimoine-global").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>PATRIMOINE GLOBAL</h3>
            <p>Réel : ${patrimoineReel.toLocaleString()} Ø</p>
            <p>Boost G‑Token : +${bonusGToken.toLocaleString()} Ø</p>
            <hr>
            <p><b>Valeur utilisée pour les primes :</b> ${getPatrimoineBoosté().toLocaleString()} Ø</p>
        </div>
    `;

    // --- STRUCTURE EMPIRE ---
    document.getElementById("patrimoine-structure").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>STRUCTURE DE L’EMPIRE</h3>
            <p>Holding : ${structureEmpire.holding.toLocaleString()} Ø</p>
            ${Object.entries(structureEmpire.filiales).map(([nom, val]) =>
                `<p>${nom} : ${val.toLocaleString()} Ø</p>`
            ).join("")}
        </div>
    `;

    // --- CLASSEMENT ---
    document.getElementById("patrimoine-classement").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>CLASSEMENT (PATRIMOINE RÉEL)</h3>
            <p>Votre score : ${getPatrimoineClassement().toLocaleString()} Ø</p>
        </div>
    `;
}
