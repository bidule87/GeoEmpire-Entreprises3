// ===============================
//   PRESTIGE & LOTERIE CROWNS – GEO EMPIRE
// ===============================

import { getData, saveData } from "../geoData.js";

const LOTS_LOTERIE = [
    { label: "👑 Jackpot : +25 Crowns (CRW)", type: "crowns", valeur: 25, poids: 5 },
    { label: "👑 +10 Crowns (CRW)", type: "crowns", valeur: 10, poids: 15 },
    { label: "👑 +5 Crowns (CRW)", type: "crowns", valeur: 5, poids: 30 },
    { label: "🎟️ +4 Tokens (GT)", type: "tokens", valeur: 4, poids: 25 },
    { label: "💰 Prime Trésorerie : +35 000 Ø", type: "argent", valeur: 35000, poids: 25 }
];

function tirageAleatoire() {
    const totalPoids = LOTS_LOTERIE.reduce((acc, l) => acc + l.poids, 0);
    let r = Math.random() * totalPoids;
    for (const lot of LOTS_LOTERIE) {
        if (r < lot.poids) return lot;
        r -= lot.poids;
    }
    return LOTS_LOTERIE[2];
}

function aTirageGratuitAujourdHui() {
    const aujourdHui = new Date().toLocaleDateString("fr-FR");
    return localStorage.getItem("geoLoterieDernierGratuit") !== aujourdHui;
}

function majTopbar() {
    const e = getData().entreprise;
    const solde = document.getElementById("solde");
    const tokens = document.getElementById("tokens");
    const crowns = document.getElementById("crowns");
    if (solde) solde.textContent = (e.argent || 0).toLocaleString("fr-FR");
    if (tokens) tokens.textContent = (e.tokens || 0).toLocaleString("fr-FR");
    if (crowns) crowns.textContent = (e.crowns || 0).toLocaleString("fr-FR");
}

function renderPrestige() {
    const container = document.getElementById("prestige-container");
    if (!container) return;

    majTopbar();
    const e = getData().entreprise;
    const gratuitDispo = aTirageGratuitAujourdHui();

    container.innerHTML = `
        <div class="premium-panel" style="max-width:950px; margin:20px auto;">
            <h2 class="premium-title">🎰 Loterie Royale & Prestige</h2>
            <p style="font-size:14px; color:#bae6fd;">
                Tentez votre chance pour gagner des <strong>Crowns (CRW)</strong>, la monnaie rare des améliorations d'empire.
            </p>

            <div class="premium-box" style="text-align:center; padding:24px; border:2px solid #fbbf24; margin-bottom:20px;">
                <div style="font-size:18px; margin-bottom:12px;">
                    Votre solde Prestige : <strong style="color:#fbbf24; font-size:22px;">👑 ${e.crowns || 0} Crowns (CRW)</strong>
                </div>

                <div id="resultat-loterie" style="min-height:42px; margin:14px auto; max-width:460px; padding:10px; border-radius:10px; background:rgba(0,15,35,0.75); border:1px solid rgba(56,189,248,0.35); font-weight:bold; color:#fde68a;">
                    Prêt pour le tirage !
                </div>

                <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:14px;">
                    <button id="btn-tirage-gratuit" class="premium-btn" style="margin:0; background:${gratuitDispo ? "#059669" : "#475569"};" ${gratuitDispo ? "" : "disabled"}>
                        ${gratuitDispo ? "🎁 Tirage Gratuit du Jour" : "✓ Tirage gratuit utilisé"}
                    </button>
                    <button id="btn-tirage-tokens" class="premium-btn" style="margin:0; background:linear-gradient(90deg, #d97706, #fbbf24); color:#0f172a;">
                        🎟️ Lancer un tirage (2 Tokens GT)
                    </button>
                </div>
            </div>

            <div class="premium-box">
                <h3 style="color:#fbbf24; margin-top:0;">👑 Boutique des Crowns (CRW)</h3>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); gap:14px;">
                    <div class="gestion-item">
                        <strong>Subvention Royale (+150 000 Ø)</strong>
                        <p style="font-size:13px; color:#cbd5e1;">Injection immédiate dans la trésorerie de votre groupe.</p>
                        <button class="btn-echange-crown premium-btn" data-type="cash" style="margin:0; background:#7e22ce;">Échanger 15 Crowns</button>
                    </div>
                    <div class="gestion-item">
                        <strong>Pack Accélération (+15 Tokens GT)</strong>
                        <p style="font-size:13px; color:#cbd5e1;">Convertissez vos Crowns en Tokens opérationnels.</p>
                        <button class="btn-echange-crown premium-btn" data-type="tokens" style="margin:0; background:#7e22ce;">Échanger 10 Crowns</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    function executerTirage(gratuit) {
        const ent = getData().entreprise;
        if (gratuit) {
            localStorage.setItem("geoLoterieDernierGratuit", new Date().toLocaleDateString("fr-FR"));
        } else {
            if ((ent.tokens || 0) < 2) return alert("Il vous faut 2 Tokens (GT) pour lancer un tirage.");
            ent.tokens -= 2;
        }

        const lot = tirageAleatoire();
        if (lot.type === "crowns") ent.crowns = (ent.crowns || 0) + lot.valeur;
        if (lot.type === "tokens") ent.tokens = (ent.tokens || 0) + lot.valeur;
        if (lot.type === "argent") ent.argent = (ent.argent || 0) + lot.valeur;

        saveData();
        renderPrestige();
        document.getElementById("resultat-loterie").innerHTML = `🎉 Résultat : <span style="color:#34d399;">${lot.label}</span>`;
    }

    const btnGratuit = document.getElementById("btn-tirage-gratuit");
    if (btnGratuit) btnGratuit.onclick = () => executerTirage(true);

    document.getElementById("btn-tirage-tokens").onclick = () => executerTirage(false);

    document.querySelectorAll(".btn-echange-crown").forEach(btn => {
        btn.onclick = () => {
            const ent = getData().entreprise;
            if (btn.dataset.type === "cash") {
                if ((ent.crowns || 0) < 15) return alert("15 Crowns (CRW) requis.");
                ent.crowns -= 15;
                ent.argent = (ent.argent || 0) + 150000;
            } else if (btn.dataset.type === "tokens") {
                if ((ent.crowns || 0) < 10) return alert("10 Crowns (CRW) requis.");
                ent.crowns -= 10;
                ent.tokens = (ent.tokens || 0) + 15;
            }
            saveData();
            renderPrestige();
        };
    });
}

document.addEventListener("DOMContentLoaded", renderPrestige);
