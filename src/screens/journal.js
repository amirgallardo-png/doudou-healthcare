/* Écran Journal (+ saisie détaillée). Données réelles : journal, notes du jour, pesées, photos. */
import { APPETIT, HUMEUR, SELLES } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { isDesk, closeSheet, toast, markPending, render } from "../ui/shell.js";
import { JOURS, MOIS, TODAY, cap, esc, fmtDate, fmtKg, ico, key, parse } from "../utils/core.js";
import { DAYWORD, GLYPH, dayOverall, emptyState } from "./today.js";
import { cat, catName, logs, logOf, journalDays } from "../domain/views.js";
import { photoURL } from "../data/photos.js";
import { parseNum } from "../ui/forms.js";
import { commit, rows, uuid } from "../data/repo.js";

export function calHTML() {
  const [y, m] = S.calMonth, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const all = logs();
  const off = (first.getDay() + 6) % 7;
  let cells = ["L", "M", "M", "J", "V", "S", "D"].map(d => `<div class="dow" aria-hidden="true">${d}</div>`).join("");
  for (let i = 0; i < off; i++) cells += `<div class="day empty" aria-hidden="true"></div>`;
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m, d), k = key(dt), l = all[k], o = dayOverall(l), fut = dt > TODAY;
    const photos = l?.photos?.length;
    const lab = `${d} ${MOIS[m]}${o ? ", " + DAYWORD[o] : fut ? "" : l ? ", note sans saisie" : ", pas de saisie"}${photos ? ", avec photo" : ""}`;
    cells += fut ? `<div class="day future" aria-hidden="true">${d}</div>` :
      `<button class="day ${o || "none"} ${k === key(TODAY) ? "today" : ""}" data-act="day" data-k="${k}" ${S.selDay === k && isDesk() ? 'aria-current="true"' : ""} aria-label="${lab}">${d}${o ? GLYPH[o] : '<span class="g"></span>'}${photos ? `<svg class="cam" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-camera"/></svg>` : ""}</button>`;
  }
  const firstDay = journalDays()[0];
  const minYM = firstDay ? [parse(firstDay).getFullYear(), parse(firstDay).getMonth()] : [TODAY.getFullYear(), TODAY.getMonth()];
  const canNext = y * 12 + m < TODAY.getFullYear() * 12 + TODAY.getMonth(), canPrev = y * 12 + m > Math.min(minYM[0] * 12 + minYM[1], TODAY.getFullYear() * 12 + TODAY.getMonth() - 1);
  return `<section class="card"><div class="card-h"><button class="icon-btn" data-act="calPrev" aria-label="Mois précédent" ${canPrev ? "" : "disabled style='opacity:.3'"}>${ico("chev-l")}</button><h2 aria-live="polite">${cap(MOIS[m])} ${y}</h2><button class="icon-btn" data-act="calNext" aria-label="Mois suivant" ${canNext ? "" : "disabled style='opacity:.3'"}>${ico("chev-r")}</button></div>
    <div class="cal">${cells}</div>
    <div class="cal-legend" style="margin-top:14px"><span>${GLYPH.bonne.replace('class="g"', 'width="14" height="14"')}Bonne</span><span>${GLYPH.moyenne.replace('class="g"', 'width="14" height="14"')}Moyenne</span><span>${GLYPH.difficile.replace('class="g"', 'width="14" height="14"')}Difficile</span></div></section>`;
}
function entryLines(e) {
  if (!e) return `<p class="muted small">Pas de saisie</p>`;
  const line = (o, v, lab) => (v != null && o[v] ? `<div class="entry-line">${ico(o[v].i)}<span>${lab} : <b>${o[v].w}</b></span></div>` : "");
  return `${line(HUMEUR, e.h, "Humeur")}${line(APPETIT, e.a, "Appétit")}${line(SELLES, e.s, "Selles")}${e.vomi ? `<div class="entry-line">${ico("alert")}Vomissement noté</div>` : ""}${e.eau ? `<div class="entry-line">${ico("drop")}<span>Eau : <b>${{ peu: "Peu", normal: "Normal", beaucoup: "Beaucoup" }[e.eau]}</b></span></div>` : ""}`;
}
/* list : identifiants de photos enregistrées, ou brouillons { url } */
export function photosHTML(list, removable = false) {
  return list.map((p, i) => { const url = typeof p === "string" ? photoURL(p) : p.url; if (!url) return "";
    return `<div class="photo" style="position:relative"><img src="${esc(url)}" alt="Photo du ${esc(catName())}">${removable ? `<button type="button" class="icon-btn" data-act="delPhoto" data-i="${i}" aria-label="Retirer la photo" style="position:absolute;top:4px;right:4px;background:var(--surface)">${ico("x", "sm")}</button>` : ""}</div>`; }).join("");
}
export function dayHTML(k) {
  const d = parse(k), l = logOf(k), o = dayOverall(l);
  if (!l) return `<p class="muted">${cap(JOURS[d.getDay()])} ${fmtDate(d, true)} : aucune saisie ce jour-là.</p><button class="btn primary" data-act="form" data-day="${k}">${ico("plus")}Ajouter une saisie</button>`;
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><p class="muted">${cap(JOURS[d.getDay()])} ${fmtDate(d, true)}</p>${o ? `<span class="status ${o === "bonne" ? "ok" : o === "moyenne" ? "watch" : "soon"}">${GLYPH[o]}${DAYWORD[o]}</span>` : ""}</div>
    <div class="slots"><div class="entry-slot"><h3 style="font-size:17px;display:flex;gap:8px;align-items:center">${ico("sun", "sm")}Matin</h3>${entryLines(l.m)}</div><div class="entry-slot"><h3 style="font-size:17px;display:flex;gap:8px;align-items:center">${ico("moon", "sm")}Soir</h3>${entryLines(l.e)}</div></div>
    ${l.w != null ? `<div class="entry-line">${ico("scale")}<span>Pesée : <b class="data">${fmtKg(l.w)}</b></span></div>` : ""}
    ${l.note ? `<div class="explain"><h4>${ico("journal", "sm")}Note</h4><p class="small" style="white-space:pre-line">${esc(l.note)}</p></div>` : ""}
    ${l.photos.length ? `<div class="photos">${photosHTML(l.photos)}</div>` : ""}
    <button class="btn secondary" data-act="form" data-day="${k}">${ico("journal", "sm")}Modifier cette journée</button>`;
}

SCREENS.journal = () => {
  if (!cat()) return { main: emptyState("journal", "Son journal t'attend", "Crée d'abord le profil de ton chat ; ensuite, quelques touches par jour suffisent.", "profileForm", "Créer son profil"), aside: "" };
  const all = logs();
  if (!Object.keys(all).length) return { main: emptyState("journal", "Son journal t'attend", "Chaque jour, quelques touches suffisent. Au bout d'une semaine, tu verras ses habitudes se dessiner dans le calendrier.", "formToday", "Écrire la première page"), aside: "" };
  const notes = Object.entries(all).filter(([, l]) => l.note || l.photos.length).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4);
  const main = `<div class="grid-2"><div class="col">
    <button class="visit-cta" data-act="form" data-day="${key(TODAY)}" style="background:var(--roux);color:var(--on-accent)"><span class="v-ico" style="background:color-mix(in srgb,var(--on-accent) 14%,transparent)">${ico("journal")}</span><span style="flex:1;min-width:0"><h3 style="color:var(--on-accent)">Saisie détaillée du jour</h3><p>Humeur, repas, eau, litière, poids, notes et photos.</p></span>${ico("plus")}</button>
    ${calHTML()}</div>
    <div class="col"><section class="card"><div class="card-h"><h2>Notes et photos récentes</h2></div>${notes.length ? `<div class="list">${notes.map(([k, l]) => `<button class="row" data-act="day" data-k="${k}" style="align-items:flex-start"><span class="r-ico roux">${ico(l.photos.length ? "camera" : "journal")}</span><span class="r-main"><span class="r-title">${cap(fmtDate(parse(k), parse(k).getFullYear() !== TODAY.getFullYear()))}</span><br><span class="r-sub">${esc((l.note || "Photo ajoutée").slice(0, 140))}</span>${l.photos.length ? `<span class="photos" style="margin-top:8px;max-width:220px">${photosHTML(l.photos)}</span>` : ""}</span></button>`).join("")}</div>` : `<p class="small muted">Aucune note ni photo pour l'instant.</p>`}</section></div></div>`;
  return { main, aside: dayHTML(S.selDay), asideTitle: "Journée" };
};

/* ---------- Saisie détaillée ---------- */
export function formHTML(k, slotArg) {
  const l = logOf(k) || {}, slot = slotArg || (k === key(TODAY) ? S.slot : "e"), e = l[slot] || {}, d = parse(k);
  const grp = (name, lab, opts, cur) => `<div class="field"><span class="flabel" id="fl-${name}">${lab}</span><div class="choice-group" role="group" aria-labelledby="fl-${name}">${opts.map(([v, o]) => `<button type="button" class="choice" data-act="fpick" data-f="${name}" data-v="${v}" aria-pressed="${cur == v}">${o.i ? ico(o.i) : ""}${o.w}</button>`).join("")}</div></div>`;
  S.draft = { k, slot, h: e.h ?? null, a: e.a ?? null, s: e.s ?? null, vomi: e.vomi ? "oui" : "non", eau: e.eau || "normal" };
  S.draftPhotos = (l.photos || []).slice();
  return `<form id="dayForm" novalidate style="display:flex;flex-direction:column;gap:20px">
    <p class="muted">${cap(JOURS[d.getDay()])} ${fmtDate(d, true)}</p>
    <div class="seg" role="group" aria-label="Moment"><button type="button" data-act="fslot" data-v="m" aria-pressed="${slot === "m"}">Matin</button><button type="button" data-act="fslot" data-v="e" aria-pressed="${slot === "e"}">Soir</button></div>
    ${grp("h", "Humeur", [[3, HUMEUR[3]], [2, HUMEUR[2]], [1, HUMEUR[1]]], S.draft.h)}
    ${grp("a", "Appétit", [[3, APPETIT[3]], [2, APPETIT[2]], [1, APPETIT[1]]], S.draft.a)}
    ${grp("s", "Selles", [["ok", SELLES.ok], ["molles", SELLES.molles], ["non", SELLES.non]], S.draft.s)}
    ${grp("vomi", "Vomissement", [["non", { w: "Non", i: "check" }], ["oui", { w: "Oui", i: "alert" }]], S.draft.vomi)}
    ${grp("eau", "Eau bue", [["peu", { w: "Peu", i: "drop" }], ["normal", { w: "Normal", i: "drop" }], ["beaucoup", { w: "Beaucoup", i: "drop" }]], S.draft.eau)}
    <div class="field"><label for="fWeight">Poids (facultatif)</label><input class="input data" id="fWeight" inputmode="decimal" placeholder="ex. 4,6" value="${l.w != null ? String(l.w).replace(".", ",") : ""}" aria-describedby="fWeightHelp"><span class="small muted" id="fWeightHelp">En kilos, pesée du matin.</span><span class="err" id="fWeightErr" hidden></span></div>
    <div class="field"><label for="fNote">Note libre</label><textarea class="input" id="fNote" placeholder="Ce que tu as remarqué aujourd'hui…">${esc(l.note || "")}</textarea></div>
    <div class="field"><span class="flabel">Photos</span><div class="photos" id="fPhotos">${photosHTML(S.draftPhotos, true)}<label class="photo-add" for="photoInput" tabindex="0" data-act="addPhoto">${ico("camera")}Ajouter</label></div></div>
    <p class="err" id="fErr" hidden></p>
    <button class="btn primary block" type="submit">${ico("check")}Enregistrer la journée</button>
  </form>`;
}
export const refreshDraftPhotos = () => { const box = document.getElementById("fPhotos"); if (box) box.innerHTML = photosHTML(S.draftPhotos, true) + `<label class="photo-add" for="photoInput" tabindex="0" data-act="addPhoto">${ico("camera")}Ajouter</label>`; };

/* Enregistrement : saisie du moment + note + photos + pesée, en une seule écriture atomique. */
export async function saveDayForm(f) {
  const d = S.draft, c = cat();
  const wN = parseNum(f.querySelector("#fWeight").value), errW = f.querySelector("#fWeightErr");
  if (Number.isNaN(wN) || (wN != null && (wN < 0.5 || wN > 15))) { errW.hidden = false; errW.innerHTML = ico("alert", "sm") + "Le poids doit être un nombre entre 0,5 et 15 kg, par exemple 4,6."; f.querySelector("#fWeight").setAttribute("aria-invalid", "true"); f.querySelector("#fWeight").focus(); return; }
  errW.hidden = true;
  if (d.h == null || d.a == null || d.s == null) { const er = f.querySelector("#fErr"); er.hidden = false; er.innerHTML = ico("alert", "sm") + "Choisis au moins son humeur, son appétit et ses selles."; return; }
  const ops = [{ table: "journal", row: { cat_id: c.id, date: d.k, moment: d.slot, h: +d.h, a: +d.a, s: d.s, vomi: d.vomi === "oui", eau: d.eau } }];
  const photoIds = [];
  for (const p of S.draftPhotos) {
    if (typeof p === "string") { photoIds.push(p); continue; }
    const id = uuid(); photoIds.push(id);
    ops.push({ table: "photos", row: { id, cat_id: c.id, date: d.k, blob: p.blob, width: p.width, height: p.height } });
  }
  const note = f.querySelector("#fNote").value.trim();
  const existingNote = rows("day_notes").find(n => n.date === d.k);
  // photos retirées de la journée : supprimées aussi de l'appareil
  for (const old of existingNote?.photo_ids || []) if (!photoIds.includes(old)) ops.push({ table: "photos", id: old, del: true });
  if (note || photoIds.length || existingNote) ops.push({ table: "day_notes", row: { cat_id: c.id, date: d.k, note, photo_ids: photoIds } });
  const wRow = rows("weights").find(x => x.date === d.k && x.moment === "m");
  if (wN != null) ops.push({ table: "weights", row: { cat_id: c.id, date: d.k, moment: "m", kg: Math.round(wN * 100) / 100 } });
  else if (wRow) ops.push({ table: "weights", id: wRow.id, del: true });
  await commit(ops);
  S.selDay = d.k;
  closeSheet(); toast("Journée enregistrée", "pawfill"); markPending(); render(false);
}
