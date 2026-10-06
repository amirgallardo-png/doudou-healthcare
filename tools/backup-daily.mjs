/* Sauvegarde quotidienne de Doudou Healthcare sur le PC (en plus des données du serveur).
   - Lit toutes les données du compte sur Supabase (clé SECRÈTE de service, collée par Amir dans .env.local,
     jamais affichée ni versionnée) et télécharge les photos.
   - Écrit un fichier au format de l'appli (restaurable via Réglages › Importer une sauvegarde).
   - Garde les 30 dernières sauvegardes.
   - Effet secondaire utile : l'appel quotidien empêche la mise en pause du projet Supabase gratuit.
   Usage : node tools/backup-daily.mjs            (dossier par défaut : Documents\Sauvegardes Doudou)
           node tools/backup-daily.mjs --dir "D:\Mes sauvegardes" */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { FORMAT, FORMAT_VERSION, blobToDataURL } from "../src/data/backup.js";
import { TABLES } from "../src/data/schema.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const KEEP = 30;
const argDir = process.argv.indexOf("--dir");
const DIR = argDir > 0 ? process.argv[argDir + 1] : join(homedir(), "Documents", "Sauvegardes Doudou");
const LOG = join(DIR, "journal-sauvegardes.txt");

const env = Object.fromEntries(readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)
  .filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.VITE_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_KEY;
const log = msg => { const line = `${new Date().toISOString()}  ${msg}`; console.log(msg); try { mkdirSync(DIR, { recursive: true }); appendFileSync(LOG, line + "\n"); } catch { /* journal facultatif */ } };

async function main() {
  if (!URL_) throw new Error("Adresse Supabase absente de .env.local (VITE_SUPABASE_URL).");
  if (!KEY) throw new Error("Clé de service absente : colle-la dans .env.local après SUPABASE_SERVICE_KEY= (voir README, section Sauvegardes).");
  const sb = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Toutes les lignes (la clé de service lit sans la sécurité par ligne : un seul compte existe).
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("rows").select("user_id,tbl,id,data,updated_at,deleted_at").range(from, from + 999).order("tbl").order("id");
    if (error) throw new Error("Lecture impossible : " + error.message);
    all.push(...data);
    if (data.length < 1000) break;
  }
  const users = [...new Set(all.filter(r => r.tbl !== "devices").map(r => r.user_id))];
  if (users.length > 1) throw new Error(`Plusieurs comptes trouvés (${users.length}) : sauvegarde arrêtée par prudence.`);

  // 2. Format de l'appli : tables → lignes vivantes ; photos intégrées (data URL).
  const tables = Object.fromEntries(TABLES.map(t => [t, []]));
  let photos = 0, missing = 0;
  for (const r of all) {
    if (!TABLES.includes(r.tbl) || r.deleted_at) continue;
    const row = { ...r.data, id: r.id, updated_at: new Date(r.updated_at).toISOString(), deleted_at: null };
    if (r.tbl === "photos" && row.storage_path) {
      const { data: blob, error } = await sb.storage.from("photos").download(row.storage_path);
      if (error || !blob) { missing++; continue; }
      row.data_url = await blobToDataURL(blob); photos++;
    }
    tables[r.tbl].push(row);
  }
  if (!tables.cats.length) { log("Rien à sauvegarder pour l'instant (aucun profil de chat)."); return; }

  // 3. Écriture puis rotation (30 dernières).
  mkdirSync(DIR, { recursive: true });
  const now = new Date(), name = `doudou-sauvegarde-${now.toISOString().slice(0, 10)}.json`;
  writeFileSync(join(DIR, name), JSON.stringify({ format: FORMAT, version: FORMAT_VERSION, exported_at: now.toISOString(), source: "sauvegarde-quotidienne", tables }, null, 1), "utf8");
  const files = readdirSync(DIR).filter(f => /^doudou-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) unlinkSync(join(DIR, f));
  const counts = Object.entries(tables).filter(([, l]) => l.length).map(([t, l]) => `${t} ${l.length}`).join(", ");
  log(`Sauvegarde OK : ${name} (${counts}) ; photos ${photos}${missing ? `, ${missing} introuvable(s)` : ""} ; ${Math.min(files.length, KEEP)} sauvegarde(s) gardée(s).`);
}
main().catch(e => { log("ÉCHEC : " + e.message); process.exit(1); });
