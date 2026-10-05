/* Vues : transforment les lignes de la base en données prêtes à afficher (formes proches de celles du prototype).
   Lecture seule : aucune écriture ici. */
import { rows, get, currentCat } from "../data/repo.js";
import { TODAY, key, parse, addDays, diffDays } from "../utils/core.js";
import { TYPES } from "./vocab.js";

/* ---------- Chat ---------- */
export const cat = () => currentCat();
export const catName = () => cat()?.name || "ton chat";
export function ageText(birth, today = TODAY) {
  if (!birth) return "";
  const b = parse(birth);
  let months = (today.getFullYear() - b.getFullYear()) * 12 + today.getMonth() - b.getMonth() - (today.getDate() < b.getDate() ? 1 : 0);
  if (months < 0) return "";
  if (months < 12) return months + " mois";
  const y = Math.floor(months / 12);
  return y + " an" + (y > 1 ? "s" : "");
}
export function sexText(c) {
  if (!c) return "";
  const f = c.sex === "female";
  return (f ? "Femelle" : "Mâle") + (c.sterilized ? (f ? " stérilisée" : " stérilisé") : "");
}
export const hasTarget = c => c && c.target_min != null && c.target_max != null;

/* ---------- Journal : { "AAAA-MM-JJ": { m, e, note, photos:[id], w } } ---------- */
export function logs() {
  const out = {};
  const day = k => (out[k] = out[k] || { m: null, e: null, note: "", photos: [] });
  for (const j of rows("journal")) {
    if (j.h == null && j.a == null && j.s == null) continue;
    day(j.date)[j.moment] = { id: j.id, h: j.h, a: j.a, s: j.s, vomi: !!j.vomi, eau: j.eau || null };
  }
  for (const n of rows("day_notes")) { const d = day(n.date); d.note = n.note || ""; d.photos = (n.photo_ids || []).filter(id => get("photos", id)); d.noteId = n.id; }
  for (const w of rows("weights")) { const d = day(w.date); if (w.moment === "m" || d.w == null) d.w = w.kg; }
  for (const k of Object.keys(out)) { const d = out[k]; if (!d.m && !d.e && !d.note && !d.photos.length && d.w == null) delete out[k]; }
  return out;
}
export const logOf = k => logs()[k] || null;
export const journalDays = () => Object.keys(logs()).sort();

/* ---------- Poids ---------- */
export const weights = () => rows("weights").map(w => ({ id: w.id, d: parse(w.date), date: w.date, v: w.kg })).sort((a, b) => a.d - b.d);
export const lastWeight = () => weights().at(-1) || null;

/* ---------- Dossier médical ---------- */
export function recordSub(r) {
  const vet = r.vet ? r.vet : "";
  if (r.type === "traitement") return [r.status === "terminé" ? "Terminé" : "En cours", r.next_date ? "prochaine dose " + shortDate(r.next_date) : ""].filter(Boolean).join(" · ");
  if (r.type === "vaccin") return r.next_date ? "Rappel prévu le " + shortDate(r.next_date, true) : (vet || "Vaccin");
  const first = (r.fields || []).find(([k]) => k !== "Motif" && k !== "Prescrit par")?.[1] || "";
  return [vet, first].filter(Boolean).join(" · ").slice(0, 80) || TYPES[r.type].w;
}
const shortDate = (k, y) => { const d = parse(k); return d.getDate() + " " + ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][d.getMonth()] + (y ? " " + d.getFullYear() : ""); };
export function records() {
  return rows("records").filter(r => r.date).map(r => ({
    id: r.id, type: r.type, date: r.date, title: r.title, sub: recordSub(r), cost: r.cost || 0,
    fields: r.fields || [], status: r.type === "traitement" ? (r.status || "en cours") : null, next: r.next_date || null, explain: r.notes || "", vet: r.vet || ""
  })).sort((a, b) => b.date.localeCompare(a.date));
}
export const activeTreatments = () => records().filter(r => r.type === "traitement" && r.status === "en cours");
export const vaccines = () => records().filter(r => r.type === "vaccin");

/* ---------- Rappels (non faits), du plus proche au plus lointain ; les retards d'abord ---------- */
export function reminders() {
  return rows("reminders").filter(m => !m.done_at && m.date).map(m => ({ ...m, effective: m.snoozed_to && m.snoozed_to > m.date ? m.snoozed_to : m.date }))
    .sort((a, b) => a.effective.localeCompare(b.effective));
}

/* ---------- Dépenses ---------- */
export const expenses = () => rows("expenses").filter(e => e.date && !e.planned).sort((a, b) => b.date.localeCompare(a.date));
export const planned = () => rows("expenses").filter(e => e.date && e.planned && e.date >= key(TODAY)).sort((a, b) => a.date.localeCompare(b.date));
export const expensesOfYear = y => expenses().filter(e => e.date.startsWith(String(y)));

/* ---------- Alimentation ---------- */
export const products = () => rows("food_products").filter(p => p.active !== false).sort((a, b) => a.name.localeCompare(b.name, "fr"));
export const product = id => get("food_products", id);
export const plan = () => rows("meal_plan").filter(p => p.active !== false).sort((a, b) => (a.time || "").localeCompare(b.time || "") || (a.order || 0) - (b.order || 0));
/* Repas d'un jour = programme (sauf modification ce jour-là) + extras du jour. */
export function mealsOf(k) {
  const logged = rows("meals").filter(m => m.date === k);
  const out = [];
  for (const p of plan()) {
    const m = logged.find(x => x.plan_id === p.id);
    if (m?.skipped) continue;
    out.push({ planId: p.id, mealId: m?.id || null, time: m?.time || p.time, productId: m?.product_id || p.product_id, qty: m?.qty_g ?? p.qty_g, eaten: m?.eaten ?? null, changed: !!m && (m.product_id !== p.product_id || m.qty_g !== p.qty_g || m.time !== p.time), extra: false });
  }
  for (const m of logged.filter(x => !x.plan_id && !x.skipped)) out.push({ planId: null, mealId: m.id, time: m.time, productId: m.product_id, qty: m.qty_g, eaten: m.eaten ?? null, changed: false, extra: true });
  return out.sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}
const isDry = id => product(id)?.kind === "croquettes";
/* Ration et quantité mangée (en g) : croquettes si le programme en contient, sinon tous les aliments. */
export function rationOf(k) {
  const list = mealsOf(k);
  const dryOnly = list.some(m => isDry(m.productId));
  const pick = list.filter(m => !dryOnly || isDry(m.productId));
  const planned = pick.filter(m => !m.extra).reduce((s, m) => s + (+m.qty || 0), 0);
  const noted = pick.filter(m => m.eaten != null);
  return { dryOnly, planned, eaten: noted.reduce((s, m) => s + (+m.qty || 0) * m.eaten, 0), notedCount: noted.length, left: list.filter(m => m.eaten == null).length };
}
export const foodWeek = () => Array.from({ length: 7 }, (_, i) => { const d = addDays(TODAY, i - 6), k = key(d); const r = rationOf(k); return { d, k, v: r.notedCount ? Math.round(r.eaten) : null, planned: r.planned }; });

/* ---------- Activité ---------- */
export const activities = () => rows("activities").filter(a => a.date).sort((a, b) => b.date.localeCompare(a.date));
export const activityOf = k => rows("activities").find(a => a.date === k) || null;
export const activityWeek = () => Array.from({ length: 7 }, (_, i) => { const d = addDays(TODAY, i - 6); const a = activityOf(key(d)); return { d, v: a?.minutes ?? null }; });

/* ---------- Contacts et allergies ---------- */
export const contacts = () => rows("contacts").sort((a, b) => ["vet", "urgence", "proche"].indexOf(a.kind) - ["vet", "urgence", "proche"].indexOf(b.kind));
export const vet = () => contacts().find(c => c.kind === "vet") || null;
export const emergency = () => contacts().find(c => c.kind === "urgence") || null;
export const allergies = () => rows("allergies");

/* ---------- Divers ---------- */
export const daysAgo = k => diffDays(TODAY, parse(k));
export const isEmpty = () => !cat();
