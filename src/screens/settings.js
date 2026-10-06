/* Écran Réglages et données : synchronisation (honnête), sauvegardes réelles, import, tout effacer, apparence. */
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { syncLabel } from "../ui/shell.js";
import { ico, esc, fmtDate } from "../utils/core.js";
import { lvl } from "./today.js";
import { store } from "../utils/store.js";
import { cat } from "../domain/views.js";
import { deviceId } from "../sync/supabase.js";
import { loadDevices } from "../sync/controller.js";
import { aiMode, loadAiUsage } from "./drdoudou.js";

const KIND_WORD = { ok: "Importé", "transformé": "Transformé", "ignoré": "Ignoré", attention: "À vérifier" };
const KIND_LVL = { ok: "ok", "transformé": "watch", "ignoré": "watch", attention: "soon" };
export function importReportHTML(res) {
  if (res.kind === "backup") return `<p>Sauvegarde restaurée : ${Object.entries(res.counts).filter(([, n]) => n).map(([t, n]) => `${n} ${esc(t)}`).join(", ")}.</p>`;
  return `<p>Ancienne sauvegarde importée. Le fichier d'origine n'a pas été modifié.</p>
    <div class="list">${res.report.map(r => `<div class="row"><span class="r-main"><span class="r-title">${lvl(KIND_LVL[r.kind] || "watch", KIND_WORD[r.kind] || r.kind)}</span><br><span class="r-sub">${esc(r.text)}</span></span></div>`).join("")}</div>`;
}

const fmtAgo = ts => { const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : `le ${fmtDate(new Date(ts), true)}`; };
function syncCard(s) {
  if (S.auth === "none") return `<section class="card"><div class="card-h"><h2>Synchronisation</h2><span class="sync" data-state="${S.sync}" style="border:0"><span class="dot"></span>${s.s}</span></div>
    <p>${s.l}. La synchronisation n'est pas configurée sur cette version.</p></section>`;
  const devs = S.devices || [], me = deviceId();
  return `<section class="card"><div class="card-h"><h2>Synchronisation</h2><span class="sync" data-state="${S.sync}" style="border:0"><span class="dot"></span>${s.s}</span></div>
    <p>${esc(s.l)}.</p>
    <p class="small muted" style="margin-top:4px">${S.lastSync ? "Dernière synchronisation " + fmtAgo(S.lastSync) + ". " : ""}${S.pending ? `${S.pending} modification${S.pending > 1 ? "s" : ""} en attente d'envoi.` : "Rien en attente."}${S.syncError ? " Détail : " + esc(S.syncError) : ""}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm primary" data-act="syncNow">${ico("refresh", "sm")}Synchroniser maintenant</button></div></section>
  <section class="card"><div class="card-h"><h2>Compte</h2></div><p class="small">Connecté avec <b>${esc(S.userEmail || "")}</b>. Données rangées en Europe (Francfort), visibles par toi seul.</p>
    <button class="btn sm ghost" data-act="logout" style="margin-top:12px">${ico("x", "sm")}Se déconnecter de cet appareil</button></section>
  <section class="card"><div class="card-h"><h2>Appareils connectés</h2></div>${devs.length ? `<div class="list">${devs.map(d => `<div class="row"><span class="r-ico">${ico(/Android|iPhone/.test(d.name) ? "phone" : "grid")}</span><span class="r-main"><span class="r-title">${esc(d.name)}${d.id === me ? " · cet appareil" : ""}</span><br><span class="r-sub">Vu ${fmtAgo(Date.parse(d.last_seen))}</span></span></div>`).join("")}</div>` : `<p class="small muted">${S.devicesError ? "Liste indisponible hors ligne." : "Chargement de la liste…"}</p>`}
    ${devs.length > 1 ? `<button class="btn sm ghost" data-act="logoutOthers" style="margin-top:12px">${ico("shield", "sm")}Déconnecter les autres appareils</button>` : ""}</section>`;
}

SCREENS.reglages = () => {
  loadDevices(); loadAiUsage();
  const s = syncLabel(), last = store.get("lastExport", null);
  const radio = (act, v, cur, title, sub) => `<button class="radio" role="radio" data-act="${act}" data-v="${v}" aria-checked="${cur === v}"><span class="rd"></span><span class="r-main"><b>${title}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ""}</span></button>`;
  const tog = (act, on, title, sub) => `<button class="set-row" role="switch" data-act="${act}" aria-checked="${!!on}"><span class="r-main"><b>${title}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ""}</span><span class="toggle" aria-checked="${!!on}"></span></button>`;
  const main = `<div class="grid-2"><div class="col">
  ${syncCard(s)}
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Sauvegardes</h2>${last ? lvl("ok", "Export fait") : lvl("watch", "Aucun export")}</div>
    <p class="small">${last ? `Dernier export : ${esc(fmtDate(new Date(last), true))}.` : "Aucun export pour l'instant."} Ton PC fait aussi une sauvegarde automatique chaque soir à 21 h 30 (dossier Documents › Sauvegardes Doudou, 30 jours gardés).</p>
    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">
      <button class="btn secondary block" data-act="export" ${cat() ? "" : "disabled"}>${ico("download", "sm")}Exporter toutes les données</button>
      <button class="btn secondary block" data-act="importFile">${ico("refresh", "sm")}Importer une sauvegarde</button>
      <button class="btn ghost block" data-act="wipeAsk" ${cat() ? "" : "disabled"}>${ico("x", "sm")}Tout effacer sur cet appareil</button></div></section>
  <section class="card"><div class="card-h"><h2>Dr. Doudou</h2></div>
    ${S.auth === "signed-in" ? `<div class="radio-list" role="radiogroup" aria-label="Mode de Dr. Doudou">${radio("aiMode", "auto", aiMode(), "Réponse directe", "L'IA répond avec ses sources ; plafond 20 questions par jour et 2 $ par mois")}${radio("aiMode", "prompt", aiMode(), "Prompt à copier (gratuit)", "Dr. Doudou prépare la question pour tes propres IA")}</div>
    <p class="small muted" style="margin-top:8px">${S.aiUsage ? `Ce mois-ci : ${S.aiUsage.requests} question${S.aiUsage.requests > 1 ? "s" : ""}, ≈ ${S.aiUsage.cost.toFixed(2).replace(".", ",")} $ sur 2 $. Au plafond, il passe tout seul en prompt à copier.` : "Dépense du mois : chargement…"}</p>` : `<p class="small muted">Connecte-toi pour activer les réponses directes. En attendant, Dr. Doudou prépare un prompt à copier.</p>`}</section>
  <section class="card"><div class="card-h"><h2>Apparence</h2></div><div class="radio-list" role="radiogroup" aria-label="Thème">${radio("theme", "system", S.theme, "Comme l'appareil", "Clair le jour, sombre le soir si ton téléphone le fait")}${radio("theme", "light", S.theme, "Clair")}${radio("theme", "dark", S.theme, "Sombre", "Pour vérifier ton chat la nuit sans t'éblouir")}</div>
    <div class="list" style="margin-top:8px">${tog("calm", S.calm, "Réduire les animations", "Respecte déjà le réglage de ton appareil")}</div></section>
  <p class="fine">${ico("info", "sm")}Doudou Healthcare · version 0.3 · adresse : ${esc(location.host)}</p>
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
