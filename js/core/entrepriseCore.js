// ============================================
// ENTREPRISE CORE — GOUVERNANCE, HIÉRARCHIE, PRIMES & HOLDING
// ============================================

import { getData, saveData, ajouterHistorique } from "./geoData.js";

export const SEUIL_HOLDING = 10;
export const PECULE_DEPART_ASSOCIE = 15000;

export function getEntreprise() {
    const e = getData().entreprise;
    if (!e.pdg) e.pdg = "Fondateur";
    if (!e.utilisateurActif) e.utilisateurActif = e.pdg;
    if (typeof e.primePdgTotal !== "number") e.primePdgTotal = 0;
    if (!Array.isArray(e.commercesGPS)) e.commercesGPS = [];
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
    return e;
}

export function sauvegarderEntreprise() {
    saveData();
}

export function estPdgGeneral() {
    const e = getEntreprise();
    return (e.utilisateurActif || e.pdg) === e.pdg;
}

export function basculerUtilisateurActif(nomUtilisateur) {
    const e = getEntreprise();
    e.utilisateurActif = nomUtilisateur || e.pdg;
    saveData();
}

export function changerNomEntreprise(nouveauNom) {
    const e = getEntreprise();
    e.nom = nouveauNom.trim() || "Mon Empire";
    ajouterHistorique(`Groupe renommé en "${e.nom}"`, "gestion");
}

export function changerNomJoueur(nouveauNom) {
    const e = getEntreprise();
    const ancienPdg = e.pdg;
    e.pdg = nouveauNom.trim() || "Fondateur";
    if (e.utilisateurActif === ancienPdg) {
        e.utilisateurActif = e.pdg;
    }
    ajouterHistorique(`Fondateur (PDG) renommé en "${e.pdg}"`, "gestion");
}

export function changerPhotoEntreprise(base64) {
    const e = getEntreprise();
    e.logo = base64;
    ajouterHistorique("Logo du groupe / Holding mis à jour", "gestion");
}

// ============================================
// CALCUL DES VALEURS & SUGGESTIONS DE PRIME (10 %)
// ============================================
export function calculerValeurSiege(siege) {
    if (!siege) return 0;
    let total = Number(siege.prixAchat || 0);
    if (siege.biens) {
        Object.values(siege.biens).forEach(styles => {
            Object.values(styles).forEach(b => {
                total += (b.quantite || 0) * (b.prixAchatMoyen || 0);
            });
        });
    }
    return Math.floor(total);
}

export function calculerValeurEntreprise() {
    const e = getEntreprise();
    let total = 0;
    (e.commercesGPS || []).forEach(s => {
        total += calculerValeurSiege(s);
    });
    return Math.floor(total);
}

export function verserPrimePdg(montant) {
    const e = getEntreprise();
    const valeur = Math.floor(Number(montant) || 0);

    if (valeur <= 0) return { ok: false, message: "Veuillez saisir un montant de prime supérieur à 0 Ø." };
    if ((e.argent || 0) < valeur) {
        return { ok: false, message: `Trésorerie insuffisante (${(e.argent || 0).toLocaleString("fr-FR")} Ø disponibles).` };
    }

    e.argent -= valeur;
    e.primePdgTotal = (e.primePdgTotal || 0) + valeur;
    ajouterHistorique(`Prime versée au Fondateur ${e.pdg} (-${valeur.toLocaleString("fr-FR")} Ø)`, "depense", e.pdg);
    saveData();
    return { ok: true };
}

// ============================================
// SIÈGES GPS & HIÉRARCHIE (FONDATEUR / DG / COMMERCIAL)
// ============================================
export function getSiegesGPS() {
    return getEntreprise().commercesGPS || [];
}

export function majSiegeGPS(id, modifications) {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege) return;
    Object.assign(siege, modifications);
    saveData();
}

export function changerPhotoSiegeGPS(id, base64) {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege) return;
    siege.logo = base64;
    ajouterHistorique(`[${siege.nom}] Photo de l'entreprise mise à jour`, "gestion");
}

export function ajouterMembreSiege(id, nomMembre, role = "commercial", droits = "complet") {
    const clean = nomMembre.trim();
    if (!clean) return false;
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege) return false;

    if (!Array.isArray(siege.associes)) siege.associes = [];
    if (siege.associes.some(a => a.nom.toLowerCase() === clean.toLowerCase())) {
        alert("Ce membre fait déjà partie de cette entreprise.");
        return false;
    }

    siege.associes.push({
        nom: clean,
        role,
        droits,
        primeTotal: 0,
        dernierePrime: 0,
        dateAjout: new Date().toLocaleDateString("fr-FR")
    });

    const libelleRole = role === "dg" ? "Directeur Général (Associé)" : "Directeur Commercial (Joueur)";
    ajouterHistorique(`[${siege.nom}] Recrutement de ${clean} en tant que ${libelleRole}`, "gestion");
    return true;
}

export function majMembreSiege(id, nomMembre, champs) {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege || !Array.isArray(siege.associes)) return;

    const membre = siege.associes.find(a => a.nom === nomMembre);
    if (!membre) return;
    Object.assign(membre, champs);
    ajouterHistorique(`[${siege.nom}] Permissions de ${nomMembre} modifiées (${membre.droits})`, "gestion");
}

export function verserPrimeMembreSiege(id, nomMembre, montant) {
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege || !Array.isArray(siege.associes)) return { ok: false, message: "Entreprise introuvable." };

    const membre = siege.associes.find(a => a.nom === nomMembre);
    if (!membre) return { ok: false, message: "Collaborateur introuvable." };

    const valeur = Math.floor(Number(montant) || 0);

    if (valeur <= 0) return { ok: false, message: "Veuillez saisir un montant de prime supérieur à 0 Ø." };
    if ((e.argent || 0) < valeur) {
        return { ok: false, message: `Trésorerie insuffisante (${(e.argent || 0).toLocaleString("fr-FR")} Ø disponibles).` };
    }

    e.argent -= valeur;
    membre.primeTotal = (membre.primeTotal || 0) + valeur;
    membre.dernierePrime = valeur;

    ajouterHistorique(`[${siege.nom}] Prime versée à ${membre.nom} (-${valeur.toLocaleString("fr-FR")} Ø)`, "depense", e.utilisateurActif || e.pdg);
    saveData();
    return { ok: true };
}

export function virerMembreSiege(id, nomMembre) {
    if (!estPdgGeneral()) {
        return { ok: false, message: "Seul le Fondateur (PDG Général) peut licencier un membre." };
    }
    const e = getEntreprise();
    const siege = e.commercesGPS.find(s => String(s.id) === String(id));
    if (!siege || !Array.isArray(siege.associes)) return { ok: false, message: "Entreprise introuvable." };

    if ((e.argent || 0) < PECULE_DEPART_ASSOCIE) {
        return { ok: false, message: `Fonds insuffisants pour l'indemnité de départ (${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø).` };
    }

    e.argent -= PECULE_DEPART_ASSOCIE;
    siege.associes = siege.associes.filter(a => a.nom !== nomMembre);
    if (e.utilisateurActif === nomMembre) e.utilisateurActif = e.pdg;

    ajouterHistorique(`[${siege.nom}] Départ de ${nomMembre} (-${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø)`, "depense");
    return { ok: true };
}

// ============================================
// HOLDING (10 ENTREPRISES)
// ============================================
export function creerHolding(nomHolding) {
    const e = getEntreprise();
    if (e.commercesGPS.length < SEUIL_HOLDING) {
        alert(`Il faut au moins ${SEUIL_HOLDING} entreprises pour fonder une Holding.`);
        return false;
    }
    e.holding = {
        active: true,
        nom: (nomHolding || `${e.nom} Holding`).trim(),
        dateCreation: new Date().toLocaleDateString("fr-FR"),
        bonusRevenus: 0.20,
        filialesIds: e.commercesGPS.map(s => s.id),
        associes: e.holding?.associes || []
    };
    ajouterHistorique(`Fondation de la Holding "${e.holding.nom}" (+20 % de revenus)`, "prestige");
    return true;
}

export function synchroniserFilialesHolding() {
    const e = getEntreprise();
    if (!e.holding?.active) return;
    e.holding.filialesIds = e.commercesGPS.map(s => s.id);
    ajouterHistorique(`Filiales de "${e.holding.nom}" synchronisées (${e.holding.filialesIds.length})`, "prestige");
}

export function ajouterAssocieHolding(nomMembre, droits = "complet") {
    const clean = nomMembre.trim();
    if (!clean) return false;
    const e = getEntreprise();
    if (!e.holding?.active) return false;

    if (!Array.isArray(e.holding.associes)) e.holding.associes = [];
    if (e.holding.associes.some(a => a.nom.toLowerCase() === clean.toLowerCase())) return false;

    e.holding.associes.push({
        nom: clean,
        role: "dg",
        droits,
        primeTotal: 0,
        dernierePrime: 0,
        dateAjout: new Date().toLocaleDateString("fr-FR")
    });
    ajouterHistorique(`[Holding ${e.holding.nom}] Nomination de ${clean} (Directeur Général Associé)`, "prestige");
    return true;
}

export function changerDroitsAssocieHolding(nomMembre, nouveauxDroits) {
    const e = getEntreprise();
    const a = (e.holding?.associes || []).find(x => x.nom === nomMembre);
    if (!a) return;
    a.droits = nouveauxDroits;
    ajouterHistorique(`[Holding ${e.holding.nom}] Droits de ${nomMembre} mis à jour`, "prestige");
}

export function verserPrimeAssocieHolding(nomMembre, montant) {
    const e = getEntreprise();
    const a = (e.holding?.associes || []).find(x => x.nom === nomMembre);
    if (!a) return { ok: false, message: "Directeur Général introuvable." };

    const valeur = Math.floor(Number(montant) || 0);

    if (valeur <= 0) return { ok: false, message: "Veuillez saisir un montant de prime supérieur à 0 Ø." };
    if ((e.argent || 0) < valeur) {
        return { ok: false, message: `Trésorerie insuffisante (${(e.argent || 0).toLocaleString("fr-FR")} Ø disponibles).` };
    }

    e.argent -= valeur;
    a.primeTotal = (a.primeTotal || 0) + valeur;
    a.dernierePrime = valeur;

    ajouterHistorique(`[Holding ${e.holding.nom}] Prime versée à ${a.nom} (-${valeur.toLocaleString("fr-FR")} Ø)`, "depense", e.utilisateurActif || e.pdg);
    saveData();
    return { ok: true };
}

export function virerAssocieHolding(nomMembre) {
    if (!estPdgGeneral()) return { ok: false, message: "Réservé au Fondateur." };
    const e = getEntreprise();
    if ((e.argent || 0) < PECULE_DEPART_ASSOCIE) {
        return { ok: false, message: `Fonds insuffisants (${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø).` };
    }
    e.argent -= PECULE_DEPART_ASSOCIE;
    e.holding.associes = (e.holding.associes || []).filter(a => a.nom !== nomMembre);
    if (e.utilisateurActif === nomMembre) e.utilisateurActif = e.pdg;
    ajouterHistorique(`[Holding] Départ de ${nomMembre} (-${PECULE_DEPART_ASSOCIE.toLocaleString("fr-FR")} Ø)`, "depense");
    return { ok: true };
}
