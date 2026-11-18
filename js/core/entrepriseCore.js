// ======================================================
//  GEO EMPIRE — ENTREPRISE, GOUVERNANCE & HOLDING
//  Rythme : 1 jour réel = 1 mois jeu | 12 jours = 1 an
// ======================================================

import { getData, saveData } from "./geoData.js";

export const SEUIL_HOLDING = 10;
export const PECULE_DEPART_ASSOCIE = 5000;

function logAction(texte, type = "gestion") {
    const data = getData();
    if (!Array.isArray(data.historique)) data.historique = [];
    data.historique.unshift({
        date: new Date().toLocaleString("fr-FR"),
        texte,
        type
    });
}

export function getEntreprise() {
    const data = getData();
    const e = data.entreprise;
    if (!Array.isArray(e.commercesGPS)) e.commercesGPS = [];
    if (!e.pdg) e.pdg = "Fondateur";
    if (!e.utilisateurActif) e.utilisateurActif = e.pdg;

    if (!e.holding) {
        e.holding = {
            active: false,
            nom: "Ma Holding",
            dateCreation: null,
            bonusRevenus: 0.20,
            filialesIds: [],
            associes: []
        };
    }
    if (!Array.isArray(e.holding.associes)) e.holding.associes = [];

    e.commercesGPS.forEach(s => {
        if (!Array.isArray(s.associes)) s.associes = [];
        s.associes = s.associes.map(a =>
            typeof a === "string" ? { nom: a, droits: "complet" } : a
        );
    });

    return e;
}

export function sauvegarderEntreprise() {
    saveData();
}

export function changerNomEntreprise(nom) {
    const e = getEntreprise();
    e.nom = (nom || "").trim() || "Mon Entreprise";
    saveData();
}

export function changerNomJoueur(nouveauNom) {
    const e = getEntreprise();
    const ancienPdg = e.pdg;
    const nomPropre = (nouveauNom || "").trim() || "Fondateur";
    e.pdg = nomPropre;
    if (e.utilisateurActif === ancienPdg) {
        e.utilisateurActif = nomPropre;
    }
    saveData();
}

export function basculerUtilisateurActif(nomUtilisateur) {
    const e = getEntreprise();
    e.utilisateurActif = nomUtilisateur;
    saveData();
}

export function estPdgGeneral() {
    const e = getEntreprise();
    return e.utilisateurActif === e.pdg;
}

export function changerPhotoEntreprise(base64) {
    const e = getEntreprise();
    e.logo = base64;
    saveData();
}

export function getSiegesGPS() {
    return getEntreprise().commercesGPS || [];
}

export function majSiegeGPS(id, updates) {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege) return false;
    Object.assign(siege, updates);
    saveData();
    return true;
}

export function ajouterAssocieSiege(id, nomAssocie, droits = "complet") {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    const nomPropre = (nomAssocie || "").trim();
    if (!siege || !nomPropre) return false;

    const existant = siege.associes.find(a => a.nom.toLowerCase() === nomPropre.toLowerCase());
    if (existant) {
        existant.droits = droits;
    } else {
        siege.associes.push({ nom: nomPropre, droits });
        logAction(`Associé ajouté sur ${siege.nom} : ${nomPropre}`);
    }
    saveData();
    return true;
}

export function changerDroitsAssocieSiege(id, nomAssocie, nouveauxDroits) {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege) return false;

    const assoc = siege.associes.find(a => a.nom === nomAssocie);
    if (!assoc) return false;

    assoc.droits = nouveauxDroits;
    saveData();
    return true;
}

export function virerAssocieSiege(id, nomAssocie) {
    const e = getEntreprise();
    if (!estPdgGeneral()) {
        return { ok: false, message: `Autorisation refusée : seul le PDG général (${e.pdg}) peut virer un associé.` };
    }

    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege) return { ok: false, message: "Entreprise introuvable." };

    if ((e.argent || 0) < PECULE_DEPART_ASSOCIE) {
        return { ok: false, message: `Trésorerie insuffisante pour verser le pécule de départ (${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø).` };
    }

    e.argent -= PECULE_DEPART_ASSOCIE;
    siege.associes = siege.associes.filter(a => a.nom !== nomAssocie);

    if (e.utilisateurActif === nomAssocie) {
        e.utilisateurActif = e.pdg;
    }

    logAction(`${nomAssocie} révoqué de ${siege.nom} par le PDG général (pécule : ${PECULE_DEPART_ASSOCIE} Ø)`);
    saveData();
    return { ok: true };
}

export function creerHolding(nomHolding) {
    const e = getEntreprise();
    if (e.commercesGPS.length < SEUIL_HOLDING) return false;

    e.holding.active = true;
    e.holding.nom = (nomHolding || "").trim() || `${e.nom} Holding`;
    e.holding.dateCreation = new Date().toLocaleDateString("fr-FR");
    e.holding.bonusRevenus = 0.20;
    e.holding.filialesIds = e.commercesGPS.map(s => String(s.id));

    logAction(`Création de la Holding "${e.holding.nom}" (${e.commercesGPS.length} entreprises)`, "prestige");
    saveData();
    return true;
}

export function synchroniserFilialesHolding() {
    const e = getEntreprise();
    if (!e.holding?.active) return;
    e.holding.filialesIds = e.commercesGPS.map(s => String(s.id));
    saveData();
}

export function ajouterAssocieHolding(nomAssocie, droits = "complet") {
    const e = getEntreprise();
    const nomPropre = (nomAssocie || "").trim();
    if (!e.holding?.active || !nomPropre) return false;

    const existant = e.holding.associes.find(a => a.nom.toLowerCase() === nomPropre.toLowerCase());
    if (existant) {
        existant.droits = droits;
    } else {
        e.holding.associes.push({ nom: nomPropre, droits });
        logAction(`Associé ajouté à la Holding "${e.holding.nom}" : ${nomPropre}`);
    }
    saveData();
    return true;
}

export function changerDroitsAssocieHolding(nomAssocie, nouveauxDroits) {
    const e = getEntreprise();
    if (!e.holding?.active) return false;

    const assoc = e.holding.associes.find(a => a.nom === nomAssocie);
    if (!assoc) return false;

    assoc.droits = nouveauxDroits;
    saveData();
    return true;
}

export function virerAssocieHolding(nomAssocie) {
    const e = getEntreprise();
    if (!estPdgGeneral()) {
        return { ok: false, message: `Autorisation refusée : seul le PDG général (${e.pdg}) peut virer un associé de la Holding.` };
    }

    if ((e.argent || 0) < PECULE_DEPART_ASSOCIE) {
        return { ok: false, message: `Trésorerie insuffisante pour verser le pécule de départ (${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø).` };
    }

    e.argent -= PECULE_DEPART_ASSOCIE;
    e.holding.associes = e.holding.associes.filter(a => a.nom !== nomAssocie);

    if (e.utilisateurActif === nomAssocie) {
        e.utilisateurActif = e.pdg;
    }

    logAction(`${nomAssocie} révoqué de la Holding par le PDG général (pécule : ${PECULE_DEPART_ASSOCIE} Ø)`);
    saveData();
    return { ok: true };
}

export function calculerValeurEntreprise() {
    const e = getEntreprise();
    let total = 0;

    if (e.biens) {
        Object.values(e.biens).forEach(styles => {
            Object.values(styles).forEach(bien => {
                total += (bien.prixAchatMoyen || 0) * (bien.quantite || 0);
            });
        });
    }

    (e.commercesGPS || []).forEach(siege => {
        total += siege.prixAchat || 0;
    });

    return total;
}
