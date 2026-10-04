/* Écran Santé. */
import { LEVELS } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { emptyState, lvl } from "../screens/today.js";
import { S } from "../state.js";
import { chartBox } from "../ui/charts.js";
import { ico } from "../utils/core.js";

SCREENS.sante = () => {
  if (S.empty) return { main: `<div class="verdict"><h2>Pas encore assez de données</h2><p class="muted">Les tendances apparaissent après 7 jours de saisies.</p></div>${emptyState("journal", "On attend ses premières saisies", "Note son humeur, son appétit et ses selles matin et soir : les courbes se dessineront d'elles-mêmes.", "goToday", "Faire la saisie du jour")}`, aside: "" };
  const main = `<div class="verdict"><h2>Doudou va bien, avec un point à surveiller</h2><p class="muted">Basé sur 90 jours de journal, 14 pesées et son bilan d'août.</p></div>
  <div class="ind">
    <button class="ind-card" data-act="explainInd" data-k="poids"><span class="i-ico t-vaccin">${ico("scale")}</span><span class="i-top"><span class="i-name">Poids</span>${lvl("ok", "Dans la norme")}</span><span class="i-val">4,60 kg</span><span class="i-txt">Zone idéale 4,4–4,8 kg · −0,2 kg en 2 mois, comme conseillé</span></button>
    <button class="ind-card" data-act="explainInd" data-k="appetit"><span class="i-ico t-analyse">${ico("bowl")}</span><span class="i-top"><span class="i-name">Appétit</span>${lvl("watch")}</span><span class="i-val">${ico("down", "sm")} 3 jours</span><span class="i-txt">Environ la moitié de sa ration depuis le 1er octobre</span></button>
    <button class="ind-card" data-act="explainInd" data-k="humeur"><span class="i-ico t-consult">${ico("smile")}</span><span class="i-top"><span class="i-name">Humeur</span>${lvl("ok", "Stable")}</span><span class="i-val">Calme</span><span class="i-txt">Un peu moins joueur que d'habitude, sans signe de douleur noté</span></button>
  </div>
  <section class="card"><div class="card-h"><h2>Courbe de poids</h2><div class="seg" role="group" aria-label="Période du poids"><button data-act="wrange" data-v="3" aria-pressed="${S.weightRange === 3}">3 mois</button><button data-act="wrange" data-v="6" aria-pressed="${S.weightRange === 6}">6 mois</button></div></div>
    ${chartBox("weight", 220)}
    <div class="legend"><span><i style="background:var(--ok-tint);box-shadow:inset 0 0 0 1px var(--ok)"></i>Zone idéale (fixée avec le Dr Martin)</span><span><i style="background:var(--soin)"></i>Pesées</span></div>
    <div class="meaning">${ico("info")}<p>Il est passé de 4,80 à 4,60 kg depuis fin juillet. C'est ce que conseillait le bilan annuel, et il reste dans sa zone idéale.</p></div></section>
  <section class="card"><div class="card-h"><h2>Tendances</h2><div class="seg" role="group" aria-label="Période des tendances">${[7, 30, 90].map(p => `<button data-act="period" data-v="${p}" aria-pressed="${S.period === p}">${p} j</button>`).join("")}</div></div>
    <div class="trend-grid">
      <div><div class="section-h" style="margin-bottom:8px"><h3 style="font-size:17px">Appétit</h3>${lvl("watch")}</div>${chartBox("appetit", 150)}<p class="small muted" style="margin-top:8px">Les 3 dernières barres (en plein) sont plus basses que sa moyenne.</p></div>
      <div><div class="section-h" style="margin-bottom:8px"><h3 style="font-size:17px">Humeur</h3>${lvl("ok", "Stable")}</div>${chartBox("humeur", 150)}<p class="small muted" style="margin-top:8px">Barre haute = joueur, moyenne = calme, basse = grognon.</p></div>
    </div></section>`;
  const aside = `<div class="explain"><h4>${ico("info", "sm")}Comment lire cet écran</h4><p class="small">Chaque indicateur compare Doudou à lui-même : sa moyenne des 30 derniers jours et la zone fixée avec son vétérinaire.</p></div>
    <div class="list">${Object.entries(LEVELS).map(([k, l]) => `<div class="row"><span class="r-main"><span class="r-title">${lvl(k)}</span><br><span class="r-sub">${{ ok: "Dans ses habitudes, rien à faire de particulier.", watch: "Un changement à suivre quelques jours à la maison.", soon: "Prendre rendez-vous dans les jours qui viennent.", urgent: "Appeler un vétérinaire immédiatement." }[k]}</span></span></div>`).join("")}</div>
    <button class="btn primary block" data-act="ask" data-q="Pourquoi mange-t-il moins depuis 3 jours ?">${ico("doc")}Parler de l'appétit</button>`;
  return { main, aside, asideTitle: "Les niveaux" };
};
