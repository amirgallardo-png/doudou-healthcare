/* Écran Profil (+ carte de secours). */
import { CAT } from "../demo/fixture.js";
import { SCREENS } from "../screens/registry.js";
import { catSVG, qrSVG } from "../ui/illustrations.js";
import { esc, ico } from "../utils/core.js";

SCREENS.profil = () => {
  const main = `<div class="grid-2"><div class="col">
  <section class="idcard" aria-label="Carte d'identité"><div class="id-top"><div class="id-photo">${catSVG("content")}</div><div style="min-width:0"><span class="label muted">Carte d'identité</span><h2>Doudou</h2><p class="muted">${CAT.breed} · ${CAT.sex.toLowerCase()}</p></div></div>
    <dl class="dl"><dt>Né le</dt><dd>${CAT.birth} (${CAT.age})</dd><dt>Poids</dt><dd class="data">4,60 kg</dd><dt>Robe</dt><dd>${CAT.color}</dd><dt>Puce</dt><dd><span class="data">${CAT.chip}</span> <span class="small muted">(${CAT.chipNote})</span></dd><dt>Vétérinaire</dt><dd>${CAT.vet.name}, ${CAT.vet.clinic}</dd></dl></section>
  <section class="card" style="border:2px solid var(--roux-ink);box-shadow:none"><div class="card-h"><h2 style="display:flex;gap:8px;align-items:center;color:var(--roux-ink)">${ico("alert")}Allergies</h2></div>
    ${CAT.allergies.map(a => `<p><b>${a.name}</b> : ${a.detail}.</p><p class="small muted">${a.since}</p>`).join("")}<p class="small" style="margin-top:8px">${CAT.noDrugAllergy}.</p></section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Carte de secours</h2>${ico("qr")}</div><div class="qr-wrap"><div class="qr">${qrSVG()}</div><div style="flex:1;min-width:180px"><p>À montrer à un vétérinaire ou au pet-sitter. Le code contient l'essentiel sans connexion : identité, allergie, traitement, vétérinaire.</p><button class="btn sm secondary" data-act="bigQR" style="margin-top:12px">${ico("qr", "sm")}Afficher en grand</button></div></div></section>
  <section class="card"><div class="card-h"><h2>Contacts d'urgence</h2></div><div class="list">
    ${[{ name: CAT.vet.name + " · " + CAT.vet.clinic, role: "Vétérinaire référent · " + CAT.vet.addr, phone: CAT.vet.phone, i: "stetho" }, { name: CAT.emergency.name, role: "Urgences nuit et week-end", phone: CAT.emergency.phone, i: "cross" }, ...CAT.contacts.map(c => ({ ...c, i: "user" }))].map(c => `<div class="row"><span class="r-ico">${ico(c.i)}</span><span class="r-main"><span class="r-title">${c.name}</span><br><span class="r-sub">${c.role}</span><br><span class="data" style="user-select:all">${c.phone}</span></span><button class="icon-btn" data-act="copy" data-v="${c.phone}" aria-label="Copier le numéro de ${c.name}">${ico("copy")}</button></div>`).join("")}
  </div><p class="fine" style="margin-top:8px">${ico("info", "sm")}Numéros fictifs pour le prototype.</p></section>
  </div></div>`;
  return { main, aside: `<p class="small muted">Ce que contient le QR code :</p><pre class="json" style="white-space:pre-wrap">${esc("CARTE DE SECOURS — DOUDOU\nChat européen, mâle stérilisé, 6 ans, 4,6 kg\nPuce : 250 26 0000 0048 21 (fictif)\nSensibilité : poulet (démangeaisons)\nTraitement : pipette antiparasitaire mensuelle\nVét : Dr Martin, Clinique des Quatre Pattes\nTél : +32 2 000 12 34 (fictif)")}</pre>`, asideTitle: "Carte de secours" };
};
