/* Chef d'orchestre de la synchronisation : connexion, déclencheurs, état affiché.
   Déclencheurs : 1,5 s après une saisie, retour du réseau, retour sur l'appli, toutes les 60 s, signal temps réel. */
import { S } from "../state.js";
import { configured, transport, currentUser, onAuth, heartbeat, subscribe, signOut, listDevices } from "./supabase.js";
import { createSync } from "./engine.js";
import { onChange, pendingCount, wipeAll } from "../data/repo.js";
import { renderSync, render } from "../ui/shell.js";

let eng = null, unsubRealtime = null, debounce = null, lastBeat = 0, wired = false;

/* Ne pas redessiner l'écran sous les doigts : pas pendant une saisie ni avec une feuille ou un résumé ouverts. */
const busy = () => !document.getElementById("sheet")?.hidden || !!document.getElementById("visitSlot")?.innerHTML || document.activeElement?.matches?.("input,textarea,select");

export function schedule(ms = 1500) { clearTimeout(debounce); debounce = setTimeout(run, ms); }

export async function run() {
  if (!eng) return;
  S.pending = await pendingCount();
  if (!navigator.onLine) { S.sync = "offline"; S.syncError = null; renderSync(); return; }
  if (S.pending) { S.sync = "pending"; renderSync(); }
  const state = await eng.syncNow();
  S.pending = await pendingCount();
  S.lastSync = eng.st.lastSync;
  S.syncError = state === "ok" ? null : eng.st.error;
  S.sync = state === "ok" ? (S.pending ? "pending" : "ok") : "offline";
  renderSync();
  if (state === "ok" && Date.now() - lastBeat > 5 * 60000) { lastBeat = Date.now(); heartbeat().catch(() => {}); }
  if (S.route === "reglages" && !busy()) render(false);
}

async function signedIn(user) {
  S.auth = "signed-in"; S.userEmail = user.email;
  eng = createSync(transport);
  await eng.ensureOwner(user.id);
  unsubRealtime?.();
  unsubRealtime = subscribe(user.id, () => schedule(600));
  render(true);
  run();
}

export async function startSync() {
  if (!configured) { S.auth = "none"; S.sync = "local"; renderSync(); return; }
  if (!wired) {
    wired = true;
    onChange((tables, origin) => {
      if (origin === "local") schedule(1500);
      else if (!busy()) render(false);
    });
    window.addEventListener("online", () => schedule(200));
    window.addEventListener("offline", () => { S.sync = "offline"; S.syncError = null; renderSync(); });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(300); });
    setInterval(() => { if (!document.hidden) run(); }, 60000);
    onAuth((event, user) => {
      if (event === "SIGNED_OUT") { eng = null; unsubRealtime?.(); unsubRealtime = null; S.auth = "signed-out"; S.sync = "offline"; renderSync(); render(true); }
    });
  }
  let user = null;
  try { user = await currentUser(); } catch { /* hors ligne au démarrage : la session locale suffit */ }
  if (user) await signedIn(user);
  else { S.auth = "signed-out"; S.sync = "offline"; renderSync(); render(true); }
}

/* Appelé par l'écran de connexion après le bon code. */
export const afterLogin = user => signedIn(user);

/* Déconnexion : les données restent sur le serveur ; cet appareil est vidé (un autre pourrait l'utiliser). */
export async function logout() {
  await run().catch(() => {});
  if (S.pending) throw new Error(`${S.pending} saisie(s) pas encore envoyée(s) : reconnecte-toi au réseau avant de te déconnecter.`);
  await signOut("local");
  await wipeAll();
}
export const logoutOthers = () => signOut("others");

/* Liste des appareils (Réglages) : chargée en arrière-plan, au plus toutes les 30 s. */
let devLoading = false;
export function loadDevices() {
  if (S.auth !== "signed-in" || devLoading || (S.devicesAt && Date.now() - S.devicesAt < 30000)) return;
  devLoading = true;
  heartbeat().catch(() => {}).then(() => listDevices())
    .then(list => { S.devices = list; S.devicesError = null; })
    .catch(e => { S.devicesError = e.message; })
    .finally(() => { devLoading = false; S.devicesAt = Date.now(); if (S.route === "reglages" && !busy()) render(false); });
}
