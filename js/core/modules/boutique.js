// ===============================
//  GEOEMPIRE 3 - BOUTIQUE
// ===============================

// Liste des items du shop
window.ge_shopItems = [
    { id: 1, nom: "Pack Starter", prix: 500, tokens: 5 },
    { id: 2, nom: "Boost Argent", prix: 1500, tokens: 15 },
    { id: 3, nom: "Pack Empire", prix: 5000, tokens: 50 }
];
// Achat d'un item
window.ge_acheterItem = function (id) {
    const item = ge_shopItems.find(i => i.id === id);
    if (!item) return;

    if (!ge_retirerArgent(item.prix)) {
        ge_notif("Fonds insuffisants", "error");
        return;
    }

    entreprise.tokens += item.tokens;
    ge_afficherBilan();
    ge_afficherShop();

    ge_notif("Achat effectué", "success");
};
// Affichage du shop
window.ge_afficherShop = function () {
    const zone = document.getElementById("shop-items");
    if (!zone) return;

    let html = `<h2>BOUTIQUE</h2>`;
    html += `<div class="shop-liste">`;

    ge_shopItems.forEach(i => {
        html += `
            <div class="shop-item">
                <div class="nom">${i.nom}</div>
                <div class="prix">${ge_formatArgent(i.prix)}</div>
                <div class="tokens">+${ge_formatTokens(i.tokens)}</div>
                <button onclick="ge_acheterItem(${i.id})">Acheter</button>
            </div>
        `;
    });

    html += `</div>`;
    zone.innerHTML = html;
};
