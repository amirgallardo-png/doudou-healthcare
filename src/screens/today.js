/* Écran Aujourd'hui (+ saisie rapide « coussinets », rappels, helpers partagés des écrans). Données réelles. */
import { APPETIT, HUMEUR, LEVELS, SELLES } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { catSVG, drSVG, emptyIll, eyeStatus } from "../ui/illustrations.js";
import { JOURS, TODAY, cap, diffDays, esc, fmtDate, fmtShort, fmtKg, ico, key, parse, relDay } from "../utils/core.js";
import { cat, catName, logs, lastWeight, reminders, rationOf, activityOf, hasTarget } from "../domain/views.js";
import { dayOverall, trend, weightStatus, weekSummary, heroTitle, catMood as moodOf } from "../domain/insights.js";
import { weights } from "../domain/views.js";

export { dayOverall };
/* Dr. Doudou (IA) est branché en Phase 4 : d'ici là, aucun bouton ne mène à une réponse simulée. */
export const AI_READY = false;
export const askBtn = (q, label = "Demander à Dr. Doudou", cls = "btn sm secondary") => (AI_READY ? `<button class="${cls}" data-act="ask" data-q="${esc(q)}">${ico("doc", "sm")}${label}</button>` : "");

export const lvl = (l, txt) => `<span class="status ${LEVELS[l].c}">${ico(LEVELS[l].i)}${esc(txt || LEVELS[l].w)}</span>`;
export const GLYPH = {
  bonne: `<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="var(--ok)"/></svg>`,
  moyenne: `<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4" fill="none" stroke="var(--miel-ink)" stroke-width="1.6"/><path d="M6 1.6a4.4 4.4 0 0 1 0 8.8z" fill="var(--miel-ink)"/></svg>`,
  difficile: `<svg class="g" viewBox="0 0 12 12" aria-hidden="true"><circle cx="6" cy="6" r="4.4" fill="none" stroke="var(--roux-ink)" stroke-width="1.8"/><path d="M3 9l6-6" stroke="var(--roux-ink)" stroke-width="1.8"/></svg>`
};
export const DAYWORD = { bonne: "Bonne journée", moyenne: "Journée moyenne", difficile: "Journée difficile" };
export const todayLog = () => logs()[key(TODAY)] || null;
export const catMood = () => moodOf(todayLog());
export const emptyState = (kind, title, text, act, label) => `<div class="empty-state">${emptyIll(kind)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${act ? `<button class="btn primary" data-act="${act}">${ico("plus")}${esc(label)}</button>` : ""}</div>`;

/* --- Saisie rapide : les coussinets --- */
export const QCATS = [
  { k: "h", lab: "Humeur", q: "Comment est son humeur ?", icon: "smile", opts: [[3, HUMEUR[3]], [2, HUMEUR[2]], [1, HUMEUR[1]]] },
  { k: "a", lab: "Appétit", q: "Comment a-t-il mangé ?", icon: "bowl", opts: [[3, APPETIT[3]], [2, APPETIT[2]], [1, APPETIT[1]]] },
  { k: "s", lab: "Selles", q: "Et dans la litière ?", icon: "litter", opts: [["ok", SELLES.ok], ["molles", SELLES.molles], ["non", SELLES.non]] }
];
export function quickHTML() {
  const t = todayLog(), saved = t && t[S.slot];
  const q = S.quick, slotW = S.slot === "m" ? "ce matin" : "ce soir";
  const done = !!saved && !q.editing && q.h == null && q.a == null && q.s == null;
  const vals = done ? saved : q;
  const toes = QCATS.map((c, i) => {
    const v = vals[c.k], o = v != null ? c.opts.find(x => x[0] == v)?.[1] : null;
    const cur = !done && q.step === i;
    return `<button class="toe ${o ? "done" : ""}" data-act="qstep" data-step="${i}" ${cur ? 'aria-current="step"' : ""} aria-label="${c.lab} : ${o ? o.w : "à renseigner"}">
      <span class="pad">${ico(o ? o.i : c.icon, "lg")}</span><span class="t-lab">${c.lab}</span><span class="t-val">${o ? o.w : "·"}</span></button>`;
  }).join("");
  const c = QCATS[Math.min(q.step, 2)];
  const opts = done ? "" : `<p class="opt-q" id="optq">${c.q}</p><div class="options" role="group" aria-labelledby="optq">${c.opts.map(([v, o]) => `<button class="opt" data-act="qpick" data-k="${c.k}" data-v="${v}">${ico(o.i)}${o.w}</button>`).join("")}</div>`;
  const nDone = QCATS.filter(c => vals[c.k] != null).length;
  return `<section class="card paw-card" id="quick" aria-label="Saisie rapide">
    <div class="paw-head"><h2>Comment va ${esc(catName())} ${slotW} ?</h2>
      <div class="seg" role="group" aria-label="Moment de la journée"><button data-act="slot" data-v="m" aria-pressed="${S.slot === "m"}">Matin</button><button data-act="slot" data-v="e" aria-pressed="${S.slot === "e"}">Soir</button></div></div>
    <div class="paw">${toes}</div>
    ${opts}
    <div class="main-pad ${done ? "done" : ""}" id="mainPad" role="status">${done ? ico("check") + "Noté pour " + slotW + ". Merci !" : nDone + " sur 3"}<span class="print-paw">${`<svg viewBox="0 0 24 24"><use href="#i-pawfill"/></svg>`}</span></div>
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      ${done ? `<button class="link-btn" data-act="qedit">${ico("refresh")}Modifier</button>` : `<span class="small muted">Enregistré automatiquement à la 3ᵉ touche</span>`}
      <button class="link-btn" data-act="form" data-day="${key(TODAY)}">Saisie détaillée${ico("chev-r")}</button></div>
  </section>`;
}

/* --- Rappels réels --- */
export function remindersHTML(limit) {
  const list = reminders().slice(0, limit || 9);
  if (!list.length) return `<section class="card"><div class="card-h"><h2>Prochains rappels</h2><button class="link-btn" data-go="dossier">Dossier${ico("chev-r")}</button></div>
    <p class="small muted">Aucun rappel pour l'instant. Ajoute un vaccin ou un traitement avec sa prochaine date : il apparaîtra ici.</p></section>`;
  return `<section class="card"><div class="card-h"><h2>Prochains rappels</h2><button class="link-btn" data-go="dossier">Dossier${ico("chev-r")}</button></div>
    <div class="list">${list.map(m => { const d = parse(m.effective), n = diffDays(d, TODAY);
      const st = n < 0 ? `<span class="status soon">${ico("clock")}En retard · ${esc(relDay(d))}</span>` : `<span class="status ${n <= 2 ? "soon" : n <= 21 ? "watch" : "neutral"}">${n <= 2 ? ico("clock") : ""}${cap(relDay(d))}</span>`;
      return `<button class="row" data-act="reminder" data-id="${m.id}" style="align-items:flex-start"><span class="r-ico ${esc(m.tone || "")}">${ico(m.icon || "bell")}</span><span class="r-main"><span class="r-title">${esc(m.title)}</span><br><span class="r-sub">${esc(m.sub || "")}</span><span class="r-meta">${st}<span class="small muted data">${fmtShort(d)}</span></span></span>${ico("chev-r", "sm chev")}</button>`; }).join("")}</div></section>`;
}

/* --- Accueil du premier lancement --- */
function welcomeHTML() {
  const d = TODAY;
  return `<section class="hero"><div class="hero-top"><div class="hero-cat">${catSVG("curieux")}</div><div class="hero-txt"><p class="hero-date">${cap(JOURS[d.getDay()])} ${fmtDate(d)}</p><h2>Bienvenue !</h2></div></div>
    <p class="hero-sum">Commence par le profil de ton chat, ou importe une sauvegarde de l'ancienne appli : tout reste sur cet appareil.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px"><button class="btn primary" data-act="profileForm">${ico("cat")}Créer son profil</button><button class="btn secondary" data-act="importFile">${ico("download")}Importer une sauvegarde</button></div></section>
    ${emptyState("today", "Aucun rappel pour l'instant", "Ajoute son dernier vaccin ou son traitement en cours : on te préviendra avant chaque échéance.")}`;
}

/* --- Phrases du jour --- */
function todaySummary(name, l, appTrend) {
  const parts = [];
  const last = l && (l.e || l.m);
  if (last) {
    const w = (o, v) => (v == null ? null : o[v]?.w.toLowerCase());
    const bits = [w(HUMEUR, last.h) && "humeur " + w(HUMEUR, last.h), w(APPETIT, last.a) && "appétit " + w(APPETIT, last.a), w(SELLES, last.s) && "selles " + w(SELLES, last.s)].filter(Boolean);
    parts.push(`Noté ${l.e ? "ce soir" : "ce matin"} : ${bits.join(", ")}.`);
  } else parts.push(`Pas encore de saisie aujourd'hui : trois touches suffisent.`);
  if (appTrend.level === "watch") parts.push("Son appétit est plus bas que d'habitude ces derniers jours.");
  else if (appTrend.enough) parts.push("Son appétit est dans ses habitudes.");
  return parts.join(" ");
}

SCREENS.aujourdhui = () => {
  const c = cat();
  if (!c) return { main: welcomeHTML(), aside: asideToday(), asideTitle: "Dr. Doudou" };
  const d = TODAY, name = catName(), l = todayLog(), all = logs();
  const appT = trend(all, "a", d), humT = trend(all, "h", d), ws = weightStatus(c, weights());
  const level = [appT.level, humT.level, ws.level].includes("watch") ? "watch" : [appT.level, humT.level, ws.level].includes("ok") ? "ok" : null;
  const watchWhat = appT.level === "watch" ? "l'appétit" : ws.level === "watch" ? "le poids" : "l'humeur";
  const hero = `<section class="hero" aria-label="${esc(name)} aujourd'hui"><div class="hero-top"><div class="hero-cat" id="heroCat" style="position:relative">${catSVG(catMood(), { label: "Illustration de " + name })}<div class="hearts" id="hearts"></div></div>
    <div class="hero-txt"><p class="hero-date">${cap(JOURS[d.getDay()])} ${fmtDate(d)}</p><h2>${esc(heroTitle(name, l))}</h2></div></div>
    <p class="hero-sum">${esc(todaySummary(name, l, appT))}</p>
    ${level ? `<button class="eye" data-go="sante">${eyeStatus(level)}<span>${level === "watch" ? "À surveiller : " + watchWhat : "Rien d'inquiétant dans ses saisies"}</span>${ico("chev-r", "sm")}</button>` : ""}
    <div class="whiskers" aria-hidden="true"><i></i><i></i><i></i></div></section>`;
  const alert = appT.level === "watch" ? `<section class="alert-soft" role="note"><span class="a-ico">${ico("eye")}</span><div><h3>Son appétit est plus bas que d'habitude</h3>
    <p>D'après son journal des derniers jours. Note bien ses repas ; un chat qui ne mange presque plus rien pendant 24 heures doit être vu par un vétérinaire.</p>
    <div class="acts">${askBtn("Pourquoi mange-t-il moins ces derniers jours ?")}<button class="btn sm ghost" data-go="alimentation">Voir ses repas</button></div></div></section>` : "";
  const w = lastWeight(), r = rationOf(key(d)), act = activityOf(key(d)), goal = c.activity_goal;
  const eau = [l?.e?.eau, l?.m?.eau].find(Boolean);
  const kpis = `<section class="kpis" aria-label="Chiffres du jour">
    <button class="kpi" data-go="sante"><span class="k-lab">${ico("scale")}Poids</span><span class="k-val">${w ? fmtKg(w.v).replace(" kg", "") + "<small>kg</small>" : "—"}</span><span class="k-note">${w ? (hasTarget(c) ? lvl(ws.level || "ok", ws.level === "ok" ? "Zone idéale" : "Hors zone") : `<span class="muted">${esc(cap(relDay(w.d)))}</span>`) : '<span class="muted">Aucune pesée</span>'}</span></button>
    <button class="kpi" data-go="activite"><span class="k-lab">${ico("paw")}Activité</span><span class="k-val">${act?.minutes != null ? act.minutes + `<small>${goal ? "/" + goal : ""} min</small>` : "—"}</span><span class="k-note muted">${act ? "Noté aujourd'hui" : "Pas encore notée"}</span></button>
    <button class="kpi" data-go="alimentation"><span class="k-lab">${ico("bowl")}Mangé</span><span class="k-val">${r.planned ? Math.round(r.eaten) + `<small>/${r.planned} g</small>` : "—"}</span><span class="k-note muted">${r.planned ? (r.left ? r.left + " repas à noter" : "Tous les repas notés") : "Programme à créer"}</span></button>
    <button class="kpi" data-go="journal"><span class="k-lab">${ico("drop")}Eau</span><span class="k-val">${eau ? cap({ peu: "peu", normal: "normal", beaucoup: "beaucoup" }[eau]) : "—"}</span><span class="k-note muted">${eau ? "D'après le journal" : "Pas encore notée"}</span></button></section>`;
  return { main: `<div class="grid-2"><div class="col">${hero}${quickHTML()}</div><div class="col">${alert}${remindersHTML()}</div></div>${kpis}`, aside: asideToday(), asideTitle: "Dr. Doudou" };
};

export function asideToday() {
  const week = cat() ? weekSummary(logs(), TODAY) : null;
  return `<div style="display:flex;gap:12px;align-items:center">${drSVG("av")}<p><b>Une question sur ${esc(catName())} ?</b><br><span class="muted small">${AI_READY ? "Je réponds avec son dossier et des sources vétérinaires." : "Dr. Doudou arrive à l'étape 4 : il répondra avec son dossier et des sources vétérinaires vérifiées."}</span></p></div>
  ${week ? `<div class="explain"><h4>${ico("journal", "sm")}Sa semaine</h4><p class="small">${esc(week.text)}</p></div>` : ""}
  <p class="fine">${ico("info", "sm")}Ne remplace pas un vétérinaire.</p>`;
}
