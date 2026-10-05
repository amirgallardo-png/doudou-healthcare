/* Phrases et niveaux calculés à partir des données (fonctions pures, testées).
   Prudence : on n'affirme une tendance qu'avec assez de saisies, et le code ne dépasse jamais « à surveiller »
   ici (les règles d'urgence validées par Amir arrivent avec Dr. Doudou, Phase 4). */
import { key, addDays } from "../utils/core.js";

const avg = list => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : null);
const entries = l => (l ? [l.m, l.e].filter(Boolean) : []);
const dayVal = (l, f) => { const v = entries(l).map(e => e[f]).filter(x => x != null); return v.length ? avg(v) : null; };

/* Bonne / moyenne / difficile (même formule que le prototype) */
export function dayOverall(l) {
  const e = entries(l).filter(x => x.a != null && x.h != null);
  if (!e.length) return null;
  const v = e.reduce((s, x) => s + (x.a + x.h) / 2, 0) / e.length;
  return v >= 2.5 ? "bonne" : v >= 1.75 ? "moyenne" : "difficile";
}

/* Série d'un champ (a = appétit, h = humeur) sur n jours finissant hier (aujourd'hui est en cours). */
export function series(logs, field, days, today) {
  return Array.from({ length: days }, (_, i) => { const d = addDays(today, i - days); return { d, k: key(d), v: dayVal(logs[key(d)], field) }; });
}

/* Tendance d'un champ : 3 derniers jours (aujourd'hui compris s'il est noté) contre les 4 à 30 jours précédents. */
export function trend(logs, field, today) {
  const recentDays = [0, 1, 2].map(i => dayVal(logs[key(addDays(today, -i))], field)).filter(v => v != null);
  const base = [];
  for (let i = 3; i <= 30; i++) { const v = dayVal(logs[key(addDays(today, -i))], field); if (v != null) base.push(v); }
  const enough = recentDays.length >= 2 && base.length >= 5;
  const r = avg(recentDays), b = avg(base);
  let dir = "stable";
  if (enough && r <= b - 0.6) dir = "baisse";
  else if (enough && r >= b + 0.6) dir = "hausse";
  // Sans historique : deux jours « peu » d'affilée restent un signal à suivre.
  const lowStreak = recentDays.length >= 2 && recentDays.slice(0, 2).every(v => v <= 1);
  return { enough, recent: r, base: b, dir, lowStreak, level: dir === "baisse" || lowStreak ? "watch" : enough ? "ok" : null };
}

/* Poids par rapport à la zone fixée avec le vétérinaire (aucune zone inventée). */
export function weightStatus(cat, ws) {
  const last = ws.at(-1);
  if (!last) return { level: null, last: null, text: "Aucune pesée pour l'instant." };
  if (cat?.target_min == null || cat?.target_max == null) return { level: null, last, text: "Zone idéale à fixer avec le vétérinaire." };
  if (last.v < cat.target_min) return { level: "watch", last, text: "Sous la zone idéale." };
  if (last.v > cat.target_max) return { level: "watch", last, text: "Au-dessus de la zone idéale." };
  return { level: "ok", last, text: "Dans la zone idéale." };
}

/* Niveau global : le plus grave des indicateurs connus ; null si on ne sait rien. */
export function overall(levels) {
  const order = [null, "ok", "watch"];
  return levels.reduce((m, l) => (order.indexOf(l) > order.indexOf(m) ? l : m), null);
}

/* Résumé des 7 derniers jours. */
export function weekSummary(logs, today) {
  const days = Array.from({ length: 7 }, (_, i) => logs[key(addDays(today, -i))]).filter(l => entries(l).length);
  if (!days.length) return null;
  const good = days.filter(l => dayOverall(l) === "bonne").length;
  const soft = days.filter(l => entries(l).some(e => e.s === "molles")).length;
  const vomi = days.filter(l => entries(l).some(e => e.vomi)).length;
  const parts = [`${good} bonne${good > 1 ? "s" : ""} journée${good > 1 ? "s" : ""} sur ${days.length} notée${days.length > 1 ? "s" : ""}.`];
  parts.push(soft ? `Selles molles ${soft} jour${soft > 1 ? "s" : ""}.` : "Selles normales les jours notés.");
  if (vomi) parts.push(`Vomissement noté ${vomi} jour${vomi > 1 ? "s" : ""}.`);
  return { good, noted: days.length, text: parts.join(" ") };
}

/* Mot du héros d'après la dernière saisie du jour. */
export function heroTitle(name, l) {
  const last = l && (l.e || l.m);
  if (!last || last.h == null) return `Comment va ${name} ?`;
  return { 3: `${name} est en forme`, 2: `${name} est calme`, 1: `${name} est grognon` }[last.h];
}
export function catMood(l) {
  const last = l && (l.e || l.m);
  if (!last) return "curieux";
  return last.h === 1 ? "boudeur" : "content";
}
