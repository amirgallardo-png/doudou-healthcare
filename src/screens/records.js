/* Écran Dossier médical (+ résumé de visite imprimable). */
import { CAT, RECORDS } from "../demo/fixture.js";
import { TYPES } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { emptyState, lvl } from "../screens/today.js";
import { S } from "../state.js";
import { chartBox, drawCharts } from "../ui/charts.js";
import { catSVG } from "../ui/illustrations.js";
import { $, isDesk } from "../ui/shell.js";
import { JOURS, MOIS, MOIS_C, TODAY, cap, diffDays, esc, fmtDate, fmtEur, fmtShort, ico, parse, relDay } from "../utils/core.js";

export function recRow(r) {
  const t = TYPES[r.type], d = parse(r.date);
  return `<button class="rec" data-act="rec" data-id="${r.id}" ${S.selRec === r.id && isDesk() ? 'aria-current="true"' : ""}><span class="r-ico ${t.c}">${ico(t.i)}</span><span style="min-width:0"><span class="r-title">${r.title}</span><br><span class="r-sub">${t.w} · ${r.sub}</span></span>
    <span class="r-end" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${r.status === "en cours" ? '<span class="status soon">En cours</span>' : ""}<span class="small muted data">${fmtShort(d)}</span></span></button>`;
}
export function recordHTML(r) {
  const t = TYPES[r.type], d = parse(r.date);
  return `<div style="display:flex;gap:14px;align-items:center"><span class="rec" style="box-shadow:none;padding:0;width:auto;display:block;background:none"><span class="r-ico ${t.c}" style="width:56px;height:56px;border-radius:16px;display:grid;place-items:center">${ico(t.i, "lg")}</span></span>
    <div style="min-width:0"><span class="label muted">${t.w}</span><h3 style="font-size:22px;line-height:28px">${r.title}</h3><p class="muted small">${cap(JOURS[d.getDay()])} ${fmtDate(d, true)} · ${relDay(d)}</p></div></div>
    ${r.status ? `<div>${r.status === "en cours" ? lvl("soon", "Traitement en cours") : lvl("ok", "Terminé")}</div>` : ""}
    ${r.next ? `<div>${diffDays(parse(r.next), TODAY) < 30 ? lvl("watch", "Rappel " + relDay(parse(r.next))) : lvl("ok", "Valable jusqu'au " + fmtDate(parse(r.next), true))}</div>` : ""}
    <dl class="dl">${r.fields.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join("")}${r.cost ? `<dt>Coût</dt><dd class="data">${fmtEur(r.cost)}</dd>` : ""}</dl>
    <div class="explain"><h4>${ico("info", "sm")}En clair</h4><p class="small">${r.explain}</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${r.next ? `<button class="btn sm primary" data-act="toastCal">${ico("bell", "sm")}Me le rappeler</button>` : ""}
    <button class="btn sm secondary" data-act="ask" data-q="${r.type === "vaccin" ? "Quand refaire son vaccin ?" : "Son poids est-il normal ?"}">${ico("doc", "sm")}Demander à Dr. Doudou</button></div>`;
}
SCREENS.dossier = () => {
  const allergy = `<div class="allergy" role="note">${ico("alert")}<span><strong>Allergie : poulet</strong> (démangeaisons). Aucune allergie aux médicaments connue.</span></div>`;
  if (S.empty) return { main: `${allergy}${emptyState("dossier", "Son dossier est vide", "Ajoute une consultation, un vaccin ou un traitement. Une photo du carnet papier suffit pour commencer.", "toastAdd", "Ajouter un soin")}`, aside: "" };
  const list = RECORDS.filter(r => S.filter === "tout" || r.type === S.filter).sort((a, b) => b.date.localeCompare(a.date));
  const months = {};
  list.forEach(r => { const d = parse(r.date), k = cap(MOIS[d.getMonth()]) + " " + d.getFullYear(); (months[k] = months[k] || []).push(r); });
  const cal = []; for (let i = 0; i < 12; i++) { const m = new Date(2026, 9 + i, 1); cal.push(m); }
  const vax = { "2026-9": { n: "Typhus + coryza", next: true }, "2027-2": { n: "Leucose" } };
  const main = `${allergy}
  <button class="visit-cta" data-act="visit"><span class="v-ico">${ico("stetho")}</span><span style="flex:1;min-width:0"><h3>Préparer ma visite chez le vétérinaire</h3><p>Un résumé clair des 30 derniers jours, à montrer ou à partager.</p></span>${ico("chev-r")}</button>
  <section class="card"><div class="card-h"><h2>Calendrier des vaccins</h2><span class="small muted">12 prochains mois</span></div>
    <div class="vax-cal" role="list">${cal.map(m => { const k = m.getFullYear() + "-" + m.getMonth(), v = vax[k];
      return `<div class="m ${v ? "has" : ""} ${v && v.next ? "next" : ""} ${m.getMonth() === 9 && m.getFullYear() === 2026 ? "now" : ""}" role="listitem" aria-label="${MOIS[m.getMonth()]} ${m.getFullYear()}${v ? " : rappel " + v.n : ""}"><b>${v ? ico("syringe") : ""}</b>${MOIS_C[m.getMonth()].replace(".", "")}</div>`; }).join("")}</div>
    <p class="small" style="margin-top:12px"><b>25 oct. 2026</b> typhus + coryza (dans 3 semaines) · <b>14 mars 2027</b> leucose</p></section>
  <div class="chips" role="group" aria-label="Filtrer par type">${[["tout", "Tout"], ...Object.entries(TYPES).map(([k, t]) => [k, t.pl])].map(([k, w]) => `<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${S.filter === k}">${w}</button>`).join("")}</div>
  <div class="tl">${Object.entries(months).map(([m, rs]) => `<div class="tl-month"><h3>${m}</h3>${rs.map(recRow).join("")}</div>`).join("") || `<p class="muted">Aucun élément de ce type.</p>`}</div>`;
  const r = RECORDS.find(x => x.id === S.selRec) || RECORDS[0];
  return { main, aside: recordHTML(r), asideTitle: "Fiche" };
};
export function visitText() {
  return `RÉSUMÉ POUR LA VISITE — ${fmtDate(TODAY, true)}
Doudou · européen à poil court · mâle stérilisé · 6 ans · 4,60 kg
Vétérinaire référent : Dr Martin, Clinique des Quatre Pattes

MOTIF PROPOSÉ
Baisse d'appétit depuis le 1er octobre (environ la moitié de sa ration).

30 DERNIERS JOURS
- Appétit : « peu » les 2 et 3 octobre, « moyen » le 1er octobre, « bien » avant
- Poids : 4,64 kg (20 sept.) → 4,60 kg (3 oct.), zone idéale 4,4–4,8 kg
- Humeur : calme, un peu moins joueur ; activité −20 % sur 3 jours
- Selles : normales ; pas de vomissement noté
- Transition alimentaire terminée le 24 septembre

TRAITEMENT EN COURS
- Pipette antiparasitaire (sélamectine), dernière dose le 6 octobre

VACCINS
- Typhus + coryza : rappel le 25 octobre 2026
- Leucose : valable jusqu'au 14 mars 2027

ALLERGIE
- Poulet (démangeaisons). Aucune allergie aux médicaments connue.

DERNIÈRE VISITE
- 4 août 2026, bilan annuel : léger tartre (stade 1), bilan sanguin normal

QUESTIONS
${S.visitQs.filter(Boolean).map(q => "- " + q).join("\n")}`;
}
export function openVisit() {
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  $("#visitSlot").innerHTML = `<div class="visit" role="dialog" aria-modal="true" aria-labelledby="visitTitle" data-act="visitBg"><article class="visit-doc">
    <div class="visit-bar"><span class="label muted">Résumé de visite</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm secondary" data-act="copyVisit">${ico("copy", "sm")}Copier le texte</button>${framed ? "" : `<button class="btn sm secondary" data-act="printVisit">${ico("print", "sm")}Imprimer ou PDF</button>`}<button class="icon-btn" data-act="closeVisit" aria-label="Fermer">${ico("x")}</button></div></div>
    <header style="display:flex;gap:16px;align-items:center"><div style="width:72px;height:72px;flex:none">${catSVG("content")}</div><div><h2 id="visitTitle">Doudou · visite du ${fmtDate(TODAY)}</h2><p class="muted">Européen à poil court · mâle stérilisé · 6 ans · 4,60 kg · puce ${CAT.chip} (fictive)</p></div></header>
    <div class="box" style="border-color:var(--miel-ink);background:var(--miel-tint)"><h3>Motif proposé</h3><p>Baisse d'appétit depuis le 1er octobre : environ la moitié de sa ration.</p></div>
    <div class="visit-grid">
      <div class="box"><h3>Ces 30 derniers jours</h3><ul><li>Appétit « peu » les 2 et 3 oct.</li><li>Poids 4,64 → 4,60 kg (zone idéale)</li><li>Humeur calme, activité −20 %</li><li>Selles normales, pas de vomissement</li><li>Transition alimentaire finie le 24 sept.</li></ul></div>
      <div class="box"><h3>Traitement en cours</h3><ul><li>Pipette antiparasitaire, dernière dose le 6 oct.</li></ul><h3 style="margin-top:12px">Vaccins</h3><ul><li>Typhus + coryza : rappel le 25 oct. 2026</li><li>Leucose : jusqu'au 14 mars 2027</li></ul></div>
      <div class="box" style="border-color:var(--roux-ink)"><h3>Allergie</h3><p>Poulet (démangeaisons). Aucune allergie aux médicaments connue.</p></div>
      <div class="box"><h3>Dernière visite</h3><p>4 août 2026, bilan annuel : léger tartre, bilan sanguin normal.</p></div>
    </div>
    <div class="box"><h3>Courbe de poids (6 mois)</h3>${chartBox("weight", 180)}</div>
    <div class="box"><h3>Mes questions</h3><div style="display:flex;flex-direction:column;gap:8px" id="visitQs">${S.visitQs.map((q, i) => `<div class="q-item"><label class="sr" for="vq${i}">Question ${i + 1}</label><input class="input" id="vq${i}" data-vq="${i}" value="${esc(q)}"><button class="icon-btn no-print" data-act="delQ" data-i="${i}" aria-label="Supprimer la question">${ico("x")}</button></div>`).join("")}</div>
      <button class="link-btn no-print" data-act="addQ" style="margin-top:6px">${ico("plus")}Ajouter une question</button></div>
    <p class="fine">${ico("info", "sm")}Résumé généré à partir du journal de Doudou. ${framed ? "Pour imprimer ou créer un PDF, ouvre le fichier HTML hors de cette fenêtre d'aperçu." : ""}</p>
  </article></div>`;
  drawCharts($("#visitSlot"));
  setTimeout(() => $("#visitSlot [data-act=closeVisit]")?.focus(), 50);
}
