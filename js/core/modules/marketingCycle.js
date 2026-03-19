import { getData, saveData, removeBien } from "../geoData.js";

export function runMarketingCycle() {
    const data = getData();
    const entreprise = data.entreprise;

    if (!entreprise) return;

    // ===============================
    //  HEURE LOCALE PARIS
    // ===============================
    const maintenantParis = new Date(
        new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
    );

    const last = entreprise.dernierCycleMarketing
        ? new Date(entreprise.dernierCycleMarketing)
        : null;

    // Si aucun cycle → on initialise et on attend demain
    if (!last) {
        entreprise.dernierCycleMarketing = maintenantParis.toISOString();
        saveData();
        return;
    }

    // Comparaison des dates (AAAA-MM-JJ)
    const jourActuel = maintenantParis.toISOString().split("T")[0];
    const jourDernier = last.toISOString().split("T")[0];

    // Si même jour → cycle déjà fait → on ne fait rien
    if (jourActuel === jourDernier) return;

    // ===============================
    //  NOUVEAU JOUR → CYCLE
    // ===============================
    entreprise.dernierCycleMarketing = maintenantParis.toISOString();

    if (!entreprise.ventesEnAttente) entreprise.ventesEnAttente = [];
    if (!entreprise.locationsEnAttente) entreprise.locationsEnAttente = [];
    if (!entreprise.historique) entreprise.historique = [];

    // ===============================
    //  TRAITEMENT DES VENTES
    // ===============================
    entreprise.ventesEnAttente.forEach(v => {
        const prixFinal = Math.floor(v.prixAchatMoyen * (1 + v.ajustement / 100));
        const montant = prixFinal * v.quantite;

        entreprise.argent += montant;

        removeBien(v.categorie, v.style, v.quantite);

        entreprise.historique.push({
            date: maintenantParis.toISOString(),
            role: "PDG",
            action: "vente",
            categorie: v.categorie,
            style: v.style,
            quantite: v.quantite,
            ajustement: v.ajustement,
            montant
        });
    });

    entreprise.ventesEnAttente = [];

    // ===============================
    //  TRAITEMENT DES LOCATIONS
    // ===============================
    entreprise.locationsEnAttente.forEach(l => {
        const prixFinal = Math.floor(l.prixAchatMoyen * (1 + l.ajustement / 100));
        const montant = prixFinal * l.quantite;

        entreprise.argent += montant;

        entreprise.historique.push({
            date: maintenantParis.toISOString(),
            role: "PDG",
            action: "location",
            categorie: l.categorie,
            style: l.style,
            quantite: l.quantite,
            ajustement: l.ajustement,
            montant
        });
    });

    entreprise.locationsEnAttente = [];

    saveData();
}

window.runMarketingCycle = runMarketingCycle;
