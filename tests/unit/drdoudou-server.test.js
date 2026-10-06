import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { retrieve, sanitize, buildInput, costOf, SYSTEM, NO_SOURCE } from "../../supabase/functions/dr-doudou/index.ts";

const fiches = JSON.parse(readFileSync(new URL("../../supabase/knowledge/fiches.json", import.meta.url), "utf8"));

describe("Dr. Doudou côté serveur", () => {
  it("retrouve les bonnes fiches selon la question", () => {
    expect(retrieve("Il va à la litière mais n'arrive pas à faire pipi", fiches)[0].id).toBe("urinaire-blocage");
    expect(retrieve("Il a mâchouillé un lys", fiches).map(f => f.id)).toContain("lys");
    expect(retrieve("Pourquoi mange-t-il moins depuis 3 jours ?", fiches)[0].id).toBe("appetit-jeune");
    expect(retrieve("Quand refaire son vaccin ?", fiches).map(f => f.id)).toEqual(expect.arrayContaining(["vaccins", "vaccins-rythme"]));
    expect(retrieve("Il a des puces", fiches).map(f => f.id)).toContain("puces-tiques");
  });
  it("aucune fiche pour une question hors sujet → pas d'appel au modèle", () => {
    expect(retrieve("Quelle est la capitale de la France ?", fiches)).toEqual([]);
    expect(NO_SOURCE.paragraphes[0]).toMatch(/pas de source fiable/);
  });
  it("refuse toute source absente de la liste fournie", () => {
    const allowed = retrieve("il vomit", fiches);
    const res = sanitize(JSON.stringify({ niveau: "soon", paragraphes: ["Texte https://site-inconnu.com"], fiches: ["vomissements", "wikipedia", "inventee"] }), allowed);
    expect(res.fiches).toEqual(["vomissements"]);
    expect(res.rejected).toEqual(["wikipedia", "inventee"]);
    expect(res.paragraphes[0]).not.toMatch(/https?:/);
  });
  it("niveau inconnu → prudent ; réponse illisible → rejetée", () => {
    expect(sanitize('{"niveau":"tout va bien","paragraphes":["x"],"fiches":["vomissements"]}', retrieve("vomi", fiches)).level).toBe("watch");
    expect(sanitize("pas du json", fiches)).toBeNull();
  });
  it("le modèle ne reçoit que les fiches retrouvées, et les règles interdisent diagnostic et dose", () => {
    const found = retrieve("il boit beaucoup", fiches);
    const input = buildInput("il boit beaucoup", "Mâle stérilisé, 8 ans", found);
    expect(input).toContain("[diabete-soif]");
    expect(input).not.toContain("[lys]");
    expect(SYSTEM).toMatch(/JAMAIS de diagnostic/);
    expect(SYSTEM).toMatch(/JAMAIS de médicament ni de dose/);
  });
  it("coût estimé par réponse (GPT-6 Sol, ~3 000 jetons entrée, 400 sortie) ≈ 0,01 $", () => {
    expect(costOf("gpt-6-sol", 3000, 400)).toBeCloseTo(0.01, 3);
  });
});
