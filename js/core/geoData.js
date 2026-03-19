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

        // Pour la logique 24h
        lastUpdateMarketing: null,

        // === BASE ÉCONOMIQUE SIMPLE ===
        prixMarche: {
            "Appartements": 200000,
            "Maisons": 300000,
            "Commerces": 150000,
            "Bureaux": 250000,
            "Entrepôts": 180000,
            "Hôtels": 400000,
            "Restaurants": 220000
        },

        charges: {
            "Appartements": 0.01,
            "Maisons": 0.015,
            "Commerces": 0.02,
            "Bureaux": 0.02,
            "Entrepôts": 0.01,
            "Hôtels": 0.03,
            "Restaurants": 0.025
        },

        impotsVente: 0.05,

        marketing: {
            clients: {
                "NOVA HABITAT": {
                    couleur: "#FF4D4D",
                    satisfaction: 0,
                    bonus: 0,
                    categorie: "Maisons"
                },
                "LUMEN CAPITAL": {
                    couleur: "#FF8C42",
                    satisfaction: 0,
                    bonus: 0,
                    categorie: "Bureaux"
                },
                "AURION INDUSTRIES": {
                    couleur: "#FFD93D",
                    satisfaction: 0,
                    bonus: 0,
                    categorie: "Entrepôts"
                },
                "VELION STARTERS": {
                    couleur: "#4CAF50",
                    satisfaction: 0,
                    bonus: 0,
                    categorie: "Commerces"
                },
                "SOLARIS GROUP": {
                    couleur: "#2196F3",
                    satisfaction: 0,
                    bonus: 0,
                    categorie: "Hôtels"
                },
                "EMPYREON TRUST": {
                    couleur: "#9C27B0",
                    satisfaction: 0,
                    bonus: 0,
                    categorie: "Appartements"
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
//  MARKETING — SATISFACTION
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
//  MARKETING — VENTES AUTOMATIQUES
// ===============================
export function appliquerVentesAutomatiques() {
    const now = Date.now();
    const last = data.entreprise.lastUpdateMarketing;

    // 24h = 86 400 000 ms
    if (last && now - last < 86400000) return;

    data.entreprise.lastUpdateMarketing = now;

    const prixMarche = data.entreprise.prixMarche;
    const charges = data.entreprise.charges;
    const impots = data.entreprise.impotsVente;

    for (const nomClient in data.entreprise.marketing.clients) {
        const client = data.entreprise.marketing.clients[nomClient];
        const categorie = client.categorie;

        if (!data.entreprise.biens[categorie]) continue;

        // Déterminer le % selon la satisfaction
        let taux = 0;

        if (client.satisfaction <= 20) taux = 0.05;
        else if (client.satisfaction <= 40) taux = 0.10;
        else if (client.satisfaction <= 60) taux = 0.20;
        else if (client.satisfaction <= 80) taux = 0.30;
        else taux = 0.40 + Math.random() * 0.10; // 40–50%

        for (const style in data.entreprise.biens[categorie]) {
            const bien = data.entreprise.biens[categorie][style];

            const quantiteVendue = Math.floor(bien.quantite * taux);
            if (quantiteVendue <= 0) continue;

            const prix = prixMarche[categorie];
            const totalBrut = prix * quantiteVendue;

            const totalCharges = totalBrut * charges[categorie];
            const totalImpots = totalBrut * impots;

            const totalNet = totalBrut - totalCharges - totalImpots;

            // Ajouter argent
            data.entreprise.argent += totalNet;

            // Retirer biens
            bien.quantite -= quantiteVendue;
            if (bien.quantite <= 0) {
                delete data.entreprise.biens[categorie][style];
            }

            // Historique
            ajouterHistorique(
                "vente-auto",
                `${quantiteVendue} ${style} (${categorie}) vendus automatiquement`,
                Math.floor(totalNet)
            );
        }
    }

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
