/* Sauvegarde complète au format JSON (export, validation, restauration).
   Le format est versionné : une sauvegarde ancienne est mise à niveau avant d'être restaurée. */
import { TABLES } from "./schema.js";
import { rows, replaceAll } from "./repo.js";

export const FORMAT = "doudou-healthcare-backup";
export const FORMAT_VERSION = 1;

/* Mises à niveau du format : UPGRADES[n] transforme une sauvegarde version n en version n+1. */
export const UPGRADES = {};

/* ---------- photos : Blob <-> data URL (fonctionne dans le navigateur et dans Node pour les tests) ---------- */
export async function blobToDataURL(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "application/octet-stream"};base64,${btoa(bin)}`;
}
export function dataURLToBlob(url) {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url || "");
  if (!m || !m[2]) throw new Error("Photo illisible dans la sauvegarde.");
  const bin = atob(m[3]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: m[1] || "application/octet-stream" });
}

/* ---------- export ---------- */
export async function buildBackup(now = new Date()) {
  const tables = {};
  for (const t of TABLES) {
    tables[t] = await Promise.all(rows(t).map(async r => (t === "photos" && r.blob instanceof Blob ? { ...r, blob: undefined, data_url: await blobToDataURL(r.blob) } : r)));
  }
  return { format: FORMAT, version: FORMAT_VERSION, exported_at: now.toISOString(), tables };
}
export const backupFileName = (now = new Date()) => `doudou-sauvegarde-${now.toISOString().slice(0, 10)}.json`;

/* ---------- validation + mise à niveau ---------- */
export function isBackup(json) { return !!json && json.format === FORMAT; }
export function validateBackup(json) {
  if (!isBackup(json)) throw new Error("Ce fichier n'est pas une sauvegarde Doudou Healthcare.");
  if (!Number.isInteger(json.version) || json.version < 0) throw new Error("Version de sauvegarde inconnue.");
  if (json.version > FORMAT_VERSION) throw new Error("Cette sauvegarde vient d'une version plus récente de l'appli : mets l'appli à jour avant de la restaurer.");
  let b = structuredClone(json);
  while (b.version < FORMAT_VERSION) {
    if (!UPGRADES[b.version]) throw new Error("Version de sauvegarde inconnue.");
    b = { ...UPGRADES[b.version](b), version: b.version + 1 };
  }
  if (!b.tables || typeof b.tables !== "object") throw new Error("Sauvegarde incomplète : aucune table.");
  const tables = {};
  for (const t of TABLES) {
    const list = b.tables[t] ?? [];
    if (!Array.isArray(list)) throw new Error(`Sauvegarde abîmée : la table « ${t} » n'est pas une liste.`);
    for (const r of list) if (!r || typeof r.id !== "string") throw new Error(`Sauvegarde abîmée : une ligne de « ${t} » n'a pas d'identifiant.`);
    tables[t] = list;
  }
  if (!tables.cats.length) throw new Error("Sauvegarde sans profil de chat.");
  return tables;
}

/* ---------- restauration (remplace tout, en une transaction) ---------- */
export async function restoreBackup(json) {
  const tables = validateBackup(json);
  tables.photos = tables.photos.map(p => {
    if (!p.data_url) return p;
    const { data_url, ...rest } = p;
    return { ...rest, blob: dataURLToBlob(data_url) };
  });
  await replaceAll(tables);
  return Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]));
}
