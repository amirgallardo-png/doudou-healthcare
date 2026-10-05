/* Écran Alimentation et poids.
   Programme de repas : la journée type, reprise automatiquement chaque jour. Un repas peut être changé
   « pour aujourd'hui seulement » ; des extras peuvent être ajoutés au jour ; le programme reste intact. */
import { SCREENS } from "../screens/registry.js";
import { chartBox } from "../ui/charts.js";
import { ico, esc, key, TODAY } from "../utils/core.js";
import { closeSheet, toast, markPending, render, openDetail } from "../ui/shell.js";
import { FORMS, form, input, select, choices, submit, formError, parseNum } from "../ui/forms.js";
import { commit, rows, get, uuid } from "../data/repo.js";
import { cat, catName, products, product, plan, mealsOf, rationOf, allergies, foodWeek } from "../domain/views.js";
import { emptyState, askBtn } from "./today.js";

export const KINDS = { croquettes: "Croquettes", patee: "Pâtée", extra: "Extra", friandise: "Friandise" };
const initials = s => (s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
const eatenWord = e => (e == null ? null : e >= 0.9 ? "tout mangé" : e >= 0.5 ? "la moitié" : e > 0 ? "presque rien" : "rien mangé");
const nowHM = () => { const d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };

/* ---------- Repas du jour ---------- */
function mealRow(m) {
  const p = product(m.productId), name = p ? p.name : "Aliment supprimé";
  const state = m.eaten == null ? "à venir, touche pour noter" : eatenWord(m.eaten);
  const tag = m.extra ? " · extra" : m.changed ? " · changé aujourd'hui" : "";
  return `<button class="row meal" data-act="meal" data-plan="${m.planId || ""}" data-meal="${m.mealId || ""}"><span class="meal-time">${esc(m.time || "")}</span><span class="r-main"><span class="r-title">${esc(name)}</span><br><span class="r-sub">${m.qty != null ? esc(String(m.qty).replace(".", ",")) + " g" : (p ? KINDS[p.kind] : "")}${tag} · ${state}</span>${m.eaten != null ? `<span class="bowl-meter" aria-hidden="true"><i style="width:${m.eaten * 100}%"></i></span>` : ""}</span>${m.eaten != null ? `<span class="status ${m.eaten >= .9 ? "ok" : m.eaten >= .5 ? "watch" : "soon"}">${Math.round(m.eaten * 100)} %</span>` : ico("plus", "sm")}</button>`;
}
function foodMeaning() {
  const wk = foodWeek().filter(d => d.v != null);
  if (!wk.length) return "Note ce qu'il mange à chaque repas : la courbe des 7 derniers jours se dessinera ici.";
  const ratio = wk.filter(d => d.planned).map(d => d.v / d.planned);
  if (!ratio.length) return `${wk.length} jour${wk.length > 1 ? "s" : ""} noté${wk.length > 1 ? "s" : ""} cette semaine.`;
  const full = ratio.filter(r => r >= 0.9).length;
  return `Sur ${ratio.length} jour${ratio.length > 1 ? "s" : ""} noté${ratio.length > 1 ? "s" : ""}, il a mangé toute sa ration ${full} fois.`;
}

SCREENS.alimentation = () => {
  if (!cat()) return { main: emptyState("today", "Pas encore de profil", "Crée d'abord le profil de ton chat, puis décris sa journée de repas type.", "profileForm", "Créer son profil"), aside: "" };
  const k = key(TODAY), meals = mealsOf(k), r = rationOf(k), pl = plan(), prods = products(), al = allergies();
  const mealsCard = `<section class="card"><div class="card-h"><h2>Repas du jour</h2>${r.planned ? `<span class="small muted data">${Math.round(r.eaten)} g / ${r.planned} g</span>` : ""}</div>
    ${meals.length ? `<div class="list">${meals.map(mealRow).join("")}</div>` : `<p class="small muted">Pas encore de programme. Décris sa journée type une seule fois : l'appli la reprend chaque jour, et tu ne modifies que les jours différents.</p>`}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn sm ${pl.length ? "secondary" : "primary"}" data-act="planEdit">${ico(pl.length ? "journal" : "plus", "sm")}${pl.length ? "Modifier le programme" : "Créer le programme"}</button>
      <button class="link-btn" data-act="extraAdd">${ico("plus")}Ajouter un extra</button></div></section>`;
  const main = `<div class="grid-2"><div class="col">
  ${mealsCard}
  <section class="card"><div class="card-h"><h2>${r.dryOnly ? "Croquettes mangées" : "Quantité mangée"}</h2><span class="small muted">7 derniers jours</span></div>${chartBox("food", 180)}<div class="meaning">${ico("info")}<p>${esc(foodMeaning())}</p></div></section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Ce qu'il mange</h2><button class="link-btn" data-act="productAdd">${ico("plus")}Ajouter</button></div>
    ${prods.length ? `<div class="list">${prods.map(p => `<button class="row brand-card" data-act="productEdit" data-id="${p.id}"><span class="pack ${p.kind === "patee" ? "roux" : ""}">${esc(initials(p.name))}</span><span class="r-main"><span class="r-title">${esc(p.name)}</span><br><span class="r-sub">${KINDS[p.kind] || "Aliment"}${p.notes ? " · " + esc(p.notes) : ""}</span></span>${ico("chev-r", "sm")}</button>`).join("")}</div>` : `<p class="small muted">Ajoute ses aliments avec leur vraie marque (croquettes, pâtée, extras).</p>`}
    ${al.length ? `<div class="allergy" style="margin-top:12px">${ico("alert")}<span><strong>Sans ${esc(al.map(a => a.name.toLowerCase()).join(", "))}</strong> : vérifie la composition avant tout nouvel aliment.</span></div>` : ""}</section>
  <section class="card"><div class="card-h"><h2>Poids</h2><button class="link-btn" data-go="sante">Santé${ico("chev-r")}</button></div>${chartBox("weight", 170)}</section>
  </div></div>`;
  const byKind = {};
  pl.forEach(p => { const pr = product(p.product_id); if (pr && p.qty_g) byKind[pr.kind] = (byKind[pr.kind] || 0) + p.qty_g; });
  const planTotal = Object.values(byKind).reduce((s, g) => s + g, 0);
  const aside = `<div class="kpi" style="box-shadow:none;background:var(--surface-tint)"><span class="k-lab">${ico("bowl")}Ration du programme</span><span class="k-val">${planTotal || "—"}<small>${planTotal ? " g/jour" : ""}</small></span><span class="k-note muted">${Object.keys(byKind).length ? esc(Object.entries(byKind).map(([kk, g]) => `${KINDS[kk].toLowerCase()} ${g} g`).join(" + ")) : "Crée le programme pour la calculer"}</span></div>
    <div class="explain"><h4>${ico("info", "sm")}Bon à savoir</h4><p class="small">Un chat qui mange moins de la moitié de sa ration pendant plus de 24 heures doit être vu par un vétérinaire.</p></div>
    ${askBtn("Sa ration est-elle adaptée ?", "Demander à Dr. Doudou", "btn secondary block")}`;
  return { main, aside, asideTitle: "Repères" };
};

/* ---------- Feuille d'un repas ---------- */
export function mealSheet(planId, mealId) {
  const m = mealsOf(key(TODAY)).find(x => (planId && x.planId === planId) || (mealId && x.mealId === mealId));
  if (!m) return;
  const p = product(m.productId);
  const opts = [[1, "Tout", "bfull"], [0.5, "La moitié", "bhalf"], [0.1, "Presque rien", "bempty"], [0, "Rien", "x"]];
  openDetail(`${m.time} · ${p ? p.name : "Repas"}`, `<p>Combien a-t-il mangé ?${m.qty != null ? ` (${String(m.qty).replace(".", ",")} g)` : ""}</p>
    <div class="choice-group">${opts.map(([v, w, i]) => `<button class="choice" data-act="mealSet" data-plan="${m.planId || ""}" data-meal="${m.mealId || ""}" data-v="${v}" aria-pressed="${m.eaten != null && Math.abs(m.eaten - v) < .05}">${ico(i)}${w}</button>`).join("")}</div>
    ${m.eaten != null ? `<button class="link-btn" data-act="mealSet" data-plan="${m.planId || ""}" data-meal="${m.mealId || ""}" data-v="">${ico("refresh")}Pas encore mangé</button>` : ""}
    <div class="explain"><h4>${ico("cal", "sm")}Pour aujourd'hui seulement</h4><p class="small">Le programme des autres jours ne change pas.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm secondary" data-act="mealChange" data-plan="${m.planId || ""}" data-meal="${m.mealId || ""}">${ico("journal", "sm")}${m.extra ? "Modifier cet extra" : "Changer ce repas"}</button>
      <button class="btn sm ghost" data-act="mealSkip" data-plan="${m.planId || ""}" data-meal="${m.mealId || ""}">${ico("x", "sm")}${m.extra ? "Supprimer cet extra" : "Pas de repas aujourd'hui"}</button></div></div>`);
}
/* Ligne du jour pour un repas du programme (créée au besoin à partir du programme). */
function dayRow(planId, mealId) {
  const k = key(TODAY);
  if (mealId) return get("meals", mealId);
  const p = get("meal_plan", planId);
  return rows("meals").find(m => m.date === k && m.plan_id === planId) || { cat_id: cat().id, date: k, plan_id: planId, time: p.time, product_id: p.product_id, qty_g: p.qty_g, eaten: null };
}
export async function setMealEaten(planId, mealId, v) {
  const row = dayRow(planId, mealId);
  await commit([{ table: "meals", row: { ...row, eaten: v === "" ? null : +v, skipped: false } }]);
  closeSheet(); toast(v === "" ? "Repas remis « à venir »" : "Repas noté"); markPending(); render(false);
}
export async function skipMeal(planId, mealId) {
  const row = dayRow(planId, mealId);
  if (row.plan_id) await commit([{ table: "meals", row: { ...row, skipped: true, eaten: null } }]);
  else await commit([{ table: "meals", id: row.id, del: true }]);
  closeSheet(); toast(row.plan_id ? "Repas retiré pour aujourd'hui" : "Extra supprimé"); markPending(); render(false);
}

/* ---------- Choix d'un aliment (existant ou nouveau, en une étape) ---------- */
function productPicker(value) {
  const prods = products();
  return `${select("product", "Aliment", [...prods.map(p => [p.id, `${p.name} (${KINDS[p.kind].toLowerCase()})`]), ["__new", "+ Nouvel aliment…"]], value || (prods.length ? prods[0].id : "__new"))}
    <div data-newproduct ${prods.length && value !== "__new" ? "hidden" : ""} style="display:flex;flex-direction:column;gap:16px">
      ${input("newName", "Marque et nom du nouvel aliment", { placeholder: "ex. Purina Pro Plan Sterilised saumon" })}
      ${choices("newKind", "Type", Object.entries(KINDS).map(([k, w]) => [k, w]), "croquettes")}</div>`;
}
/* Rend l'id de l'aliment choisi, en créant le nouvel aliment au besoin (ajouté au lot d'écriture). */
function resolveProduct(v, ops, f) {
  if (v.product !== "__new") return v.product;
  if (!v.newName) { formError(f, "Indique la marque et le nom du nouvel aliment.", "newName"); return null; }
  const id = uuid();
  ops.push({ table: "food_products", row: { id, cat_id: cat().id, name: v.newName, kind: v.newKind || "croquettes", notes: "", active: true } });
  return id;
}
const qtyOk = (f, q) => { if (Number.isNaN(q) || (q != null && (q <= 0 || q > 1000))) { formError(f, "La quantité est un nombre de grammes, par exemple 25.", "qty"); return false; } return true; };
const timeOk = (f, t) => { if (!/^\d{2}:\d{2}$/.test(t || "")) { formError(f, "Indique l'heure du repas, par exemple 07:30.", "time"); return false; } return true; };

/* ---------- Changer un repas pour aujourd'hui / ajouter un extra ---------- */
export function mealDayFormHTML(planId, mealId) {
  const row = planId || mealId ? dayRow(planId, mealId) : null;
  return form("mealday", `<p class="small muted">${row ? "Ce changement ne vaut que pour aujourd'hui." : "Un extra ne s'ajoute qu'à aujourd'hui."}</p>
    ${input("time", "Heure", { type: "time", value: row?.time || nowHM() })}
    ${productPicker(row?.product_id)}
    ${input("qty", "Quantité en grammes", { value: row?.qty_g ?? "", inputmode: "decimal", data: true })}
    ${submit(row ? "Enregistrer pour aujourd'hui" : "Ajouter l'extra")}`, `data-plan="${planId || ""}" data-meal="${mealId || ""}"`);
}
FORMS.mealday = async (f, v) => {
  const q = parseNum(v.qty);
  if (!timeOk(f, v.time) || !qtyOk(f, q)) return;
  const ops = [], pid = resolveProduct(v, ops, f); if (!pid) return;
  const planId = f.dataset.plan || null, mealId = f.dataset.meal || null;
  const base = planId || mealId ? dayRow(planId, mealId) : { cat_id: cat().id, date: key(TODAY), plan_id: null, eaten: null };
  ops.push({ table: "meals", row: { ...base, time: v.time, product_id: pid, qty_g: q, skipped: false } });
  await commit(ops);
  closeSheet(); toast(planId || mealId ? "Repas changé pour aujourd'hui" : "Extra ajouté"); markPending(); render(false);
};

/* ---------- Éditeur du programme ---------- */
export function planEditorHTML() {
  const pl = plan();
  return `<p class="small muted">La journée type de ${esc(catName())}. Elle est reprise automatiquement chaque jour ; pour un jour différent, change le repas depuis « Repas du jour ».</p>
    ${pl.length ? `<div class="list">${pl.map(p => { const pr = product(p.product_id); return `<button class="row" data-act="planItem" data-id="${p.id}"><span class="meal-time">${esc(p.time)}</span><span class="r-main"><span class="r-title">${esc(pr?.name || "Aliment supprimé")}</span><br><span class="r-sub">${pr ? KINDS[pr.kind] : ""}${p.qty_g != null ? " · " + String(p.qty_g).replace(".", ",") + " g" : ""}</span></span>${ico("chev-r", "sm")}</button>`; }).join("")}</div>` : `<p class="small">Aucun repas dans le programme pour l'instant.</p>`}
    <button class="btn primary block" data-act="planItem" data-id="">${ico("plus")}Ajouter un repas au programme</button>`;
}
export function planItemFormHTML(id) {
  const p = id ? get("meal_plan", id) : null;
  return form("planitem", `${input("time", "Heure", { type: "time", value: p?.time || "08:00" })}
    ${productPicker(p?.product_id)}
    ${input("qty", "Quantité en grammes", { value: p?.qty_g ?? "", inputmode: "decimal", data: true, help: "Ration habituelle pour ce repas." })}
    ${submit(p ? "Enregistrer" : "Ajouter au programme")}
    ${p ? `<button type="button" class="btn ghost block" data-act="planItemDel" data-id="${p.id}">${ico("x", "sm")}Retirer du programme</button>` : ""}`, `data-id="${id || ""}"`);
}
FORMS.planitem = async (f, v) => {
  const q = parseNum(v.qty);
  if (!timeOk(f, v.time) || !qtyOk(f, q)) return;
  const ops = [], pid = resolveProduct(v, ops, f); if (!pid) return;
  ops.push({ table: "meal_plan", row: { id: f.dataset.id || undefined, cat_id: cat().id, time: v.time, product_id: pid, qty_g: q, active: true } });
  await commit(ops);
  toast(f.dataset.id ? "Programme mis à jour" : "Repas ajouté au programme"); markPending(); render(false);
  openDetail("Programme de repas", planEditorHTML());
};
export async function deletePlanItem(id) {
  await commit([{ table: "meal_plan", id, del: true }]);
  toast("Repas retiré du programme"); markPending(); render(false);
  openDetail("Programme de repas", planEditorHTML());
}

/* ---------- Aliments ---------- */
export function productFormHTML(id) {
  const p = id ? get("food_products", id) : null;
  return form("product", `${input("name", "Marque et nom", { value: p?.name || "", placeholder: "ex. Purina Pro Plan Sterilised saumon" })}
    ${choices("kind", "Type", Object.entries(KINDS).map(([k, w]) => [k, w]), p?.kind || "croquettes")}
    ${input("notes", "Note (facultatif)", { value: p?.notes || "", placeholder: "ex. sans poulet, sachet de 85 g" })}
    ${submit(p ? "Enregistrer" : "Ajouter l'aliment")}
    ${p ? `<button type="button" class="btn ghost block" data-act="productDel" data-id="${p.id}">${ico("x", "sm")}Ne plus utiliser cet aliment</button>` : ""}`, `data-id="${id || ""}"`);
}
FORMS.product = async (f, v) => {
  if (!v.name) return formError(f, "Indique la marque et le nom de l'aliment.", "name");
  await commit([{ table: "food_products", row: { id: f.dataset.id || undefined, cat_id: cat().id, name: v.name, kind: v.kind || "croquettes", notes: v.notes, active: true } }]);
  closeSheet(); toast(f.dataset.id ? "Aliment mis à jour" : "Aliment ajouté"); markPending(); render(false);
};
export async function retireProduct(id) {
  const used = plan().some(p => p.product_id === id);
  await commit([{ table: "food_products", row: { id, active: false } }]);
  closeSheet(); toast(used ? "Aliment retiré (toujours présent dans le programme : pense à le modifier)" : "Aliment retiré", "info"); markPending(); render(false);
}
