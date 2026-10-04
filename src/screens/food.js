/* Écran Alimentation et poids. */
import { FOOD } from "../demo/fixture.js";
import { SCREENS } from "../screens/registry.js";
import { lvl } from "../screens/today.js";
import { chartBox } from "../ui/charts.js";
import { ico } from "../utils/core.js";

SCREENS.alimentation = () => {
  const meals = FOOD.meals.map((m, i) => `<button class="row meal" data-act="meal" data-i="${i}"><span class="meal-time">${m.t}</span><span class="r-main"><span class="r-title">${m.what}</span><br><span class="r-sub">${m.qty} · ${m.done ? (m.eaten >= .9 ? "tout mangé" : m.eaten >= .5 ? "la moitié" : "presque rien") : "à venir, touche pour noter"}</span>${m.done ? `<span class="bowl-meter" aria-hidden="true"><i style="width:${m.eaten * 100}%"></i></span>` : ""}</span>${m.done ? `<span class="status ${m.eaten >= .9 ? "ok" : m.eaten >= .5 ? "watch" : "soon"}">${Math.round(m.eaten * 100)} %</span>` : ico("plus", "sm")}</button>`).join("");
  const main = `<div class="grid-2"><div class="col">
  <section class="card"><div class="card-h"><h2>Repas du jour</h2><span class="small muted data">26 g / 50 g</span></div><div class="list">${meals}</div></section>
  <section class="card"><div class="card-h"><h2>Croquettes mangées</h2><span class="small muted">7 derniers jours</span></div>${chartBox("food", 180)}<div class="meaning">${ico("info")}<p>Il mangeait toute sa ration jusqu'à jeudi. Depuis, il en laisse environ la moitié.</p></div></section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Ce qu'il mange</h2></div>
    <div class="list"><div class="row brand-card"><span class="pack">FV</span><span class="r-main"><span class="r-title">${FOOD.dry.name}</span><br><span class="r-sub">${FOOD.dry.kind} · ${FOOD.dry.note}</span></span></div>
    <div class="row brand-card"><span class="pack roux">MM</span><span class="r-main"><span class="r-title">${FOOD.wet.name}</span><br><span class="r-sub">${FOOD.wet.kind}</span></span></div>
    <div class="row"><span class="r-ico">${ico("water")}</span><span class="r-main"><span class="r-title">Eau</span><br><span class="r-sub">${FOOD.water}</span></span></div></div>
    <div class="allergy" style="margin-top:12px">${ico("alert")}<span><strong>Sans poulet</strong> : vérifie la composition avant tout nouvel aliment.</span></div></section>
  <section class="card"><div class="card-h"><h2>Transition alimentaire</h2>${lvl("ok", "Terminée")}</div>
    <p class="small">De <b>${FOOD.transition.from}</b> à <b>${FOOD.transition.to}</b>, du 14 au 24 septembre. On mélange progressivement l'ancien et le nouvel aliment pour ménager son ventre.</p>
    <div class="transition">${FOOD.transition.steps.map(([d, p]) => `<div><span class="bar" role="img" aria-label="${d} : ${p} % de nouvelles croquettes"><i style="width:${p}%"></i><s style="width:${100 - p}%"></s></span>${d}<b class="data" style="color:var(--ink)">${p} %</b></div>`).join("")}</div>
    <div class="legend"><span><i style="background:var(--soin)"></i>Nouvelles</span><span><i style="background:var(--roux-tint)"></i>Anciennes</span></div></section>
  <section class="card"><div class="card-h"><h2>Poids</h2><button class="link-btn" data-go="sante">Santé${ico("chev-r")}</button></div>${chartBox("weight", 170)}</section>
  </div></div>`;
  const aside = `<div class="kpi" style="box-shadow:none;background:var(--surface-tint)"><span class="k-lab">${ico("bowl")}Ration conseillée</span><span class="k-val">50<small>g/jour</small></span><span class="k-note muted">+ 1 sachet de pâtée le soir, pour un chat stérilisé de 4,6 kg</span></div>
    <div class="explain"><h4>${ico("info", "sm")}Bon à savoir</h4><p class="small">Un chat qui mange moins de la moitié de sa ration pendant plus de 24 heures doit être vu par un vétérinaire.</p></div>
    <button class="btn secondary block" data-act="ask" data-q="Pourquoi mange-t-il moins depuis 3 jours ?">${ico("doc", "sm")}Demander à Dr. Doudou</button>`;
  return { main, aside, asideTitle: "Repères" };
};
