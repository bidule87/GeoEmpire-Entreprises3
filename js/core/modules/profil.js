import { getData } from "../geoData.js";

export function initProfil() {
    const zone = document.getElementById("profil-container");
    if (!zone) return;

    const data = getData();
    const joueur = data.joueur;

    zone.innerHTML = `
        <div class="profil-premium">
            <h2>Profil du Joueur</h2>

            <div class="profil-header">
                <img src="${joueur.photo}" class="profil-photo">

                <div class="profil-info">
                    <p><strong>Nom :</strong> ${joueur.nom}</p>
                    <p><strong>Niveau :</strong> ${joueur.niveau}</p>
                    <p><strong>Expérience :</strong> ${joueur.xp.toLocaleString()} XP</p>
                    <span class="badge-premium">Compte Premium</span>
                </div>
            </div>

            <div class="profil-section-title">Statistiques générales</div>
            <table class="profil-table">
                <tr><th>Statistique</th><th>Valeur</th></tr>
                <tr><td>Entreprises possédées</td><td>${joueur.stats.entreprises}</td></tr>
                <tr><td>Biens immobiliers</td><td>${joueur.stats.biens}</td></tr>
                <tr><td>Valeur totale</td><td>${joueur.stats.valeurTotale.toLocaleString()} €</td></tr>
                <tr><td>Revenus mensuels</td><td>${joueur.stats.revenusMensuels.toLocaleString()} €</td></tr>
            </table>

            <div class="profil-section-title">Bonus Premium</div>
            <table class="profil-table">
                <tr><th>Bonus</th><th>Effet</th></tr>
                <tr><td>+10% revenus</td><td>Appliqué automatiquement</td></tr>
                <tr><td>Réduction frais</td><td>-5% sur charges</td></tr>
                <tr><td>Badge exclusif</td><td>Affiché sur le profil</td></tr>
            </table>
        </div>
    `;
}

window.initProfil = initProfil;
