/* Dr. Doudou : conversation (réponses simulées en Phase 1, branchées en Phase 4). */
import { ANSWERS, CAT, FALLBACK, SOURCES, SUGGESTIONS } from "../demo/fixture.js";
import { LEVELS } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { lvl } from "../screens/today.js";
import { S } from "../state.js";
import { drSVG } from "../ui/illustrations.js";
import { $ } from "../ui/shell.js";
import { esc, ico } from "../utils/core.js";

export let msgId = 0;
export function findAnswer(q) { return ANSWERS.find(a => a.re.test(q)) || FALLBACK; }
export function blocksOf(a) {
  const b = [];
  (a.ctx || []).forEach(t => b.push({ t: "ctx", text: t }));
  (a.p || []).forEach(t => b.push({ t: "p", text: t }));
  if (a.li) b.push({ t: "li", items: a.li });
  (a.p2 || []).forEach(t => b.push({ t: "p", text: t }));
  return b;
}
export const blocksLen = b => b.reduce((s, x) => s + (x.items ? x.items.join("").length : x.text.length), 0);
export function renderBlocks(blocks, budget) {
  let out = "", left = budget;
  for (const b of blocks) {
    if (left <= 0) break;
    if (b.t === "li") {
      let lis = "";
      for (const it of b.items) { if (left <= 0) break; lis += `<li>${esc(it.slice(0, left))}${left < it.length ? '<span class="caret"></span>' : ""}</li>`; left -= it.length; }
      out += `<ul>${lis}</ul>`;
    } else {
      const txt = b.text.slice(0, left), cut = left < b.text.length;
      out += b.t === "ctx" ? `<p class="ctx">${ico("folder")}<span>${esc(txt)}${cut ? '<span class="caret"></span>' : ""}</span></p>` : `<p>${esc(txt)}${cut ? '<span class="caret"></span>' : ""}</p>`;
      left -= b.text.length;
    }
  }
  return out;
}
export function callBox() {
  return [[CAT.vet.clinic, CAT.vet.phone], [CAT.emergency.name, CAT.emergency.phone]].map(([n, p]) =>
    `<div class="callbox"><span class="small"><b>${n}</b></span><span class="numb">${p}</span><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm danger" href="tel:${p.replace(/\s/g, "")}">${ico("phone", "sm")}Appeler</a><button class="btn sm ghost" data-act="copy" data-v="${p}">${ico("copy", "sm")}Copier</button></div></div>`).join("") + `<p class="small">Si l'appel ne se lance pas, compose le numéro affiché. Numéros fictifs pour le prototype.</p>`;
}
export function msgHTML(m) {
  if (m.role === "user") return `<div class="msg user" data-msg="${m.id}">${esc(m.text)}</div>`;
  if (m.typing) return `<div class="msg bot" data-msg="${m.id}"><div class="bubble" aria-label="Dr. Doudou écrit"><div class="bot-h">${drSVG("av")}Dr. Doudou</div><span class="typing"><i></i><i></i><i></i></span></div></div>`;
  if (m.error) return `<div class="msg bot" data-msg="${m.id}"><div class="err-bubble" role="alert"><div class="bot-h">${ico("cloud-off")}Dr. Doudou n'a pas pu répondre</div><p>${S.sync === "offline" ? "Tu es hors ligne. Ta question est gardée : réessaie quand le réseau revient." : "Le service ne répond pas pour le moment. Ta question est gardée."}</p><p class="small muted">Si c'est urgent, n'attends pas : appelle la clinique au <span class="data" style="user-select:all">${CAT.vet.phone}</span>.</p><div><button class="btn sm primary" data-act="retry" data-id="${m.id}">${ico("refresh", "sm")}Réessayer</button></div></div></div>`;
  const a = m.ans, blocks = blocksOf(a), total = blocksLen(blocks), done = m.shown >= total, L = LEVELS[a.level];
  return `<div class="msg bot" data-msg="${m.id}"><div class="bubble">
    <div class="bot-h">${drSVG("av")}<span style="flex:1">Dr. Doudou</span><span class="status ${L.c}">${ico(L.i)}${L.w}</span></div>
    ${a.level === "urgent" ? `<div class="urgent-band" role="alert"><h4>${ico("cross")}Appelle un vétérinaire maintenant</h4>${callBox()}</div>` : ""}
    ${renderBlocks(blocks, m.shown)}
    ${done ? `<div><p class="src-lab">Sources</p><div class="sources">${a.src.map(s => `<a class="src" href="${SOURCES[s].url}" target="_blank" rel="noopener">${ico("book")}${SOURCES[s].name}${ico("ext")}</a>`).join("")}</div></div>
    <p class="fine">${ico("info", "sm")}Ne remplace pas un vétérinaire. En cas de doute, appelle la clinique.</p>` : ""}
  </div>
  ${done && m.last ? `<div class="suggest" style="margin-top:4px">${SUGGESTIONS.filter(q => findAnswer(q).id !== a.id).slice(0, 2).map(q => `<button data-act="ask" data-q="${esc(q)}">${ico("doc")}${q}</button>`).join("")}</div>` : ""}</div>`;
}
export function chatHTML(where) {
  const intro = !S.chat.length;
  return `<div class="chat" data-chat="${where}">
    ${intro ? `<div class="chat-intro">${drSVG("doc")}<h2>Bonjour, je suis Dr. Doudou</h2><p class="muted">Je réponds à tes questions à partir du dossier de Doudou et de sources vétérinaires reconnues.</p></div>` : ""}
    <p class="disclaimer">${ico("info")}<span>Je ne remplace pas un vétérinaire. Chaque réponse indique un niveau d'urgence et ses sources.</span></p>
    ${intro ? `<div class="suggest"><p class="src-lab">Suggestions</p>${SUGGESTIONS.map(q => `<button data-act="ask" data-q="${esc(q)}">${ico("doc")}${q}</button>`).join("")}</div>` : `<div class="msgs" aria-live="polite">${S.chat.map((m, i) => msgHTML(Object.assign(m, { last: i === S.chat.length - 1 }))).join("")}</div>`}
    <form class="composer" data-act="composer"><label class="sr" for="composer-${where}">Ta question pour Dr. Doudou</label><textarea id="composer-${where}" rows="1" placeholder="Pose ta question sur Doudou…" ${S.chatBusy ? "disabled" : ""}></textarea><button class="send" type="submit" aria-label="Envoyer" ${S.chatBusy ? "disabled" : ""}>${ico("send")}</button></form>
  </div>`;
}
export function refreshChats() {
  document.querySelectorAll("[data-chat]").forEach(el => { el.outerHTML = chatHTML(el.dataset.chat); });
  scrollChat();
}
export function updateMsg(m) {
  document.querySelectorAll(`[data-msg="${m.id}"]`).forEach(el => { el.outerHTML = msgHTML(m); });
}
export function scrollChat() {
  const pb = $("#paneBody"); if (S.chatPinned && pb) pb.scrollTop = pb.scrollHeight;
  if (S.route === "drdoudou" && S.chat.length) { const last = document.querySelector('[data-chat="main"] .msgs > :last-child'); last?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
}
export function ask(q) {
  q = q.trim(); if (!q || S.chatBusy) return;
  S.chat.push({ id: ++msgId, role: "user", text: q });
  answer(q);
}
export function answer(q) {
  const m = { id: ++msgId, role: "bot", typing: true, q };
  S.chat.push(m); S.chatBusy = true; refreshChats();
  setTimeout(() => {
    m.typing = false;
    if (S.sync === "offline" || S.demoError) { m.error = true; S.chatBusy = false; refreshChats(); return; }
    m.ans = findAnswer(q); m.shown = 0;
    const total = blocksLen(blocksOf(m.ans));
    const reduce = S.calm || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { m.shown = total; S.chatBusy = false; refreshChats(); return; }
    refreshChats();
    const iv = setInterval(() => {
      m.shown += 7; updateMsg(m);
      if (m.shown >= total) { clearInterval(iv); m.shown = total; S.chatBusy = false; refreshChats(); }
    }, 22);
  }, 1100);
}
export function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.min(120, t.scrollHeight) + "px"; }
SCREENS.drdoudou = () => ({
  main: chatHTML("main"),
  asideTitle: "Ce que Dr. Doudou sait",
  aside: `<p class="small muted">Pour te répondre, Dr. Doudou lit le dossier de Doudou :</p>
  <div class="list">${[["cat", "Profil", "Mâle stérilisé, 6 ans, européen"], ["scale", "Poids", "14 pesées depuis avril"], ["journal", "Journal", "90 jours d'humeur, d'appétit et de selles"], ["syringe", "Vaccins", "Typhus + coryza, leucose"], ["pipette", "Traitement", "Pipette en cours jusqu'au 6 oct."], ["alert", "Allergie", "Poulet"]].map(([i, t, s]) => `<div class="row"><span class="r-ico">${ico(i)}</span><span class="r-main"><span class="r-title">${t}</span><br><span class="r-sub">${s}</span></span>${ico("check", "sm")}</div>`).join("")}</div>
  <div class="explain"><h4>${ico("info", "sm")}Les 4 niveaux d'urgence</h4><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">${Object.keys(LEVELS).map(k => lvl(k)).join("")}</div></div>`
});
