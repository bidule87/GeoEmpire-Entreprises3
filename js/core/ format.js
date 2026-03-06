// ===============================
//  GEOEMPIRE 3 - FORMATAGE PREMIUM
// ===============================

// Format monnaie Ø
window.ge_formatArgent = function (montant) {
    return montant.toLocaleString("fr-FR") + " Ø";
};

// Format tokens
window.ge_formatTokens = function (n) {
    return n.toLocaleString("fr-FR") + " GT";
};

// Format crowns
window.ge_formatCrowns = function (n) {
    return n.toLocaleString("fr-FR") + " CRW";
};

// Format pourcentage
window.ge_formatPourcent = function (p) {
    return p.toFixed(1).replace(".", ",") + " %";
};

// Format distance (GPS)
window.ge_formatDistance = function (m) {
    if (m < 1000) return m.toFixed(0) + " m";
    return (m / 1000).toFixed(2).replace(".", ",") + " km";
};

// Format nom d'entreprise (capitalisation propre)
window.ge_formatNom = function (txt) {
    if (!txt) return "";
    return txt
        .toLowerCase()
        .replace(/(^\w|\s\w)/g, c => c.toUpperCase());
};

// Format date
window.ge_formatDate = function (d = new Date()) {
    return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
};
