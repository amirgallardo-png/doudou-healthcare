/* Écran Finances. */
import { EXPENSES, PLANNED } from "../demo/fixture.js";
import { CATS } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { emptyState } from "../screens/today.js";
import { S } from "../state.js";
import { chartBox } from "../ui/charts.js";
import { TODAY, cap, esc, fmtDate, fmtEur, fmtShort, ico, key, parse, relDay } from "../utils/core.js";

SCREENS.finances = () => {
  if (S.empty) return { main: emptyState("finances", "Aucune dépense notée", "Garde une trace des consultations et des médicaments : tu verras le budget annuel de Doudou en un coup d'œil.", "addExpense", "Ajouter une dépense"), aside: "" };
  const total = EXPENSES.reduce((s, e) => s + e.amt, 0), plan = PLANNED.reduce((s, e) => s + e.amt, 0);
  const byCat = {}; EXPENSES.forEach(e => byCat[e.cat] = (byCat[e.cat] || 0) + e.amt);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const main = `<div class="grid-2"><div class="col">
  <section class="card"><div class="total"><span class="label muted">Dépensé en 2026</span><span class="big">${fmtEur(total)}</span><p class="small muted">${fmtEur(total + plan)} prévus d'ici fin décembre · 356 € en 2025</p></div>
    ${chartBox("money", 190)}<div class="legend"><span><i style="background:var(--soin)"></i>Payé</span><span><i style="border:2px dashed var(--soin)"></i>Prévu</span></div></section>
  <section class="card cat-list"><div class="card-h"><h2>Par catégorie</h2></div>
    <div class="stackbar" role="img" aria-label="${cats.map(([c, v]) => c + " " + Math.round(v / total * 100) + " %").join(", ")}">${cats.map(([c, v]) => `<i style="width:${v / total * 100}%;background:${CATS[c]}"></i>`).join("")}</div>
    <div class="list">${cats.map(([c, v]) => `<div class="row"><span class="sw" style="background:${CATS[c]}"></span><span class="r-main"><span class="r-title">${c}</span></span><span class="r-end"><b class="data">${fmtEur(v)}</b><span class="small muted">${Math.round(v / total * 100)} %</span></span></div>`).join("")}</div></section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Prochaines dépenses</h2><span class="data small muted">${fmtEur(plan)}</span></div><div class="list">${PLANNED.map(p => `<div class="row"><span class="r-ico miel">${ico("cal")}</span><span class="r-main"><span class="r-title">${p.label}</span><br><span class="r-sub">${cap(fmtDate(parse(p.d)))} · ${relDay(parse(p.d))}</span></span><span class="r-end"><b class="data">${fmtEur(p.amt)}</b><span class="small muted">estimé</span></span></div>`).join("")}</div></section>
  <section class="card"><div class="card-h"><h2>Historique</h2><button class="btn sm primary" data-act="addExpense">${ico("plus", "sm")}Ajouter</button></div><div class="list">${EXPENSES.slice().sort((a, b) => b.d.localeCompare(a.d)).map(e => `<div class="row"><span class="sw" style="width:10px;height:36px;border-radius:5px;background:${CATS[e.cat] || "var(--line)"};flex:none"></span><span class="r-main"><span class="r-title">${esc(e.label)}</span><br><span class="r-sub">${e.cat} · ${fmtShort(parse(e.d))}</span></span><b class="data">${fmtEur(e.amt)}</b></div>`).join("")}</div></section>
  </div></div>`;
  const aside = `<div class="kpi" style="box-shadow:none;background:var(--surface-tint)"><span class="k-lab">${ico("wallet")}Moyenne mensuelle</span><span class="k-val">${Math.round(total / 10)}<small>€ / mois</small></span><span class="k-note muted">Calculée sur janvier à octobre</span></div>
    <div class="explain"><h4>${ico("info", "sm")}Astuce</h4><p class="small">Garde une petite réserve de 150 € pour les imprévus : une consultation d'urgence coûte souvent entre 80 et 150 €.</p></div>`;
  return { main, aside, asideTitle: "Budget" };
};
export function expenseForm() {
  return `<form id="expForm" novalidate style="display:flex;flex-direction:column;gap:16px">
    <div class="field"><label for="eLabel">Libellé</label><input class="input" id="eLabel" placeholder="ex. Consultation"></div>
    <div class="field"><label for="eAmt">Montant (€)</label><input class="input data" id="eAmt" inputmode="decimal" placeholder="ex. 45"><span class="err" id="eErr" hidden></span></div>
    <div class="field"><label for="eCat">Catégorie</label><select class="input" id="eCat">${Object.keys(CATS).map(c => `<option>${c}</option>`).join("")}</select></div>
    <div class="field"><label for="eDate">Date</label><input class="input" id="eDate" type="date" value="${key(TODAY)}" max="${key(TODAY)}"></div>
    <button class="btn primary block" type="submit">${ico("check")}Ajouter la dépense</button></form>`;
}
