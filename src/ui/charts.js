/* Graphiques SVG dessinés à la taille réelle du conteneur, avec info-bulles. */
import { ACTIVITY, EXPENSES, FOOD, LOGS, PLANNED, WEIGHTS } from "../demo/fixture.js";
import { APPETIT, HUMEUR } from "../domain/vocab.js";
import { S } from "../state.js";
import { MOIS, MOIS_C, TODAY, addDays, fmtDate, fmtEur, fmtKg, fmtShort, key, parse } from "../utils/core.js";

export const CHARTS = {};
export function chartBox(id, h = 200) { return `<div class="chart" data-chart="${id}" style="height:${h}px" role="img"></div>`; }
export function drawCharts(root = document) {
  root.querySelectorAll("[data-chart]").forEach(el => {
    const fn = CHARTS[el.dataset.chart]; if (!fn) return;
    const w = Math.max(240, el.clientWidth), h = el.clientHeight || 200;
    el.innerHTML = fn(w, h, el) + `<div class="tip"></div>`;
  });
}
export function scale(d0, d1, r0, r1) { return v => r0 + (v - d0) / (d1 - d0) * (r1 - r0); }

CHARTS.weight = (w, h, el) => {
  const since = addDays(TODAY, -(S.weightRange === 6 ? 183 : 92));
  const pts = WEIGHTS.filter(p => p.d >= since);
  el.setAttribute("aria-label", `Courbe de poids : ${fmtKg(pts[0].v)} le ${fmtDate(pts[0].d)}, ${fmtKg(pts[pts.length - 1].v)} le ${fmtDate(pts[pts.length - 1].d)}. Zone idéale 4,4 à 4,8 kg.`);
  const L = 40, R = 16, T = 14, B = 28;
  const x = scale(+since, +TODAY, L, w - R), y = scale(4.3, 4.9, h - B, T);
  let g = "";
  [4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9].forEach(v => { if (v === 4.3 || v === 4.9) return; g += `<line x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="${v === 4.4 || v === 4.8 ? "0" : "2 4"}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(1).replace(".", ",")}</text>`; });
  const band = `<rect x="${L}" y="${y(4.8)}" width="${w - R - L}" height="${y(4.4) - y(4.8)}" fill="var(--ok-tint)"/><text x="${L + 8}" y="${y(4.4) - 8}" style="fill:var(--ok);font-weight:600">zone idéale</text>`;
  const months = []; for (let m = new Date(since.getFullYear(), since.getMonth() + 1, 1); m <= TODAY; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(m);
  const xl = months.map(m => `<text x="${x(+m)}" y="${h - 8}" text-anchor="middle">${MOIS_C[m.getMonth()]}</text>`).join("");
  const path = pts.map((p, i) => (i ? "L" : "M") + x(+p.d).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const area = path + ` L${x(+pts[pts.length - 1].d)} ${h - B} L${x(+pts[0].d)} ${h - B} Z`;
  const dots = pts.map((p, i) => `<circle cx="${x(+p.d)}" cy="${y(p.v)}" r="${i === pts.length - 1 ? 6 : 3.5}" fill="${i === pts.length - 1 ? "var(--soin)" : "var(--surface)"}" stroke="var(--soin)" stroke-width="2.5" data-tip="${fmtShort(p.d)} · ${fmtKg(p.v)}"/>`).join("");
  const last = pts[pts.length - 1];
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${band}${g}${xl}<path d="${area}" fill="var(--soin)" opacity=".08"/><path d="${path}" fill="none" stroke="var(--soin)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}<text x="${Math.min(x(+last.d), w - R - 30)}" y="${y(last.v) - 12}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${fmtKg(last.v)}</text></svg>`;
};
export function trendData(field, days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(TODAY, -i - 1), l = LOGS[key(d)];
    if (!l) { out.push({ d, v: null }); continue; }
    const vals = [l.m, l.e].filter(Boolean).map(e => e[field]);
    out.push({ d, v: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null });
  }
  return out;
}
export function trendChart(field, color, label, words) {
  return (w, h, el) => {
    const days = S.period, data = trendData(field, days);
    const L = 8, R = 8, T = 10, B = 26, bw = (w - L - R) / days;
    const y = scale(0, 3, h - B, T);
    const valid = data.filter(d => d.v != null), avg = valid.reduce((a, b) => a + b.v, 0) / valid.length;
    el.setAttribute("aria-label", `${label} sur ${days} jours : moyenne ${avg.toFixed(1).replace(".", ",")} sur 3, ${words}.`);
    let bars = "";
    data.forEach((p, i) => {
      if (p.v == null) return;
      const recent = i >= days - 3;
      const bh = (h - B) - y(p.v);
      bars += `<rect x="${(L + i * bw + bw * .15).toFixed(1)}" y="${y(p.v).toFixed(1)}" width="${Math.max(1.5, bw * .7).toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(3, bw * .3).toFixed(1)}" fill="${color}" opacity="${recent ? 1 : .45}" data-tip="${fmtShort(p.d)} · ${(field === "a" ? APPETIT : HUMEUR)[Math.round(p.v)].w}"/>`;
    });
    const ticks = [1, 2, 3].map(v => `<line x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/>`).join("");
    const avgL = `<line x1="${L}" x2="${w - R}" y1="${y(avg)}" y2="${y(avg)}" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="6 4"/><text x="${w - R}" y="${y(avg) - 6}" text-anchor="end" style="fill:var(--ink)">moyenne</text>`;
    const lab = `<text x="${L}" y="${h - 6}">${fmtShort(data[0].d)}</text><text x="${w - R}" y="${h - 6}" text-anchor="end">hier</text>`;
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${ticks}${bars}${avgL}${lab}</svg>`;
  };
}
CHARTS.appetit = trendChart("a", "var(--roux)", "Appétit", "en baisse depuis 3 jours");
CHARTS.humeur = trendChart("h", "var(--soin)", "Humeur", "plutôt stable");
CHARTS.food = (w, h, el) => {
  const L = 8, R = 8, T = 22, B = 26, n = FOOD.week.length, bw = (w - L - R) / n;
  const y = scale(0, 60, h - B, T);
  el.setAttribute("aria-label", "Croquettes mangées sur 7 jours : de 50 g à 26 g aujourd'hui (journée en cours).");
  const days = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
  let s = `<line x1="${L}" x2="${w - R}" y1="${y(50)}" y2="${y(50)}" stroke="var(--soin)" stroke-dasharray="5 4"/><text x="${w - R}" y="${y(50) - 6}" text-anchor="end" style="fill:var(--soin)">ration 50 g</text>`;
  FOOD.week.forEach((v, i) => {
    const today = i === n - 1;
    s += `<rect x="${L + i * bw + bw * .2}" y="${y(v)}" width="${bw * .6}" height="${(h - B) - y(v)}" rx="6" fill="${today ? "var(--surface)" : "var(--roux)"}" stroke="var(--roux)" stroke-width="2" ${today ? 'stroke-dasharray="4 3"' : ""} data-tip="${days[i]} · ${v} g${today ? " (en cours)" : ""}"/><text x="${L + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${days[i]}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
};
CHARTS.activity = (w, h, el) => {
  const L = 8, R = 8, T = 22, B = 26, n = ACTIVITY.week.length, bw = (w - L - R) / n;
  const y = scale(0, 60, h - B, T);
  el.setAttribute("aria-label", "Minutes d'activité sur 7 jours, objectif 45 minutes.");
  let s = `<line x1="${L}" x2="${w - R}" y1="${y(45)}" y2="${y(45)}" stroke="var(--soin)" stroke-dasharray="5 4"/><text x="${w - R}" y="${y(45) - 6}" text-anchor="end" style="fill:var(--soin)">objectif 45 min</text>`;
  ACTIVITY.week.forEach((p, i) => {
    s += `<rect x="${L + i * bw + bw * .2}" y="${y(p.v)}" width="${bw * .6}" height="${(h - B) - y(p.v)}" rx="6" fill="var(--soin)" opacity="${i === n - 1 ? 1 : .55}" data-tip="${p.d} · ${p.v} min"/><text x="${L + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${p.d}</text>`;
  });
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${s}</svg>`;
};
CHARTS.money = (w, h, el) => {
  const L = 34, R = 8, T = 14, B = 26, bw = (w - L - R) / 12;
  const byM = Array(12).fill(0), plan = Array(12).fill(0);
  EXPENSES.forEach(e => byM[parse(e.d).getMonth()] += e.amt);
  PLANNED.forEach(e => plan[parse(e.d).getMonth()] += e.amt);
  const y = scale(0, 180, h - B, T);
  el.setAttribute("aria-label", "Dépenses vétérinaires par mois en 2026 : pic en août (169 €). Dépenses prévues en octobre et novembre.");
  let s = [0, 60, 120, 180].map(v => `<line x1="${L}" x2="${w - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-dasharray="2 4"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("");
  for (let m = 0; m < 12; m++) {
    const x0 = L + m * bw + bw * .18, bwi = bw * .64;
    if (byM[m]) s += `<rect x="${x0}" y="${y(byM[m])}" width="${bwi}" height="${(h - B) - y(byM[m])}" rx="4" fill="var(--soin)" data-tip="${MOIS[m]} · ${fmtEur(byM[m])}"/>`;
    if (plan[m]) s += `<rect x="${x0}" y="${y(plan[m])}" width="${bwi}" height="${(h - B) - y(plan[m])}" rx="4" fill="none" stroke="var(--soin)" stroke-width="2" stroke-dasharray="4 3" data-tip="${MOIS[m]} · ${fmtEur(plan[m])} prévus"/>`;
    s += `<text x="${L + m * bw + bw / 2}" y="${h - 6}" text-anchor="middle" style="${m === 9 ? "fill:var(--ink);font-weight:600" : ""}">${MOIS[m][0].toUpperCase()}</text>`;
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
export let rT; window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { drawCharts(); }, 120); });
