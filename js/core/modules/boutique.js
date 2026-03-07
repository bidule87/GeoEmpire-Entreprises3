// ======================================================
//  GEO EMPIRE — MODULE BOUTIQUE (VERSION FINALE)
//  Compatible Codespaces / GitHub / Modules internes
//  Design : Bleu futuriste (CodePen original conservé)
// ======================================================

// =====================
//  ÉTAT GLOBAL BOUTIQUE
// =====================
export const boutiqueState = {
    gTokens: 0,
    crowns: 0,
    gpsRadius: 5,
    prestigeOwned: false,
    jumpCharges: 0,
    moveCards: 0,
    locksBonus: 0,
    autoManager: false,
    autoMarketing: false,
    autoPrimes: false
};

// =====================
//  SAUVEGARDE
// =====================
function saveBoutique() {
    localStorage.setItem("geoEmpireBoutique", JSON.stringify(boutiqueState));
    renderBoutiqueState();
}

function loadBoutique() {
    const raw = localStorage.getItem("geoEmpireBoutique");
    if (!raw) return;
    try {
        Object.assign(boutiqueState, JSON.parse(raw));
    } catch {}
}

loadBoutique();

// =====================
//  PACKS OFFICIELS
// =====================
const packs = [
    {
        id: "prestige",
        name: "Pack Prestige",
        tag: "Le pack ultime",
        price: "9.99 €",
        oneTime: true,
        effectsText: [
            "Rayon GPS étendu à 20 km",
            "Achats illimités de biens",
            "Assurance spéciale (Holding / Filiales / Banque / Monuments)",
            "Priorité absolue à minuit",
            "Actions de masse (Achat/Vente/Location)",
            "Export Excel / Sheets",
            "Bonus de vente via la molette",
            "Bonus de location via la molette",
            "+10 000 G‑Tokens",
            "+10 Crowns",
            "+9 cadenas sur toutes les entités",
            "Statut PDG / actionnaires"
        ],
        apply() {
            if (boutiqueState.prestigeOwned) return "Pack déjà possédé.";

            boutiqueState.prestigeOwned = true;
            boutiqueState.gpsRadius = 20;
            boutiqueState.gTokens += 10000;
            boutiqueState.crowns += 10;
            boutiqueState.locksBonus += 9;

            saveBoutique();
            return "Pack Prestige activé.";
        }
    },

    // =====================
    //  PACK AUTO‑MANAGER
    // =====================
    {
        id: "automanager",
        name: "Pack Auto‑Manager",
        tag: "Gestion Automatique",
        price: "9.99 €",
        oneTime: true,
        effectsText: [
            "Calcul automatique des primes",
            "Gestion automatique du marketing",
            "Optimisation automatique à minuit",
            "Assistant IA interne"
        ],
        apply() {
            if (boutiqueState.autoManager) return "Pack Auto‑Manager déjà activé.";

            boutiqueState.autoManager = true;
            boutiqueState.autoMarketing = true;
            boutiqueState.autoPrimes = true;

            saveBoutique();
            return "Pack Auto‑Manager activé.";
        }
    },

    // =====================
    //  PACKS GPS
    // =====================
    {
        id: "gps5km",
        name: "Pack GPS 5 km",
        tag: "Extension Zone",
        price: "2.99 €",
        oneTime: true,
        effectsText: ["Augmente le rayon GPS à 5 km"],
        apply() {
            if (boutiqueState.gpsRadius >= 5) return "Rayon déjà étendu.";
            boutiqueState.gpsRadius = 5;
            saveBoutique();
            return "Rayon GPS étendu à 5 km.";
        }
    },
    {
        id: "gps10km",
        name: "Pack GPS 10 km",
        tag: "Double Zone",
        price: "4.99 €",
        oneTime: true,
        effectsText: ["Augmente le rayon GPS à 10 km"],
        apply() {
            if (boutiqueState.gpsRadius >= 10) return "Rayon déjà étendu.";
            boutiqueState.gpsRadius = 10;
            saveBoutique();
            return "Rayon GPS étendu à 10 km.";
        }
    },
    {
        id: "gps20km",
        name: "Pack GPS 20 km",
        tag: "Max Zone",
        price: "9.99 €",
        oneTime: true,
        effectsText: ["Augmente le rayon GPS à 20 km"],
        apply() {
            if (boutiqueState.gpsRadius >= 20) return "Rayon déjà étendu.";
            boutiqueState.gpsRadius = 20;
            saveBoutique();
            return "Rayon GPS étendu à 20 km.";
        }
    },

    // =====================
    //  PACK G‑TOKEN
    // =====================
    {
        id: "gtoken",
        name: "Pack G‑Tokens",
        tag: "Valeur & Action",
        price: "4.99 €",
        oneTime: false,
        effectsText: [
            "+10 000 G‑Tokens",
            "Injection libre (Holding / Filiale / Banque)",
            "Effet actionnaire : boost du patrimoine"
        ],
        apply() {
            boutiqueState.gTokens += 10000;
            saveBoutique();
            return "+10 000 G‑Tokens ajoutés.";
        }
    },

    // =====================
    //  PACK CROWNS
    // =====================
    {
        id: "crowns",
        name: "Pack Crowns",
        tag: "Chance Royale",
        price: "4.99 €",
        oneTime: false,
        effectsText: ["+10 Crowns", "Pour la Loterie Royale (coffres)"],
        apply() {
            boutiqueState.crowns += 10;
            saveBoutique();
            return "+10 Crowns ajoutées.";
        }
    },

    // =====================
    //  PACK JUMP
    // =====================
    {
        id: "jump",
        name: "Pack Jump (10)",
        tag: "Mobilité globale",
        price: "5.99 €",
        oneTime: false,
        effectsText: ["10 téléportations GPS", "Permet de briser la limite des 5 km"],
        apply() {
            boutiqueState.jumpCharges += 10;
            saveBoutique();
            return "+10 téléportations ajoutées.";
        }
    },

    // =====================
    //  PACK DÉMÉNAGEMENT
    // =====================
    {
        id: "move",
        name: "Pack Déménagement",
        tag: "Migration",
        price: "6.99 €",
        oneTime: false,
        effectsText: [
            "10 cartes Déménagement",
            "Changement de ville instantané"
        ],
        apply() {
            boutiqueState.moveCards += 10;
            saveBoutique();
            return "+10 cartes Déménagement ajoutées.";
        }
    }
];

// =====================
//  RENDU DES STATUTS
// =====================
function renderBoutiqueState() {
    document.getElementById("gtokens").textContent = boutiqueState.gTokens;
    document.getElementById("crowns").textContent = boutiqueState.crowns;
    document.getElementById("gps-radius").textContent = boutiqueState.gpsRadius;
}

// =====================
//  RENDU DE LA BOUTIQUE
// =====================
export function afficherBoutique() {
    const container = document.getElementById("packs");
    container.innerHTML = "";

    packs.forEach((pack) => {
        const card = document.createElement("div");
        card.className = "pack-card";

        const title = `<div class="pack-title">${pack.name}</div>`;
        const tag = `<div class="pack-tag">${pack.tag}</div>`;
        const price = `<div class="pack-price">${pack.price}</div>`;
        const effects = `<div class="pack-effects">${pack.effectsText.map(t => "• " + t).join("<br>")}</div>`;

        const owned = (pack.oneTime && boutiqueState[pack.id + "Owned"])
            ? `<div class="badge-owned">Déjà possédé</div>`
            : "";

        const button = `<button class="pack-button" data-pack="${pack.id}" ${owned ? "disabled" : ""}>Acheter</button>`;

        card.innerHTML = title + tag + price + effects + owned + button;
        container.appendChild(card);
    });

    document.querySelectorAll(".pack-button").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-pack");
            const pack = packs.find(p => p.id === id);
            const msg = pack.apply();
            document.getElementById("status").textContent = msg;
            afficherBoutique();
        });
    });

    renderBoutiqueState();
}
