/* Écran Réglages et données. */
import { DEVICES } from "../demo/fixture.js";
import { SCREENS } from "../screens/registry.js";
import { lvl } from "../screens/today.js";
import { S } from "../state.js";
import { syncLabel } from "../ui/shell.js";
import { ico } from "../utils/core.js";

SCREENS.reglages = () => {
  const s = syncLabel();
  const radio = (act, v, cur, title, sub) => `<button class="radio" role="radio" data-act="${act}" data-v="${v}" aria-checked="${cur === v}"><span class="rd"></span><span class="r-main"><b>${title}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ""}</span></button>`;
  const tog = (act, on, title, sub) => `<button class="set-row" role="switch" data-act="${act}" aria-checked="${!!on}"><span class="r-main"><b>${title}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ""}</span><span class="toggle" aria-checked="${!!on}"></span></button>`;
  const main = `<div class="grid-2"><div class="col">
  <section class="card"><div class="card-h"><h2>Synchronisation</h2><span class="sync" data-state="${S.sync}" style="border:0"><span class="dot"></span>${s.s}</span></div>
    <p>${s.l}. Tes données sont sur ce téléphone et sur ton PC.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm primary" data-act="syncNow" ${S.sync === "offline" ? "disabled" : ""}>${ico("refresh", "sm")}Synchroniser maintenant</button></div>
    <p class="label muted" style="margin:20px 0 8px">Simuler l'état (démo)</p>
    <div class="radio-list" role="radiogroup" aria-label="État de synchronisation">${radio("setSync", "ok", S.sync, "À jour", "Tout est envoyé")}${radio("setSync", "pending", S.sync, "En attente", "Une saisie part dès que possible")}${radio("setSync", "offline", S.sync, "Hors ligne", "Les saisies sont gardées sur l'appareil")}</div></section>
  <section class="card"><div class="card-h"><h2>Appareils connectés</h2></div><div class="list">${DEVICES.map(d => `<div class="row"><span class="r-ico ${d.state === "off" ? "miel" : ""}">${ico(d.i)}</span><span class="r-main"><span class="r-title">${d.name}</span><br><span class="r-sub">${d.detail} · ${d.state === "off" ? "déconnectée depuis hier" : "connecté"}</span></span>${d.state === "off" ? `<button class="btn sm ghost" data-act="reconnect">Reconnecter</button>` : `<span class="batt">${ico("tag", "sm")}${d.batt} %</span>`}</div>`).join("")}</div></section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Sauvegardes</h2>${lvl("ok", "Actives")}</div><div class="list">${tog("noop", true, "Sauvegarde automatique chaque nuit", "Dernière : aujourd'hui à 3 h 00")}
    <div class="set-row"><span class="r-ico" style="width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--surface-tint);color:var(--soin)">${ico("shield")}</span><span class="r-main"><b>3 sauvegardes gardées</b><br><span class="small muted">4, 3 et 2 octobre</span></span></div></div>
    <button class="btn secondary block" data-act="export" style="margin-top:12px">${ico("download", "sm")}Exporter toutes les données</button></section>
  <section class="card"><div class="card-h"><h2>Apparence</h2></div><div class="radio-list" role="radiogroup" aria-label="Thème">${radio("theme", "system", S.theme, "Comme l'appareil", "Clair le jour, sombre le soir si ton téléphone le fait")}${radio("theme", "light", S.theme, "Clair")}${radio("theme", "dark", S.theme, "Sombre", "Pour vérifier Doudou la nuit sans t'éblouir")}</div>
    <div class="list" style="margin-top:8px">${tog("calm", S.calm, "Réduire les animations", "Respecte déjà le réglage de ton appareil")}</div></section>
  <section class="card"><div class="card-h"><h2>Démo du prototype</h2></div><div class="list">${tog("demoEmpty", S.empty, "Voir les états vides", "Comme au premier lancement")}${tog("demoError", S.demoError, "Simuler une erreur de Dr. Doudou")}
    <button class="set-row" data-act="replaySk"><span class="r-main"><b>Rejouer les chargements</b><br><span class="small muted">Affiche les squelettes à la prochaine visite</span></span>${ico("chev-r")}</button></div>
    <p class="fine" style="margin-top:8px">${ico("info", "sm")}Doudou Healthcare V2 · prototype · données fictives.</p></section>
  </div></div>`;
  return { main, aside: `<div class="explain"><h4>${ico("shield", "sm")}Tes données</h4><p class="small">Le journal, le dossier et les photos de Doudou restent à toi. L'export contient tout, dans un format lisible par un développeur (JSON).</p></div>`, asideTitle: "Données" };
};
