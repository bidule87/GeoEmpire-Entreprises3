// ======================================================
//  GEO EMPIRE — FICHIER CENTRAL DE DONNÉES
//  (Entreprise, biens, marketing, finances internes)
// ======================================================

// ===============================
//  STRUCTURE PAR DÉFAUT
// ===============================
let data = {
    entreprise: {
        nom: "",
        logo: "",
        argent: 0,
        patrimoine: 0,
        dateCreation: null,

        historique: [],

        primes: {
            pdg: 0,
            dg: 0,
            dc: 0
        },

        biens: {},

        marketing: {
            clients: {
                "NOVA HABITAT": {
                    couleur: "#FF4D4D",
                    satisfaction: 0,
                    bonus: 0
                },
                "LUMEN CAPITAL": {
                    couleur: "#FF8C42",
                    satisfaction: 0,
                    bonus: 0
                },
                "AURION INDUSTRIES": {
                    couleur: "#FFD93D",
                    satisfaction: 0,
                    bonus: 0
                },
                "VELION STARTERS": {
                    couleur: "#4CAF50",
                    satisfaction: 0,
                    bonus: 0
                },
                "SOLARIS GROUP": {
                    couleur: "#2196F3",
                    satisfaction: 0,
                    bonus: 0
                },
                "EMPYREON TRUST": {
                    couleur: "#9C27B0",
                    satisfaction: 0,
                    bonus: 0
                }
            }
        }
    }
};

// ===============================
//  SAUVEGARDE / CHARGEMENT
// ===============================
export function saveData() {
    localStorage.setItem("geoEmpireData", JSON.stringify(data));
}

export function loadData() {
    const saved = localStorage.getItem("geoEmpireData");
    if (saved) {
        data = JSON.parse(saved);
    }
}

loadData();

// ===============================
//  ACCÈS PRINCIPAL
// ===============================
export function getData() {
    return data;
}

export function updateEntreprise(obj) {
    Object.assign(data.entreprise, obj);
    saveData();
}

// ===============================
//  NOM + LOGO
// ===============================
export function setNom(nom) {
    data.entreprise.nom = nom;
    saveData();
}

export function setLogo(base64) {
    data.entreprise.logo = base64;
    saveData();
}

// ===============================
//  ARGENT
// ===============================
export function addArgent(montant) {
    data.entreprise.argent += montant;
    saveData();
}

export function removeArgent(montant) {
    data.entreprise.argent -= montant;
    if (data.entreprise.argent < 0) data.entreprise.argent = 0;
    saveData();
}

// ===============================
//  BIENS
// ===============================
export function addBien(categorie, style, prixAchat) {
    if (!data.entreprise.biens[categorie]) {
        data.entreprise.biens[categorie] = {};
    }

    if (!data.entreprise.biens[categorie][style]) {
        data.entreprise.biens[categorie][style] = {
            quantite: 0,
            prixAchatMoyen: 0,
            renovation: null,
            assurance: null
        };
    }

    const bien = data.entreprise.biens[categorie][style];

    bien.prixAchatMoyen =
        (bien.prixAchatMoyen * bien.quantite + prixAchat) /
        (bien.quantite + 1);

    bien.quantite++;

    saveData();
}

export function removeBien(categorie, style, quantite) {
    const bien = data.entreprise.biens[categorie]?.[style];
    if (!bien) return;

    bien.quantite -= quantite;
    if (bien.quantite <= 0) {
        delete data.entreprise.biens[categorie][style];
    }

    saveData();
}

// ===============================
//  MARKETING
// ===============================
export function modifierSatisfaction(client, valeur) {
    const c = data.entreprise.marketing.clients[client];
    if (!c) return;

    c.satisfaction += valeur;

    // Bonus caché
    c.bonus = Math.min(0.20, Math.max(0, c.satisfaction / 100));

    saveData();
}

// ===============================
//  HISTORIQUE
// ===============================
export function ajouterHistorique(type, details, montant) {
    data.entreprise.historique.push({
        date: Date.now(),
        type,
        details,
        montant
    });

    saveData();
}
