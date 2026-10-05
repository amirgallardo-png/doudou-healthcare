/* Interactions : délégation d'événements sur data-act, formulaires, clavier, photos, gestes. Toutes les écritures
   passent par le repository (écriture atomique sur l'appareil). */
import { S } from "./state.js";
import { $, ROUTES, applyTheme, closePane, closeSheet, go, isDesk, markPending, openDetail, render, syncLabel, toast } from "./ui/shell.js";
import { chartBox } from "./ui/charts.js";
import { qrSVG } from "./ui/illustrations.js";
import { TODAY, cap, esc, fmtDate, ico, key, parse, relDay, addDays } from "./utils/core.js";
import { store } from "./utils/store.js";
import { FORMS, readForm, formError } from "./ui/forms.js";
import { commit, get, wipeAll } from "./data/repo.js";
import { buildBackup, backupFileName } from "./data/backup.js";
import { importFile } from "./data/importer.js";
import { shrinkImage } from "./data/photos.js";
import { cat, catName, reminders } from "./domain/views.js";
import { QCATS, quickHTML, todayLog } from "./screens/today.js";
import { ask, autoGrow } from "./screens/drdoudou.js";
import { dayHTML, formHTML, saveDayForm, refreshDraftPhotos } from "./screens/journal.js";
import { recordHTML, recordFormHTML, deleteRecord, openVisit, visitText } from "./screens/records.js";
import { mealSheet, setMealEaten, skipMeal, mealDayFormHTML, planEditorHTML, planItemFormHTML, deletePlanItem, productFormHTML, retireProduct } from "./screens/food.js";
import { activityFormHTML } from "./screens/activity.js";
import { expenseForm } from "./screens/finances.js";
import { emergencyText, profileFormHTML, contactFormHTML, allergyFormHTML } from "./screens/profile.js";
import { importReportHTML, wipeHTML } from "./screens/settings.js";
import { weightMeaning } from "./screens/health.js";
import { records } from "./domain/views.js";
import { run as runSync, logout, logoutOthers } from "./sync/controller.js";
import { loginGo } from "./screens/login.js";

/* ---------- Saisie rapide ---------- */
export function refreshQuick() { const el = $("#quick"); if (el) el.outerHTML = quickHTML(); }
export function celebrate() {
  const pad = $("#mainPad"); pad?.classList.add("stamp");
  const c = $("#heroCat .cat");
  if (c) { c.classList.remove("blink", "purr"); void c.getBoundingClientRect(); c.classList.add("blink", "purr"); }
  const h = $("#hearts");
  if (h && !(S.calm || matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    for (let i = 0; i < 4; i++) { const s = document.createElement("span"); s.className = "heart"; s.style.left = (20 + i * 22) + "%"; s.style.top = "30%"; s.style.animationDelay = (i * 120) + "ms"; s.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><use href="#i-heart"/></svg>`; h.appendChild(s); setTimeout(() => s.remove(), 2000); }
  }
  navigator.vibrate?.(30);
}

/* Suppression en deux touches : le premier clic demande confirmation sur le bouton lui-même. */
function confirmTwice(t, label = "Confirmer la suppression") {
  if (t.dataset.confirm === "1") return true;
  t.dataset.confirm = "1"; t.classList.add("danger"); t.innerHTML = ico("alert", "sm") + label;
  setTimeout(() => { if (t.isConnected && t.dataset.confirm === "1") { delete t.dataset.confirm; } }, 6000);
  return false;
}
const done = msg => { closeSheet(); toast(msg); markPending(); render(false); };

/* ---------- Fichiers ---------- */
function download(name, text) {
  const b = new Blob([text], { type: "application/json" }), u = URL.createObjectURL(b), l = document.createElement("a");
  l.href = u; l.download = name; document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
async function exportAll() {
  try {
    const data = await buildBackup();
    download(backupFileName(), JSON.stringify(data, null, 1));
    store.set("lastExport", Date.now());
    toast("Sauvegarde téléchargée", "download"); if (S.route === "reglages") render(false);
  } catch (e) { toast("Export impossible : " + e.message, "alert"); }
}
function pickJSON() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "application/json,.json";
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      toast("Import en cours…", "refresh");
      const res = await importFile(f, { shrink: src => shrinkImage(src) });
      if (res.kind === "legacy" && res.settings?.theme && S.theme === "system") { /* le thème de l'ancienne appli n'est pas imposé */ }
      S.selRec = null; render(false); markPending();
      openDetail("Import terminé", importReportHTML(res) + `<button class="btn primary block" data-go="aujourdhui">${ico("check")}Voir ${esc(catName())}</button>`, { sheet: true });
    } catch (e) { toast(e.message, "alert"); }
  };
  inp.click();
}

/* ---------- Clics ---------- */
document.addEventListener("click", async e => {
  const g = e.target.closest("[data-go]");
  if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const t = e.target.closest("[data-act]"); if (!t) return;
  const a = t.dataset.act, v = t.dataset.v;
  try {
    switch (a) {
      /* saisie rapide */
      case "slot": S.slot = v; S.quick = { step: 0, h: null, a: null, s: null }; refreshQuick(); break;
      case "qstep": { if (t.closest("#quick .main-pad.done")) break; S.quick.step = +t.dataset.step; refreshQuick(); break; }
      case "qedit": { const sv = todayLog()?.[S.slot]; S.quick = { step: 0, h: sv?.h ?? null, a: sv?.a ?? null, s: sv?.s ?? null, editing: true }; refreshQuick(); break; }
      case "qpick": {
        const k = t.dataset.k, val = k === "s" ? v : +v;
        S.quick[k] = val;
        const idx = QCATS.findIndex(c => c.k === k);
        const next = S.quick.editing ? (idx < 2 ? idx + 1 : -1) : QCATS.findIndex(c => S.quick[c.k] == null);
        S.quick.step = next === -1 ? 3 : next;
        refreshQuick();
        document.querySelectorAll("#quick .toe")[idx]?.classList.add("lit");
        if (next === -1 && S.quick.h != null && S.quick.a != null && S.quick.s != null) {
          await commit([{ table: "journal", row: { cat_id: cat().id, date: key(TODAY), moment: S.slot, h: S.quick.h, a: S.quick.a, s: S.quick.s } }]);
          S.quick = { step: 3, h: null, a: null, s: null };
          setTimeout(() => { render(false); celebrate(); toast("Saisie " + (S.slot === "m" ? "du matin" : "du soir") + " enregistrée", "pawfill"); markPending(); }, 380);
        }
        break;
      }
      /* rappels */
      case "reminder": { const m = reminders().find(x => x.id === t.dataset.id); if (!m) break; const r = m.record_id ? records().find(x => x.id === m.record_id) : null;
        openDetail(m.title, `<p class="muted">${cap(fmtDate(parse(m.effective), true))} · ${relDay(parse(m.effective))}</p>${m.sub ? `<p>${esc(m.sub)}.</p>` : ""}${r ? `<div class="explain"><h4>${ico("folder", "sm")}Lié au dossier</h4><p class="small">${esc(r.title)}${r.explain ? " : " + esc(r.explain) : ""}</p></div>` : ""}<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="doneReminder" data-id="${m.id}">${ico("check")}C'est fait</button><button class="btn secondary" data-act="snooze" data-id="${m.id}">${ico("clock", "sm")}Me le rappeler demain</button></div>`); break; }
      case "doneReminder": { const m = get("reminders", t.dataset.id); await commit([{ table: "reminders", row: { id: m.id, done_at: new Date().toISOString() } }]); done(m.title + " : noté comme fait"); break; }
      case "snooze": await commit([{ table: "reminders", row: { id: t.dataset.id, snoozed_to: key(addDays(TODAY, 1)) } }]); closeSheet(); toast("Rappel déplacé à demain", "bell"); render(false); break;
      /* Dr. Doudou */
      case "ask": ask(t.dataset.q); break;
      /* santé */
      case "explainInd": { const k = t.dataset.k;
        const T = { poids: ["Poids", weightMeaning(), "weight"], appetit: ["Appétit", "Moyenne de ses saisies du matin et du soir, jour par jour. Un chat qui saute des repas plus de 24 heures doit être vu par un vétérinaire.", "appetit"], humeur: ["Humeur", "Barre haute = joueur, moyenne = calme, basse = grognon. Note aussi s'il se cache ou grogne quand on le touche.", "humeur"] }[k];
        openDetail(T[0], `<p>${esc(T[1])}</p>${chartBox(T[2], 180)}`, { sheet: false }); break; }
      case "wrange": S.weightRange = +v; render(false); break;
      case "period": S.period = +v; render(false); break;
      /* dossier */
      case "filter": S.filter = v; render(false); break;
      case "rec": { S.selRec = t.dataset.id; const r = records().find(x => x.id === S.selRec);
        if (isDesk()) { document.querySelectorAll(".rec[aria-current]").forEach(x => x.removeAttribute("aria-current")); t.setAttribute("aria-current", "true"); }
        openDetail("Fiche", recordHTML(r)); break; }
      case "addRec": openDetail("Ajouter un soin", recordFormHTML("consult"), { sheet: true }); break;
      case "editRec": { const r = records().find(x => x.id === t.dataset.id); openDetail("Modifier la fiche", recordFormHTML(r.type, r), { sheet: true }); break; }
      case "delRec": if (confirmTwice(t)) { await deleteRecord(t.dataset.id); S.selRec = null; done("Fiche supprimée"); } break;
      case "visit": openVisit(); break;
      case "closeVisit": $("#visitSlot").innerHTML = ""; $("[data-act=visit]")?.focus(); break;
      case "visitBg": if (e.target === t) $("#visitSlot").innerHTML = ""; break;
      case "addQ": S.visitQs.push(""); store.set("visitQs", S.visitQs); openVisit(); setTimeout(() => $(`#vq${S.visitQs.length - 1}`)?.focus(), 80); break;
      case "delQ": S.visitQs.splice(+t.dataset.i, 1); store.set("visitQs", S.visitQs); openVisit(); break;
      case "copyVisit": copyText(visitText(), "Résumé copié : colle-le dans un e-mail ou un message"); break;
      case "printVisit": window.print(); break;
      /* journal */
      case "calPrev": { let [y, m] = S.calMonth; m--; if (m < 0) { m = 11; y--; } S.calMonth = [y, m]; render(false); break; }
      case "calNext": { let [y, m] = S.calMonth; m++; if (m > 11) { m = 0; y++; } S.calMonth = [y, m]; render(false); break; }
      case "day": S.selDay = t.dataset.k;
        if (isDesk()) { document.querySelectorAll(".day[aria-current]").forEach(x => x.removeAttribute("aria-current")); t.setAttribute("aria-current", "true"); }
        openDetail(cap(fmtDate(parse(S.selDay), parse(S.selDay).getFullYear() !== TODAY.getFullYear())), dayHTML(S.selDay)); break;
      case "form": if (!cat()) { openDetail("Profil", profileFormHTML(), { sheet: true }); break; } openDetail("Saisie détaillée", formHTML(t.dataset.day), { sheet: true }); break;
      case "formToday": openDetail("Saisie détaillée", formHTML(key(TODAY)), { sheet: true }); break;
      case "fslot": openDetail("Saisie détaillée", formHTML(S.draft.k, v), { sheet: true }); break;
      case "fpick": { const f = t.dataset.f; S.draft[f] = f === "h" || f === "a" ? +v : v; t.parentElement.querySelectorAll(".choice").forEach(b => b.setAttribute("aria-pressed", b === t)); const er = $("#fErr"); if (er) er.hidden = true; break; }
      case "addPhoto": if (e.target.tagName !== "INPUT") { e.preventDefault(); S.photoMode = "day"; $("#photoInput").click(); } break;
      case "delPhoto": S.draftPhotos.splice(+t.dataset.i, 1); refreshDraftPhotos(); break;
      /* alimentation */
      case "meal": mealSheet(t.dataset.plan || null, t.dataset.meal || null); break;
      case "mealSet": await setMealEaten(t.dataset.plan || null, t.dataset.meal || null, v); break;
      case "mealChange": openDetail("Repas d'aujourd'hui", mealDayFormHTML(t.dataset.plan || null, t.dataset.meal || null), { sheet: true }); break;
      case "mealSkip": if (confirmTwice(t, "Confirmer")) await skipMeal(t.dataset.plan || null, t.dataset.meal || null); break;
      case "extraAdd": openDetail("Ajouter un extra", mealDayFormHTML(null, null), { sheet: true }); break;
      case "planEdit": openDetail("Programme de repas", planEditorHTML(), { sheet: true }); break;
      case "planItem": openDetail(t.dataset.id ? "Repas du programme" : "Nouveau repas du programme", planItemFormHTML(t.dataset.id || null), { sheet: true }); break;
      case "planItemDel": if (confirmTwice(t, "Confirmer le retrait")) await deletePlanItem(t.dataset.id); break;
      case "productAdd": openDetail("Nouvel aliment", productFormHTML(null), { sheet: true }); break;
      case "productEdit": openDetail("Aliment", productFormHTML(t.dataset.id), { sheet: true }); break;
      case "productDel": if (confirmTwice(t, "Confirmer")) await retireProduct(t.dataset.id); break;
      /* activité */
      case "activityForm": openDetail("Activité", activityFormHTML(t.dataset.k || key(TODAY)), { sheet: true }); break;
      /* finances */
      case "addExpense": openDetail("Nouvelle dépense", expenseForm(null), { sheet: true }); break;
      case "editExpense": openDetail("Dépense", expenseForm(t.dataset.id), { sheet: true }); break;
      case "delExpense": if (confirmTwice(t)) { await commit([{ table: "expenses", id: t.dataset.id, del: true }]); done("Dépense supprimée"); } break;
      /* profil */
      case "profileForm": openDetail(cat() ? "Modifier le profil" : "Créer son profil", profileFormHTML(), { sheet: true }); break;
      case "profilePhoto": S.photoMode = "profile"; $("#photoInput").click(); break;
      case "contactForm": openDetail(t.dataset.id ? "Contact" : "Nouveau contact", contactFormHTML(t.dataset.id || null), { sheet: true }); break;
      case "delContact": if (confirmTwice(t)) { await commit([{ table: "contacts", id: t.dataset.id, del: true }]); done("Contact supprimé"); } break;
      case "allergyForm": openDetail(t.dataset.id ? "Allergie" : "Nouvelle allergie", allergyFormHTML(t.dataset.id || null), { sheet: true }); break;
      case "delAllergy": if (confirmTwice(t)) { await commit([{ table: "allergies", id: t.dataset.id, del: true }]); done("Allergie supprimée"); } break;
      case "copy": copyText(v, "Numéro copié"); break;
      case "bigQR": openDetail("Carte de secours", `<div class="qr" style="width:min(320px,100%);height:auto;aspect-ratio:1;margin:0 auto">${qrSVG(emergencyText())}</div><pre class="json" style="white-space:pre-wrap">${esc(emergencyText())}</pre>`, { sheet: true }); break;
      /* réglages */
      case "export": await exportAll(); break;
      case "syncNow": toast("Synchronisation…", "refresh"); await runSync(); toast(S.sync === "ok" ? "Tout est à jour" : S.sync === "pending" ? "Encore des saisies en attente" : "Serveur injoignable : tes saisies sont gardées", S.sync === "ok" ? "cloud" : "cloud-off"); break;
      case "logout": if (confirmTwice(t, "Confirmer la déconnexion")) { await logout(); toast("Déconnecté : les données restent sur ton compte", "info"); S.devices = null; S.devicesAt = 0; render(true); } break;
      case "logoutOthers": if (confirmTwice(t, "Confirmer")) { await logoutOthers(); S.devicesAt = 0; toast("Les autres appareils devront se reconnecter", "shield"); } break;
      case "loginStep": loginGo(v); break;
      case "importFile": pickJSON(); break;
      case "wipeAsk": openDetail("Tout effacer", wipeHTML(), { sheet: true }); break;
      case "theme": S.theme = v; store.set("theme", v); applyTheme(); render(false); break;
      case "calm": S.calm = !S.calm; store.set("calm", S.calm); applyTheme(); render(false); break;
      case "goDossier": go("dossier"); break;
      case "goToday": go("aujourdhui"); break;
      /* choix par boutons (formulaires génériques) */
      case "choose": {
        const grp = t.closest(".choice-group");
        grp.querySelectorAll(".choice").forEach(b => b.setAttribute("aria-pressed", b === t));
        const f = t.closest("form");
        if (f?.dataset.form === "record" && grp.dataset.name === "type") openDetail("Ajouter un soin", recordFormHTML(v), { sheet: true });
        break;
      }
    }
  } catch (err) { console.error(err); toast("Oups : " + err.message, "alert"); }
});

/* ---------- Formulaires ---------- */
document.addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  try {
    if (f.matches(".composer")) { ask(f.querySelector("textarea").value); return; }
    if (f.id === "dayForm") { await saveDayForm(f); return; }
    if (f.dataset.form === "wipe") {
      if (readForm(f).word !== "EFFACER") return formError(f, "Écris EFFACER en majuscules pour confirmer.", "word");
      await wipeAll(); closeSheet(); toast("Toutes les données ont été effacées de cet appareil", "info"); go("aujourdhui"); return;
    }
    const fn = FORMS[f.dataset.form];
    if (fn) await fn(f, readForm(f));
  } catch (err) { console.error(err); formError(f, "L'enregistrement a échoué : " + err.message); }
});
document.addEventListener("input", e => {
  if (e.target.matches(".composer textarea")) autoGrow(e.target);
  if (e.target.dataset.vq != null) { S.visitQs[+e.target.dataset.vq] = e.target.value; store.set("visitQs", S.visitQs); }
  if (e.target.matches("[data-visit-motif]")) store.set("visitMotif", e.target.value);
  if (e.target.getAttribute("aria-invalid")) e.target.removeAttribute("aria-invalid");
});
document.addEventListener("change", e => {
  if (e.target.matches('select[name="product"]')) { const box = e.target.closest("form")?.querySelector("[data-newproduct]"); if (box) box.hidden = e.target.value !== "__new"; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if ($("#visitSlot").innerHTML) { $("#visitSlot").innerHTML = ""; return; } closeSheet(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches(".photo-add")) { e.preventDefault(); S.photoMode = "day"; $("#photoInput").click(); }
});

/* ---------- Photos (réduites sur l'appareil avant tout enregistrement) ---------- */
$("#photoInput").addEventListener("change", async e => {
  const file = e.target.files[0]; e.target.value = ""; if (!file) return;
  if (!file.type.startsWith("image/")) { toast("Ce fichier n'est pas une image", "alert"); return; }
  try {
    const p = await shrinkImage(file);
    if (S.photoMode === "profile") {
      const c = cat(), id = crypto.randomUUID();
      await commit([{ table: "photos", row: { id, cat_id: c.id, date: key(TODAY), blob: p.blob, width: p.width, height: p.height } }, { table: "cats", row: { id: c.id, photo_id: id } }]);
      toast("Photo du profil enregistrée", "camera"); render(false);
    } else {
      S.draftPhotos.push({ ...p, url: URL.createObjectURL(p.blob) });
      refreshDraftPhotos(); toast("Photo ajoutée", "camera");
    }
  } catch { toast("La photo n'a pas pu être lue. Essaie une autre image.", "alert"); }
});

export async function copyText(txt, msg) {
  try { await navigator.clipboard.writeText(txt); toast(msg, "copy"); }
  catch (er) {
    const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch (x) {}
    ta.remove(); toast(ok ? msg : "Copie impossible ici : sélectionne le texte et copie-le à la main", ok ? "copy" : "alert");
  }
}
$("#scrim").addEventListener("click", closeSheet);
$("#sheetClose").addEventListener("click", closeSheet);
$("#paneClose").addEventListener("click", closePane);
$("#dockChat").addEventListener("click", () => { go("drdoudou"); });
$("#moreTab").addEventListener("click", () => {
  const items = [["journal", "Journal", "Calendrier, notes, photos"], ["alimentation", "Alimentation", "Repas, marques, poids"], ["activite", "Activité et GPS", "Jeu, sommeil, lieu"], ["finances", "Finances", "Dépenses vétérinaires"], ["profil", "Profil", "Identité, carte de secours"], ["reglages", "Réglages", "Données, sauvegardes, thème"]];
  openDetail("Plus", `<div class="more-grid">${items.map(([k, tt, s]) => `<button class="more-item" data-go="${k}"><span class="m-ico">${ico(ROUTES[k].i)}</span><b>${tt}</b><span>${s}</span></button>`).join("")}</div>
    <button class="sync" data-go="reglages" data-state="${S.sync}" style="align-self:flex-start"><span class="dot"></span>${syncLabel().l}</button>`, { sheet: true });
});
/* glisser la feuille vers le bas pour la fermer */
(() => { let y0 = null; const sh = $("#sheet");
  sh.addEventListener("touchstart", e => { if (e.target.closest(".sheet-b") && $("#sheetBody").scrollTop > 0) return; y0 = e.touches[0].clientY; }, { passive: true });
  sh.addEventListener("touchmove", e => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
  sh.addEventListener("touchend", e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; sh.style.transform = ""; y0 = null; if (dy > 110) closeSheet(); });
})();
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);
export let wasDesk = isDesk();
window.addEventListener("resize", () => { const d = isDesk(); if (d !== wasDesk) { wasDesk = d; closeSheet(); render(false); } });
