// ===============================
//  GEOEMPIRE 3 - UI PREMIUM
// ===============================

// Petite notification en haut de l'écran
window.ge_notif = function (txt, type = "info") {
    const box = document.createElement("div");
    box.className = "ge-notif " + type;
    box.innerText = txt;

    document.body.appendChild(box);

    setTimeout(() => {
        box.classList.add("show");
    }, 10);

    setTimeout(() => {
        box.classList.remove("show");
        setTimeout(() => box.remove(), 300);
    }, 2500);
};

// Chargement simple
window.ge_loader = {
    show() {
        let l = document.getElementById("ge-loader");
        if (!l) {
            l = document.createElement("div");
            l.id = "ge-loader";
            l.innerHTML = "<div class='spinner'></div>";
            document.body.appendChild(l);
        }
        l.style.display = "flex";
    },

    hide() {
        const l = document.getElementById("ge-loader");
        if (l) l.style.display = "none";
    }
};
