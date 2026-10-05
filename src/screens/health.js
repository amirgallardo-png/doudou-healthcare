/* Écran Santé : verdict, indicateurs, courbe de poids, tendances (tout est calculé à partir du journal et des pesées). */
import { LEVELS, HUMEUR } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { chartBox } from "../ui/charts.js";
import { ico, esc, fmtKg, fmtDate, TODAY, key } from "../utils/core.js";
import { FORMS, form, input, submit, formError, parseNum } from "../ui/forms.js";
import { commit } from "../data/repo.js";
import { closeSheet, toast, markPending, render } from "../ui/shell.js";
import { lvl, emptyState, askBtn } from "./today.js";
import { cat, catName, logs, weights, hasTarget, journalDays } from "../domain/views.js";
import { trend, weightStatus } from "../domain/insights.js";

const fmtZone = c => `${String(c.target_min).replace(".", ",")}–${String(c.target_max).replace(".", ",")} kg`;

export function weightMeaning() {
  const c = cat(), ws = weights();
  if (!ws.length) return "Aucune pesée pour l'instant : ajoute son poids dans la saisie détaillée du journal.";
  const last = ws.at(-1), first = ws[0];
  const span = ws.length > 1 ? ` Il est passé de ${fmtKg(first.v)} (${fmtDate(first.d, true)}) à ${fmtKg(last.v)} (${fmtDate(last.d, true)}).` : "";
  const zone = hasTarget(c) ? ` Sa zone idéale, fixée avec le vétérinaire : ${fmtZone(c)}.` : " Aucune zone idéale n'est encore renseignée : demande-la à ton vétérinaire et note-la dans son profil.";
  return `${ws.length} pesée${ws.length > 1 ? "s" : ""} enregistrée${ws.length > 1 ? "s" : ""}.${span}${zone}`;
}

SCREENS.sante = () => {
  const c = cat();
  if (!c) return { main: `<div class="verdict"><h2>Pas encore de profil</h2><p class="muted">Crée le profil de ton chat pour commencer son suivi.</p></div>${emptyState("journal", "On attend ses premières saisies", "Note son humeur, son appétit et ses selles matin et soir : les courbes se dessineront d'elles-mêmes.", "goToday", "Aller à la saisie du jour")}`, aside: "" };
  const all = logs(), name = catName();
  const appT = trend(all, "a", TODAY), humT = trend(all, "h", TODAY), ws = weightStatus(c, weights());
  const nDays = journalDays().length, nW = weights().length;
  const watch = [appT.level, humT.level, ws.level].filter(l => l === "watch").length;
  const known = [appT.level, humT.level, ws.level].some(Boolean);
  const verdict = !known ? `Pas encore assez de données` : watch ? `${name} va bien, avec ${watch > 1 ? watch + " points" : "un point"} à surveiller` : `${name} va bien`;
  const lastH = [...Object.keys(all)].sort().reverse().map(k => all[k].e || all[k].m).find(e => e?.h != null);
  const trendTxt = t => (!t.enough ? (t.lowStreak ? "Bas deux jours de suite" : "Pas encore assez de saisies (il en faut une dizaine sur 30 jours)") : t.dir === "baisse" ? "Plus bas que d'habitude ces 3 derniers jours" : t.dir === "hausse" ? "Plus haut que d'habitude ces 3 derniers jours" : "Dans ses habitudes");
  const main = `<div class="verdict"><h2>${esc(verdict)}</h2><p class="muted">Basé sur ${nDays} jour${nDays > 1 ? "s" : ""} de journal et ${nW} pesée${nW > 1 ? "s" : ""}.</p></div>
  <div class="ind">
    <button class="ind-card" data-act="explainInd" data-k="poids"><span class="i-ico t-vaccin">${ico("scale")}</span><span class="i-top"><span class="i-name">Poids</span>${ws.level ? lvl(ws.level, ws.level === "ok" ? "Dans la norme" : "Hors zone") : `<span class="status neutral">${ws.last ? "Zone à fixer" : "Aucune pesée"}</span>`}</span><span class="i-val">${ws.last ? fmtKg(ws.last.v) : "—"}</span><span class="i-txt">${esc(hasTarget(c) ? "Zone idéale " + fmtZone(c) + " · " + ws.text : ws.text)}</span></button>
    <button class="ind-card" data-act="explainInd" data-k="appetit"><span class="i-ico t-analyse">${ico("bowl")}</span><span class="i-top"><span class="i-name">Appétit</span>${appT.level ? lvl(appT.level, appT.level === "ok" ? "Stable" : null) : '<span class="status neutral">À suivre</span>'}</span><span class="i-val">${appT.dir === "baisse" ? ico("down", "sm") + " 3 jours" : appT.enough ? "Habituel" : "—"}</span><span class="i-txt">${esc(trendTxt(appT))}</span></button>
    <button class="ind-card" data-act="explainInd" data-k="humeur"><span class="i-ico t-consult">${ico("smile")}</span><span class="i-top"><span class="i-name">Humeur</span>${humT.level ? lvl(humT.level, humT.level === "ok" ? "Stable" : null) : '<span class="status neutral">À suivre</span>'}</span><span class="i-val">${lastH ? HUMEUR[lastH.h].w : "—"}</span><span class="i-txt">${esc(trendTxt(humT))}</span></button>
  </div>
  <section class="card"><div class="card-h"><h2>Courbe de poids</h2><div class="seg" role="group" aria-label="Période du poids"><button data-act="wrange" data-v="3" aria-pressed="${S.weightRange === 3}">3 mois</button><button data-act="wrange" data-v="6" aria-pressed="${S.weightRange === 6}">6 mois</button><button data-act="wrange" data-v="0" aria-pressed="${S.weightRange === 0}">Tout</button></div></div>
    ${chartBox("weight", 220)}
    <div class="legend">${hasTarget(c) ? `<span><i style="background:var(--ok-tint);box-shadow:inset 0 0 0 1px var(--ok)"></i>Zone idéale (fixée avec le vétérinaire)</span>` : ""}<span><i style="background:var(--soin)"></i>Pesées</span></div>
    <div class="meaning">${ico("info")}<p>${esc(weightMeaning())}</p></div>
    <div style="margin-top:12px"><button class="btn sm primary" data-act="weightForm">${ico("scale", "sm")}Ajouter une pesée</button></div></section>
  <section class="card"><div class="card-h"><h2>Tendances</h2><div class="seg" role="group" aria-label="Période des tendances">${[7, 30, 90].map(p => `<button data-act="period" data-v="${p}" aria-pressed="${S.period === p}">${p} j</button>`).join("")}</div></div>
    <div class="trend-grid">
      <div><div class="section-h" style="margin-bottom:8px"><h3 style="font-size:17px">Appétit</h3>${appT.level ? lvl(appT.level, appT.level === "ok" ? "Stable" : null) : ""}</div>${chartBox("appetit", 150)}<p class="small muted" style="margin-top:8px">Les 3 dernières barres (en plein) sont comparées à sa moyenne.</p></div>
      <div><div class="section-h" style="margin-bottom:8px"><h3 style="font-size:17px">Humeur</h3>${humT.level ? lvl(humT.level, humT.level === "ok" ? "Stable" : null) : ""}</div>${chartBox("humeur", 150)}<p class="small muted" style="margin-top:8px">Barre haute = joueur, moyenne = calme, basse = grognon.</p></div>
    </div></section>`;
  const aside = `<div class="explain"><h4>${ico("info", "sm")}Comment lire cet écran</h4><p class="small">Chaque indicateur compare ${esc(name)} à lui-même : sa moyenne des 30 derniers jours et la zone fixée avec son vétérinaire. Sans assez de saisies, l'appli ne conclut rien.</p></div>
    <div class="list">${Object.entries(LEVELS).map(([k]) => `<div class="row"><span class="r-main"><span class="r-title">${lvl(k)}</span><br><span class="r-sub">${{ ok: "Dans ses habitudes, rien à faire de particulier.", watch: "Un changement à suivre quelques jours à la maison.", soon: "Prendre rendez-vous dans les jours qui viennent.", urgent: "Appeler un vétérinaire immédiatement." }[k]}</span></span></div>`).join("")}</div>
    ${askBtn("Comment va son appétit ?", "Parler de l'appétit", "btn primary block")}`;
  return { main, aside, asideTitle: "Les niveaux" };
};

/* Pesée rapide (date + poids) ; une seule pesée du matin par jour : la nouvelle remplace l'ancienne. */
export const weightFormHTML = () => form("weight", `${input("date", "Date", { type: "date", value: key(TODAY), max: key(TODAY) })}
  ${input("kg", "Poids (kg)", { inputmode: "decimal", data: true, placeholder: "ex. 5,9" })}${submit("Enregistrer la pesée", "scale")}`);
FORMS.weight = async (f, v) => {
  const kg = parseNum(v.kg);
  if (kg == null || Number.isNaN(kg) || kg < 0.5 || kg > 15) return formError(f, "Le poids s'écrit en kilos, par exemple 5,9.", "kg");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || v.date > key(TODAY)) return formError(f, "Indique une date passée ou aujourd'hui.", "date");
  await commit([{ table: "weights", row: { cat_id: cat().id, date: v.date, moment: "m", kg: Math.round(kg * 100) / 100 } }]);
  closeSheet(); toast("Pesée enregistrée : " + fmtKg(kg), "scale"); markPending(); render(false);
};
