// ===============================
//  GEO EMPIRE — MODULE PATRIMOINE
//  Version Finale (V3)
// ===============================

// --- MONNAIES ---
let geo = 0;
let gtoken = 0;
let crowns = 0;

// --- PATRIMOINE ---
let patrimoineReel = 0;
let bonusGToken = 0;

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
//  INITIALISATION
// ===============================
export function initPatrimoine() {

    const zone = document.getElementById("patrimoine");

    zone.innerHTML = `
        <h2>Patrimoine</h2>

        <div class="patrimoine-bloc">
            <div id="patrimoine-monnaies"></div>
            <div id="patrimoine-global"></div>
            <div id="patrimoine-structure"></div>
            <div id="patrimoine-classement"></div>
        </div>
    `;

    afficherPatrimoine();
}

window.initPatrimoine = initPatrimoine;
