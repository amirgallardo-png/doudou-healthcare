/* Écran Dossier médical (+ formulaire de soin, résumé de visite imprimable). Données réelles. */
import { TYPES } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { S } from "../state.js";
import { chartBox, drawCharts } from "../ui/charts.js";
import { catSVG } from "../ui/illustrations.js";
import { $, isDesk, toast, closeSheet, render, markPending } from "../ui/shell.js";
import { JOURS, MOIS, MOIS_C, TODAY, cap, diffDays, esc, fmtDate, fmtEur, fmtKg, ico, parse, relDay, key, addDays } from "../utils/core.js";
import { lvl, emptyState, askBtn } from "./today.js";
import { cat, records, vaccines, activeTreatments, allergies, vet, lastWeight, ageText, sexText, logs } from "../domain/views.js";
import { trend } from "../domain/insights.js";
import { FORMS, form, input, choices, submit, formError, parseNum } from "../ui/forms.js";
import { commit, rows } from "../data/repo.js";
import { store } from "../utils/store.js";

/* ---------- Champs propres à chaque type de soin ---------- */
export const RECORD_SPEC = {
  consult: { fields: [["motif", "Motif"], ["diagnostic", "Diagnostic"], ["traitement", "Traitement"]], next: null, expense: "Consultations" },
  vaccin: { fields: [["vaccin", "Vaccin"], ["lot", "Lot"]], next: "Rappel le", expense: "Vaccins" },
  traitement: { fields: [["type", "Type"], ["rythme", "Rythme"]], next: "Prochaine dose", status: true, expense: "Médicaments" },
  analyse: { fields: [["labo", "Laboratoire"], ["resultat", "Résultat"]], next: "Prochain contrôle", expense: "Analyses" },
  ordonnance: { fields: [["contenu", "Contenu"]], next: null, expense: "Médicaments" }
};
const REM = { vaccin: ["syringe", "miel", "Vaccin à refaire"], traitement: ["pipette", "roux", "Prochaine dose"], analyse: ["flask", "", "Contrôle prévu"] };

export function recordFormHTML(type, r = null) {
  const sp = RECORD_SPEC[type], val = label => (r?.fields || []).find(([k]) => k === label)?.[1] || "";
  return form("record", `
    ${r ? "" : choices("type", "Type de soin", Object.entries(TYPES).map(([k, t]) => [k, t.w, t.i]), type)}
    ${input("title", "Titre", { value: r?.title || "", placeholder: type === "vaccin" ? "ex. Typhus + coryza" : type === "consult" ? "ex. Bilan annuel" : "", required: true })}
    ${input("date", "Date", { type: "date", value: r?.date || key(TODAY), max: key(addDays(TODAY, 365)) })}
    ${input("vet", "Vétérinaire ou lieu", { value: r?.vet ?? (vet()?.name || "") })}
    ${sp.fields.map(([n, l]) => input("f_" + n, l, { value: val(l), area: n === "diagnostic" || n === "resultat" || n === "contenu" })).join("")}
    ${sp.status ? choices("status", "Statut", [["en cours", "En cours"], ["terminé", "Terminé"]], r?.status || "en cours") : ""}
    ${sp.next ? input("next", sp.next + " (facultatif)", { type: "date", value: r?.next || "", help: "Crée un rappel sur l'écran Aujourd'hui." }) : ""}
    ${input("cost", "Coût en € (facultatif)", { value: r?.cost || "", inputmode: "decimal", data: true, help: "Ajoute aussi la dépense dans Finances." })}
    ${input("notes", "En clair / notes", { value: r?.explain || "", area: true, placeholder: "Ce que le vétérinaire a expliqué, en mots simples" })}
    ${submit(r ? "Enregistrer les modifications" : "Ajouter au dossier")}`, `data-type="${type}" ${r ? `data-id="${r.id}"` : ""}`);
}

FORMS.record = async (f, v) => {
  const type = f.dataset.type, sp = RECORD_SPEC[type], c = cat();
  if (!v.title) return formError(f, "Donne un titre au soin, par exemple « Bilan annuel ».", "title");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return formError(f, "Indique la date du soin.", "date");
  const cost = parseNum(v.cost);
  if (Number.isNaN(cost) || (cost != null && cost < 0)) return formError(f, "Le coût doit être un montant en euros, par exemple 45.", "cost");
  const fields = sp.fields.map(([n, l]) => [l, v["f_" + n]]).filter(([, x]) => x);
  const id = f.dataset.id || crypto.randomUUID();
  const ops = [{ table: "records", row: { id, cat_id: c.id, type, date: v.date, title: v.title, vet: v.vet, fields, status: sp.status ? v.status || "en cours" : null, next_date: v.next || null, cost, notes: v.notes } }];
  // rappel lié
  const rem = rows("reminders").find(m => m.record_id === id);
  const wantRem = v.next && (!sp.status || (v.status || "en cours") === "en cours");
  if (wantRem) { const [icon, tone, sub] = REM[type] || ["bell", "", "Rappel"]; ops.push({ table: "reminders", row: { id: rem?.id, cat_id: c.id, record_id: id, date: v.next, title: type === "vaccin" ? "Rappel " + v.title : v.title, sub, icon, tone, done_at: null, snoozed_to: null } }); }
  else if (rem) ops.push({ table: "reminders", id: rem.id, del: true });
  // dépense liée
  const exp = rows("expenses").find(e => e.record_id === id);
  if (cost) ops.push({ table: "expenses", row: { id: exp?.id, cat_id: c.id, record_id: id, date: v.date, label: v.title, cat: sp.expense, amount: cost, reimbursed: exp?.reimbursed || 0, planned: v.date > key(TODAY) } });
  else if (exp) ops.push({ table: "expenses", id: exp.id, del: true });
  await commit(ops);
  S.selRec = id; closeSheet(); toast(f.dataset.id ? "Fiche mise à jour" : "Ajouté au dossier", "folder"); markPending(); render(false);
};

/* ---------- Liste et fiche ---------- */
export function recRow(r) {
  const t = TYPES[r.type], d = parse(r.date);
  return `<button class="rec" data-act="rec" data-id="${r.id}" ${S.selRec === r.id && isDesk() ? 'aria-current="true"' : ""}><span class="r-ico ${t.c}">${ico(t.i)}</span><span style="min-width:0"><span class="r-title">${esc(r.title)}</span><br><span class="r-sub">${t.w} · ${esc(r.sub)}</span></span>
    <span class="r-end" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${r.status === "en cours" ? '<span class="status soon">En cours</span>' : ""}<span class="small muted data">${fmtShort(d)}</span></span></button>`;
}
const fmtShort = d => d.getDate() + " " + MOIS_C[d.getMonth()] + (d.getFullYear() !== TODAY.getFullYear() ? " " + d.getFullYear() : "");
export function recordHTML(r) {
  if (!r) return `<p class="muted">Choisis un élément du dossier pour voir sa fiche.</p>`;
  const t = TYPES[r.type], d = parse(r.date);
  return `<div style="display:flex;gap:14px;align-items:center"><span class="rec" style="box-shadow:none;padding:0;width:auto;display:block;background:none"><span class="r-ico ${t.c}" style="width:56px;height:56px;border-radius:16px;display:grid;place-items:center">${ico(t.i, "lg")}</span></span>
    <div style="min-width:0"><span class="label muted">${t.w}</span><h3 style="font-size:22px;line-height:28px">${esc(r.title)}</h3><p class="muted small">${cap(JOURS[d.getDay()])} ${fmtDate(d, true)} · ${relDay(d)}</p></div></div>
    ${r.status ? `<div>${r.status === "en cours" ? lvl("soon", "Traitement en cours") : lvl("ok", "Terminé")}</div>` : ""}
    ${r.next ? `<div>${diffDays(parse(r.next), TODAY) < 0 ? lvl("soon", "Date passée : " + relDay(parse(r.next))) : diffDays(parse(r.next), TODAY) < 30 ? lvl("watch", "Rappel " + relDay(parse(r.next))) : lvl("ok", "Valable jusqu'au " + fmtDate(parse(r.next), true))}</div>` : ""}
    <dl class="dl">${r.vet ? `<dt>Vétérinaire</dt><dd>${esc(r.vet)}</dd>` : ""}${r.fields.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join("")}${r.cost ? `<dt>Coût</dt><dd class="data">${fmtEur(r.cost)}</dd>` : ""}</dl>
    ${r.explain ? `<div class="explain"><h4>${ico("info", "sm")}En clair</h4><p class="small">${esc(r.explain)}</p></div>` : ""}
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm secondary" data-act="editRec" data-id="${r.id}">${ico("journal", "sm")}Modifier</button>
    ${askBtn(r.type === "vaccin" ? "Quand refaire son vaccin ?" : "Peux-tu m'expliquer ce soin ?")}
    <button class="btn sm ghost" data-act="delRec" data-id="${r.id}">${ico("x", "sm")}Supprimer</button></div>`;
}
export async function deleteRecord(id) {
  const ops = [{ table: "records", id, del: true }];
  rows("reminders").filter(m => m.record_id === id).forEach(m => ops.push({ table: "reminders", id: m.id, del: true }));
  await commit(ops);
}

function allergyBanner() {
  const al = allergies();
  if (!al.length) return `<div class="allergy" role="note">${ico("alert")}<span><strong>Allergies : aucune notée.</strong> Ajoute-les dans son profil si besoin.</span></div>`;
  return `<div class="allergy" role="note">${ico("alert")}<span><strong>Allergie${al.length > 1 ? "s" : ""} : ${esc(al.map(a => a.name).join(", "))}</strong>${al[0].detail ? " (" + esc(al[0].detail) + ")" : ""}.</span></div>`;
}

SCREENS.dossier = () => {
  if (!cat()) return { main: emptyState("dossier", "Pas encore de profil", "Crée d'abord le profil de ton chat, puis ajoute ses soins.", "profileForm", "Créer son profil"), aside: "" };
  const all = records();
  const add = `<button class="btn primary" data-act="addRec">${ico("plus")}Ajouter un soin</button>`;
  if (!all.length) return { main: `${allergyBanner()}${emptyState("dossier", "Son dossier est vide", "Ajoute une consultation, un vaccin ou un traitement. Une photo du carnet papier suffit pour commencer.", "addRec", "Ajouter un soin")}`, aside: "" };
  const list = all.filter(r => S.filter === "tout" || r.type === S.filter);
  const months = {};
  list.forEach(r => { const d = parse(r.date), k = cap(MOIS[d.getMonth()]) + " " + d.getFullYear(); (months[k] = months[k] || []).push(r); });
  const cal = []; for (let i = 0; i < 12; i++) cal.push(new Date(TODAY.getFullYear(), TODAY.getMonth() + i, 1));
  const vax = {};
  vaccines().filter(v => v.next).forEach(v => { const d = parse(v.next), k = d.getFullYear() + "-" + d.getMonth(); vax[k] = vax[k] || { n: v.title, d }; });
  const firstK = Object.keys(vax).sort((a, b) => vax[a].d - vax[b].d)[0];
  const upcoming = Object.values(vax).filter(v => v.d >= addDays(TODAY, -1)).sort((a, b) => a.d - b.d);
  const main = `${allergyBanner()}
  <button class="visit-cta" data-act="visit"><span class="v-ico">${ico("stetho")}</span><span style="flex:1;min-width:0"><h3>Préparer ma visite chez le vétérinaire</h3><p>Un résumé clair des 30 derniers jours, à montrer ou à partager.</p></span>${ico("chev-r")}</button>
  <section class="card"><div class="card-h"><h2>Calendrier des vaccins</h2><span class="small muted">12 prochains mois</span></div>
    <div class="vax-cal" role="list">${cal.map(m => { const k = m.getFullYear() + "-" + m.getMonth(), v = vax[k];
      return `<div class="m ${v ? "has" : ""} ${k === firstK ? "next" : ""} ${m.getMonth() === TODAY.getMonth() && m.getFullYear() === TODAY.getFullYear() ? "now" : ""}" role="listitem" aria-label="${MOIS[m.getMonth()]} ${m.getFullYear()}${v ? " : rappel " + esc(v.n) : ""}"><b>${v ? ico("syringe") : ""}</b>${MOIS_C[m.getMonth()].replace(".", "")}</div>`; }).join("")}</div>
    <p class="small" style="margin-top:12px">${upcoming.length ? upcoming.map(v => `<b>${fmtShort(v.d)}</b> ${esc(v.n)} (${relDay(v.d)})`).join(" · ") : "Aucun rappel de vaccin noté. Ajoute un vaccin avec sa date de rappel."}</p></section>
  <div style="display:flex;justify-content:flex-end">${add}</div>
  <div class="chips" role="group" aria-label="Filtrer par type">${[["tout", "Tout"], ...Object.entries(TYPES).map(([k, t]) => [k, t.pl])].map(([k, w]) => `<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${S.filter === k}">${w}</button>`).join("")}</div>
  <div class="tl">${Object.entries(months).map(([m, rs]) => `<div class="tl-month"><h3>${m}</h3>${rs.map(recRow).join("")}</div>`).join("") || `<p class="muted">Aucun élément de ce type.</p>`}</div>`;
  const r = all.find(x => x.id === S.selRec) || all[0];
  return { main, aside: recordHTML(r), asideTitle: "Fiche" };
};

/* ---------- Résumé de visite (calculé) ---------- */
function last30() {
  const all = logs(), out = { days: 0, appetit: {}, humeur: {}, soft: 0, vomi: 0 };
  for (let i = 0; i < 30; i++) {
    const l = all[key(addDays(TODAY, -i))]; if (!l) continue;
    const e = [l.m, l.e].filter(Boolean); if (!e.length) continue;
    out.days++;
    e.forEach(x => { if (x.a) out.appetit[x.a] = (out.appetit[x.a] || 0) + 1; if (x.h) out.humeur[x.h] = (out.humeur[x.h] || 0) + 1; });
    if (e.some(x => x.s === "molles")) out.soft++;
    if (e.some(x => x.vomi)) out.vomi++;
  }
  const w = rows("weights").filter(x => x.date >= key(addDays(TODAY, -30))).sort((a, b) => a.date.localeCompare(b.date));
  return { ...out, w };
}
const WORD = { 3: ["bien", "joueur"], 2: ["moyen", "calme"], 1: ["peu", "grognon"] };
function visitFacts() {
  const c = cat(), s = last30(), w = lastWeight(), appT = trend(logs(), "a", TODAY);
  const dist = (o, i) => Object.entries(o).sort((a, b) => b[0] - a[0]).map(([k, n]) => `« ${WORD[k][i]} » ${n} fois`).join(", ");
  const facts = [];
  if (!s.days) facts.push("Aucune saisie du journal sur 30 jours.");
  else {
    facts.push(`${s.days} jour${s.days > 1 ? "s" : ""} noté${s.days > 1 ? "s" : ""} dans le journal`);
    if (Object.keys(s.appetit).length) facts.push("Appétit : " + dist(s.appetit, 0) + (appT.level === "watch" ? " (plus bas ces derniers jours)" : ""));
    if (Object.keys(s.humeur).length) facts.push("Humeur : " + dist(s.humeur, 1));
    facts.push(s.soft ? `Selles molles ${s.soft} jour${s.soft > 1 ? "s" : ""}` : "Selles normales les jours notés");
    facts.push(s.vomi ? `Vomissement noté ${s.vomi} jour${s.vomi > 1 ? "s" : ""}` : "Pas de vomissement noté");
  }
  if (s.w.length) facts.push(`Poids : ${s.w.map(x => fmtKg(x.kg) + " (" + fmtShort(parse(x.date)) + ")").join(" → ")}`);
  else if (w) facts.push(`Dernière pesée : ${fmtKg(w.v)} (${fmtDate(w.d, true)})`);
  const ident = [c.breed, sexText(c).toLowerCase(), ageText(c.birth_date), w ? fmtKg(w.v) : "", c.chip_id ? "puce " + c.chip_id : ""].filter(Boolean).join(" · ");
  const lastVisit = records().find(r => r.type === "consult");
  return { c, ident, facts, treat: activeTreatments(), vax: vaccines(), al: allergies(), lastVisit };
}
export function visitText() {
  const { c, ident, facts, treat, vax, al, lastVisit } = visitFacts(), v = vet();
  const motif = store.get("visitMotif", "");
  return `RÉSUMÉ POUR LA VISITE — ${fmtDate(TODAY, true)}
${c.name} · ${ident}${v ? `\nVétérinaire référent : ${[v.name, v.clinic].filter(Boolean).join(", ")}` : ""}

MOTIF
${motif || "(à préciser)"}

30 DERNIERS JOURS
${facts.map(f => "- " + f).join("\n")}

TRAITEMENT EN COURS
${treat.length ? treat.map(t => `- ${t.title}${t.next ? ", prochaine dose le " + fmtDate(parse(t.next), true) : ""}`).join("\n") : "- Aucun"}

VACCINS
${vax.length ? vax.map(x => `- ${x.title} : fait le ${fmtDate(parse(x.date), true)}${x.next ? ", rappel le " + fmtDate(parse(x.next), true) : ""}`).join("\n") : "- Aucun noté"}

ALLERGIES
${al.length ? al.map(a => `- ${a.name}${a.detail ? " (" + a.detail + ")" : ""}`).join("\n") : "- Aucune notée"}

DERNIÈRE VISITE
${lastVisit ? `- ${fmtDate(parse(lastVisit.date), true)}, ${lastVisit.title}${lastVisit.fields.length ? " : " + lastVisit.fields.map(([, b]) => b).join(" ; ") : ""}` : "- Aucune notée"}

QUESTIONS
${S.visitQs.filter(Boolean).map(q => "- " + q).join("\n") || "- (aucune)"}`;
}
export function openVisit() {
  const framed = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  const { c, ident, facts, treat, vax, al, lastVisit } = visitFacts();
  const motif = store.get("visitMotif", "");
  const li = list => list.map(x => `<li>${esc(x)}</li>`).join("");
  $("#visitSlot").innerHTML = `<div class="visit" role="dialog" aria-modal="true" aria-labelledby="visitTitle" data-act="visitBg"><article class="visit-doc">
    <div class="visit-bar"><span class="label muted">Résumé de visite</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm secondary" data-act="copyVisit">${ico("copy", "sm")}Copier le texte</button>${framed ? "" : `<button class="btn sm secondary" data-act="printVisit">${ico("print", "sm")}Imprimer ou PDF</button>`}<button class="icon-btn" data-act="closeVisit" aria-label="Fermer">${ico("x")}</button></div></div>
    <header style="display:flex;gap:16px;align-items:center"><div style="width:72px;height:72px;flex:none">${catSVG("content", { label: c.name })}</div><div><h2 id="visitTitle">${esc(c.name)} · visite du ${fmtDate(TODAY)}</h2><p class="muted">${esc(ident)}</p></div></header>
    <div class="box" style="border-color:var(--miel-ink);background:var(--miel-tint)"><h3>Motif de la visite</h3><label class="sr" for="visitMotif">Motif de la visite</label><input class="input" id="visitMotif" data-visit-motif value="${esc(motif)}" placeholder="ex. Baisse d'appétit depuis 3 jours"></div>
    <div class="visit-grid">
      <div class="box"><h3>Ces 30 derniers jours</h3><ul>${li(facts)}</ul></div>
      <div class="box"><h3>Traitement en cours</h3><ul>${treat.length ? li(treat.map(t => t.title + (t.next ? ", prochaine dose le " + fmtDate(parse(t.next)) : ""))) : "<li>Aucun</li>"}</ul><h3 style="margin-top:12px">Vaccins</h3><ul>${vax.length ? li(vax.map(x => x.title + (x.next ? " : rappel le " + fmtDate(parse(x.next), true) : " : fait le " + fmtDate(parse(x.date), true)))) : "<li>Aucun noté</li>"}</ul></div>
      <div class="box" style="border-color:var(--roux-ink)"><h3>Allergies</h3><p>${al.length ? esc(al.map(a => a.name + (a.detail ? " (" + a.detail + ")" : "")).join(", ")) : "Aucune notée."}</p></div>
      <div class="box"><h3>Dernière visite</h3><p>${lastVisit ? esc(fmtDate(parse(lastVisit.date), true) + ", " + lastVisit.title + (lastVisit.fields.length ? " : " + lastVisit.fields.map(([, b]) => b).join(" ; ") : "")) : "Aucune notée."}</p></div>
    </div>
    <div class="box"><h3>Courbe de poids</h3>${chartBox("weight", 180)}</div>
    <div class="box"><h3>Mes questions</h3><div style="display:flex;flex-direction:column;gap:8px" id="visitQs">${S.visitQs.map((q, i) => `<div class="q-item"><label class="sr" for="vq${i}">Question ${i + 1}</label><input class="input" id="vq${i}" data-vq="${i}" value="${esc(q)}"><button class="icon-btn no-print" data-act="delQ" data-i="${i}" aria-label="Supprimer la question">${ico("x")}</button></div>`).join("")}</div>
      <button class="link-btn no-print" data-act="addQ" style="margin-top:6px">${ico("plus")}Ajouter une question</button></div>
    <p class="fine">${ico("info", "sm")}Résumé généré à partir du journal et du dossier. ${framed ? "Pour imprimer ou créer un PDF, ouvre l'appli hors de cette fenêtre d'aperçu." : ""}</p>
  </article></div>`;
  drawCharts($("#visitSlot"));
  setTimeout(() => $("#visitSlot [data-act=closeVisit]")?.focus(), 50);
}
