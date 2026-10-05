/* Écran Activité et GPS : activité saisie à la main. Aucun traceur n'est branché (voir Phase 6) : on le dit clairement. */
import { SCREENS } from "../screens/registry.js";
import { chartBox } from "../ui/charts.js";
import { emptyIll } from "../ui/illustrations.js";
import { ico, esc, key, TODAY, parse, fmtDate, cap, fmtNum } from "../utils/core.js";
import { closeSheet, toast, markPending, render } from "../ui/shell.js";
import { FORMS, form, input, submit, formError, parseNum } from "../ui/forms.js";
import { commit } from "../data/repo.js";
import { cat, catName, activities, activityOf, activityWeek } from "../domain/views.js";
import { lvl, emptyState } from "./today.js";

function wellbeing() {
  const wk = activityWeek().filter(d => d.v != null);
  if (wk.length < 3) return { level: null, text: "Note son activité quelques jours : on comparera chaque jour à sa moyenne de la semaine." };
  const avg = wk.reduce((s, d) => s + d.v, 0) / wk.length, last = wk.at(-1).v;
  const diff = Math.round((last - avg) / avg * 100);
  if (diff <= -25) return { level: "watch", text: `Dernière journée notée : ${last} min, ${-diff} % de moins que sa moyenne de la semaine (${Math.round(avg)} min).` };
  return { level: "ok", text: `Moyenne de la semaine : ${Math.round(avg)} min par jour (${wk.length} jours notés).` };
}

SCREENS.activite = () => {
  const c = cat();
  if (!c) return { main: emptyState("today", "Pas encore de profil", "Crée d'abord le profil de ton chat.", "profileForm", "Créer son profil"), aside: "" };
  const a = activityOf(key(TODAY)), goal = c.activity_goal || null, min = a?.minutes ?? null;
  const pct = goal && min != null ? Math.min(1, min / goal) : min ? 1 : 0, C = 2 * Math.PI * 54;
  const wb = wellbeing();
  const sentence = min == null ? "Pas encore notée aujourd'hui." : goal ? (min >= goal ? "Objectif atteint. Bravo à lui !" : `Encore ${goal - min} minutes pour son objectif.`) : "Fixe un objectif quotidien si tu veux suivre sa progression.";
  const main = `<div class="grid-2"><div class="col">
  <section class="card"><div class="ring-wrap"><div class="ring" role="img" aria-label="${min ?? 0} minutes d'activité${goal ? " sur un objectif de " + goal : ""}"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="54" fill="none" stroke="var(--surface-tint)" stroke-width="14"/><circle cx="66" cy="66" r="54" fill="none" stroke="var(--soin)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 66 66)"/></svg><div class="r-in"><b>${min ?? "—"}</b><span class="small muted">${goal ? "/ " + goal + " min" : "min"}</span></div></div>
    <div style="min-width:0"><h2 style="font-size:22px;line-height:28px">Activité du jour</h2><p class="small muted" style="margin-top:4px">${esc(sentence)}</p><button class="btn sm primary" data-act="activityForm" data-k="${key(TODAY)}" style="margin-top:12px">${ico(a ? "journal" : "plus", "sm")}${a ? "Modifier" : "Noter l'activité"}</button></div></div>
    ${a ? `<div class="well" style="margin-top:16px"><div>${ico("yarn", "sm")}<b>${a.play_min != null ? a.play_min + " min" : "—"}</b><span class="small muted">jeu</span></div><div>${ico("zzz", "sm")}<b>${a.sleep_h != null ? fmtNum(a.sleep_h) + " h" : "—"}</b><span class="small muted">sommeil</span></div><div>${ico("pin", "sm")}<b>${esc(a.zone || "—")}</b><span class="small muted">lieu</span></div></div>` : ""}</section>
  <section class="card"><div class="card-h"><h2>Bien-être</h2>${wb.level ? lvl(wb.level, wb.level === "ok" ? "Habituel" : "Moins actif") : ""}</div><p>${esc(wb.text)}</p>${chartBox("activity", 170)}</section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Où est ${esc(catName())} ?</h2><span class="small muted">Traceur</span></div>
    <div class="empty-state" style="padding:8px 0">${emptyIll("today")}<h3>Aucun traceur connecté</h3><p>L'appli ne suit pas sa position : elle n'utilise que tes saisies. Un accès officiel au collier Tractive sera vérifié plus tard ; aucun service non vérifié n'est branché.</p></div></section>
  </div></div>`;
  const recent = activities().slice(0, 5);
  const aside = `<div class="explain"><h4>${ico("info", "sm")}Pourquoi suivre l'activité ?</h4><p class="small">Un chat qui joue moins et dort plus peut simplement profiter du soleil. Associé à une baisse d'appétit, c'est un signe à noter pour le vétérinaire.</p></div>
    ${recent.length ? `<div class="list">${recent.map(x => `<button class="row" data-act="activityForm" data-k="${x.date}"><span class="r-ico">${ico("paw")}</span><span class="r-main"><span class="r-title">${cap(fmtDate(parse(x.date), parse(x.date).getFullYear() !== TODAY.getFullYear()))}</span><br><span class="r-sub">${x.minutes != null ? x.minutes + " min" : ""}${x.zone ? " · " + esc(x.zone) : ""}${x.notes ? " · " + esc(x.notes.slice(0, 60)) : ""}</span></span></button>`).join("")}</div>` : ""}`;
  return { main, aside, asideTitle: "Repères" };
};

export function activityFormHTML(k) {
  const a = activityOf(k), c = cat();
  return form("activity", `<p class="muted">${cap(fmtDate(parse(k), true))}</p>
    ${input("minutes", "Minutes d'activité", { value: a?.minutes ?? "", inputmode: "numeric", data: true })}
    ${input("play", "Dont jeu (minutes, facultatif)", { value: a?.play_min ?? "", inputmode: "numeric", data: true })}
    ${input("sleep", "Sommeil (heures, facultatif)", { value: a?.sleep_h != null ? String(a.sleep_h).replace(".", ",") : "", inputmode: "decimal", data: true })}
    ${input("zone", "Où (facultatif)", { value: a?.zone || "", placeholder: "ex. jardin, appartement" })}
    ${input("notes", "Note (facultatif)", { value: a?.notes || "", area: true })}
    ${input("goal", "Objectif quotidien en minutes (facultatif)", { value: c.activity_goal ?? "", inputmode: "numeric", data: true, help: "Sert uniquement à l'anneau et au graphique." })}
    ${submit(a ? "Enregistrer" : "Noter l'activité")}`, `data-k="${k}"`);
}
FORMS.activity = async (f, v) => {
  const n = { minutes: parseNum(v.minutes), play: parseNum(v.play), sleep: parseNum(v.sleep), goal: parseNum(v.goal) };
  for (const [name, val, max] of [["minutes", n.minutes, 1440], ["play", n.play, 1440], ["sleep", n.sleep, 24], ["goal", n.goal, 1440]]) {
    if (Number.isNaN(val) || (val != null && (val < 0 || val > max))) return formError(f, "Indique un nombre valide (par exemple 30).", name);
  }
  if (n.minutes == null && n.play == null && n.sleep == null && !v.zone && !v.notes) return formError(f, "Note au moins les minutes d'activité ou une remarque.", "minutes");
  const c = cat(), k = f.dataset.k;
  const ops = [{ table: "activities", row: { cat_id: c.id, date: k, minutes: n.minutes, play_min: n.play, sleep_h: n.sleep, zone: v.zone, notes: v.notes } }];
  if ((n.goal ?? null) !== (c.activity_goal ?? null)) ops.push({ table: "cats", row: { id: c.id, activity_goal: n.goal } });
  await commit(ops);
  closeSheet(); toast("Activité notée", "paw"); markPending(); render(false);
};
