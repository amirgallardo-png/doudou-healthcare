/* Graphiques SVG dessinés à la taille réelle du conteneur, avec info-bulles (style du prototype, données réelles). */
import { S } from "../state.js";
import { MOIS, MOIS_C, TODAY, addDays, fmtDate, fmtKg, fmtShort, fmtEur, parse, esc } from "../utils/core.js";
import { APPETIT, HUMEUR } from "../domain/vocab.js";
import { weights, logs, cat, hasTarget, foodWeek, activityWeek, expensesOfYear, planned } from "../domain/views.js";
import { series } from "../domain/insights.js";

export const CHARTS = {};
export function chartBox(id, h = 200) { return `<div class="chart" data-chart="${id}" style="height:${h}px" role="img"></div>`; }
export function drawCharts(root = document) {
  root.querySelectorAll("[data-chart]").forEach(el => {
    const fn = CHARTS[el.dataset.chart]; if (!fn) return;
    const w = Math.max(240, el.clientWidth), h = el.clientHeight || 200;
    el.innerHTML = fn(w, h, el) + `<div class="tip"></div>`;
  });
}
export function scale(d0, d1, r0, r1) { return v => r0 + (v - d0) / ((d1 - d0) || 1) * (r1 - r0); }
const empty = (w, h, msg) => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><text x="${w / 2}" y="${h / 2}" text-anchor="middle">${esc(msg)}</text></svg>`;
const DOW = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/* Période du poids : 3 mois, 6 mois ou tout (0). */
export function weightPoints(range = S.weightRange) {
  const all = weights();
  if (!range) return { pts: all, since: all[0]?.d || addDays(TODAY, -183) };
  const since = addDays(TODAY, -(range === 6 ? 183 : 92));
  return { pts: all.filter(p => p.d >= since), since };
}
CHARTS.weight = (w, h, el) => {
  const { pts, since } = weightPoints();
  if (!pts.length) { el.setAttribute("aria-label", "Pas de pesée sur cette période."); return empty(w, h, "Pas de pesée sur cette période"); }
  const c = cat(), tgt = hasTarget(c);
  el.setAttribute("aria-label", `Courbe de poids : ${fmtKg(pts[0].v)} le ${fmtDate(pts[0].d, true)}, ${fmtKg(pts.at(-1).v)} le ${fmtDate(pts.at(-1).d, true)}.${tgt ? ` Zone idéale ${String(c.target_min).replace(".", ",")} à ${String(c.target_max).replace(".", ",")} kg.` : ""}`);
  const vals = pts.map(p => p.v).concat(tgt ? [c.target_min, c.target_max] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, 0.4);
  const step = span > 3 ? 1 : span > 1.2 ? 0.5 : 0.1;
  lo = Math.floor((lo - span * 0.12) / step) * step; hi = Math.ceil((hi + span * 0.12) / step) * step;
  const L = 40, R = 16, T = 14, B = 28;
  const x0 = Math.min(+since, +pts[0].d), x = scale(x0, +TODAY, L, w - R), y = scale(lo, hi, h - B, T);
  let g = "";
  for (let v = lo + step; v < hi - step / 2; v += step) g += `<line x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${(+v.toFixed(1)).toString().replace(".", ",")}</text>`;
  const band = tgt ? `<rect x="${L}" y="${y(c.target_max)}" width="${w - R - L}" height="${y(c.target_min) - y(c.target_max)}" fill="var(--ok-tint)"/><text x="${L + 8}" y="${y(c.target_min) - 8}" style="fill:var(--ok);font-weight:600">zone idéale</text>` : "";
  const years = (+TODAY - x0) / 864e5 > 540;
  const ticks = [];
  if (years) for (let yy = new Date(x0).getFullYear() + 1; yy <= TODAY.getFullYear(); yy++) ticks.push([new Date(yy, 0, 1), String(yy)]);
  else for (let m = new Date(new Date(x0).getFullYear(), new Date(x0).getMonth() + 1, 1); m <= TODAY; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) ticks.push([m, MOIS_C[m.getMonth()]]);
  // une étiquette sur n quand la place manque (au moins ~44 px entre deux étiquettes)
  const every = Math.max(1, Math.ceil(ticks.length / Math.max(1, Math.floor((w - L - R) / 44))));
  const xl = ticks.filter((_, i) => i % every === 0).map(([d, t]) => `<text x="${x(+d)}" y="${h - 8}" text-anchor="middle">${t}</text>`).join("");
  const path = pts.map((p, i) => (i ? "L" : "M") + x(+p.d).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const area = path + ` L${x(+pts.at(-1).d)} ${h - B} L${x(+pts[0].d)} ${h - B} Z`;
  const dots = pts.map((p, i) => `<circle cx="${x(+p.d)}" cy="${y(p.v)}" r="${i === pts.length - 1 ? 6 : 3.5}" fill="${i === pts.length - 1 ? "var(--soin)" : "var(--surface)"}" stroke="var(--soin)" stroke-width="2.5" data-tip="${fmtShort(p.d)}${years ? " " + p.d.getFullYear() : ""} · ${fmtKg(p.v)}"/>`).join("");
  const last = pts.at(-1);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${band}${g}${xl}<path d="${area}" fill="var(--soin)" opacity=".08"/><path d="${path}" fill="none" stroke="var(--soin)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}<text x="${Math.min(Math.max(x(+last.d), L + 30), w - R - 30)}" y="${y(last.v) - 12}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${fmtKg(last.v)}</text></svg>`;
};

function trendChart(field, color, label) {
  return (w, h, el) => {
    const days = S.period, data = series(logs(), field, days, TODAY);
    const valid = data.filter(d => d.v != null);
    if (!valid.length) { el.setAttribute("aria-label", `${label} : aucune saisie sur ${days} jours.`); return empty(w, h, `Aucune saisie sur ${days} jours`); }
    const L = 8, R = 8, T = 10, B = 26, bw = (w - L - R) / days;
    const y = scale(0, 3, h - B, T);
    const avg = valid.reduce((a, b) => a + b.v, 0) / valid.length;
    el.setAttribute("aria-label", `${label} sur ${days} jours : ${valid.length} jour${valid.length > 1 ? "s" : ""} noté${valid.length > 1 ? "s" : ""}, moyenne ${avg.toFixed(1).replace(".", ",")} sur 3.`);
    let bars = "";
    data.forEach((p, i) => {
      if (p.v == null) return;
      const recent = i >= days - 3, bh = (h - B) - y(p.v);
      bars += `<rect x="${(L + i * bw + bw * .15).toFixed(1)}" y="${y(p.v).toFixed(1)}" width="${Math.max(1.5, bw * .7).toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(3, bw * .3).toFixed(1)}" fill="${color}" opacity="${recent ? 1 : .45}" data-tip="${fmtShort(p.d)} · ${(field === "a" ? APPETIT : HUMEUR)[Math.round(p.v)].w}"/>`;
    });
    const ticks = [1, 2, 3].map(v => `<line x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/>`).join("");
    const avgL = valid.length >= 3 ? `<line x1="${L}" x2="${w - R}" y1="${y(avg)}" y2="${y(avg)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${w - R}" y="${y(avg) - 6}" text-anchor="end" style="fill:var(--ink)">moyenne</text>` : "";
    const lab = `<text x="${L}" y="${h - 6}">${fmtShort(data[0].d)}</text><text x="${w - R}" y="${h - 6}" text-anchor="end">hier</text>`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${ticks}${bars}${avgL}${lab}</svg>`;
  };
}
CHARTS.appetit = trendChart("a", "var(--roux)", "Appétit");
CHARTS.humeur = trendChart("h", "var(--soin)", "Humeur");

CHARTS.food = (w, h, el) => {
  const wk = foodWeek(), ration = Math.max(0, ...wk.map(d => d.planned));
  if (!wk.some(d => d.v != null)) { el.setAttribute("aria-label", "Aucun repas noté sur 7 jours."); return empty(w, h, "Aucun repas noté sur 7 jours"); }
  const L = 8, R = 8, T = 22, B = 26, n = wk.length, bw = (w - L - R) / n;
  const top = Math.max(ration, ...wk.map(d => d.v || 0)) * 1.2 || 60;
  const y = scale(0, top, h - B, T);
  el.setAttribute("aria-label", `Quantité mangée sur 7 jours${ration ? `, ration ${ration} g` : ""} : ${wk.map(d => `${DOW[d.d.getDay()]} ${d.v == null ? "non noté" : d.v + " g"}`).join(", ")}.`);
  let s = ration ? `<line x1="${L}" x2="${w - R}" y1="${y(ration)}" y2="${y(ration)}" stroke="var(--soin)" stroke-dasharray="5 4"/><text x="${w - R}" y="${y(ration) - 6}" text-anchor="end" style="fill:var(--soin)">ration ${ration} g</text>` : "";
  wk.forEach((d, i) => {
    const today = i === n - 1;
    if (d.v != null) s += `<rect x="${L + i * bw + bw * .2}" y="${y(d.v)}" width="${bw * .6}" height="${Math.max(0, (h - B) - y(d.v))}" rx="6" fill="${today ? "var(--surface)" : "var(--roux)"}" stroke="var(--roux)" stroke-width="2" ${today ? 'stroke-dasharray="4 3"' : ""} data-tip="${DOW[d.d.getDay()]} · ${d.v} g${today ? " (en cours)" : ""}"/>`;
    s += `<text x="${L + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${DOW[d.d.getDay()]}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
};

CHARTS.activity = (w, h, el) => {
  const wk = activityWeek(), goal = cat()?.activity_goal || null;
  if (!wk.some(d => d.v != null)) { el.setAttribute("aria-label", "Aucune activité notée sur 7 jours."); return empty(w, h, "Aucune activité notée sur 7 jours"); }
  const L = 8, R = 8, T = 22, B = 26, n = wk.length, bw = (w - L - R) / n;
  const y = scale(0, Math.max(goal || 0, ...wk.map(d => d.v || 0)) * 1.25, h - B, T);
  el.setAttribute("aria-label", `Minutes d'activité sur 7 jours${goal ? `, objectif ${goal} minutes` : ""}.`);
  let s = goal ? `<line x1="${L}" x2="${w - R}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--soin)" stroke-dasharray="5 4"/><text x="${w - R}" y="${y(goal) - 6}" text-anchor="end" style="fill:var(--soin)">objectif ${goal} min</text>` : "";
  wk.forEach((d, i) => {
    if (d.v != null) s += `<rect x="${L + i * bw + bw * .2}" y="${y(d.v)}" width="${bw * .6}" height="${Math.max(0, (h - B) - y(d.v))}" rx="6" fill="var(--soin)" opacity="${i === n - 1 ? 1 : .55}" data-tip="${DOW[d.d.getDay()]} · ${d.v} min"/>`;
    s += `<text x="${L + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${DOW[d.d.getDay()]}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
};

CHARTS.money = (w, h, el) => {
  const yr = TODAY.getFullYear();
  const byM = Array(12).fill(0), plan = Array(12).fill(0);
  expensesOfYear(yr).forEach(e => byM[parse(e.date).getMonth()] += e.amount);
  planned().filter(e => e.date.startsWith(String(yr))).forEach(e => plan[parse(e.date).getMonth()] += e.amount);
  const max = Math.max(...byM, ...plan);
  if (!max) { el.setAttribute("aria-label", `Aucune dépense en ${yr}.`); return empty(w, h, `Aucune dépense en ${yr}`); }
  const stepV = max > 600 ? 200 : max > 300 ? 100 : max > 120 ? 60 : 20, top = Math.ceil(max / stepV) * stepV;
  const L = 40, R = 8, T = 14, B = 26, bw = (w - L - R) / 12;
  const y = scale(0, top, h - B, T);
  const peak = byM.indexOf(Math.max(...byM));
  el.setAttribute("aria-label", `Dépenses vétérinaires par mois en ${yr}${Math.max(...byM) ? ` : pic en ${MOIS[peak]} (${fmtEur(byM[peak])})` : ""}.${plan.some(Boolean) ? " Dépenses prévues indiquées en pointillés." : ""}`);
  let s = "";
  for (let v = 0; v <= top; v += stepV) s += `<line x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  for (let m = 0; m < 12; m++) {
    const x0 = L + m * bw + bw * .18, bwi = bw * .64;
    if (byM[m]) s += `<rect x="${x0}" y="${y(byM[m])}" width="${bwi}" height="${(h - B) - y(byM[m])}" rx="4" fill="var(--soin)" data-tip="${MOIS[m]} · ${fmtEur(byM[m])}"/>`;
    if (plan[m]) s += `<rect x="${x0}" y="${y(plan[m])}" width="${bwi}" height="${(h - B) - y(plan[m])}" rx="4" fill="none" stroke="var(--soin)" stroke-width="2" stroke-dasharray="4 3" data-tip="${MOIS[m]} · ${fmtEur(plan[m])} prévus"/>`;
    s += `<text x="${L + m * bw + bw / 2}" y="${h - 6}" text-anchor="middle" style="${m === TODAY.getMonth() ? "fill:var(--ink);font-weight:600" : ""}">${MOIS[m][0].toUpperCase()}</text>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
};

/* info-bulles des graphiques */
document.addEventListener("pointerover", e => {
  const t = e.target.closest("[data-tip]"); if (!t) return;
  const box = t.closest(".chart"); if (!box) return;
  const tip = box.querySelector(".tip"), r = t.getBoundingClientRect(), b = box.getBoundingClientRect();
  tip.textContent = t.dataset.tip;
  tip.style.left = Math.min(Math.max(r.left - b.left + r.width / 2, 60), b.width - 60) + "px";
  tip.style.top = (r.top - b.top - 8) + "px";
  tip.classList.add("on");
});
document.addEventListener("pointerout", e => { const t = e.target.closest("[data-tip]"); if (t) t.closest(".chart")?.querySelector(".tip")?.classList.remove("on"); });
let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { drawCharts(); }, 120); });
