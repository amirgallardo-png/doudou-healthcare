/* Repository : la SEULE porte d'accès aux données pour les écrans.
   - lecture synchrone depuis un cache mémoire (les écrans restent de simples fonctions de rendu) ;
   - écriture atomique : la ligne ET son entrée dans la file d'envoi (outbox) sont écrites dans une même transaction ;
     le cache n'est mis à jour qu'après la réussite de la transaction (jamais d'état à moitié écrit). */
import { openDB } from "./db.js";
import { TABLES, NATURAL_KEYS } from "./schema.js";

const listeners = new Set();
export const repo = { db: null, data: {}, now: () => new Date().toISOString() };

export const uuid = () => crypto.randomUUID();

/* Identifiant stable calculé à partir d'un texte (hachage FNV-1a 2 × 64 bits, au format UUID).
   Sert aux tables à clé métier : deux appareils qui notent le même (chat, jour, moment) obtiennent le même id. */
export function stableId(...parts) {
  const s = parts.map(p => String(p ?? "")).join("|"), P = 0x100000001b3n, M = (1n << 64n) - 1n;
  let h1 = 0xcbf29ce484222325n, h2 = 0x84222325cbf29ce4n;
  for (const ch of s) { const c = BigInt(ch.codePointAt(0)); h1 = ((h1 ^ c) * P) & M; h2 = ((h2 ^ (c + 0x9en)) * P) & M; }
  const x = h1.toString(16).padStart(16, "0") + h2.toString(16).padStart(16, "0");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-8${x.slice(13, 16)}-${((parseInt(x[16], 16) & 3) | 8).toString(16)}${x.slice(17, 20)}-${x.slice(20, 32)}`;
}
const naturalId = (table, row) => stableId(table, ...NATURAL_KEYS[table].map(k => row[k]));

export async function initRepo(db = openDB()) {
  repo.db = db;
  await db.open();
  for (const t of TABLES) repo.data[t] = new Map((await db.table(t).toArray()).map(r => [r.id, r]));
  // Demande au navigateur de ne pas effacer la base en cas de manque de place (sans effet si refusé).
  try { await globalThis.navigator?.storage?.persist?.(); } catch { /* facultatif */ }
  return repo;
}

/* ---------- Lecture ---------- */
export const rows = table => [...(repo.data[table]?.values() || [])].filter(r => !r.deleted_at);
export const get = (table, id) => { const r = repo.data[table]?.get(id); return r && !r.deleted_at ? r : null; };
export const find = (table, pred) => rows(table).find(pred) || null;

/* ---------- Écriture ---------- */
function sameKey(table, a, b) { return NATURAL_KEYS[table].every(k => a[k] === b[k]); }

/* Prépare une ligne : id, horodatage, fusion avec l'existant, réutilisation de la ligne de même clé métier. */
function prepare(table, row, at, batch) {
  const pool = [...batch.filter(p => p.table === table).map(p => p.row), ...repo.data[table].values()];
  let existing = row.id ? pool.find(r => r.id === row.id) || null : null;
  if (!existing && NATURAL_KEYS[table]) existing = pool.find(r => sameKey(table, r, row)) || null;
  const merged = { ...(existing || {}), ...row };
  merged.id = existing?.id || row.id || (NATURAL_KEYS[table] ? naturalId(table, merged) : uuid());
  merged.created_at = existing?.created_at || row.created_at || at;
  merged.updated_at = at;
  merged.deleted_at = row.deleted_at ?? null;
  return merged;
}

/* ops : [{ table, row }] pour créer/modifier, [{ table, id, del: true }] pour supprimer (suppression douce). */
export async function commit(ops) {
  const at = repo.now();
  // Si une même ligne apparaît plusieurs fois dans le lot, la dernière version (fusionnée) remplace les précédentes.
  const prepared = [];
  for (const op of ops) {
    if (!TABLES.includes(op.table)) throw new Error("Table inconnue : " + op.table);
    let row;
    if (op.del) {
      const cur = prepared.find(p => p.table === op.table && p.row.id === op.id)?.row || repo.data[op.table].get(op.id);
      if (!cur) continue;
      row = { ...cur, deleted_at: at, updated_at: at };
    } else row = prepare(op.table, op.row, at, prepared);
    const i = prepared.findIndex(p => p.table === op.table && p.row.id === row.id);
    if (i >= 0) prepared.splice(i, 1);
    prepared.push({ table: op.table, row });
  }
  if (!prepared.length) return [];
  const tables = [...new Set(prepared.map(p => p.table)), "outbox"];
  await repo.db.transaction("rw", tables, async () => {
    for (const p of prepared) {
      await repo.db.table(p.table).put(p.row);
      await repo.db.outbox.add({ table: p.table, row_id: p.row.id, at });
    }
  });
  for (const p of prepared) repo.data[p.table].set(p.row.id, p.row);
  emit(prepared.map(p => p.table));
  return prepared.map(p => p.row);
}
export const save = async (table, row) => (await commit([{ table, row }]))[0];
export const remove = (table, id) => commit([{ table, id, del: true }]);

/* Remplace TOUTES les données (restauration d'une sauvegarde), en une seule transaction. */
export async function replaceAll(tables) {
  const all = [...TABLES, "outbox"];
  await repo.db.transaction("rw", all, async () => {
    for (const t of all) await repo.db.table(t).clear();
    for (const t of TABLES) {
      const list = tables[t] || [];
      await repo.db.table(t).bulkPut(list);
      if (list.length) await repo.db.outbox.bulkAdd(list.map(r => ({ table: t, row_id: r.id, at: repo.now() })));
    }
  });
  for (const t of TABLES) repo.data[t] = new Map((tables[t] || []).map(r => [r.id, r]));
  emit(TABLES);
}

/* Efface tout (bouton « Tout effacer », après double confirmation dans l'interface). */
export async function wipeAll() {
  await repo.db.transaction("rw", [...TABLES, "outbox", "meta"], async () => {
    for (const t of [...TABLES, "outbox", "meta"]) await repo.db.table(t).clear();
  });
  for (const t of TABLES) repo.data[t] = new Map();
  emit(TABLES);
}

export const pendingCount = () => repo.db.outbox.count();

/* ---------- Synchronisation (utilisé par src/sync/engine.js) ---------- */
/* Prochaines entrées de la file d'envoi, dédoublonnées (une ligne modifiée 3 fois = 1 envoi). */
/* Toutes les entrées lues sont rendues (pas de coupe) : ackOutbox(maxSeq) ne doit retirer que ce qui a été envoyé. */
export async function readOutbox(limit = 1000) {
  const entries = await repo.db.outbox.orderBy("seq").limit(limit).toArray();
  const seen = new Map();
  for (const e of entries) seen.set(e.table + "|" + e.row_id, e);
  return { maxSeq: entries.at(-1)?.seq ?? 0, items: [...seen.values()], full: entries.length === limit };
}
/* Retire de la file les entrées envoyées (celles ajoutées depuis restent : elles repartiront). */
export const ackOutbox = maxSeq => repo.db.outbox.where("seq").belowOrEqual(maxSeq).delete();
export const rawRow = (table, id) => repo.data[table]?.get(id) || null;

/* Écrit une ligne SANS passer par la file d'envoi (ex. photo téléchargée, chemin de stockage). */
export async function setLocal(table, row) {
  await repo.db.table(table).put(row);
  repo.data[table].set(row.id, row);
  emit([table], "remote");
}

/* Applique des lignes reçues du serveur. Règle : la version la plus récente (updated_at) gagne.
   Conflit de clé métier (deux ids différents pour le même jour/moment) : la plus récente reste,
   l'autre est supprimée ici et renvoyée en « pierre tombale » pour être supprimée sur le serveur. */
export async function applyRemote(items) {
  const changed = new Set(), tombstones = [], writes = [], removals = [];
  const pending = new Map(); // état après ce lot, pour comparer les lignes du même lot entre elles
  const cur = (t, id) => (pending.has(t + "|" + id) ? pending.get(t + "|" + id) : repo.data[t].get(id));
  for (const it of items) {
    const t = it.tbl;
    if (!TABLES.includes(t)) continue;
    const local = cur(t, it.id);
    if (local && local.updated_at >= it.updated_at) continue;
    const row = { ...it.data, id: it.id, updated_at: it.updated_at, deleted_at: it.deleted_at ?? null };
    if (t === "photos") { delete row.blob; if (local?.blob && local.storage_path === row.storage_path) row.blob = local.blob; }
    // Version supprimée d'un ancien doublon alors qu'une autre ligne vivante occupe la même clé : rien à garder ici
    // (la base locale n'accepte qu'une ligne par clé métier, même supprimée).
    const live = r => r && r.id !== row.id && !r.deleted_at && sameKey(t, r, row);
    if (NATURAL_KEYS[t] && row.deleted_at && [...repo.data[t].values(), ...pending.values()].some(live)) continue;
    if (NATURAL_KEYS[t] && !row.deleted_at) {
      const rival = [...repo.data[t].values(), ...[...pending.values()].filter(Boolean)].find(r => r && r.id !== row.id && !r.deleted_at && sameKey(t, r, row));
      if (rival) {
        const loser = rival.updated_at > row.updated_at ? row : rival;
        tombstones.push({ tbl: t, id: loser.id, data: { ...loser, blob: undefined }, updated_at: repo.now(), deleted_at: repo.now() });
        if (loser === row) continue;
        removals.push([t, rival.id]); pending.set(t + "|" + rival.id, null);
      }
    }
    writes.push([t, row]); pending.set(t + "|" + row.id, row); changed.add(t);
  }
  if (!writes.length && !removals.length) return { applied: 0, tombstones };
  const tables = [...new Set([...writes.map(w => w[0]), ...removals.map(r => r[0])]), "outbox"];
  await repo.db.transaction("rw", tables, async () => {
    for (const [t, id] of removals) { await repo.db.table(t).delete(id); await repo.db.outbox.where("row_id").equals(id).delete(); }
    for (const [t, row] of writes) await repo.db.table(t).put(row);
  });
  for (const [t, id] of removals) { repo.data[t].delete(id); changed.add(t); }
  for (const [t, row] of writes) repo.data[t].set(row.id, row);
  emit([...changed], "remote");
  return { applied: writes.length, tombstones };
}
export const getMeta = async key => (await repo.db.meta.get(key))?.value;
export const setMeta = (key, value) => repo.db.meta.put({ key, value });

/* ---------- Abonnement aux changements ---------- */
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
/* origin : "local" (saisie sur cet appareil, à envoyer) ou "remote" (reçu du serveur, à afficher seulement). */
function emit(tables, origin = "local") { for (const fn of listeners) { try { fn(tables, origin); } catch (e) { console.error(e); } } }

/* ---------- Raccourcis ---------- */
export const currentCat = () => rows("cats").sort((a, b) => a.created_at.localeCompare(b.created_at))[0] || null;
