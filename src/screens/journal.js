/* Écran Journal (+ saisie détaillée). */
import { LOGS } from "../demo/fixture.js";
import { APPETIT, HUMEUR, SELLES } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { DAYWORD, GLYPH, dayOverall, emptyState } from "../screens/today.js";
import { S } from "../state.js";
import { photoSVG } from "../ui/illustrations.js";
import { isDesk } from "../ui/shell.js";
import { JOURS, MOIS, TODAY, cap, esc, fmtDate, fmtKg, ico, key, parse } from "../utils/core.js";

export function calHTML() {
  const [y, m] = S.calMonth, first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
  const off = (first.getDay() + 6) % 7;
  let cells = ["L", "M", "M", "J", "V", "S", "D"].map((d, i) => `<div class="dow" aria-hidden="true">${d}</div>`).join("");
  for (let i = 0; i < off; i++) cells += `<div class="day empty" aria-hidden="true"></div>`;
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, m, d), k = key(dt), l = S.empty ? null : LOGS[k], o = dayOverall(l), fut = dt > TODAY;
    const lab = `${d} ${MOIS[m]}${o ? ", " + DAYWORD[o] : fut ? "" : ", pas de saisie"}${l && l.photos && l.photos.length ? ", avec photo" : ""}`;
    cells += fut ? `<div class="day future" aria-hidden="true">${d}</div>` :
      `<button class="day ${o || "none"} ${k === key(TODAY) ? "today" : ""}" data-act="day" data-k="${k}" ${S.selDay === k && isDesk() ? 'aria-current="true"' : ""} aria-label="${lab}">${d}${o ? GLYPH[o] : '<span class="g"></span>'}${l && l.photos && l.photos.length ? `<svg class="cam" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><use href="#i-camera"/></svg>` : ""}</button>`;
  }
  const canNext = !(y === 2026 && m === 9), canPrev = !(y === 2026 && m === 6);
  return `<section class="card"><div class="card-h"><button class="icon-btn" data-act="calPrev" aria-label="Mois précédent" ${canPrev ? "" : "disabled style='opacity:.3'"}>${ico("chev-l")}</button><h2 aria-live="polite">${cap(MOIS[m])} ${y}</h2><button class="icon-btn" data-act="calNext" aria-label="Mois suivant" ${canNext ? "" : "disabled style='opacity:.3'"}>${ico("chev-r")}</button></div>
    <div class="cal">${cells}</div>
    <div class="cal-legend" style="margin-top:14px"><span>${GLYPH.bonne.replace('class="g"', 'width="14" height="14"')}Bonne</span><span>${GLYPH.moyenne.replace('class="g"', 'width="14" height="14"')}Moyenne</span><span>${GLYPH.difficile.replace('class="g"', 'width="14" height="14"')}Difficile</span></div></section>`;
}
export function entryLines(e) {
  if (!e) return `<p class="muted small">Pas de saisie</p>`;
  return `<div class="entry-line">${ico(HUMEUR[e.h].i)}<span>Humeur : <b>${HUMEUR[e.h].w}</b></span></div><div class="entry-line">${ico(APPETIT[e.a].i)}<span>Appétit : <b>${APPETIT[e.a].w}</b></span></div><div class="entry-line">${ico(SELLES[e.s].i)}<span>Selles : <b>${SELLES[e.s].w}</b></span></div>${e.vomi ? `<div class="entry-line">${ico("alert")}Vomissement noté</div>` : ""}`;
}
export function photosHTML(list) { return list.map(p => `<div class="photo">${p.startsWith("data:") ? `<img src="${p}" alt="Photo ajoutée">` : photoSVG(p)}</div>`).join(""); }
export function dayHTML(k) {
  const d = parse(k), l = LOGS[k], o = dayOverall(l);
  if (!l) return `<p class="muted">Aucune saisie ce jour-là.</p><button class="btn primary" data-act="form" data-day="${k}">${ico("plus")}Ajouter une saisie</button>`;
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><p class="muted">${cap(JOURS[d.getDay()])} ${fmtDate(d, true)}</p>${o ? `<span class="status ${o === "bonne" ? "ok" : o === "moyenne" ? "watch" : "soon"}">${GLYPH[o]}${DAYWORD[o]}</span>` : ""}</div>
    <div class="slots"><div class="entry-slot"><h3 style="font-size:17px;display:flex;gap:8px;align-items:center">${ico("sun", "sm")}Matin</h3>${entryLines(l.m)}</div><div class="entry-slot"><h3 style="font-size:17px;display:flex;gap:8px;align-items:center">${ico("moon", "sm")}Soir</h3>${entryLines(l.e)}</div></div>
    ${l.w ? `<div class="entry-line">${ico("scale")}<span>Pesée : <b class="data">${fmtKg(l.w)}</b></span></div>` : ""}
    ${l.note ? `<div class="explain"><h4>${ico("journal", "sm")}Note</h4><p class="small">${esc(l.note)}</p></div>` : ""}
    ${l.photos.length ? `<div class="photos">${photosHTML(l.photos)}</div>` : ""}
    <button class="btn secondary" data-act="form" data-day="${k}">${ico("journal", "sm")}Modifier cette journée</button>`;
}
SCREENS.journal = () => {
  if (S.empty) return { main: emptyState("journal", "Son journal t'attend", "Chaque jour, quelques touches suffisent. Au bout d'une semaine, tu verras ses habitudes se dessiner dans le calendrier.", "formToday", "Écrire la première page"), aside: "" };
  const notes = Object.entries(LOGS).filter(([k, l]) => l.note || l.photos.length).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4);
  const main = `<div class="grid-2"><div class="col">
    <button class="visit-cta" data-act="form" data-day="${key(TODAY)}" style="background:var(--roux);color:var(--on-accent)"><span class="v-ico" style="background:color-mix(in srgb,var(--on-accent) 14%,transparent)">${ico("journal")}</span><span style="flex:1;min-width:0"><h3 style="color:var(--on-accent)">Saisie détaillée du jour</h3><p>Humeur, repas, eau, litière, poids, notes et photos.</p></span>${ico("plus")}</button>
    ${calHTML()}</div>
    <div class="col"><section class="card"><div class="card-h"><h2>Notes et photos récentes</h2></div><div class="list">${notes.map(([k, l]) => `<button class="row" data-act="day" data-k="${k}" style="align-items:flex-start"><span class="r-ico roux">${ico(l.photos.length ? "camera" : "journal")}</span><span class="r-main"><span class="r-title">${cap(fmtDate(parse(k)))}</span><br><span class="r-sub">${esc(l.note || "Photo ajoutée")}</span>${l.photos.length ? `<span class="photos" style="margin-top:8px;max-width:220px">${photosHTML(l.photos)}</span>` : ""}</span></button>`).join("")}</div></section></div></div>`;
  return { main, aside: dayHTML(S.selDay), asideTitle: "Journée" };
};
export function formHTML(k) {
  const l = LOGS[k] || {}, slot = k === key(TODAY) ? S.slot : "e", e = l[slot] || {}, d = parse(k);
  const grp = (name, lab, opts, cur) => `<div class="field"><span class="flabel" id="fl-${name}">${lab}</span><div class="choice-group" role="group" aria-labelledby="fl-${name}">${opts.map(([v, o]) => `<button type="button" class="choice" data-act="fpick" data-f="${name}" data-v="${v}" aria-pressed="${cur == v}">${o.i ? ico(o.i) : ""}${o.w}</button>`).join("")}</div></div>`;
  S.draft = { k, slot, h: e.h || null, a: e.a || null, s: e.s || null, vomi: e.vomi ? "oui" : "non", eau: "normal" };
  S.draftPhotos = (l.photos || []).slice();
  return `<form id="dayForm" novalidate style="display:flex;flex-direction:column;gap:20px">
    <p class="muted">${cap(JOURS[d.getDay()])} ${fmtDate(d, true)}</p>
    <div class="seg" role="group" aria-label="Moment"><button type="button" data-act="fslot" data-v="m" aria-pressed="${slot === "m"}">${"Matin"}</button><button type="button" data-act="fslot" data-v="e" aria-pressed="${slot === "e"}">Soir</button></div>
    ${grp("h", "Humeur", [[3, HUMEUR[3]], [2, HUMEUR[2]], [1, HUMEUR[1]]], e.h)}
    ${grp("a", "Appétit", [[3, APPETIT[3]], [2, APPETIT[2]], [1, APPETIT[1]]], e.a)}
    ${grp("s", "Selles", [["ok", SELLES.ok], ["molles", SELLES.molles], ["non", SELLES.non]], e.s)}
    ${grp("vomi", "Vomissement", [["non", { w: "Non", i: "check" }], ["oui", { w: "Oui", i: "alert" }]], e.vomi ? "oui" : "non")}
    ${grp("eau", "Eau bue", [["peu", { w: "Peu", i: "drop" }], ["normal", { w: "Normal", i: "drop" }], ["beaucoup", { w: "Beaucoup", i: "drop" }]], "normal")}
    <div class="field"><label for="fWeight">Poids (facultatif)</label><input class="input data" id="fWeight" inputmode="decimal" placeholder="ex. 4,6" value="${l.w ? String(l.w).replace(".", ",") : ""}" aria-describedby="fWeightHelp"><span class="small muted" id="fWeightHelp">En kilos. Zone idéale de Doudou : 4,4 à 4,8 kg.</span><span class="err" id="fWeightErr" hidden></span></div>
    <div class="field"><label for="fNote">Note libre</label><textarea class="input" id="fNote" placeholder="Ce que tu as remarqué aujourd'hui…">${esc(l.note || "")}</textarea></div>
    <div class="field"><span class="flabel">Photos</span><div class="photos" id="fPhotos">${photosHTML(S.draftPhotos)}<label class="photo-add" for="photoInput" tabindex="0" data-act="addPhoto">${ico("camera")}Ajouter</label></div></div>
    <p class="err" id="fErr" hidden></p>
    <button class="btn primary block" type="submit">${ico("check")}Enregistrer la journée</button>
  </form>`;
}
