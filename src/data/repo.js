/* Repository : la SEULE porte d'accès aux données pour les écrans.
   - lecture synchrone depuis un cache mémoire (les écrans restent de simples fonctions de rendu) ;
   - écriture atomique : la ligne ET son entrée dans la file d'envoi (outbox) sont écrites dans une même transaction ;
     le cache n'est mis à jour qu'après la réussite de la transaction (jamais d'état à moitié écrit). */
import { openDB } from "./db.js";
import { TABLES, NATURAL_KEYS } from "./schema.js";

const listeners = new Set();
export const repo = { db: null, data: {}, now: () => new Date().toISOString() };

export const uuid = () => crypto.randomUUID();

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
  merged.id = existing?.id || row.id || uuid();
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
export const getMeta = async key => (await repo.db.meta.get(key))?.value;
export const setMeta = (key, value) => repo.db.meta.put({ key, value });

/* ---------- Abonnement aux changements ---------- */
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(tables) { for (const fn of listeners) { try { fn(tables); } catch (e) { console.error(e); } } }

/* ---------- Raccourcis ---------- */
export const currentCat = () => rows("cats").sort((a, b) => a.created_at.localeCompare(b.created_at))[0] || null;
