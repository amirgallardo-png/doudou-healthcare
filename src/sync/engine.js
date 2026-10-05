/* Moteur de synchronisation « local d'abord ». Indépendant de Supabase : il parle à un « transport »
   (vrai serveur en production, faux serveur en mémoire dans les tests).
   Ordre d'une synchro : envoyer (photos d'abord) → recevoir → renvoyer les pierres tombales → télécharger les photos. */
import { readOutbox, ackOutbox, rawRow, setLocal, applyRemote, getMeta, setMeta, rows, wipeAll, repo } from "../data/repo.js";

const PAGE = 1000, CHUNK = 400, OVERLAP_MS = 10000;
const EPOCH = "1970-01-01T00:00:00.000Z";
const ext = type => ({ "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" }[type] || "bin");
const iso = v => (v == null ? null : new Date(v).toISOString());
export const normalize = r => ({ ...r, updated_at: iso(r.updated_at), deleted_at: iso(r.deleted_at), server_at: iso(r.server_at) });
export const isNetworkError = e => !!e && (e.name === "TypeError" || /fetch|network|offline|Failed to fetch|NetworkError|timeout|ECONN|503|502|504/i.test(String(e.message || e)));

export function createSync(transport) {
  const st = { state: "idle", lastSync: null, error: null, userId: null };
  let running = null;

  /* Un autre compte se connecte sur cet appareil : on repart de zéro (les données de l'autre compte sont sur le serveur). */
  async function ensureOwner(userId) {
    st.userId = userId;
    const owner = await getMeta("sync.owner");
    if (owner && owner !== userId) { await wipeAll(); await setMeta("sync.cursor", EPOCH); await setMeta("sync.tombstones", []); }
    await setMeta("sync.owner", userId);
  }

  async function pushOnce() {
    for (;;) {
      const { maxSeq, items, full } = await readOutbox(PAGE);
      const tombs = (await getMeta("sync.tombstones")) || [];
      if (!items.length && !tombs.length) return;
      const payload = [];
      for (const e of items) {
        let r = rawRow(e.table, e.row_id);
        if (!r) continue;
        // Photo : le fichier part d'abord dans l'espace privé, la ligne ensuite (avec son chemin).
        if (e.table === "photos" && r.blob && !r.storage_path && !r.deleted_at) {
          const path = `${st.userId}/${r.id}.${ext(r.blob.type)}`;
          await transport.upload(path, r.blob);
          r = { ...r, storage_path: path };
          await setLocal("photos", r);
        }
        const data = { ...r }; delete data.blob;   // le fichier ne transite jamais dans la ligne
        payload.push({ tbl: e.table, id: r.id, data, updated_at: r.updated_at, deleted_at: r.deleted_at ?? null });
      }
      const all = [...payload, ...tombs];
      for (let i = 0; i < all.length; i += CHUNK) await transport.push(all.slice(i, i + CHUNK));
      if (tombs.length) await setMeta("sync.tombstones", []);
      if (maxSeq) await ackOutbox(maxSeq);
      if (!full) return;
    }
  }

  async function pullOnce() {
    let cursor = (await getMeta("sync.cursor")) || EPOCH;
    for (;;) {
      const since = new Date(Math.max(0, Date.parse(cursor) - OVERLAP_MS)).toISOString();
      // Heures normalisées au format de l'appli (Postgres renvoie « +00:00 » et une précision variable) :
      // sans cela, la comparaison « le plus récent gagne » serait faussée.
      const list = (await transport.pull(since, PAGE)).map(normalize);
      const { tombstones } = await applyRemote(list);
      if (tombstones.length) await setMeta("sync.tombstones", [...((await getMeta("sync.tombstones")) || []), ...tombstones]);
      const last = list.at(-1)?.server_at;
      if (!last || last <= cursor) return;
      cursor = last; await setMeta("sync.cursor", cursor);
      if (list.length < PAGE) return;
    }
  }

  /* Photos reçues d'un autre appareil : téléchargées puis gardées sur celui-ci. Une photo en échec n'arrête rien. */
  async function downloadPhotos() {
    for (const p of rows("photos").filter(x => !x.blob && x.storage_path)) {
      try { const blob = await transport.download(p.storage_path); await setLocal("photos", { ...p, blob }); }
      catch (e) { if (isNetworkError(e)) throw e; }
    }
  }

  async function syncNow() {
    if (!st.userId) throw new Error("Synchronisation sans utilisateur connecté.");
    if (running) return running;
    running = (async () => {
      st.state = "syncing";
      try {
        await pushOnce(); await pullOnce(); await pushOnce(); await downloadPhotos();
        st.state = "ok"; st.lastSync = Date.now(); st.error = null;
      } catch (e) {
        st.state = isNetworkError(e) ? "offline" : "error"; st.error = e.message || String(e);
      } finally { running = null; }
      return st.state;
    })();
    return running;
  }

  return { st, ensureOwner, syncNow, pushOnce, pullOnce, downloadPhotos, get db() { return repo.db; } };
}
