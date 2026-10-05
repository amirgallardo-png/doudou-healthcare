/* Écran Finances : dépenses réelles (payées et prévues), modifiables. */
import { CATS } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { chartBox } from "../ui/charts.js";
import { TODAY, cap, esc, fmtDate, fmtEur, fmtShort, ico, key, parse, relDay } from "../utils/core.js";
import { closeSheet, toast, markPending, render } from "../ui/shell.js";
import { FORMS, form, input, select, choices, submit, formError, parseNum } from "../ui/forms.js";
import { commit, get } from "../data/repo.js";
import { cat, expenses, expensesOfYear, planned } from "../domain/views.js";
import { emptyState } from "./today.js";

SCREENS.finances = () => {
  if (!cat()) return { main: emptyState("finances", "Pas encore de profil", "Crée d'abord le profil de ton chat.", "profileForm", "Créer son profil"), aside: "" };
  const yr = TODAY.getFullYear(), list = expensesOfYear(yr), plan = planned(), lastYear = expensesOfYear(yr - 1);
  if (!expenses().length && !plan.length) return { main: emptyState("finances", "Aucune dépense notée", "Garde une trace des consultations et des médicaments : tu verras le budget annuel en un coup d'œil.", "addExpense", "Ajouter une dépense"), aside: "" };
  const total = list.reduce((s, e) => s + e.amount, 0), planT = plan.filter(e => e.date.startsWith(String(yr))).reduce((s, e) => s + e.amount, 0);
  const lastT = lastYear.reduce((s, e) => s + e.amount, 0);
  const byCat = {}; list.forEach(e => byCat[e.cat] = (byCat[e.cat] || 0) + e.amount);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const color = c => CATS[c] || "var(--line)";
  const row = e => `<button class="row" data-act="editExpense" data-id="${e.id}"><span class="sw" style="width:10px;height:36px;border-radius:5px;background:${color(e.cat)};flex:none"></span><span class="r-main"><span class="r-title">${esc(e.label)}</span><br><span class="r-sub">${esc(e.cat)} · ${fmtShort(parse(e.date))}${parse(e.date).getFullYear() !== yr ? " " + parse(e.date).getFullYear() : ""}</span></span><b class="data">${fmtEur(e.amount)}</b></button>`;
  const main = `<div class="grid-2"><div class="col">
  <section class="card"><div class="total"><span class="label muted">Dépensé en ${yr}</span><span class="big">${fmtEur(total)}</span><p class="small muted">${planT ? fmtEur(total + planT) + " prévus d'ici fin décembre · " : ""}${lastT ? fmtEur(lastT) + " en " + (yr - 1) : "rien de noté en " + (yr - 1)}</p></div>
    ${chartBox("money", 190)}<div class="legend"><span><i style="background:var(--soin)"></i>Payé</span><span><i style="border:2px dashed var(--soin)"></i>Prévu</span></div></section>
  ${cats.length ? `<section class="card cat-list"><div class="card-h"><h2>Par catégorie</h2><span class="small muted">${yr}</span></div>
    <div class="stackbar" role="img" aria-label="${esc(cats.map(([c, v]) => c + " " + Math.round(v / total * 100) + " %").join(", "))}">${cats.map(([c, v]) => `<i style="width:${v / total * 100}%;background:${color(c)}"></i>`).join("")}</div>
    <div class="list">${cats.map(([c, v]) => `<div class="row"><span class="sw" style="background:${color(c)}"></span><span class="r-main"><span class="r-title">${esc(c)}</span></span><span class="r-end"><b class="data">${fmtEur(v)}</b><span class="small muted">${Math.round(v / total * 100)} %</span></span></div>`).join("")}</div></section>` : ""}
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Prochaines dépenses</h2><span class="data small muted">${fmtEur(plan.reduce((s, e) => s + e.amount, 0))}</span></div>${plan.length ? `<div class="list">${plan.map(p => `<button class="row" data-act="editExpense" data-id="${p.id}"><span class="r-ico miel">${ico("cal")}</span><span class="r-main"><span class="r-title">${esc(p.label)}</span><br><span class="r-sub">${cap(fmtDate(parse(p.date)))} · ${relDay(parse(p.date))}</span></span><span class="r-end"><b class="data">${fmtEur(p.amount)}</b><span class="small muted">estimé</span></span></button>`).join("")}</div>` : `<p class="small muted">Aucune dépense prévue. Ajoute une dépense « prévue » pour un vaccin ou un contrôle à venir.</p>`}</section>
  <section class="card"><div class="card-h"><h2>Historique</h2><button class="btn sm primary" data-act="addExpense">${ico("plus", "sm")}Ajouter</button></div>${expenses().length ? `<div class="list">${expenses().slice(0, 30).map(row).join("")}</div>` : `<p class="small muted">Aucune dépense payée pour l'instant.</p>`}</section>
  </div></div>`;
  const months = TODAY.getMonth() + 1;
  const aside = `<div class="kpi" style="box-shadow:none;background:var(--surface-tint)"><span class="k-lab">${ico("wallet")}Moyenne mensuelle</span><span class="k-val">${Math.round(total / months)}<small>€ / mois</small></span><span class="k-note muted">Calculée sur janvier à ${["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][TODAY.getMonth()]} ${yr}</span></div>
    <div class="explain"><h4>${ico("info", "sm")}Astuce</h4><p class="small">Garde une petite réserve pour les imprévus : une consultation d'urgence coûte souvent bien plus qu'une visite de routine.</p></div>`;
  return { main, aside, asideTitle: "Budget" };
};

export function expenseForm(id) {
  const e = id ? get("expenses", id) : null;
  const cats = Object.keys(CATS);
  if (e && !cats.includes(e.cat)) cats.push(e.cat);
  return form("expense", `${input("label", "Libellé", { value: e?.label || "", placeholder: "ex. Consultation" })}
    ${input("amount", "Montant (€)", { value: e?.amount ?? "", inputmode: "decimal", data: true, placeholder: "ex. 45" })}
    ${select("cat", "Catégorie", cats.map(c => [c, c]), e?.cat || "Consultations")}
    ${input("date", "Date", { type: "date", value: e?.date || key(TODAY) })}
    ${choices("planned", "Statut", [["non", "Payée"], ["oui", "Prévue"]], e?.planned ? "oui" : "non")}
    ${input("reimbursed", "Remboursé (€, facultatif)", { value: e?.reimbursed || "", inputmode: "decimal", data: true })}
    ${submit(e ? "Enregistrer" : "Ajouter la dépense")}
    ${e ? `<button type="button" class="btn ghost block" data-act="delExpense" data-id="${e.id}">${ico("x", "sm")}Supprimer cette dépense</button>` : ""}`, `data-id="${id || ""}"`);
}
FORMS.expense = async (f, v) => {
  const amount = parseNum(v.amount), reimb = parseNum(v.reimbursed);
  if (amount == null || Number.isNaN(amount) || amount <= 0) return formError(f, "Indique un montant en euros, par exemple 45.", "amount");
  if (Number.isNaN(reimb) || (reimb != null && reimb < 0)) return formError(f, "Le remboursement doit être un montant en euros.", "reimbursed");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return formError(f, "Indique la date.", "date");
  await commit([{ table: "expenses", row: { id: f.dataset.id || undefined, cat_id: cat().id, label: v.label || "Dépense vétérinaire", amount: Math.round(amount * 100) / 100, cat: v.cat, date: v.date, planned: v.planned === "oui", reimbursed: reimb || 0 } }]);
  closeSheet(); toast((f.dataset.id ? "Dépense mise à jour : " : "Dépense ajoutée : ") + fmtEur(amount)); markPending(); render(false);
};
