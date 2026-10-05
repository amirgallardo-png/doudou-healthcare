/* Petite boîte à outils de formulaires, dans le style exact du prototype (.field, .input, .choice-group, .btn).
   Un formulaire porte data-form="nom" ; sa fonction d'envoi est déclarée dans FORMS[nom]. */
import { esc, ico } from "../utils/core.js";

export const FORMS = {};
let uid = 0;
const nid = name => `f-${name}-${++uid}`;

/* Champ texte / nombre / date / zone de texte. opts : { type, value, placeholder, help, inputmode, area, min, max, required } */
export function input(name, label, opts = {}) {
  const id = nid(name), v = opts.value == null ? "" : String(opts.value);
  const attrs = `id="${id}" name="${name}" class="input${opts.data ? " data" : ""}" ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ""} ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ""} ${opts.min ? `min="${opts.min}"` : ""} ${opts.max ? `max="${opts.max}"` : ""} ${opts.required ? "required" : ""} ${opts.help ? `aria-describedby="${id}-h"` : ""}`;
  const control = opts.area ? `<textarea ${attrs}>${esc(v)}</textarea>` : `<input ${attrs} type="${opts.type || "text"}" value="${esc(v)}" autocomplete="off">`;
  return `<div class="field"><label for="${id}">${esc(label)}</label>${control}${opts.help ? `<span class="small muted" id="${id}-h">${esc(opts.help)}</span>` : ""}</div>`;
}

/* Liste déroulante. options : [[valeur, libellé]] */
export function select(name, label, options, value) {
  const id = nid(name);
  return `<div class="field"><label for="${id}">${esc(label)}</label><select class="input" id="${id}" name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value ?? "") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
}

/* Choix par boutons (comme Humeur / Appétit). options : [[valeur, libellé, icône?]] */
export function choices(name, label, options, value) {
  const id = nid(name);
  return `<div class="field"><span class="flabel" id="${id}">${esc(label)}</span><div class="choice-group" role="group" aria-labelledby="${id}" data-name="${name}">${options.map(([v, l, i]) =>
    `<button type="button" class="choice" data-act="choose" data-v="${esc(v)}" aria-pressed="${String(v) === String(value ?? "")}">${i ? ico(i) : ""}${esc(l)}</button>`).join("")}</div></div>`;
}

export const errorSlot = () => `<p class="err" data-err hidden></p>`;
export const submit = (label, icon = "check") => `<button class="btn primary block" type="submit">${ico(icon)}${esc(label)}</button>`;
export const form = (name, body, extra = "") => `<form data-form="${name}" novalidate style="display:flex;flex-direction:column;gap:16px" ${extra}>${body}${errorSlot()}</form>`;

/* Lecture : valeurs des champs nommés + choix pressés. */
export function readForm(f) {
  const out = {};
  f.querySelectorAll("input[name],select[name],textarea[name]").forEach(el => { out[el.name] = el.type === "checkbox" ? el.checked : el.value.trim(); });
  f.querySelectorAll(".choice-group[data-name]").forEach(g => { out[g.dataset.name] = g.querySelector('[aria-pressed="true"]')?.dataset.v ?? null; });
  return out;
}
export function formError(f, msg, fieldName) {
  const e = f.querySelector("[data-err]");
  e.hidden = false; e.innerHTML = ico("alert", "sm") + esc(msg);
  const el = fieldName && f.querySelector(`[name="${fieldName}"]`);
  if (el) { el.setAttribute("aria-invalid", "true"); el.focus(); }
}

/* Nombres saisis à la française (« 4,6 ») ; null si vide ; NaN si invalide. */
export const parseNum = s => { if (s == null || String(s).trim() === "") return null; const n = Number(String(s).replace(",", ".").replace(/\s/g, "")); return Number.isFinite(n) ? n : NaN; };
