import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { retrieveLocal, promptFor } from "../../src/domain/prompt.js";
import { retrieve } from "../../supabase/functions/dr-doudou/index.ts";

const fiches = JSON.parse(readFileSync(new URL("../../supabase/knowledge/fiches.json", import.meta.url), "utf8"));
const QS = ["Il va à la litière mais n'arrive pas à faire pipi", "Pourquoi mange-t-il moins ?", "Quand refaire son vaccin ?", "Il a des puces", "il boit beaucoup", "capitale de la France ?"];

describe("prompt à copier", () => {
  it("retrouve exactement les mêmes fiches que le serveur", () => {
    for (const q of QS) expect(retrieveLocal(q, fiches).map(f => f.id)).toEqual(retrieve(q, fiches).map(f => f.id));
  });
  it("contient les règles de sécurité, le dossier, les fiches utiles et la question", () => {
    const p = promptFor("Il a des puces", "Chat : Madara, mâle.", fiches);
    expect(p).toMatch(/pas de diagnostic, pas de médicament ni de dose/);
    expect(p).toContain("Chat : Madara, mâle.");
    expect(p).toContain("FICHES DE RÉFÉRENCE");
    expect(p).toMatch(/QUESTION :\nIl a des puces$/);
  });
  it("sans fiche pertinente : pas de section fiches", () => {
    expect(promptFor("capitale de la France ?", "x", fiches)).not.toContain("FICHES DE RÉFÉRENCE");
  });
});
