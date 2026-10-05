/* Écran Réglages et données : synchronisation (honnête), sauvegardes réelles, import, tout effacer, apparence. */
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { syncLabel } from "../ui/shell.js";
import { ico, esc, fmtDate } from "../utils/core.js";
import { lvl } from "./today.js";
import { store } from "../utils/store.js";
import { cat } from "../domain/views.js";

const KIND_WORD = { ok: "Importé", "transformé": "Transformé", "ignoré": "Ignoré", attention: "À vérifier" };
const KIND_LVL = { ok: "ok", "transformé": "watch", "ignoré": "watch", attention: "soon" };
export function importReportHTML(res) {
  if (res.kind === "backup") return `<p>Sauvegarde restaurée : ${Object.entries(res.counts).filter(([, n]) => n).map(([t, n]) => `${n} ${esc(t)}`).join(", ")}.</p>`;
  return `<p>Ancienne sauvegarde importée. Le fichier d'origine n'a pas été modifié.</p>
    <div class="list">${res.report.map(r => `<div class="row"><span class="r-main"><span class="r-title">${lvl(KIND_LVL[r.kind] || "watch", KIND_WORD[r.kind] || r.kind)}</span><br><span class="r-sub">${esc(r.text)}</span></span></div>`).join("")}</div>`;
}

SCREENS.reglages = () => {
  const s = syncLabel(), last = store.get("lastExport", null);
  const radio = (act, v, cur, title, sub) => `<button class="radio" role="radio" data-act="${act}" data-v="${v}" aria-checked="${cur === v}"><span class="rd"></span><span class="r-main"><b>${title}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ""}</span></button>`;
  const tog = (act, on, title, sub) => `<button class="set-row" role="switch" data-act="${act}" aria-checked="${!!on}"><span class="r-main"><b>${title}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ""}</span><span class="toggle" aria-checked="${!!on}"></span></button>`;
  const main = `<div class="grid-2"><div class="col">
  <section class="card"><div class="card-h"><h2>Synchronisation</h2><span class="sync" data-state="${S.sync}" style="border:0"><span class="dot"></span>${s.s}</span></div>
    <p>${s.l}. Chaque saisie est écrite immédiatement sur cet appareil.</p>
    <p class="small muted" style="margin-top:8px">La synchronisation entre ton PC et ton téléphone arrive à l'étape suivante. ${S.pending ? `${S.pending} modification${S.pending > 1 ? "s" : ""} attend${S.pending > 1 ? "ent" : ""} déjà d'être envoyée${S.pending > 1 ? "s" : ""}.` : ""}</p></section>
  <section class="card"><div class="card-h"><h2>Appareils connectés</h2></div><div class="list"><div class="row"><span class="r-ico">${ico("phone")}</span><span class="r-main"><span class="r-title">Cet appareil</span><br><span class="r-sub">Les autres appareils apparaîtront ici après la connexion à ton compte.</span></span></div></div></section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Sauvegardes</h2>${last ? lvl("ok", "Export fait") : lvl("watch", "Aucun export")}</div>
    <p class="small">${last ? `Dernier export : ${esc(fmtDate(new Date(last), true))}.` : "Aucun export pour l'instant."} La sauvegarde automatique quotidienne sur ton PC arrive à l'étape 6 ; d'ici là, exporte de temps en temps.</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      <button class="btn secondary block" data-act="export" ${cat() ? "" : "disabled"}>${ico("download", "sm")}Exporter toutes les données</button>
      <button class="btn secondary block" data-act="importFile">${ico("refresh", "sm")}Importer une sauvegarde</button>
      <button class="btn ghost block" data-act="wipeAsk" ${cat() ? "" : "disabled"}>${ico("x", "sm")}Tout effacer sur cet appareil</button></div></section>
  <section class="card"><div class="card-h"><h2>Apparence</h2></div><div class="radio-list" role="radiogroup" aria-label="Thème">${radio("theme", "system", S.theme, "Comme l'appareil", "Clair le jour, sombre le soir si ton téléphone le fait")}${radio("theme", "light", S.theme, "Clair")}${radio("theme", "dark", S.theme, "Sombre", "Pour vérifier ton chat la nuit sans t'éblouir")}</div>
    <div class="list" style="margin-top:8px">${tog("calm", S.calm, "Réduire les animations", "Respecte déjà le réglage de ton appareil")}</div></section>
  <p class="fine">${ico("info", "sm")}Doudou Healthcare · version 0.2 · données enregistrées sur cet appareil.</p>
  </div></div>`;
  return { main, aside: `<div class="explain"><h4>${ico("shield", "sm")}Tes données</h4><p class="small">Le journal, le dossier et les photos restent à toi. L'export contient tout, photos comprises, dans un format lisible (JSON) : garde-le en lieu sûr.</p></div>`, asideTitle: "Données" };
};

export function wipeHTML() {
  return `<p><b>Attention :</b> cela efface définitivement toutes les données de ${esc(cat()?.name || "ton chat")} sur cet appareil (journal, dossier, photos, dépenses).</p>
    <p class="small muted">Conseil : exporte d'abord tes données.</p>
    <button class="btn secondary block" data-act="export">${ico("download", "sm")}Exporter d'abord</button>
    <form data-form="wipe" novalidate style="display:flex;flex-direction:column;gap:12px;margin-top:8px"><div class="field"><label for="wipeWord">Pour confirmer, écris EFFACER</label><input class="input" id="wipeWord" name="word" autocomplete="off"></div>
    <p class="err" data-err hidden></p><button class="btn danger block" type="submit">${ico("x")}Tout effacer</button></form>`;
}
