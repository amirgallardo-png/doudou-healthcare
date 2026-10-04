/* Interactions : délégation d'événements sur data-act, formulaires, clavier, photos, gestes. */
import { CAT, EXPENSES, FOOD, LOGS, RECORDS, REMINDERS, WEIGHTS } from "./demo/fixture.js";
import { answer, ask, autoGrow } from "./screens/drdoudou.js";
import { expenseForm } from "./screens/finances.js";
import { dayHTML, formHTML, photosHTML } from "./screens/journal.js";
import { openVisit, recordHTML, visitText } from "./screens/records.js";
import { QCATS, quickHTML, todayLog } from "./screens/today.js";
import { S } from "./state.js";
import { chartBox } from "./ui/charts.js";
import { qrSVG } from "./ui/illustrations.js";
import { $, ROUTES, applyTheme, buildSideNav, closePane, closeSheet, go, isDesk, markPending, openDetail, render, renderAside, renderSync, syncLabel, toast } from "./ui/shell.js";
import { TODAY, cap, esc, fmtDate, fmtEur, ico, key, parse, relDay } from "./utils/core.js";
import { store } from "./utils/store.js";

export function refreshQuick() { const el = $("#quick"); if (el) el.outerHTML = quickHTML(); }
export function celebrate() {
  const pad = $("#mainPad"); pad?.classList.add("stamp");
  const cat = $("#heroCat .cat");
  if (cat) { cat.classList.remove("blink", "purr"); void cat.getBoundingClientRect(); cat.classList.add("blink", "purr"); }
  const h = $("#hearts");
  if (h && !(S.calm || matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    for (let i = 0; i < 4; i++) { const s = document.createElement("span"); s.className = "heart"; s.style.left = (20 + i * 22) + "%"; s.style.top = "30%"; s.style.animationDelay = (i * 120) + "ms"; s.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18"><use href="#i-heart"/></svg>`; h.appendChild(s); setTimeout(() => s.remove(), 2000); }
  }
  navigator.vibrate?.(30);
}

/* ---------- Événements ---------- */
document.addEventListener("click", e => {
  const g = e.target.closest("[data-go]");
  if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const t = e.target.closest("[data-act]"); if (!t) return;
  const a = t.dataset.act, v = t.dataset.v;
  switch (a) {
    case "slot": S.slot = v; S.quick = { step: 0, h: null, a: null, s: null }; refreshQuick(); break;
    case "qstep": if (!t.closest("#quick .main-pad.done")) { S.quick.step = +t.dataset.step; const sv = todayLog()?.[S.slot]; if (sv && !S.quick.h && !S.quick.a && !S.quick.s) S.quick = { step: +t.dataset.step, ...sv }; refreshQuick(); } break;
    case "qedit": { const sv = todayLog()?.[S.slot]; S.quick = { step: 0, h: null, a: null, s: null }; if (sv) { delete todayLog()[S.slot]; } refreshQuick(); break; }
    case "qpick": {
      const k = t.dataset.k, val = k === "s" ? v : +v;
      S.quick[k] = val;
      const idx = QCATS.findIndex(c => c.k === k);
      const next = QCATS.findIndex(c => S.quick[c.k] == null);
      S.quick.step = next === -1 ? 3 : next;
      refreshQuick();
      const toe = document.querySelectorAll("#quick .toe")[idx]; toe?.classList.add("lit");
      if (next === -1) {
        const tk = key(TODAY); LOGS[tk] = LOGS[tk] || { m: null, e: null, note: "", photos: [] };
        LOGS[tk][S.slot] = { h: S.quick.h, a: S.quick.a, s: S.quick.s };
        S.quick = { step: 3, h: null, a: null, s: null };
        setTimeout(() => { refreshQuick(); celebrate(); toast("Saisie " + (S.slot === "m" ? "du matin" : "du soir") + " enregistrée", "pawfill"); markPending(); renderAside(); }, 380);
      }
      break;
    }
    case "reminder": { const m = REMINDERS.find(x => x.id === t.dataset.id); const r = RECORDS.find(x => x.id === m.rec);
      openDetail(m.title, `<p class="muted">${cap(fmtDate(parse(m.date), true))} · ${relDay(parse(m.date))}</p><p>${m.sub}.</p>${r ? `<div class="explain"><h4>${ico("folder", "sm")}Lié au dossier</h4><p class="small">${r.title} : ${r.explain}</p></div>` : ""}<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="doneReminder" data-id="${m.id}">${ico("check")}C'est fait</button><button class="btn secondary" data-act="snooze">${ico("clock", "sm")}Me le rappeler demain</button></div>`); break; }
    case "doneReminder": { const i = REMINDERS.findIndex(x => x.id === t.dataset.id); const m = REMINDERS.splice(i, 1)[0]; closeSheet(); toast(m.title + " : noté comme fait"); markPending(); render(false); break; }
    case "snooze": closeSheet(); toast("Rappel déplacé à demain", "bell"); renderAside(); break;
    case "ask":
      if (!isDesk()) go("drdoudou", { focus: false });
      else if (S.route !== "drdoudou") { S.chatPinned = true; renderAside(); }
      ask(t.dataset.q); break;
    case "retry": { const i = S.chat.findIndex(m => m.id === +t.dataset.id); const q = S.chat[i].q; S.chat.splice(i, 1); answer(q); break; }
    case "explainInd": { const k = t.dataset.k; const T = { poids: ["Poids", "Le poids de Doudou est de 4,60 kg. Sa zone idéale, fixée avec le Dr Martin, va de 4,4 à 4,8 kg. Il a perdu 200 g depuis fin juillet, comme le conseillait le bilan d'août.", "weight"], appetit: ["Appétit", "Depuis le 1er octobre, il mange environ la moitié de sa ration. Un chat qui saute des repas plus de 24 heures doit être vu par un vétérinaire, car le jeûne peut abîmer son foie.", "appetit"], humeur: ["Humeur", "Il est calme, un peu moins joueur. Aucun signe de douleur n'a été noté (il ne se cache pas, ne grogne pas quand on le touche).", "humeur"] }[k];
      openDetail(T[0], `<p>${T[1]}</p>${chartBox(T[2], 180)}<button class="btn secondary" data-act="ask" data-q="${k === "poids" ? "Son poids est-il normal ?" : "Pourquoi mange-t-il moins depuis 3 jours ?"}">${ico("doc", "sm")}En parler à Dr. Doudou</button>`, { sheet: false }); break; }
    case "wrange": S.weightRange = +v; render(false); break;
    case "period": S.period = +v; render(false); break;
    case "filter": S.filter = v; render(false); break;
    case "rec": { S.selRec = t.dataset.id; const r = RECORDS.find(x => x.id === S.selRec);
      if (isDesk()) { document.querySelectorAll(".rec[aria-current]").forEach(x => x.removeAttribute("aria-current")); t.setAttribute("aria-current", "true"); }
      openDetail("Fiche", recordHTML(r)); break; }
    case "visit": openVisit(); break;
    case "closeVisit": $("#visitSlot").innerHTML = ""; $("[data-act=visit]")?.focus(); break;
    case "visitBg": if (e.target === t) $("#visitSlot").innerHTML = ""; break;
    case "addQ": S.visitQs.push(""); openVisit(); setTimeout(() => $(`#vq${S.visitQs.length - 1}`)?.focus(), 80); break;
    case "delQ": S.visitQs.splice(+t.dataset.i, 1); openVisit(); break;
    case "copyVisit": copyText(visitText(), "Résumé copié : colle-le dans un e-mail ou un message"); break;
    case "printVisit": window.print(); break;
    case "calPrev": { let [y, m] = S.calMonth; m--; if (m < 0) { m = 11; y--; } S.calMonth = [y, m]; render(false); break; }
    case "calNext": { let [y, m] = S.calMonth; m++; if (m > 11) { m = 0; y++; } S.calMonth = [y, m]; render(false); break; }
    case "day": S.selDay = t.dataset.k;
      if (isDesk()) { document.querySelectorAll(".day[aria-current]").forEach(x => x.removeAttribute("aria-current")); t.setAttribute("aria-current", "true"); }
      openDetail(cap(fmtDate(parse(S.selDay))), dayHTML(S.selDay)); break;
    case "form": openDetail("Saisie détaillée", formHTML(t.dataset.day)); break;
    case "formToday": S.empty = false; openDetail("Saisie détaillée", formHTML(key(TODAY))); break;
    case "fslot": S.draft.slot = v; t.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b === t)); break;
    case "fpick": { const f = t.dataset.f; S.draft[f] = f === "h" || f === "a" ? +v : v; t.parentElement.querySelectorAll(".choice").forEach(b => b.setAttribute("aria-pressed", b === t)); $("#fErr").hidden = true; break; }
    case "addPhoto": if (e.target.tagName !== "INPUT") { e.preventDefault(); $("#photoInput").click(); } break;
    case "meal": { const m = FOOD.meals[+t.dataset.i];
      openDetail(m.t + " · " + m.what, `<p>Combien a-t-il mangé ? (${m.qty})</p><div class="choice-group">${[[1, "Tout", "bfull"], [.5, "La moitié", "bhalf"], [.1, "Presque rien", "bempty"]].map(([v, w, i]) => `<button class="choice" data-act="mealSet" data-i="${t.dataset.i}" data-v="${v}" aria-pressed="${m.done && Math.abs(m.eaten - v) < .2}">${ico(i)}${w}</button>`).join("")}</div>`); break; }
    case "mealSet": { const m = FOOD.meals[+t.dataset.i]; m.done = true; m.eaten = +v; closeSheet(); toast("Repas de " + m.t + " noté"); markPending(); render(false); break; }
    case "ring": toast("Le collier sonne pendant 10 secondes", "sound"); break;
    case "zone": toast("Tu seras prévenu si Doudou sort de la zone maison", "pin"); break;
    case "addExpense": S.empty = false; openDetail("Nouvelle dépense", expenseForm()); setTimeout(() => $("#eLabel")?.focus(), 320); break;
    case "copy": copyText(v, "Numéro copié"); break;
    case "bigQR": openDetail("Carte de secours", `<div class="qr" style="width:min(320px,100%);height:auto;aspect-ratio:1;margin:0 auto">${qrSVG()}</div><p style="text-align:center">Doudou · mâle stérilisé · 6 ans · <b>allergie poulet</b><br>Vétérinaire : ${CAT.vet.name}, <span class="data">${CAT.vet.phone}</span></p>`, { sheet: true }); break;
    case "setSync": S.sync = v; S.pending = v === "pending" ? 1 : 0; if (v === "ok") S.lastSync = Date.now(); renderSync(); render(false); toast(v === "offline" ? "Mode hors ligne : tes saisies sont gardées" : v === "pending" ? "Une saisie en attente d'envoi" : "Tout est à jour", v === "offline" ? "cloud-off" : "cloud"); break;
    case "syncNow": S.sync = "pending"; S.pending = 1; renderSync(); render(false); setTimeout(() => { S.sync = "ok"; S.pending = 0; S.lastSync = Date.now(); renderSync(); if (S.route === "reglages") render(false); toast("Synchronisation terminée", "cloud"); }, 1300); break;
    case "reconnect": toast("Recherche de la fontaine… rapproche ton téléphone", "refresh"); break;
    case "export": { const data = JSON.stringify({ chat: CAT, poids: WEIGHTS.map(w => ({ date: key(w.d), kg: w.v })), dossier: RECORDS, rappels: REMINDERS, depenses: EXPENSES, journal: LOGS }, null, 2);
      const framed = (() => { try { return window.self !== window.top; } catch (er) { return true; } })();
      S.exportData = data;
      openDetail("Exporter les données", `<p>Toutes les données de Doudou (${Object.keys(LOGS).length} jours de journal, ${RECORDS.length} actes médicaux, ${EXPENSES.length} dépenses) au format JSON.</p><pre class="json">${esc(data.slice(0, 1600))}\n…</pre><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="copyExport">${ico("copy", "sm")}Copier tout</button>${framed ? "" : `<button class="btn secondary" data-act="dlExport">${ico("download", "sm")}Télécharger le fichier</button>`}</div>${framed ? `<p class="fine">${ico("info", "sm")}Le téléchargement est disponible quand l'appli est ouverte hors de l'aperçu.</p>` : ""}`); break; }
    case "copyExport": copyText(S.exportData, "Données copiées"); break;
    case "dlExport": { const b = new Blob([S.exportData], { type: "application/json" }); const u = URL.createObjectURL(b); const l = document.createElement("a"); l.href = u; l.download = "doudou-donnees.json"; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); break; }
    case "theme": S.theme = v; store.set("theme", v); applyTheme(); render(false); break;
    case "calm": S.calm = !S.calm; store.set("calm", S.calm); applyTheme(); render(false); break;
    case "demoEmpty": S.empty = !S.empty; buildSideNav(); render(false); toast(S.empty ? "États vides affichés" : "Données de démo rétablies", "info"); break;
    case "demoError": S.demoError = !S.demoError; render(false); toast(S.demoError ? "Dr. Doudou simulera une erreur" : "Dr. Doudou fonctionne normalement", "info"); break;
    case "replaySk": S.loaded = {}; toast("Les chargements seront rejoués", "refresh"); break;
    case "toastCal": toast("Rappel ajouté : on te prévient une semaine avant", "bell"); break;
    case "toastAdd": toast("Ajout d'un soin : disponible dans la version finale", "info"); break;
    case "goDossier": go("dossier"); break;
    case "goToday": go("aujourdhui"); break;
    case "noop": toast("La sauvegarde automatique reste active", "shield"); break;
  }
});
document.addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target;
  if (f.matches(".composer")) { const ta = f.querySelector("textarea"); const q = ta.value; ta.value = ""; if (isDesk() && S.route !== "drdoudou") S.chatPinned = true; ask(q); return; }
  if (f.id === "dayForm") {
    const d = S.draft, wRaw = $("#fWeight").value.trim().replace(",", ".");
    const errW = $("#fWeightErr");
    if (wRaw && (isNaN(+wRaw) || +wRaw < 1 || +wRaw > 15)) { errW.hidden = false; errW.innerHTML = ico("alert", "sm") + "Le poids doit être un nombre entre 1 et 15 kg, par exemple 4,6."; $("#fWeight").setAttribute("aria-invalid", "true"); $("#fWeight").focus(); return; }
    errW.hidden = true; $("#fWeight").removeAttribute("aria-invalid");
    if (d.h == null || d.a == null || d.s == null) { const er = $("#fErr"); er.hidden = false; er.innerHTML = ico("alert", "sm") + "Choisis au moins son humeur, son appétit et ses selles."; return; }
    LOGS[d.k] = LOGS[d.k] || { m: null, e: null, note: "", photos: [] };
    LOGS[d.k][d.slot] = { h: d.h, a: d.a, s: d.s, vomi: d.vomi === "oui" };
    LOGS[d.k].note = $("#fNote").value.trim(); LOGS[d.k].photos = S.draftPhotos.slice();
    if (wRaw) LOGS[d.k].w = +wRaw;
    S.selDay = d.k; S.empty = false;
    closeSheet(); toast("Journée enregistrée", "pawfill"); markPending(); render(false); return;
  }
  if (f.id === "expForm") {
    const amt = $("#eAmt").value.trim().replace(",", "."), lab = $("#eLabel").value.trim() || "Dépense vétérinaire";
    if (!amt || isNaN(+amt) || +amt <= 0) { const er = $("#eErr"); er.hidden = false; er.innerHTML = ico("alert", "sm") + "Indique un montant en euros, par exemple 45."; $("#eAmt").setAttribute("aria-invalid", "true"); $("#eAmt").focus(); return; }
    EXPENSES.push({ d: $("#eDate").value || key(TODAY), label: lab, cat: $("#eCat").value, amt: Math.round(+amt * 100) / 100 });
    closeSheet(); toast("Dépense ajoutée : " + fmtEur(+amt)); markPending(); render(false);
  }
});
document.addEventListener("input", e => {
  if (e.target.matches(".composer textarea")) autoGrow(e.target);
  if (e.target.dataset.vq != null) S.visitQs[+e.target.dataset.vq] = e.target.value;
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if ($("#visitSlot").innerHTML) { $("#visitSlot").innerHTML = ""; return; } closeSheet(); }
  if (e.key === "Enter" && !e.shiftKey && e.target.matches(".composer textarea")) { e.preventDefault(); e.target.closest("form").requestSubmit(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches(".photo-add")) { e.preventDefault(); $("#photoInput").click(); }
});
$("#photoInput").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  if (!file.type.startsWith("image/")) { toast("Ce fichier n'est pas une image", "alert"); return; }
  const r = new FileReader();
  r.onload = () => { S.draftPhotos.push(r.result); const box = $("#fPhotos"); if (box) box.innerHTML = photosHTML(S.draftPhotos) + `<label class="photo-add" for="photoInput" tabindex="0" data-act="addPhoto">${ico("camera")}Ajouter</label>`; toast("Photo ajoutée", "camera"); };
  r.onerror = () => toast("La photo n'a pas pu être lue. Essaie une autre image.", "alert");
  r.readAsDataURL(file); e.target.value = "";
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
$("#dockChat").addEventListener("click", () => { S.chatPinned = true; renderAside(); setTimeout(() => $("#composer-pane")?.focus(), 50); });
$("#moreTab").addEventListener("click", () => {
  const items = [["journal", "Journal", "Calendrier, notes, photos"], ["alimentation", "Alimentation", "Repas, marques, poids"], ["activite", "Activité et GPS", "Jeu, sommeil, position"], ["finances", "Finances", "Dépenses vétérinaires"], ["profil", "Profil", "Identité, carte de secours"], ["reglages", "Réglages", "Synchro, données, thème"]];
  openDetail("Plus", `<div class="more-grid">${items.map(([k, t, s]) => `<button class="more-item" data-go="${k}"><span class="m-ico">${ico(ROUTES[k].i)}</span><b>${t}</b><span>${s}</span></button>`).join("")}</div>
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
