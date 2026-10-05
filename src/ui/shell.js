/* Coquille : routeur #hash, feuille mobile, volet PC, toasts, indicateur de synchronisation. */
import { autoGrow, chatHTML, scrollChat } from "../screens/drdoudou.js";
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { drawCharts } from "../ui/charts.js";
import { catSVG } from "../ui/illustrations.js";
import { ico, esc } from "../utils/core.js";
import { cat, catName, ageText, lastWeight, logs, weights } from "../domain/views.js";
import { trend, weightStatus, overall } from "../domain/insights.js";
import { TODAY, fmtKg } from "../utils/core.js";

export const $ = (s, r = document) => r.querySelector(s);
export const ROUTES = {
  aujourdhui: { t: "Aujourd'hui", i: "today", g: "Quotidien" },
  journal: { t: "Journal", i: "journal", g: "Quotidien" },
  alimentation: { t: "Alimentation et poids", i: "bowl", g: "Quotidien" },
  activite: { t: "Activité et GPS", i: "paw", g: "Quotidien" },
  sante: { t: "Santé", i: "pulse", g: "Santé" },
  dossier: { t: "Dossier médical", i: "folder", g: "Santé" },
  drdoudou: { t: "Dr. Doudou", i: "doc", g: "Santé" },
  finances: { t: "Finances", i: "wallet", g: "Pratique" },
  profil: { t: "Profil de Doudou", i: "cat", g: "Pratique" },
  reglages: { t: "Réglages et données", i: "gear", g: "Pratique" }
};
export const isDesk = () => window.matchMedia("(min-width:1024px)").matches;

export function applyTheme() {
  const r = document.documentElement;
  if (S.theme === "system") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", S.theme);
  r.classList.toggle("calm", !!S.calm);
  const dark = S.theme === "dark" || (S.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0D1918" : "#F4F1EB");
}
export function buildSideNav() {
  const groups = {};
  Object.entries(ROUTES).forEach(([k, r]) => (groups[r.g] = groups[r.g] || []).push([k, r]));
  $("#sideNav").innerHTML = Object.entries(groups).map(([g, items]) => `<div class="nav-group"><h3>${g}</h3>${items.map(([k, r]) =>
    `<button class="nav-item" data-go="${k}">${ico(r.i)}${esc(routeTitle(k))}${k === "sante" && healthLevel() === "watch" ? '<span class="dotw" aria-label="un point à surveiller"></span>' : ""}</button>`).join("")}</div>`).join("");
}
/* Tant que la synchronisation (Phase 3) n'existe pas, l'état réel est « enregistré sur cet appareil ». */
export function syncLabel() {
  if (S.auth === "signed-out") return { l: "Non connecté · tes saisies restent sur l'appareil", s: "Non connecté", i: "cloud-off" };
  if (S.sync === "offline") return S.syncError ? { l: "Serveur injoignable · tes saisies sont gardées", s: "Hors ligne", i: "cloud-off" } : { l: "Hors ligne · tes saisies sont gardées", s: "Hors ligne", i: "cloud-off" };
  if (S.sync === "pending") return { l: S.pending + " saisie" + (S.pending > 1 ? "s" : "") + " en attente d'envoi", s: "En attente", i: "refresh" };
  if (S.sync === "local") return { l: "Enregistré sur cet appareil", s: "Sur l'appareil", i: "cloud" };
  const m = Math.max(0, Math.round((Date.now() - S.lastSync) / 60000));
  return { l: "À jour " + (m < 1 ? "à l'instant" : "il y a " + m + " min"), s: "À jour", i: "cloud" };
}
export function renderSync() {
  const s = syncLabel();
  const html = `<span class="dot" aria-hidden="true"></span><span class="txt-long">${s.l}</span><span class="txt-short">${s.s}</span>`;
  ["#syncTop", "#syncSide"].forEach(id => { const el = $(id); el.dataset.state = S.sync; el.innerHTML = html; el.setAttribute("aria-label", "Synchronisation : " + s.l + ". Ouvrir les réglages."); });
  $("#syncSide .txt-short").hidden = true;
  $("#offlineSlot").innerHTML = S.sync === "offline" && S.auth === "signed-in" ? `<div class="offline-banner" role="status">${ico("cloud-off")}<span><b>Hors ligne.</b> Tu peux continuer à noter : tout sera envoyé au retour du réseau.</span></div>` : "";
}
setInterval(renderSync, 30000);
/* Appelé après chaque enregistrement : la donnée est déjà écrite sur l'appareil (l'envoi arrive en Phase 3). */
export function markPending() { renderSync(); }

export function toast(msg, icon = "check") {
  const t = document.createElement("div");
  t.className = "toast"; t.innerHTML = ico(icon) + `<span>${esc(msg)}</span>`;
  $("#toasts").appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 260); }, 2600);
}

/* Feuille mobile / volet PC */
export let lastFocus = null;
export function openDetail(title, html, opts = {}) {
  if (isDesk() && !opts.sheet) {
    S.chatPinned = false;
    $("#paneTitle").textContent = title; $("#paneBody").innerHTML = html; $("#paneClose").hidden = false;
    $("#paneBody").scrollTop = 0; drawCharts($("#pane")); $("#paneBody").classList.remove("view-enter"); void $("#paneBody").offsetWidth; $("#paneBody").classList.add("view-enter");
    return;
  }
  lastFocus = document.activeElement;
  $("#sheetTitle").textContent = title; $("#sheetBody").innerHTML = html;
  const sc = $("#scrim"), sh = $("#sheet");
  sc.hidden = false; sh.hidden = false;
  requestAnimationFrame(() => { sc.classList.add("on"); sh.classList.add("on"); drawCharts(sh); });
  setTimeout(() => $("#sheetClose").focus(), 60);
}
export function closeSheet() {
  const sc = $("#scrim"), sh = $("#sheet");
  if (sh.hidden) return;
  sc.classList.remove("on"); sh.classList.remove("on");
  setTimeout(() => { sc.hidden = true; sh.hidden = true; $("#sheetBody").innerHTML = ""; }, 280);
  lastFocus?.focus?.();
}
export function closePane() { S.chatPinned = false; renderAside(); }

/* Routeur */
export function go(route, opts = {}) {
  if (!ROUTES[route]) route = "aujourdhui";
  closeSheet();
  if (S.route !== route || opts.force) { S.route = route; try { history.replaceState(null, "", "#" + route); } catch (e) {} }
  render(true);
  if (!opts.keepScroll) window.scrollTo({ top: 0 });
  if (opts.focus !== false) $("#view").focus({ preventScroll: true });
}
/* Niveau santé global (pastille de l'onglet Santé) : calculé, jamais inventé. */
export function healthLevel() {
  if (!cat()) return null;
  const l = logs();
  return overall([trend(l, "a", TODAY).level, trend(l, "h", TODAY).level, weightStatus(cat(), weights()).level]);
}
export const routeTitle = r => (S.auth === "signed-out" ? "Connexion" : r === "profil" ? "Profil de " + (cat()?.name || "ton chat") : ROUTES[r].t);
/* Carte du chat dans la barre latérale (PC) */
function renderSideCat() {
  const c = cat(), w = lastWeight();
  const b = $(".side-cat b"), s = $(".side-cat span > span");
  if (!b || !s) return;
  b.textContent = c ? c.name : "Bienvenue";
  s.textContent = c ? [ageText(c.birth_date), w ? fmtKg(w.v) : "", (c.breed || "").toLowerCase()].filter(Boolean).join(" · ") : "Crée son profil";
}
export function render(anim) {
  const title = routeTitle(S.route);
  $("#screenTitle").textContent = title;
  document.title = title + " · Doudou Healthcare";
  buildSideNav(); renderSideCat();
  document.querySelectorAll(".tab,.nav-item").forEach(b => b.dataset.go === S.route ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  const moreRoutes = ["journal", "alimentation", "activite", "finances", "profil", "reglages"];
  $("#moreTab").toggleAttribute("aria-current", moreRoutes.includes(S.route));
  if (moreRoutes.includes(S.route)) $("#moreTab").setAttribute("aria-current", "page");
  const v = $("#view");
  if (!S.ready) { v.innerHTML = skeleton(); return; }
  const out = (S.auth === "signed-out" ? SCREENS.login : SCREENS[S.route])();
  v.innerHTML = `<div class="view ${anim ? "view-enter" : ""}">${out.main}</div>`;
  v.querySelectorAll(".view > *").forEach((el, i) => { if (anim) { el.classList.add("rise"); el.style.setProperty("--i", i); } });
  drawCharts(v);
  renderAside(out);
  afterRender();
}
export function renderAside(out) {
  if (S.chatPinned) { $("#paneTitle").textContent = "Dr. Doudou"; $("#paneClose").hidden = false; $("#paneBody").innerHTML = chatHTML("pane"); scrollChat(); return; }
  out = out || (S.auth === "signed-out" ? SCREENS.login() : SCREENS[S.route] ? SCREENS[S.route]() : {});
  $("#paneClose").hidden = true;
  $("#paneTitle").textContent = out.asideTitle || "En un coup d'œil";
  $("#paneBody").innerHTML = out.aside || "";
  drawCharts($("#pane"));
}
export function skeleton() {
  return `<div class="view" aria-busy="true" aria-label="Chargement"><div class="sk" style="height:38px;width:60%"></div><div class="sk" style="height:96px"></div><div class="sk" style="height:220px"></div><div class="sk" style="height:140px"></div></div>`;
}
export function afterRender() {
  document.querySelectorAll("[data-cat-mini]").forEach(el => { if (!el.innerHTML) el.innerHTML = catSVG("content", { label: catName() }); });
  const c = $("#composer-main"); if (c) autoGrow(c);
}
window.addEventListener("scroll", () => $("#topbar").classList.toggle("scrolled", window.scrollY > 4), { passive: true });
