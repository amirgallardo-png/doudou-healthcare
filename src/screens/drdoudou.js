/* Dr. Doudou : conversation réelle.
   - Règles d'urgence calculées par le code (src/domain/urgency.js), niveau final = le plus grave (règles, IA).
   - IA via la fonction serveur « dr-doudou » (clé côté serveur, plafonds, sources de la liste uniquement).
   - Mode « prompt à copier » (gratuit) : choisi dans Réglages, ou automatique au plafond / sans serveur.
   - Historique dans la table « chat » (synchronisé entre appareils). */
import { LEVELS } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { lvl } from "../screens/today.js";
import { S } from "../state.js";
import { drSVG } from "../ui/illustrations.js";
import { $, toast, render } from "../ui/shell.js";
import { esc, ico, fmtDate, parse } from "../utils/core.js";
import { store } from "../utils/store.js";
import { cat, catName, weights, journalDays, vaccines, activeTreatments, allergies, vet, emergency, sexText, ageText } from "../domain/views.js";
import { checkUrgency, graver } from "../domain/urgency.js";
import { buildDossier, urgencyContext } from "../domain/dossier.js";
import { promptFor } from "../domain/prompt.js";
import { commit, rows } from "../data/repo.js";
import { configured, sb } from "../sync/supabase.js";

export const SUGGESTIONS = ["Pourquoi mange-t-il moins ces derniers jours ?", "Son poids est-il normal ?", "Quand refaire son vaccin ?", "Il a vomi deux fois ce matin", "Il va à la litière mais n'arrive pas à faire pipi"];
const tel = p => String(p || "").replace(/[^\d+]/g, "");
export const aiMode = () => (!configured || S.auth !== "signed-in" ? "prompt" : store.get("aiMode", "auto"));

/* ---------- Boîte d'appel d'urgence (vrais numéros du profil) ---------- */
export function callBox() {
  const list = [vet(), emergency()].filter(c => c?.phone);
  if (!list.length) return `<p class="small">Ajoute le numéro de ton vétérinaire et de la garde vétérinaire dans le profil : ils s'afficheront ici, prêts à appeler.</p><button class="btn sm secondary" data-go="profil">${ico("phone", "sm")}Ajouter les numéros</button>`;
  return list.map(c => `<div class="callbox"><span class="small"><b>${esc([c.name, c.clinic].filter(Boolean).join(" · "))}</b></span><span class="numb">${esc(c.phone)}</span><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm danger" href="tel:${esc(tel(c.phone))}">${ico("phone", "sm")}Appeler</a><button class="btn sm ghost" data-act="copy" data-v="${esc(c.phone)}">${ico("copy", "sm")}Copier</button></div></div>`).join("") + `<p class="small">Si l'appel ne se lance pas, compose le numéro affiché.</p>`;
}

/* ---------- Messages ---------- */
const messages = () => rows("chat").filter(m => m.cat_id === cat()?.id).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "") || (a.seq || 0) - (b.seq || 0));
let busy = false;

const verif = d => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? fmtDate(parse(d), true) : "date inconnue");
function sourcesHTML(list) {
  if (!list?.length) return "";
  return `<div><p class="src-lab">Sources</p><div class="sources">${list.map(s => `<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="${esc(s.titre)} · vérifié le ${esc(verif(s.verifie))}">${ico("book")}${esc(s.publisher)}${ico("ext")}</a>`).join("")}</div>
    <p class="small muted" style="margin-top:6px">${list.map(s => `${esc(s.titre)} (vérifié le ${esc(verif(s.verifie))})`).join(" · ")}</p></div>`;
}
function msgHTML(m, last) {
  if (m.role === "user") return `<div class="msg user">${esc(m.text)}</div>`;
  if (m.kind === "error") return `<div class="msg bot"><div class="err-bubble" role="alert"><div class="bot-h">${ico("cloud-off")}Dr. Doudou n'a pas pu répondre</div><p>${esc(m.text)}</p>${m.rules?.length ? `<div class="urgent-band" role="alert"><h4>${ico("cross")}Signe d'urgence détecté : appelle un vétérinaire</h4>${callBox()}</div>` : `<p class="small muted">Si c'est urgent, n'attends pas : appelle ton vétérinaire.</p>`}<div><button class="btn sm primary" data-act="retryAsk" data-q="${esc(m.question || "")}">${ico("refresh", "sm")}Réessayer</button> <button class="btn sm ghost" data-act="promptAsk" data-q="${esc(m.question || "")}">${ico("copy", "sm")}Préparer un prompt à copier</button></div></div></div>`;
  const L = LEVELS[m.level || "watch"];
  const urgent = m.level === "urgent";
  const prompt = m.kind === "prompt";
  return `<div class="msg bot"><div class="bubble">
    <div class="bot-h">${drSVG("av")}<span style="flex:1">Dr. Doudou</span>${m.level ? `<span class="status ${L.c}">${ico(L.i)}${L.w}</span>` : ""}</div>
    ${urgent ? `<div class="urgent-band" role="alert"><h4>${ico("cross")}Appelle un vétérinaire maintenant</h4>${callBox()}</div>` : ""}
    ${(m.rules || []).length ? `<p class="ctx">${ico("alert")}<span>Règle de sécurité : ${esc(m.rules.map(r => r.label).join(" ; "))}.</span></p>` : ""}
    ${(m.contexte || []).map(t => `<p class="ctx">${ico("folder")}<span>${esc(t)}</span></p>`).join("")}
    ${(m.paragraphes || []).map(t => `<p>${esc(t)}</p>`).join("")}
    ${(m.conseils || []).length ? `<ul>${m.conseils.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
    ${prompt ? `<pre class="json" style="white-space:pre-wrap;max-height:220px;overflow:auto">${esc(m.prompt || "")}</pre><button class="btn sm primary" data-act="copyPrompt" data-id="${m.id}">${ico("copy", "sm")}Copier le prompt</button>` : ""}
    ${sourcesHTML(m.sources)}
    <p class="fine">${ico("info", "sm")}Ne remplace pas un vétérinaire. En cas de doute, appelle la clinique.${m.cost ? ` · coût ≈ ${(m.cost * 100).toFixed(2).replace(".", ",")} centime(s)` : ""}</p>
  </div>${last ? `<div class="suggest" style="margin-top:4px">${SUGGESTIONS.slice(0, 2).map(q => `<button data-act="ask" data-q="${esc(q)}">${ico("doc")}${esc(q)}</button>`).join("")}</div>` : ""}</div>`;
}

export function chatHTML(where) {
  const list = messages(), intro = !list.length, mode = aiMode();
  return `<div class="chat" data-chat="${where}">
    ${intro ? `<div class="chat-intro">${drSVG("doc")}<h2>Bonjour, je suis Dr. Doudou</h2><p class="muted">Je réponds à tes questions sur ${esc(catName())} à partir de son dossier et uniquement de sources vétérinaires vérifiées, avec un niveau d'urgence pour chaque réponse.</p></div>` : ""}
    <p class="disclaimer">${ico("info")}<span>Je ne remplace pas un vétérinaire. ${mode === "prompt" ? "Mode « prompt à copier » : je prépare la question pour tes propres IA (gratuit)." : "Chaque réponse indique un niveau d'urgence et ses sources."}</span></p>
    ${intro ? `<div class="suggest"><p class="src-lab">Suggestions</p>${SUGGESTIONS.map(q => `<button data-act="ask" data-q="${esc(q)}">${ico("doc")}${esc(q)}</button>`).join("")}</div>
      <div class="urgent-band" role="note"><h4>${ico("cross")}En cas d'urgence, n'attends pas</h4>${callBox()}</div>`
      : `<div class="msgs" aria-live="polite">${list.map((m, i) => msgHTML(m, i === list.length - 1)).join("")}${busy ? `<div class="msg bot"><div class="bubble" aria-label="Dr. Doudou écrit"><div class="bot-h">${drSVG("av")}Dr. Doudou</div><span class="typing"><i></i><i></i><i></i></span></div></div>` : ""}</div>
      <div style="display:flex;justify-content:flex-end"><button class="link-btn" data-act="clearChat">${ico("x")}Effacer la conversation</button></div>`}
    <form class="composer"><label class="sr" for="composer-${where}">Ta question pour Dr. Doudou</label><textarea id="composer-${where}" rows="1" placeholder="Pose ta question sur ${esc(catName())}…" ${busy ? "disabled" : ""}></textarea><button class="send" type="submit" aria-label="Envoyer" ${busy ? "disabled" : ""}>${ico("send")}</button></form>
  </div>`;
}
export function refreshChats() { document.querySelectorAll("[data-chat]").forEach(el => { el.outerHTML = chatHTML(el.dataset.chat); }); scrollChat(); }
export function scrollChat() {
  const pb = $("#paneBody"); if (S.chatPinned && pb) pb.scrollTop = pb.scrollHeight;
  document.querySelector('[data-chat="main"] .msgs > :last-child')?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
export function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.min(120, t.scrollHeight) + "px"; }

/* ---------- Prompt à copier (gratuit) ---------- */
async function promptText(question, dossier) {
  let fiches = [];
  try { if (configured && S.auth === "signed-in") { const { data } = await sb().from("knowledge").select("id,titre,mots,resume,url,sources(publisher)"); fiches = data || []; } } catch { /* hors ligne : sans fiches */ }
  return promptFor(question, dossier, fiches);
}

/* ---------- Envoi d'une question ---------- */
const save = (row) => commit([{ table: "chat", row: { cat_id: cat().id, ...row } }]);
export async function ask(q, opts = {}) {
  q = String(q || "").trim();
  if (!q || busy) return;
  if (!cat()) { toast("Crée d'abord le profil de ton chat", "info"); return; }
  const urg = checkUrgency(q, urgencyContext());
  const dossier = buildDossier();
  if (!opts.retry) await save({ role: "user", text: q });
  busy = true; refreshChats();
  try {
    if (opts.prompt || aiMode() === "prompt") {
      await save({ role: "bot", kind: "prompt", level: urg.level, rules: urg.rules, contexte: dossier.lines, paragraphes: ["Voici ta question préparée avec le dossier et les fiches de référence. Copie-la dans ChatGPT, Gemini ou Claude."], prompt: await promptText(q, dossier.text) });
      return;
    }
    let res;
    try {
      const { data, error } = await sb().functions.invoke("dr-doudou", { body: { question: q, dossier: dossier.text } });
      if (error) {
        let msg = error.message;
        try { const b = await error.context?.json?.(); if (b?.error) msg = b.error; } catch { /* corps illisible */ }
        throw new Error(msg);
      }
      res = data;
    } catch (e) {
      const offline = !navigator.onLine || /fetch|network|Failed/i.test(String(e.message));
      await save({ role: "bot", kind: "error", question: q, rules: urg.rules.filter(r => r.level === "urgent"), text: offline ? "Tu es hors ligne : réessaie quand le réseau revient." : `Le service ne répond pas pour le moment (${e.message}).` });
      return;
    }
    if (res.mode === "plafond") {
      await save({ role: "bot", kind: "prompt", level: urg.level, rules: urg.rules, contexte: dossier.lines, paragraphes: [`${res.message} Je passe en mode « prompt à copier » (gratuit) pour cette question.`], prompt: await promptText(q, dossier.text) });
      return;
    }
    const level = graver(urg.level || "ok", res.level || "watch");
    await save({ role: "bot", kind: res.noSource ? "nosource" : "answer", level, rules: urg.rules, contexte: dossier.lines, paragraphes: res.paragraphes || [], conseils: res.conseils || [], sources: res.sources || [], cost: res.cost || 0, model: res.model || null });
  } finally {
    busy = false; usageAt = 0; refreshChats();
  }
}
export const answer = ask;
export async function clearChat() {
  await commit(messages().map(m => ({ table: "chat", id: m.id, del: true })));
  render(false);
}
/* Dépense du mois (table ai_usage, lisible seulement par son propriétaire). */
let usageAt = 0;
export async function loadAiUsage() {
  if (!configured || S.auth !== "signed-in" || Date.now() - usageAt < 60000) return;
  usageAt = Date.now();
  try {
    const month = new Date().toISOString().slice(0, 7);
    const { data, error } = await sb().from("ai_usage").select("requests,cost_usd").gte("day", month + "-01");
    if (error) throw error;
    S.aiUsage = { requests: data.reduce((n, u) => n + (u.requests || 0), 0), cost: data.reduce((n, u) => n + Number(u.cost_usd || 0), 0) };
    if (S.route === "reglages") render(false);
  } catch { usageAt = 0; }
}
export function copyPrompt(id) { return messages().find(m => m.id === id)?.prompt || ""; }

SCREENS.drdoudou = () => {
  const c = cat();
  const known = c ? [["cat", "Profil", [sexText(c), ageText(c.birth_date), c.breed].filter(Boolean).join(", ") || "À compléter"],
    ["scale", "Poids", `${weights().length} pesée${weights().length > 1 ? "s" : ""}`],
    ["journal", "Journal", `${journalDays().length} jour${journalDays().length > 1 ? "s" : ""} noté${journalDays().length > 1 ? "s" : ""}`],
    ["syringe", "Vaccins", vaccines().map(v => v.title).join(", ") || "Aucun noté"],
    ["pipette", "Traitement", activeTreatments().map(t => t.title).join(", ") || "Aucun en cours"],
    ["alert", "Allergies", allergies().map(a => a.name).join(", ") || "Aucune notée"]] : [];
  return {
    main: chatHTML("main"),
    asideTitle: "Ce que Dr. Doudou sait",
    aside: `${known.length ? `<p class="small muted">Pour te répondre, Dr. Doudou lit le dossier de ${esc(catName())} :</p>
    <div class="list">${known.map(([i, t, s]) => `<div class="row"><span class="r-ico">${ico(i)}</span><span class="r-main"><span class="r-title">${t}</span><br><span class="r-sub">${esc(s)}</span></span>${ico("check", "sm")}</div>`).join("")}</div>` : ""}
    <div class="explain"><h4>${ico("info", "sm")}Les 4 niveaux d'urgence</h4><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">${Object.keys(LEVELS).map(k => lvl(k)).join("")}</div></div>
    <p class="fine">${ico("shield", "sm")}Les signes d'urgence sont repérés par des règles fixes, testées ; l'IA ne peut jamais les minimiser.</p>`
  };
};
