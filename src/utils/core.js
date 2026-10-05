/* Outils : dates, formats, échappement (esc), icônes. */

/* Date du jour (à minuit). Mise à jour par refreshToday() quand l'appli revient au premier plan après minuit. */
export let TODAY = startOfDay(new Date());
export function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export function refreshToday(now = new Date()) { const t = startOfDay(now); const changed = +t !== +TODAY; TODAY = t; return changed; }
export const DAY = 86400000;
export const pad2 = n => String(n).padStart(2, "0");
export const key = d => d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
export const parse = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const diffDays = (a, b) => Math.round((parse(key(a)) - parse(key(b))) / DAY);
export const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
export const MOIS_C = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
export const JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
export const fmtDate = (d, y) => d.getDate() + (d.getDate() === 1 ? "er" : "") + " " + MOIS[d.getMonth()] + (y ? " " + d.getFullYear() : "");
export const fmtShort = d => d.getDate() + " " + MOIS_C[d.getMonth()];
export const fmtKg = v => v.toFixed(2).replace(".", ",").replace(/0$/, "") + " kg";
export const fmtNum = (v, dec = 1) => (+v).toLocaleString("fr-BE", { maximumFractionDigits: dec });
export const todayKey = () => key(TODAY);
export const fmtEur = v => v.toLocaleString("fr-BE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const ico = (id, cls = "") => `<svg class="ico ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
export function relDay(d) {
  const n = diffDays(d, TODAY);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  if (n > 1 && n < 14) return "dans " + n + " jours";
  if (n >= 14 && n < 60) return "dans " + Math.round(n / 7) + " semaines";
  if (n < -1 && n > -14) return "il y a " + (-n) + " jours";
  if (n <= -14 && n > -60) return "il y a " + Math.round(-n / 7) + " semaines";
  if (n <= -60 && n > -365) return "il y a " + Math.round(-n / 30) + " mois";
  if (n >= 60 && n < 365) return "dans " + Math.round(n / 30) + " mois";
  if (n >= 365) { const y = Math.round(n / 365); return "dans " + y + " an" + (y > 1 ? "s" : ""); }
  return n > 0 ? "dans " + Math.round(n / 30) + " mois" : "il y a " + Math.round(-n / 365) + " an" + (Math.round(-n / 365) > 1 ? "s" : "");
}
