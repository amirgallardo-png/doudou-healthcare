import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { mapLegacyBackup, mapAppetit, mapHumeur, mapSelles, mapEaten, normalizeBrand } from "../../src/data/legacy-import.js";

const sample = JSON.parse(readFileSync(new URL("../fixtures/legacy-sample.json", import.meta.url), "utf8"));

describe("échelles de l'ancienne appli", () => {
  it("convertit l'appétit sur 5 en 3 niveaux", () => {
    expect([1, 2, 3, 4, 5].map(mapAppetit)).toEqual([1, 1, 2, 3, 3]);
    expect(mapAppetit("")).toBeNull();
  });
  it("convertit l'humeur en mots", () => {
    expect(mapHumeur("Agressif")).toBe(1);
    expect(mapHumeur("Normal")).toBe(2);
    expect(mapHumeur("Joueur")).toBe(3);
    expect(mapHumeur("")).toBeNull();
  });
  it("convertit selles, repas et marques", () => {
    expect(mapSelles("Normales")).toBe("ok");
    expect(mapSelles("Diarrhée")).toBe("molles");
    expect(mapEaten("Tout")).toBe(1);
    expect(mapEaten("La moitié")).toBe(0.5);
    expect(normalizeBrand("Purina ProPlan  Sterilised")).toBe("Purina Pro Plan Sterilised");
  });
});

describe("import de la sauvegarde V1", () => {
  let n = 0;
  const res = mapLegacyBackup(sample, { uuid: () => "id-" + ++n });
  const t = res.tables;

  it("importe le profil et le vétérinaire", () => {
    expect(t.cats).toHaveLength(1);
    expect(t.cats[0]).toMatchObject({ name: "Minou Test", sex: "male", sterilized: true, birth_date: "2019-01-02", coat: "Gris" });
    expect(t.contacts[0]).toMatchObject({ kind: "vet", name: "Dr Exemple", cat_id: t.cats[0].id });
  });
  it("crée la consultation ET la dépense liée", () => {
    expect(t.records.find(r => r.type === "consult")).toMatchObject({ date: "2025-10-20", cost: 90 });
    expect(t.expenses[0]).toMatchObject({ amount: 90, cat: "Consultations", record_id: t.records.find(r => r.type === "consult").id });
  });
  it("crée le traitement en cours et son rappel", () => {
    const rec = t.records.find(r => r.type === "traitement");
    expect(rec).toMatchObject({ status: "en cours", next_date: "2026-08-01" });
    expect(t.reminders[0]).toMatchObject({ date: "2026-08-01", record_id: rec.id });
  });
  it("convertit le journal et déduit le moment de l'heure (Bruxelles)", () => {
    const j16 = t.journal.find(j => j.date === "2026-05-16");
    const j19 = t.journal.find(j => j.date === "2026-05-19");
    expect(j16).toMatchObject({ moment: "e", a: 3, h: 1, s: "ok", vomi: false });   // 13:26 UTC = 15:26 à Bruxelles → soir
    expect(j19).toMatchObject({ moment: "e", a: 3, h: 2, vomi: true });   // 22:39 UTC = 0:39 à Bruxelles → soirée
  });
  it("garde les valeurs d'origine et les événements dans la note du jour", () => {
    const n16 = t.day_notes.find(x => x.date === "2026-05-16").note;
    expect(n16).toContain("Note de test");
    expect(n16).toContain("humeur « Agressif »");
    expect(t.day_notes.find(x => x.date === "2026-05-19").note).toContain("vomi la nuit");
  });
  it("corrige la pesée datée dans le futur (D3)", () => {
    expect(t.weights.map(w => w.date).sort()).toEqual(["2024-10-20", "2025-10-20"]);
    expect(res.report.some(r => r.kind === "transformé" && r.text.includes("2025-10-20"))).toBe(true);
  });
  it("regroupe les aliments et harmonise les marques", () => {
    expect(t.food_products.map(p => p.name + "/" + p.kind).sort()).toEqual(["Marque Pro Plan Test/croquettes", "Marque Pro Plan Test/patee"]);
    expect(t.meals).toHaveLength(3);
    expect(t.meals.find(m => m.legacy_id === "f-3")).toMatchObject({ time: "08:00", qty_g: 80, eaten: 0.5 });
  });
  it("signale le poids du profil ignoré et la puce vide", () => {
    expect(res.report.some(r => r.kind === "ignoré" && r.text.includes("5.1"))).toBe(true);
    expect(res.report.some(r => r.kind === "attention" && r.text.includes("puce"))).toBe(true);
  });
  it("garde les identifiants d'origine pour un réimport sans doublon", () => {
    const again = mapLegacyBackup(sample, { idFor: (table, legacy) => (table === "records" && legacy === "c-1" ? "existant" : null), uuid: () => "x" });
    expect(again.tables.records.find(r => r.legacy_id === "c-1").id).toBe("existant");
  });
  it("ne modifie pas l'objet source", () => {
    const copy = structuredClone(sample);
    mapLegacyBackup(copy);
    expect(copy).toEqual(sample);
  });
  it("refuse un fichier qui n'est pas une sauvegarde", () => {
    expect(() => mapLegacyBackup({ hello: 1 })).toThrow(/pas une sauvegarde/);
    expect(() => mapLegacyBackup({ source: "autre", data: { profile: [{}] } })).toThrow(/autre application/);
  });
});

/* Vrai fichier d'Amir : seulement s'il est présent sur ce PC (jamais dans git). N'affiche que des comptages. */
const REAL = new URL("../../donnees-reelles/doudou-backup-2026-06-11.json", import.meta.url);
describe.runIf(existsSync(REAL))("sauvegarde réelle (locale)", () => {
  it("s'importe sans erreur avec les comptages attendus", () => {
    const res = mapLegacyBackup(JSON.parse(readFileSync(REAL, "utf8")));
    expect(res.counts).toMatchObject({ cats: 1, records: 2, journal: 2, weights: 6, meals: 5, activities: 1, expenses: 1, reminders: 1 });
    expect(res.photo?.dataURL.startsWith("data:image/jpeg")).toBe(true);
    expect(res.tables.weights.every(w => w.date <= "2026-06-11")).toBe(true);
  });
});
