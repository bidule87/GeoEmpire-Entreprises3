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
    filiales: {}
};

// ===============================
//  TAUX DE CONVERSION G-TOKEN
// ===============================
function tauxConversionActuel() {
    return 1;
}

// ===============================
//  CALCUL BONUS G-TOKEN
// ===============================
function calculerBonusGToken() {
    bonusGToken = gtoken * tauxConversionActuel();
}

// ===============================
//  PATRIMOINE BOOSTÉ
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

    document.getElementById("patrimoine-monnaies").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>MONNAIES</h3>
            <p>GEO : ${geo.toLocaleString()} Ø</p>
            <p>G‑TOKEN : ${gtoken.toLocaleString()}</p>
            <p>CROWNS : ${crowns.toLocaleString()}</p>
        </div>
    `;

    document.getElementById("patrimoine-global").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>PATRIMOINE GLOBAL</h3>
            <p>Réel : ${patrimoineReel.toLocaleString()} Ø</p>
            <p>Boost G‑Token : +${bonusGToken.toLocaleString()} Ø</p>
            <hr>
            <p><b>Valeur utilisée pour les primes :</b> ${getPatrimoineBoosté().toLocaleString()} Ø</p>
        </div>
    `;

    document.getElementById("patrimoine-structure").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>STRUCTURE DE L’EMPIRE</h3>
            <p>Holding : ${structureEmpire.holding.toLocaleString()} Ø</p>
            ${Object.entries(structureEmpire.filiales).map(([nom, val]) =>
                `<p>${nom} : ${val.toLocaleString()} Ø</p>`
            ).join("")}
        </div>
    `;

    document.getElementById("patrimoine-classement").innerHTML = `
        <div class="bloc-patrimoine">
            <h3>CLASSEMENT (PATRIMOINE RÉEL)</h3>
            <p>Votre score : ${getPatrimoineClassement().toLocaleString()} Ø</p>
        </div>
    `;
}

// ===============================
//  INITIALISATION (APPELÉ PAR LE HTML)
// ===============================
export function initPatrimoine() {
    afficherPatrimoine();
}

// Pour compatibilité avec ton HTML
window.initPatrimoine = initPatrimoine;
