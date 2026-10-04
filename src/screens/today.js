/* Écran Aujourd'hui (+ saisie rapide « coussinets », rappels, helpers partagés des écrans). */
import { LOGS, REMINDERS, SUGGESTIONS } from "../demo/fixture.js";
import { APPETIT, HUMEUR, LEVELS, SELLES } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { catSVG, drSVG, emptyIll, eyeStatus } from "../ui/illustrations.js";
import { JOURS, TODAY, cap, diffDays, esc, fmtDate, fmtShort, ico, key, parse, relDay } from "../utils/core.js";

export const lvl = (l, txt) => `<span class="status ${LEVELS[l].c}">${ico(LEVELS[l].i)}${txt || LEVELS[l].w}</span>`;
export function dayOverall(l) {
  if (!l) return null;
  const e = [l.m, l.e].filter(Boolean); if (!e.length) return null;
  const v = e.reduce((s, x) => s + (x.a + x.h) / 2, 0) / e.length;
  return v >= 2.5 ? "bonne" : v >= 1.75 ? "moyenne" : "difficile";
}
export const GLYPH = {
  bonne: `<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--ok)"/></svg>`,
  moyenne: `<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4" fill="none" stroke="var(--miel-ink)" stroke-width="1.6"/><path d="M6 1.6a4.4 4.4 0 0 1 0 8.8z" fill="var(--miel-ink)"/></svg>`,
  difficile: `<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4" fill="none" stroke="var(--roux-ink)" stroke-width="1.8"/><path d="M3 9l6-6" stroke="var(--roux-ink)" stroke-width="1.8"/></svg>`
};
export const DAYWORD = { bonne: "Bonne journée", moyenne: "Journée moyenne", difficile: "Journée difficile" };
export const todayLog = () => LOGS[key(TODAY)];
export function catMood() {
  const t = todayLog(), last = t && (t.e || t.m);
  if (last) return last.h === 3 ? "content" : last.h === 1 ? "boudeur" : "content";
  return "curieux";
}
export const emptyState = (kind, title, text, act, label) => `<div class="empty-state">${emptyIll(kind)}<h3>${title}</h3><p>${text}</p>${act ? `<button class="btn primary" data-act="${act}">${ico("plus")}${label}</button>` : ""}</div>`;

/* --- Saisie rapide : les coussinets --- */
export const QCATS = [
  { k: "h", lab: "Humeur", q: "Comment est son humeur ?", icon: "smile", opts: [[3, HUMEUR[3]], [2, HUMEUR[2]], [1, HUMEUR[1]]] },
  { k: "a", lab: "Appétit", q: "Comment a-t-il mangé ?", icon: "bowl", opts: [[3, APPETIT[3]], [2, APPETIT[2]], [1, APPETIT[1]]] },
  { k: "s", lab: "Selles", q: "Et dans la litière ?", icon: "litter", opts: [["ok", SELLES.ok], ["molles", SELLES.molles], ["non", SELLES.non]] }
];
export function quickHTML() {
  const t = todayLog(), saved = t && t[S.slot];
  const q = S.quick, slotW = S.slot === "m" ? "ce matin" : "ce soir";
  const done = !!saved && q.h == null && q.a == null && q.s == null;
  const vals = done ? saved : q;
  const toes = QCATS.map((c, i) => {
    const v = vals[c.k], o = v != null ? c.opts.find(x => x[0] == v)[1] : null;
    const cur = !done && q.step === i;
    return `<button class="toe ${o ? "done" : ""}" data-act="qstep" data-step="${i}" ${cur ? 'aria-current="step"' : ""} aria-label="${c.lab} : ${o ? o.w : "à renseigner"}">
      <span class="pad">${ico(o ? o.i : c.icon, "lg")}</span><span class="t-lab">${c.lab}</span><span class="t-val">${o ? o.w : "·"}</span></button>`;
  }).join("");
  const c = QCATS[Math.min(q.step, 2)];
  const opts = done ? "" : `<p class="opt-q" id="optq">${c.q}</p><div class="options" role="group" aria-labelledby="optq">${c.opts.map(([v, o]) => `<button class="opt" data-act="qpick" data-k="${c.k}" data-v="${v}">${ico(o.i)}${o.w}</button>`).join("")}</div>`;
  const nDone = QCATS.filter(c => vals[c.k] != null).length;
  return `<section class="card paw-card" id="quick" aria-label="Saisie rapide">
    <div class="paw-head"><h2>Comment va Doudou ${slotW} ?</h2>
      <div class="seg" role="group" aria-label="Moment de la journée"><button data-act="slot" data-v="m" aria-pressed="${S.slot === "m"}">Matin</button><button data-act="slot" data-v="e" aria-pressed="${S.slot === "e"}">Soir</button></div></div>
    <div class="paw">${toes}</div>
    ${opts}
    <div class="main-pad ${done ? "done" : ""}" id="mainPad" role="status">${done ? ico("check") + "Noté pour " + slotW + ". Merci !" : nDone + " sur 3"}<span class="print-paw">${`<svg viewBox="0 0 24 24"><use href="#i-pawfill"/></svg>`}</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      ${done ? `<button class="link-btn" data-act="qedit">${ico("refresh")}Modifier</button>` : `<span class="small muted">Enregistré automatiquement à la 3ᵉ touche</span>`}
      <button class="link-btn" data-act="form" data-day="${key(TODAY)}">Saisie détaillée${ico("chev-r")}</button></div>
  </section>`;
}
export function remindersHTML(limit) {
  const list = REMINDERS.slice(0, limit || 9);
  return `<section class="card"><div class="card-h"><h2>Prochains rappels</h2><button class="link-btn" data-go="dossier">Dossier${ico("chev-r")}</button></div>
    <div class="list">${list.map(m => { const d = parse(m.date), n = diffDays(d, TODAY);
      return `<button class="row" data-act="reminder" data-id="${m.id}" style="align-items:flex-start"><span class="r-ico ${m.c}">${ico(m.i)}</span><span class="r-main"><span class="r-title">${m.title}</span><br><span class="r-sub">${m.sub}</span><span class="r-meta"><span class="status ${n <= 2 ? "soon" : n <= 21 ? "watch" : "neutral"}">${n <= 2 ? ico("clock") : ""}${cap(relDay(d))}</span><span class="small muted data">${fmtShort(d)}</span></span></span>${ico("chev-r", "sm chev")}</button>`; }).join("")}</div></section>`;
}
SCREENS.aujourdhui = () => {
  const d = TODAY;
  if (S.empty) return { main: `<section class="hero"><div class="hero-top"><div class="hero-cat">${catSVG("curieux")}</div><div class="hero-txt"><p class="hero-date">${cap(JOURS[d.getDay()])} ${fmtDate(d)}</p><h2>Bienvenue, Doudou !</h2></div></div><p class="hero-sum">Commence par la saisie du jour : trois touches, et l'appli apprend à connaître ses habitudes.</p></section>${quickHTML()}${emptyState("today", "Aucun rappel pour l'instant", "Ajoute son dernier vaccin ou son traitement en cours : on te préviendra avant chaque échéance.", "goDossier", "Ajouter un soin")}`, aside: asideToday() };
  const hero = `<section class="hero" aria-label="Doudou aujourd'hui"><div class="hero-top"><div class="hero-cat" id="heroCat" style="position:relative">${catSVG(catMood())}<div class="hearts" id="hearts"></div></div>
    <div class="hero-txt"><p class="hero-date">${cap(JOURS[d.getDay()])} ${fmtDate(d)}</p><h2>Doudou se repose</h2></div></div>
    <p class="hero-sum">Il a dormi au soleil une bonne partie de la matinée. Son appétit est un peu bas depuis 3 jours, le reste va bien.</p>
    <button class="eye" data-go="sante">${eyeStatus("watch")}<span>À surveiller : l'appétit</span>${ico("chev-r", "sm")}</button>
    <div class="whiskers" aria-hidden="true"><i></i><i></i><i></i></div></section>`;
  const alert = `<section class="alert-soft" role="note"><span class="a-ico">${ico("eye")}</span><div><h3>Son appétit baisse depuis 3 jours</h3>
    <p>Il mange environ la moitié de sa ration depuis le 1er octobre. Rien d'alarmant pour l'instant : note bien ses repas, et appelle le Dr Martin s'il ne mange presque plus rien pendant 24 heures.</p>
    <div class="acts"><button class="btn sm secondary" data-act="ask" data-q="Pourquoi mange-t-il moins depuis 3 jours ?">${ico("doc", "sm")}Demander à Dr. Doudou</button><button class="btn sm ghost" data-go="alimentation">Voir ses repas</button></div></div></section>`;
  const kpis = `<section class="kpis" aria-label="Chiffres du jour">
    <button class="kpi" data-go="sante"><span class="k-lab">${ico("scale")}Poids</span><span class="k-val">4,60<small>kg</small></span><span class="k-note">${lvl("ok", "Zone idéale")}</span></button>
    <button class="kpi" data-go="activite"><span class="k-lab">${ico("paw")}Activité</span><span class="k-val">38<small>/45 min</small></span><span class="k-note muted">Un peu moins joueur</span></button>
    <button class="kpi" data-go="alimentation"><span class="k-lab">${ico("bowl")}Mangé</span><span class="k-val">26<small>/50 g</small></span><span class="k-note muted">2 repas restants</span></button>
    <button class="kpi" data-go="alimentation"><span class="k-lab">${ico("drop")}Eau</span><span class="k-val">140<small>ml</small></span><span class="k-note muted">Normal à cette heure</span></button></section>`;
  return { main: `<div class="grid-2"><div class="col">${hero}${quickHTML()}</div><div class="col">${alert}${remindersHTML()}</div></div>${kpis}`, aside: asideToday(), asideTitle: "Dr. Doudou" };
};
export function asideToday() {
  return `<div style="display:flex;gap:12px;align-items:center">${drSVG("av")}<p><b>Une question sur Doudou ?</b><br><span class="muted small">Je réponds avec son dossier et des sources vétérinaires.</span></p></div>
  <div class="suggest">${SUGGESTIONS.slice(0, 3).map(q => `<button data-act="ask" data-q="${esc(q)}">${ico("doc")}${q}</button>`).join("")}</div>
  <div class="explain"><h4>${ico("journal", "sm")}Sa semaine</h4><p class="small">5 bonnes journées sur 7. Selles normales tous les jours. Appétit en baisse depuis jeudi, humeur stable, activité un peu plus basse (−20 %).</p></div>
  <p class="fine">${ico("info", "sm")}Ne remplace pas un vétérinaire.</p>`;
}
