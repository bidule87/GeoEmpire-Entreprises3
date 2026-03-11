// ==========================
// ETAT DU JOUEUR
// ==========================

const state = {
  gTokens: 0,
  crowns: 0,
  gpsRadius: 5,
  prestigeOwned: false
};

// ==========================
// LISTE DES PACKS
// ==========================

const packs = [

{
id:"prestige",
name:"Pack Prestige",
subtitle:"Le pack ultime",
price:"9.99 €",
oneTime:true,

lines:[
"Rayon GPS étendu à 20 km",
"Achats illimités de biens",
"Assurance spéciale",
"Priorité absolue à minuit",
"Actions de masse",
"Export Excel / Sheets",
"Bonus de vente",
"Bonus de location",
"+10 000 G-Tokens",
"+10 Crowns",
"+9 cadenas"
]

},

{
id:"autoManagers",
name:"Pack Auto-Managers",
subtitle:"Prime & Marketing",
price:"9.99 €",

lines:[
"Prime automatique pour les managers",
"Boost marketing des entreprises"
]

},

{
id:"gps5",
name:"Pack GPS 5 km",
subtitle:"Extension Zone",
price:"2.99 €",

lines:["Augmente le rayon GPS à 5 km"]
},

{
id:"gps10",
name:"Pack GPS 10 km",
subtitle:"Double Zone",
price:"4.99 €",

lines:["Augmente le rayon GPS à 10 km"]
},

{
id:"gps20",
name:"Pack GPS 20 km",
subtitle:"Max Zone",
price:"9.99 €",

lines:["Augmente le rayon GPS à 20 km"]
},

{
id:"gtokens",
name:"Pack G-Tokens",
subtitle:"Valeur & Action",
price:"4.99 €",

lines:["+10 000 G-Tokens"]
},

{
id:"crowns",
name:"Pack Crowns",
subtitle:"Chance Royale",
price:"4.99 €",

lines:["+10 Crowns"]
}

];

// ==========================
// VARIABLES
// ==========================

let packsContainer;
let statusEl;


// ==========================
// CODE PRESTIGE
// ==========================

function validerCodePrestige(){

const input=document.getElementById("prestige-code").value.trim()

const codesValides=[
"GEO-9999",
"PRESTIGE-2025",
"EMPIRE-VIP"
]

if(!codesValides.includes(input)){

showStatus("Code invalide")
return

}

applyPack(packs.find(p=>p.id==="prestige"))

}


// ==========================
// RENDER PACKS
// ==========================

function renderPacks(){

packsContainer.innerHTML=""

packs.forEach(pack=>{

const div=document.createElement("div")
div.className="pack-card"

const linesHtml=pack.lines
.map(l=>"<li>"+l+"</li>")
.join("")

div.innerHTML=`

<h3>${pack.name}</h3>

<div class="subtitle">
${pack.subtitle}
</div>

<div class="pack-price">
${pack.price}
</div>

<ul>
${linesHtml}
</ul>

<button class="btn-buy">
Acheter
</button>

`

const button=div.querySelector(".btn-buy")

if(pack.oneTime && state.prestigeOwned){

button.disabled=true
button.textContent="Déjà acheté"

}

button.addEventListener("click",()=>{

applyPack(pack)

})

packsContainer.appendChild(div)

})

}


// ==========================
// APPLICATION DES PACKS
// ==========================

function applyPack(pack){

switch(pack.id){

case "prestige":

if(state.prestigeOwned){

showStatus("Pack déjà possédé")
return

}

state.gpsRadius=20
state.gTokens+=10000
state.crowns+=10
state.prestigeOwned=true

break


case "autoManagers":

showStatus("Prime automatique & marketing activés !")
break


case "gps5":

state.gpsRadius=Math.max(state.gpsRadius,5)
break


case "gps10":

state.gpsRadius=Math.max(state.gpsRadius,10)
break


case "gps20":

state.gpsRadius=Math.max(state.gpsRadius,20)
break


case "gtokens":

state.gTokens+=10000
break


case "crowns":

state.crowns+=10
break

}

renderState()

showStatus(pack.name+" activé !")

renderPacks()

}


// ==========================
// RENDER STATE
// ==========================

function renderState(){

document.getElementById("gtokens").textContent=state.gTokens

document.getElementById("crowns").textContent=state.crowns

document.getElementById("gps-radius").textContent=state.gpsRadius

}


// ==========================
// MESSAGE TEMPORAIRE
// ==========================

function showStatus(msg){

statusEl.textContent=msg

setTimeout(()=>{

statusEl.textContent=""

},3000)

}


// ==========================
// INIT
// ==========================

document.addEventListener("DOMContentLoaded",()=>{

packsContainer=document.getElementById("packs")

statusEl=document.getElementById("status")

renderState()

renderPacks()

})
