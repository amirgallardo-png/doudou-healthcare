/* Accès à Supabase : connexion par code e-mail, transport de synchronisation, appareils, temps réel.
   L'adresse et la clé PUBLIQUE viennent de .env.local (VITE_…), jamais du code. Sans elles, l'appli reste locale. */
import { createClient } from "@supabase/supabase-js";

const URL_ = import.meta.env.VITE_SUPABASE_URL || "";
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const configured = !!(URL_ && KEY);

let client = null;
export function sb() {
  if (!configured) throw new Error("Synchronisation non configurée.");
  if (!client) client = createClient(URL_, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "doudou.auth" } });
  return client;
}
const fail = error => { if (error) throw Object.assign(new Error(error.message || String(error)), { name: error.name || "Error", status: error.status }); };

/* ---------- Connexion par e-mail + mot de passe (décision d'Amir du 2026-10-05 : le service d'e-mail gratuit
   de Supabase n'envoie que des liens, sans code modifiable) ---------- */
const backHere = () => location.origin + location.pathname;   // le lien de confirmation ramène vers l'appli
export async function signUp(email, password) { const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: backHere() } }); fail(error); return data; }
export async function signIn(email, password) { const { data, error } = await sb().auth.signInWithPassword({ email, password }); fail(error); return data.user; }
export async function sendReset(email) { const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: backHere() }); fail(error); }
export async function setNewPassword(password) { const { data, error } = await sb().auth.updateUser({ password }); fail(error); return data.user; }
export async function currentUser() { const { data } = await sb().auth.getSession(); return data.session?.user || null; }
export async function signOut(scope = "local") { const { error } = await sb().auth.signOut({ scope }); fail(error); }
export const onAuth = fn => sb().auth.onAuthStateChange((event, session) => fn(event, session?.user || null));

/* ---------- Transport de synchronisation (même interface que le faux serveur des tests) ---------- */
export const transport = {
  async push(items) { const { error } = await sb().rpc("push_rows", { items }); fail(error); },
  async pull(since, limit) {
    const { data, error } = await sb().from("rows").select("tbl,id,data,updated_at,deleted_at,server_at")
      .neq("tbl", "devices").gt("server_at", since).order("server_at", { ascending: true }).limit(limit);
    fail(error); return data;
  },
  async upload(path, blob) { const { error } = await sb().storage.from("photos").upload(path, blob, { upsert: true, contentType: blob.type }); fail(error); },
  async download(path) { const { data, error } = await sb().storage.from("photos").download(path); fail(error); return data; }
};

/* ---------- Appareils : chacun se déclare ; la liste vient du serveur ---------- */
export function deviceId() {
  let id = null;
  try { id = localStorage.getItem("doudou.device"); if (!id) { id = crypto.randomUUID(); localStorage.setItem("doudou.device", id); } } catch { id = id || crypto.randomUUID(); }
  return id;
}
export function deviceName() {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone / iPad" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Appareil";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navigateur";
  const installed = matchMedia("(display-mode: standalone)").matches ? " (appli installée)" : "";
  return `${os} · ${br}${installed}`;
}
export async function heartbeat() {
  const now = new Date().toISOString(), id = deviceId();
  await transport.push([{ tbl: "devices", id, data: { id, name: deviceName(), last_seen: now }, updated_at: now, deleted_at: null }]);
}
export async function listDevices() {
  const { data, error } = await sb().from("rows").select("id,data,updated_at").eq("tbl", "devices").is("deleted_at", null).order("updated_at", { ascending: false });
  fail(error); return data.map(d => ({ id: d.id, ...d.data }));
}

/* ---------- Temps réel : prévient dès qu'une ligne change sur un autre appareil ---------- */
export function subscribe(userId, onChange) {
  const ch = sb().channel("rows-" + userId)
    .on("postgres_changes", { event: "*", schema: "public", table: "rows", filter: `user_id=eq.${userId}` }, onChange)
    .subscribe();
  return () => sb().removeChannel(ch);
}
