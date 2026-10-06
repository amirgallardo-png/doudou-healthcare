/* Dossier de Dr. Doudou : ce que l'IA reçoit (texte compact) et ce que l'écran montre (« d'après… »).
   Tout est calculé à partir des données réelles ; rien n'est inventé. Fonctions de lecture uniquement. */
import { TODAY, key, addDays, fmtKg, fmtDate } from "../utils/core.js";
import { cat, ageText, sexText, weights, logs, allergies, activeTreatments, vaccines, plan, product, mealsOf, hasTarget } from "./views.js";
import { HUMEUR, APPETIT, SELLES } from "./vocab.js";

const lastDays = n => Array.from({ length: n }, (_, i) => key(addDays(TODAY, -i)));

/* Contexte des règles d'urgence calculé sur le journal et les pesées. */
export function urgencyContext() {
  const c = cat(), all = logs();
  let lowAppetiteDays = 0, vomitStreak = 0;
  for (const k of lastDays(7)) { const l = all[k], e = l ? [l.m, l.e].filter(Boolean) : []; if (!e.length) { if (k === key(TODAY)) continue; break; } if (e.every(x => x.a === 1)) lowAppetiteDays++; else break; }
  for (const k of lastDays(7)) { const l = all[k], e = l ? [l.m, l.e].filter(Boolean) : []; if (!e.length && k === key(TODAY)) continue; if (e.some(x => x.vomi)) vomitStreak++; else break; }
  const since = addDays(TODAY, -31), ws = weights().filter(w => w.d >= since);
  const max = ws.length ? Math.max(...ws.map(w => w.v)) : null, last = ws.at(-1);
  const weightLossPct = max && last && ws.length >= 2 ? Math.round((max - last.v) / max * 1000) / 10 : 0;
  return { sex: c?.sex || null, lowAppetiteDays, vomitStreak, weightLossPct };
}

/* Résumé texte (envoyé à l'IA) + lignes « d'après… » (montrées à l'utilisateur). */
export function buildDossier() {
  const c = cat();
  if (!c) return { text: "(profil non renseigné)", lines: [] };
  const out = [], lines = [];
  out.push(`Chat : ${c.name}, ${[c.breed, sexText(c).toLowerCase(), ageText(c.birth_date)].filter(Boolean).join(", ")}.`);
  const al = allergies();
  out.push(`Allergies : ${al.length ? al.map(a => a.name + (a.detail ? " (" + a.detail + ")" : "")).join(", ") : "aucune notée"}.`);
  const tr = activeTreatments();
  if (tr.length) out.push(`Traitement en cours : ${tr.map(t => t.title + (t.next ? ", prochaine dose " + t.next : "")).join(" ; ")}.`);
  const vx = vaccines();
  if (vx.length) out.push(`Vaccins : ${vx.map(v => `${v.title} fait le ${v.date}${v.next ? ", rappel " + v.next : ""}`).join(" ; ")}.`);
  const ws = weights(), recent = ws.filter(w => w.d >= addDays(TODAY, -92));
  if (ws.length) {
    out.push(`Pesées (3 derniers mois) : ${recent.length ? recent.map(w => `${w.date} ${w.v} kg`).join(", ") : "aucune ; dernière " + ws.at(-1).date + " " + ws.at(-1).v + " kg"}.${hasTarget(c) ? ` Zone idéale ${c.target_min}–${c.target_max} kg.` : ""}`);
    lines.push(recent.length > 1 ? `D'après les pesées des 3 derniers mois : ${fmtKg(recent[0].v)} → ${fmtKg(recent.at(-1).v)}.` : `D'après sa dernière pesée : ${fmtKg(ws.at(-1).v)} (${fmtDate(ws.at(-1).d, true)}).`);
  }
  const all = logs(), days = lastDays(14).filter(k => all[k] && (all[k].m || all[k].e));
  if (days.length) {
    const word = (o, v) => (v != null && o[v] ? o[v].w.toLowerCase() : "?");
    out.push("Journal (14 derniers jours) : " + days.map(k => { const l = all[k]; return `${k} ` + ["m", "e"].filter(s => l[s]).map(s => `${s === "m" ? "matin" : "soir"} humeur ${word(HUMEUR, l[s].h)}, appétit ${word(APPETIT, l[s].a)}, selles ${word(SELLES, l[s].s)}${l[s].vomi ? ", vomissement" : ""}`).join(" / ") + (l.note ? ` — note : ${l.note.slice(0, 120)}` : ""); }).join(" | ") + ".");
    const low = days.filter(k => [all[k].m, all[k].e].some(e => e?.a === 1)).length;
    lines.push(`D'après le journal des 14 derniers jours (${days.length} jour${days.length > 1 ? "s" : ""} noté${days.length > 1 ? "s" : ""}) : appétit « peu » ${low} fois.`);
  }
  const pl = plan();
  if (pl.length) {
    out.push(`Repas prévus chaque jour : ${pl.map(p => `${p.time} ${product(p.product_id)?.name || "?"} ${p.qty_g ?? "?"} g`).join(", ")}.`);
    const today = mealsOf(key(TODAY)).filter(m => m.eaten != null);
    if (today.length) out.push(`Aujourd'hui : ${today.map(m => `${m.time} mangé ${Math.round(m.eaten * 100)} %`).join(", ")}.`);
  }
  if (!lines.length) lines.push("Je n'ai encore que son profil : ses saisies du journal et ses pesées affineront mes réponses.");
  return { text: out.join("\n").slice(0, 6000), lines };
}
