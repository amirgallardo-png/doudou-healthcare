/* Synchronisation : deux appareils simulés (deux bases locales) et un faux serveur qui applique les mêmes règles
   que supabase/migrations/0001_sync.sql (le plus récent gagne, curseur posé par le serveur, lignes par utilisateur). */
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { openDB } from "../../src/data/db.js";
import { repo, initRepo, save, remove, rows, get, pendingCount, commit } from "../../src/data/repo.js";
import { createSync, normalize } from "../../src/sync/engine.js";

class FakeServer {
  constructor() { this.rows = new Map(); this.files = new Map(); this.online = true; this.tick = 0; }
  now() { return new Date(Date.UTC(2026, 9, 5, 12, 0, 0) + ++this.tick).toISOString().replace("Z", "+00:00"); } // format Postgres
  transport(uid) {
    const s = this, chk = () => { if (!s.online) throw new TypeError("Failed to fetch"); };
    return {
      async push(items) { chk();
        for (const it of items) {
          const k = `${uid}|${it.tbl}|${it.id}`, cur = s.rows.get(k);
          if (!cur || Date.parse(cur.updated_at) < Date.parse(it.updated_at)) s.rows.set(k, { ...structuredClone(it), user_id: uid, server_at: s.now() });
        } },
      async pull(since, limit) { chk();
        return [...s.rows.values()].filter(r => r.user_id === uid && Date.parse(r.server_at) > Date.parse(since))
          .sort((a, b) => Date.parse(a.server_at) - Date.parse(b.server_at)).slice(0, limit).map(r => structuredClone(r)); },
      async upload(path, blob) { chk(); if (!path.startsWith(uid + "/")) throw new Error("refusé par la sécurité"); s.files.set(path, blob); },
      async download(path) { chk(); if (!path.startsWith(uid + "/")) throw new Error("refusé par la sécurité"); return s.files.get(path); }
    };
  }
}

let n = 0, clock = 0, server, A, B;
const T = () => new Date(Date.UTC(2026, 9, 5, 8, 0, 0) + 1000 * ++clock).toISOString();
const devices = {};
/* Bascule sur un appareil (sa propre base locale), comme si on prenait l'autre téléphone en main. */
async function on(name, uid = "user-1") {
  if (repo.db) repo.db.close();
  devices[name] = devices[name] || { db: "dev-" + name + "-" + n, eng: createSync(server.transport(uid)) };
  await initRepo(openDB(devices[name].db));
  repo.now = T;
  await devices[name].eng.ensureOwner(uid);
  return devices[name].eng;
}

beforeEach(() => { n++; server = new FakeServer(); for (const k of Object.keys(devices)) delete devices[k]; });

describe("synchronisation entre deux appareils", () => {
  it("une saisie faite sur le PC apparaît sur le téléphone", async () => {
    A = await on("pc");
    const cat = await save("cats", { name: "Test" });
    await save("journal", { cat_id: cat.id, date: "2026-10-05", moment: "m", h: 3, a: 3, s: "ok" });
    expect(await A.syncNow()).toBe("ok");
    expect(await pendingCount()).toBe(0);
    B = await on("tel");
    expect(await B.syncNow()).toBe("ok");
    expect(rows("cats")[0].name).toBe("Test");
    expect(rows("journal")[0]).toMatchObject({ date: "2026-10-05", moment: "m", h: 3 });
    expect(await pendingCount()).toBe(0);   // ce qui est reçu ne repart pas en écho
  });

  it("hors ligne : les saisies sont gardées, puis envoyées au retour du réseau", async () => {
    A = await on("pc");
    await save("cats", { name: "Test" });
    server.online = false;
    expect(await A.syncNow()).toBe("offline");
    expect(await pendingCount()).toBe(1);
    expect(rows("cats")).toHaveLength(1);
    server.online = true;
    expect(await A.syncNow()).toBe("ok");
    expect(await pendingCount()).toBe(0);
    expect(server.rows.size).toBe(1);
  });

  it("conflit : la modification la plus récente gagne, sur les deux appareils", async () => {
    A = await on("pc"); const cat = await save("cats", { name: "Avant" }); await A.syncNow();
    B = await on("tel"); await B.syncNow();
    A = await on("pc"); await save("cats", { id: cat.id, name: "Modifié sur PC" });          // plus ancienne
    B = await on("tel"); await save("cats", { id: cat.id, name: "Modifié sur téléphone" });  // plus récente
    A = await on("pc"); await A.syncNow();
    B = await on("tel"); await B.syncNow();
    expect(get("cats", cat.id).name).toBe("Modifié sur téléphone");
    A = await on("pc"); await A.syncNow();
    expect(get("cats", cat.id).name).toBe("Modifié sur téléphone");
  });

  it("une suppression se propage", async () => {
    A = await on("pc"); const e = await save("expenses", { cat_id: "c", label: "Litière", amount: 9, date: "2026-10-05" }); await A.syncNow();
    B = await on("tel"); await B.syncNow(); expect(rows("expenses")).toHaveLength(1);
    A = await on("pc"); await remove("expenses", e.id); await A.syncNow();
    B = await on("tel"); await B.syncNow();
    expect(rows("expenses")).toHaveLength(0);
  });

  it("même jour et même moment notés sur deux appareils hors ligne : une seule saisie au final", async () => {
    A = await on("pc"); const cat = await save("cats", { name: "Test" }); await A.syncNow();
    B = await on("tel"); await B.syncNow();
    A = await on("pc"); await save("journal", { cat_id: cat.id, date: "2026-10-05", moment: "e", h: 3, a: 3, s: "ok" });
    B = await on("tel"); await save("journal", { cat_id: cat.id, date: "2026-10-05", moment: "e", h: 1, a: 1, s: "molles" });
    A = await on("pc"); await A.syncNow();
    B = await on("tel"); await B.syncNow();
    expect(rows("journal")).toHaveLength(1);
    expect(rows("journal")[0].h).toBe(1);
    A = await on("pc"); await A.syncNow();
    expect(rows("journal")).toHaveLength(1);
    expect(rows("journal")[0].h).toBe(1);
  });

  it("anciens identifiants différents pour la même clé : un seul reste, l'autre est supprimé partout", async () => {
    A = await on("pc");
    await commit([{ table: "journal", row: { id: "11111111-1111-4111-8111-111111111111", cat_id: "c", date: "2026-10-01", moment: "m", h: 2 } }]);
    await A.syncNow();
    B = await on("tel");
    await commit([{ table: "journal", row: { id: "22222222-2222-4222-8222-222222222222", cat_id: "c", date: "2026-10-01", moment: "m", h: 3 } }]);
    await B.syncNow();
    expect(rows("journal")).toHaveLength(1);
    A = await on("pc"); await A.syncNow();
    expect(rows("journal")).toHaveLength(1);
    expect(rows("journal")[0].h).toBe(3);
    const alive = [...server.rows.values()].filter(r => r.tbl === "journal" && !r.deleted_at);
    expect(alive).toHaveLength(1);
  });

  it("les photos passent par l'espace privé et arrivent sur l'autre appareil", async () => {
    A = await on("pc");
    const p = await save("photos", { cat_id: "c", date: "2026-10-05", blob: new Blob([new Uint8Array([7, 8, 9])], { type: "image/webp" }) });
    await A.syncNow();
    expect(get("photos", p.id).storage_path).toBe(`user-1/${p.id}.webp`);
    expect([...server.rows.values()][0].data.blob).toBeUndefined();   // le fichier ne transite jamais dans la ligne
    B = await on("tel"); await B.syncNow();
    expect([...new Uint8Array(await get("photos", p.id).blob.arrayBuffer())]).toEqual([7, 8, 9]);
  });

  it("chaque utilisateur ne voit que ses données ; un autre compte sur le même appareil repart de zéro", async () => {
    A = await on("pc", "user-1"); await save("cats", { name: "Chat d'Amir" }); await A.syncNow();
    const C = await on("pc-intrus", "user-2"); await C.syncNow();
    expect(rows("cats")).toHaveLength(0);
    devices.pc.eng = createSync(server.transport("user-2"));
    await on("pc", "user-2");
    expect(rows("cats")).toHaveLength(0);
  });

  it("normalise les heures du serveur avant de comparer", () => {
    expect(normalize({ updated_at: "2026-10-05T12:00:00.12+00:00", deleted_at: null, server_at: "2026-10-05T12:00:01+00:00" }))
      .toMatchObject({ updated_at: "2026-10-05T12:00:00.120Z", deleted_at: null, server_at: "2026-10-05T12:00:01.000Z" });
  });
});
