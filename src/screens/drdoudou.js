/* Dr. Doudou. L'IA réelle (sources vérifiées, règles d'urgence codées) arrive en Phase 4.
   D'ici là : aucune réponse simulée ; l'écran dit ce qui arrive et donne les vrais numéros d'urgence. */
import { LEVELS } from "../domain/vocab.js";
import { SCREENS } from "../screens/registry.js";
import { lvl, AI_READY } from "../screens/today.js";
import { S } from "../state.js";
import { drSVG } from "../ui/illustrations.js";
import { $, toast } from "../ui/shell.js";
import { esc, ico } from "../utils/core.js";
import { cat, catName, weights, journalDays, vaccines, activeTreatments, allergies, vet, emergency, sexText, ageText } from "../domain/views.js";

const tel = p => String(p || "").replace(/[^\d+]/g, "");
export function callBox() {
  const list = [vet(), emergency()].filter(c => c?.phone);
  if (!list.length) return `<p class="small">Ajoute le numéro de ton vétérinaire et de la garde vétérinaire dans le profil : ils s'afficheront ici, prêts à appeler.</p><button class="btn sm secondary" data-go="profil">${ico("phone", "sm")}Ajouter les numéros</button>`;
  return list.map(c => `<div class="callbox"><span class="small"><b>${esc([c.name, c.clinic].filter(Boolean).join(" · "))}</b></span><span class="numb">${esc(c.phone)}</span><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm danger" href="tel:${esc(tel(c.phone))}">${ico("phone", "sm")}Appeler</a><button class="btn sm ghost" data-act="copy" data-v="${esc(c.phone)}">${ico("copy", "sm")}Copier</button></div></div>`).join("") + `<p class="small">Si l'appel ne se lance pas, compose le numéro affiché.</p>`;
}

export function chatHTML(where) {
  return `<div class="chat" data-chat="${where}">
    <div class="chat-intro">${drSVG("doc")}<h2>Bonjour, je suis Dr. Doudou</h2><p class="muted">${AI_READY ? "Je réponds à tes questions à partir du dossier et de sources vétérinaires reconnues." : `J'arrive bientôt : je répondrai à tes questions sur ${esc(catName())} à partir de son dossier et uniquement de sources vétérinaires vérifiées, avec un niveau d'urgence pour chaque réponse.`}</p></div>
    <p class="disclaimer">${ico("info")}<span>Je ne remplace pas un vétérinaire. Chaque réponse indiquera un niveau d'urgence et ses sources.</span></p>
    <div class="urgent-band" role="note"><h4>${ico("cross")}En cas d'urgence, n'attends pas</h4>${callBox()}</div>
    <form class="composer" data-act="composer"><label class="sr" for="composer-${where}">Ta question pour Dr. Doudou</label><textarea id="composer-${where}" rows="1" placeholder="${AI_READY ? "Pose ta question…" : "Disponible à l'étape 4"}" ${AI_READY ? "" : "disabled"}></textarea><button class="send" type="submit" aria-label="Envoyer" ${AI_READY ? "" : "disabled"}>${ico("send")}</button></form>
  </div>`;
}
export function refreshChats() { document.querySelectorAll("[data-chat]").forEach(el => { el.outerHTML = chatHTML(el.dataset.chat); }); }
export function scrollChat() { const pb = $("#paneBody"); if (S.chatPinned && pb) pb.scrollTop = pb.scrollHeight; }
export function ask() { if (!AI_READY) toast("Dr. Doudou arrive à l'étape 4", "info"); }
export const answer = ask;
export function autoGrow(t) { t.style.height = "auto"; t.style.height = Math.min(120, t.scrollHeight) + "px"; }

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
    asideTitle: "Ce que Dr. Doudou saura",
    aside: `${known.length ? `<p class="small muted">Pour te répondre, Dr. Doudou lira le dossier de ${esc(catName())} :</p>
    <div class="list">${known.map(([i, t, s]) => `<div class="row"><span class="r-ico">${ico(i)}</span><span class="r-main"><span class="r-title">${t}</span><br><span class="r-sub">${esc(s)}</span></span>${ico("check", "sm")}</div>`).join("")}</div>` : ""}
    <div class="explain"><h4>${ico("info", "sm")}Les 4 niveaux d'urgence</h4><div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">${Object.keys(LEVELS).map(k => lvl(k)).join("")}</div></div>`
  };
};
