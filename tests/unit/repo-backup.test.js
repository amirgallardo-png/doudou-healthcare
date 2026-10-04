import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { openDB } from "../../src/data/db.js";
import { VERSIONS } from "../../src/data/schema.js";
import { repo, initRepo, commit, save, remove, rows, get, pendingCount, wipeAll } from "../../src/data/repo.js";
import { buildBackup, restoreBackup, validateBackup, FORMAT, FORMAT_VERSION, UPGRADES } from "../../src/data/backup.js";
import { importLegacy, detectKind } from "../../src/data/importer.js";

let n = 0;
beforeEach(async () => {
  if (repo.db) repo.db.close();
  await initRepo(openDB("test-" + ++n));
  let t = 0;
  repo.now = () => new Date(Date.UTC(2026, 9, 4, 8, 0, t++)).toISOString();
});

describe("repository", () => {
  it("écrit la ligne et son entrée d'envoi ensemble", async () => {
    const cat = await save("cats", { name: "Test" });
    expect(cat.id).toMatch(/[0-9a-f-]{36}/);
    expect(get("cats", cat.id).name).toBe("Test");
    expect(await repo.db.cats.get(cat.id)).toMatchObject({ name: "Test" });
    expect(await pendingCount()).toBe(1);
  });

  it("fusionne une modification partielle sans perdre les autres champs", async () => {
    const cat = await save("cats", { name: "Test", breed: "Européen" });
    await save("cats", { id: cat.id, coat: "Noir" });
    expect(get("cats", cat.id)).toMatchObject({ name: "Test", breed: "Européen", coat: "Noir", created_at: cat.created_at });
    expect(get("cats", cat.id).updated_at > cat.updated_at).toBe(true);
  });

  it("une seule saisie par (jour, moment) : la seconde met à jour la première", async () => {
    await save("journal", { cat_id: "c", date: "2026-10-04", moment: "m", h: 3 });
    await save("journal", { cat_id: "c", date: "2026-10-04", moment: "m", h: 1 });
    await save("journal", { cat_id: "c", date: "2026-10-04", moment: "e", h: 2 });
    expect(rows("journal")).toHaveLength(2);
    expect(rows("journal").find(j => j.moment === "m").h).toBe(1);
  });

  it("supprime en douceur et peut recréer la même clé ensuite", async () => {
    const j = await save("journal", { cat_id: "c", date: "2026-10-04", moment: "m", h: 3 });
    await remove("journal", j.id);
    expect(rows("journal")).toHaveLength(0);
    expect((await repo.db.journal.get(j.id)).deleted_at).toBeTruthy();
    const again = await save("journal", { cat_id: "c", date: "2026-10-04", moment: "m", h: 2 });
    expect(again.id).toBe(j.id);
    expect(again.deleted_at).toBeNull();
  });

  it("est atomique : si l'écriture échoue, rien n'est écrit (ni base, ni cache)", async () => {
    const before = await save("cats", { name: "Avant" });
    const put = repo.db.table("weights").put.bind(repo.db.table("weights"));
    repo.db.table("weights").put = () => Promise.reject(new Error("disque plein"));
    await expect(commit([{ table: "cats", row: { id: before.id, name: "Après" } }, { table: "weights", row: { cat_id: before.id, date: "2026-10-04", moment: "m", kg: 5 } }])).rejects.toThrow();
    repo.db.table("weights").put = put;
    expect(get("cats", before.id).name).toBe("Avant");
    expect((await repo.db.cats.get(before.id)).name).toBe("Avant");
    expect(await repo.db.weights.count()).toBe(0);
  });

  it("refuse une table inconnue", async () => {
    await expect(commit([{ table: "pirate", row: {} }])).rejects.toThrow(/Table inconnue/);
  });
});

describe("migrations", () => {
  it("les versions du schéma sont croissantes et la dernière garde toutes les tables", () => {
    VERSIONS.forEach((v, i) => i && expect(v.version).toBeGreaterThan(VERSIONS[i - 1].version));
    expect(Object.keys(VERSIONS.at(-1).stores)).toEqual(expect.arrayContaining(["cats", "journal", "meal_plan", "outbox", "meta"]));
  });
  it("les données survivent à la fermeture et à la réouverture de la base", async () => {
    const cat = await save("cats", { name: "Persistant" });
    const name = repo.db.name;
    repo.db.close();
    await initRepo(openDB(name));
    expect(get("cats", cat.id).name).toBe("Persistant");
  });
});

describe("sauvegarde complète", () => {
  it("export puis restauration redonne exactement les mêmes données (photo comprise)", async () => {
    const cat = await save("cats", { name: "Test" });
    await save("weights", { cat_id: cat.id, date: "2026-10-01", moment: "m", kg: 5.2 });
    await save("photos", { cat_id: cat.id, date: "2026-10-01", blob: new Blob([new Uint8Array([1, 2, 3, 250])], { type: "image/webp" }) });
    const backup = JSON.parse(JSON.stringify(await buildBackup()));
    expect(backup).toMatchObject({ format: FORMAT, version: FORMAT_VERSION });
    await wipeAll();
    expect(rows("cats")).toHaveLength(0);
    const counts = await restoreBackup(backup);
    expect(counts).toMatchObject({ cats: 1, weights: 1, photos: 1 });
    expect(rows("weights")[0].kg).toBe(5.2);
    const blob = rows("photos")[0].blob;
    expect(blob.type).toBe("image/webp");
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3, 250]);
  });
  it("refuse une sauvegarde abîmée, étrangère ou trop récente", () => {
    expect(() => validateBackup({ format: "autre" })).toThrow(/pas une sauvegarde/);
    expect(() => validateBackup({ format: FORMAT, version: FORMAT_VERSION + 1, tables: {} })).toThrow(/plus récente/);
    expect(() => validateBackup({ format: FORMAT, version: 1, tables: { cats: "x" } })).toThrow(/pas une liste/);
    expect(() => validateBackup({ format: FORMAT, version: 1, tables: { cats: [{ name: "sans id" }] } })).toThrow(/identifiant/);
    expect(() => validateBackup({ format: FORMAT, version: 1, tables: { cats: [] } })).toThrow(/profil/);
  });
  it("met à niveau une sauvegarde d'un ancien format avant de la restaurer", () => {
    UPGRADES[0] = b => ({ ...b, tables: { cats: b.chats } });
    const t = validateBackup({ format: FORMAT, version: 0, chats: [{ id: "a", name: "Ancien" }] });
    delete UPGRADES[0];
    expect(t.cats[0].name).toBe("Ancien");
  });
  it("une restauration ratée ne touche pas aux données actuelles", async () => {
    await save("cats", { name: "Actuel" });
    await expect(restoreBackup({ format: FORMAT, version: 1, tables: { cats: [] } })).rejects.toThrow();
    expect(rows("cats")[0].name).toBe("Actuel");
  });
});

describe("import de l'ancienne V1 dans la base", () => {
  const sample = JSON.parse(readFileSync(new URL("../fixtures/legacy-sample.json", import.meta.url), "utf8"));
  it("reconnaît le type de fichier", () => {
    expect(detectKind(sample)).toBe("legacy");
    expect(detectKind({ format: FORMAT })).toBe("backup");
    expect(detectKind({ a: 1 })).toBeNull();
  });
  it("importe tout, et un second import ne crée aucun doublon", async () => {
    await importLegacy(sample);
    const count = () => Object.fromEntries(["cats", "records", "journal", "weights", "meals", "expenses", "reminders", "day_notes"].map(t => [t, rows(t).length]));
    const first = count();
    expect(first).toMatchObject({ cats: 1, records: 2, journal: 2, weights: 2, meals: 3, expenses: 1, reminders: 1 });
    await importLegacy(sample);
    expect(count()).toEqual(first);
  });
  it("complète un profil saisi à la main sans écraser ce qu'Amir a déjà rempli", async () => {
    await save("cats", { name: "Nom choisi", breed: "", coat: "" });
    await importLegacy(sample);
    expect(rows("cats")).toHaveLength(1);
    expect(rows("cats")[0]).toMatchObject({ name: "Nom choisi", breed: "Européen", coat: "Gris" });
  });
  it("réduit et rattache la photo du profil (fonction de réduction injectée)", async () => {
    const withPhoto = structuredClone(sample);
    withPhoto.data.profile[0].photo = "data:image/jpeg;base64,AAAA";
    const shrink = async () => ({ blob: new Blob([new Uint8Array(10)], { type: "image/webp" }), width: 1280, height: 960 });
    const res = await importLegacy(withPhoto, { shrink });
    const cat = rows("cats")[0];
    expect(get("photos", cat.photo_id)).toMatchObject({ width: 1280, height: 960 });
    expect(cat.name).toBe("Minou Test");
    expect(res.report.some(r => r.text.includes("1280 × 960"))).toBe(true);
  });
});
