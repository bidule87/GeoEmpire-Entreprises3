import { getData, saveData, removeBien } from "../geoData.js";

export function runMarketingCycle() {
    const data = getData();
    const entreprise = data.entreprise;

    if (!entreprise) return;

    const maintenant = Date.now();

    // Initialisation si manquant
    if (!entreprise.dernierCycleMarketing) entreprise.dernierCycleMarketing = 0;
    if (!entreprise.ventesEnAttente) entreprise.ventesEnAttente = [];
    if (!entreprise.locationsEnAttente) entreprise.locationsEnAttente = [];
    if (!entreprise.historique) entreprise.historique = [];

    // 24h = 86 400 000 ms
    const cycle24h = 86400000;

    // Pas encore 24h → on ne fait rien
    if (maintenant - entreprise.dernierCycleMarketing < cycle24h) return;

    // Mise à jour du timestamp
    entreprise.dernierCycleMarketing = maintenant;

    // ============================
    // TRAITEMENT DES VENTES
    // ============================
    entreprise.ventesEnAttente.forEach(v => {
        const prixBase = v.prixAchatMoyen;
        const prixFinal = Math.floor(prixBase * (1 + v.ajustement / 100));

        const commissionTaux = entreprise.prestigePack ? 0 : 0.02;
        const montantBrut = prixFinal * v.quantite;
        const montantNet = Math.floor(montantBrut * (1 - commissionTaux));

        entreprise.argent += montantNet;

        removeBien(v.categorie, v.style, v.quantite);

        entreprise.historique.push({
            date: maintenant,
            role: "PDG",
            action: "vente",
            categorie: v.categorie,
            style: v.style,
            quantite: v.quantite,
            ajustement: v.ajustement,
            montant: montantNet
        });
    });

    // On vide la liste
    entreprise.ventesEnAttente = [];

    // ============================
    // TRAITEMENT DES LOCATIONS
    // ============================
    entreprise.locationsEnAttente.forEach(l => {
        const prixBase = l.prixAchatMoyen || 1000; // fallback si pas encore défini
        const prixFinal = Math.floor(prixBase * (1 + l.ajustement / 100));

        const montant = prixFinal * l.quantite;

        entreprise.argent += montant;

        entreprise.historique.push({
            date: maintenant,
            role: "PDG",
            action: "location",
            categorie: l.categorie,
            style: l.style,
            quantite: l.quantite,
            ajustement: l.ajustement,
            montant: montant
        });
    });

    entreprise.locationsEnAttente = [];

    saveData();
}

window.runMarketingCycle = runMarketingCycle;
