import { describe, it, expect } from "vitest";
import { dayOverall, trend, weightStatus, overall, weekSummary, heroTitle } from "../../src/domain/insights.js";
import { ageText } from "../../src/domain/views.js";
import { key, addDays } from "../../src/utils/core.js";

const TODAY = new Date(2026, 9, 4);
const e = (h, a, s = "ok", vomi = false) => ({ h, a, s, vomi });
function logsFrom(spec) { // spec : { joursAvant: [h, a] }
  const out = {};
  for (const [ago, [h, a, s, v]] of Object.entries(spec)) out[key(addDays(TODAY, -ago))] = { m: e(h, a, s, v), e: null, note: "", photos: [] };
  return out;
}

describe("journée globale", () => {
  it("bonne / moyenne / difficile", () => {
    expect(dayOverall({ m: e(3, 3) })).toBe("bonne");
    expect(dayOverall({ m: e(2, 2) })).toBe("moyenne");
    expect(dayOverall({ m: e(1, 1) })).toBe("difficile");
    expect(dayOverall(null)).toBeNull();
  });
});

describe("tendance de l'appétit", () => {
  it("ne conclut rien sans assez de saisies", () => {
    expect(trend(logsFrom({ 0: [3, 3], 1: [3, 3] }), "a", TODAY)).toMatchObject({ enough: false, level: null });
  });
  it("détecte une baisse nette par rapport à l'habitude", () => {
    const spec = { 0: [2, 1], 1: [2, 2], 2: [2, 1] };
    for (let i = 3; i < 13; i++) spec[i] = [3, 3];
    expect(trend(logsFrom(spec), "a", TODAY)).toMatchObject({ enough: true, dir: "baisse", level: "watch" });
  });
  it("reste stable quand rien ne change", () => {
    const spec = {};
    for (let i = 0; i < 13; i++) spec[i] = [3, 3];
    expect(trend(logsFrom(spec), "a", TODAY)).toMatchObject({ dir: "stable", level: "ok" });
  });
  it("signale deux jours « peu » d'affilée même sans historique", () => {
    expect(trend(logsFrom({ 0: [2, 1], 1: [2, 1] }), "a", TODAY)).toMatchObject({ enough: false, lowStreak: true, level: "watch" });
  });
});

describe("poids", () => {
  const ws = [{ v: 5.9 }];
  it("n'invente pas de zone idéale", () => {
    expect(weightStatus({ target_min: null }, ws)).toMatchObject({ level: null, text: expect.stringContaining("à fixer") });
    expect(weightStatus({}, [])).toMatchObject({ level: null, last: null });
  });
  it("compare à la zone fixée", () => {
    expect(weightStatus({ target_min: 5, target_max: 6 }, ws).level).toBe("ok");
    expect(weightStatus({ target_min: 4, target_max: 5 }, ws).level).toBe("watch");
  });
  it("niveau global = le plus grave connu", () => {
    expect(overall([null, "ok", "watch"])).toBe("watch");
    expect(overall([null, null])).toBeNull();
  });
});

describe("textes", () => {
  it("résume la semaine", () => {
    const s = weekSummary(logsFrom({ 0: [3, 3], 1: [3, 3], 2: [1, 1, "molles", true] }), TODAY);
    expect(s.text).toBe("2 bonnes journées sur 3 notées. Selles molles 1 jour. Vomissement noté 1 jour.");
    expect(weekSummary({}, TODAY)).toBeNull();
  });
  it("titre du héros avec le vrai nom", () => {
    expect(heroTitle("Madame", null)).toBe("Comment va Madame ?");
    expect(heroTitle("Madame", { m: e(3, 3) })).toBe("Madame est en forme");
  });
  it("âge", () => {
    expect(ageText("2018-03-21", TODAY)).toBe("8 ans");
    expect(ageText("2026-01-10", TODAY)).toBe("8 mois");
    expect(ageText(null, TODAY)).toBe("");
  });
});
