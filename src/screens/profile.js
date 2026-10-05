/* Écran Profil : carte d'identité, allergies, carte de secours (QR généré en local), contacts. Tout est modifiable. */
import { SCREENS } from "../screens/registry.js";
import { catSVG, qrSVG } from "../ui/illustrations.js";
import { ico, esc, fmtKg, fmtDate, parse, cap, key, TODAY } from "../utils/core.js";
import { closeSheet, toast, markPending, render, go } from "../ui/shell.js";
import { FORMS, form, input, choices, select, submit, formError, parseNum } from "../ui/forms.js";
import { commit, get } from "../data/repo.js";
import { photoURL } from "../data/photos.js";
import { cat, ageText, sexText, lastWeight, contacts, allergies, activeTreatments, vet, hasTarget } from "../domain/views.js";
import { emptyState } from "./today.js";

const KIND = { vet: "Vétérinaire référent", urgence: "Urgences nuit et week-end", proche: "Proche" };
const tel = p => String(p || "").replace(/[^\d+]/g, "");

/* Texte de la carte de secours (contenu du QR) : l'essentiel, lisible sans connexion. */
export function emergencyText() {
  const c = cat(), w = lastWeight(), v = vet(), al = allergies(), tr = activeTreatments();
  return [
    `CARTE DE SECOURS — ${c.name.toUpperCase()}`,
    [c.breed, sexText(c).toLowerCase(), ageText(c.birth_date), w ? fmtKg(w.v) : ""].filter(Boolean).join(", "),
    c.chip_id ? `Puce : ${c.chip_id}` : "",
    `Allergies : ${al.length ? al.map(a => a.name + (a.detail ? " (" + a.detail + ")" : "")).join(", ") : "aucune connue"}`,
    tr.length ? `Traitement : ${tr.map(t => t.title).join(", ")}` : "",
    v ? `Vét : ${[v.name, v.clinic].filter(Boolean).join(", ")}${v.phone ? " · Tél : " + v.phone : ""}` : "",
    ...contacts().filter(x => x.kind !== "vet" && x.phone).map(x => `${KIND[x.kind]} : ${x.name} · ${x.phone}`)
  ].filter(Boolean).join("\n");
}

SCREENS.profil = () => {
  const c = cat();
  if (!c) return { main: emptyState("today", "Pas encore de profil", "Commence par son nom : le reste peut être complété plus tard.", "profileForm", "Créer son profil"), aside: "" };
  const w = lastWeight(), url = photoURL(c.photo_id), v = vet(), al = allergies();
  const photo = url ? `<img src="${esc(url)}" alt="Photo de ${esc(c.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : catSVG("content", { label: c.name });
  const main = `<div class="grid-2"><div class="col">
  <section class="idcard" aria-label="Carte d'identité"><div class="id-top"><div class="id-photo">${photo}</div><div style="min-width:0"><span class="label muted">Carte d'identité</span><h2>${esc(c.name)}</h2><p class="muted">${esc([c.breed, sexText(c).toLowerCase()].filter(Boolean).join(" · "))}</p></div></div>
    <dl class="dl">${c.birth_date ? `<dt>Né le</dt><dd>${fmtDate(parse(c.birth_date), true)} (${ageText(c.birth_date)})</dd>` : ""}<dt>Poids</dt><dd class="data">${w ? fmtKg(w.v) : "—"}</dd>${hasTarget(c) ? `<dt>Zone idéale</dt><dd class="data">${String(c.target_min).replace(".", ",")}–${String(c.target_max).replace(".", ",")} kg</dd>` : ""}${c.coat ? `<dt>Robe</dt><dd>${esc(c.coat)}</dd>` : ""}<dt>Puce</dt><dd>${c.chip_id ? `<span class="data">${esc(c.chip_id)}</span>` : '<span class="muted">non renseignée</span>'}</dd>${v ? `<dt>Vétérinaire</dt><dd>${esc([v.name, v.clinic].filter(Boolean).join(", "))}</dd>` : ""}${c.insurance ? `<dt>Assurance</dt><dd>${esc(c.insurance)}${c.insurance_id ? " · " + esc(c.insurance_id) : ""}</dd>` : ""}</dl>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm secondary" data-act="profileForm">${ico("journal", "sm")}Modifier</button><button class="btn sm ghost" data-act="profilePhoto">${ico("camera", "sm")}${url ? "Changer la photo" : "Ajouter une photo"}</button></div></section>
  <section class="card" style="border:2px solid var(--roux-ink);box-shadow:none"><div class="card-h"><h2 style="display:flex;gap:8px;align-items:center;color:var(--roux-ink)">${ico("alert")}Allergies</h2><button class="link-btn" data-act="allergyForm" data-id="">${ico("plus")}Ajouter</button></div>
    ${al.length ? al.map(a => `<button class="row" data-act="allergyForm" data-id="${a.id}" style="width:100%"><span class="r-main"><b>${esc(a.name)}</b>${a.detail ? " : " + esc(a.detail) : ""}${a.since ? `<br><span class="small muted">${esc(a.since)}</span>` : ""}</span>${ico("chev-r", "sm")}</button>`).join("") : `<p class="small">Aucune allergie connue notée.</p>`}</section>
  </div><div class="col">
  <section class="card"><div class="card-h"><h2>Carte de secours</h2>${ico("qr")}</div><div class="qr-wrap"><div class="qr">${qrSVG(emergencyText())}</div><div style="flex:1;min-width:180px"><p>À montrer à un vétérinaire ou au pet-sitter. Le code contient l'essentiel sans connexion : identité, allergies, traitement, vétérinaire.</p><button class="btn sm secondary" data-act="bigQR" style="margin-top:12px">${ico("qr", "sm")}Afficher en grand</button></div></div></section>
  <section class="card"><div class="card-h"><h2>Contacts d'urgence</h2><button class="link-btn" data-act="contactForm" data-id="">${ico("plus")}Ajouter</button></div>${contacts().length ? `<div class="list">
    ${contacts().map(x => `<div class="row"><span class="r-ico">${ico(x.kind === "vet" ? "stetho" : x.kind === "urgence" ? "cross" : "user")}</span><span class="r-main"><span class="r-title">${esc([x.name, x.clinic].filter(Boolean).join(" · ") || KIND[x.kind])}</span><br><span class="r-sub">${esc(KIND[x.kind])}${x.address ? " · " + esc(x.address) : ""}</span>${x.phone ? `<br><a class="data" style="user-select:all;white-space:nowrap" href="tel:${esc(tel(x.phone))}">${esc(x.phone)}</a>` : ""}</span>${x.phone ? `<button class="icon-btn" data-act="copy" data-v="${esc(x.phone)}" aria-label="Copier le numéro">${ico("copy")}</button>` : ""}<button class="icon-btn" data-act="contactForm" data-id="${x.id}" aria-label="Modifier le contact">${ico("journal")}</button></div>`).join("")}
  </div>` : `<p class="small muted">Ajoute son vétérinaire et la garde vétérinaire de nuit : leurs numéros apparaîtront aussi en cas d'urgence.</p>`}</section>
  </div></div>`;
  return { main, aside: `<p class="small muted">Ce que contient le QR code :</p><pre class="json" style="white-space:pre-wrap">${esc(emergencyText())}</pre>`, asideTitle: "Carte de secours" };
};

/* ---------- Formulaires ---------- */
export function profileFormHTML() {
  const c = cat() || {};
  return form("profile", `${input("name", "Nom", { value: c.name || "", placeholder: "ex. Doudou" })}
    ${input("breed", "Race", { value: c.breed || "", placeholder: "ex. Européen" })}
    ${input("birth", "Date de naissance", { type: "date", value: c.birth_date || "" })}
    ${choices("sex", "Sexe", [["male", "Mâle"], ["female", "Femelle"]], c.sex || "male")}
    ${choices("sterilized", "Stérilisé", [["oui", "Oui"], ["non", "Non"]], c.sterilized === false ? "non" : "oui")}
    ${input("coat", "Robe", { value: c.coat || "", placeholder: "ex. Noir et blanc" })}
    ${input("chip", "Numéro de puce", { value: c.chip_id || "", data: true })}
    ${input("weight", "Poids actuel (kg, facultatif)", { value: "", inputmode: "decimal", data: true, placeholder: lastWeight() ? String(lastWeight().v).replace(".", ",") : "ex. 5,9", help: "Ajoute une pesée datée d'aujourd'hui (visible dans Santé et le journal)." })}
    ${input("tmin", "Zone de poids idéale : minimum (kg)", { value: c.target_min ?? "", inputmode: "decimal", data: true, help: "À demander à ton vétérinaire. Laisse vide si tu ne la connais pas." })}
    ${input("tmax", "Zone de poids idéale : maximum (kg)", { value: c.target_max ?? "", inputmode: "decimal", data: true })}
    ${input("insurance", "Assurance (facultatif)", { value: c.insurance || "" })}
    ${input("insurance_id", "N° de contrat (facultatif)", { value: c.insurance_id || "", data: true })}
    ${input("notes", "Notes (facultatif)", { value: c.notes || "", area: true })}
    ${submit(c.id ? "Enregistrer le profil" : "Créer le profil")}`);
}
FORMS.profile = async (f, v) => {
  if (!v.name) return formError(f, "Indique au moins son nom.", "name");
  const tmin = parseNum(v.tmin), tmax = parseNum(v.tmax);
  if (Number.isNaN(tmin) || Number.isNaN(tmax) || (tmin != null && (tmin < 0.5 || tmin > 15)) || (tmax != null && (tmax < 0.5 || tmax > 15))) return formError(f, "La zone de poids s'écrit en kilos, par exemple 4,4 et 4,8.", "tmin");
  if ((tmin == null) !== (tmax == null) || (tmin != null && tmin >= tmax)) return formError(f, "Indique le minimum ET le maximum, le minimum étant plus petit.", "tmin");
  const w = parseNum(v.weight);
  if (Number.isNaN(w) || (w != null && (w < 0.5 || w > 15))) return formError(f, "Le poids s'écrit en kilos, par exemple 5,9.", "weight");
  const c = cat(), first = !c, catId = c?.id || crypto.randomUUID();
  const ops = [{ table: "cats", row: { id: catId, name: v.name, breed: v.breed, birth_date: v.birth || null, sex: v.sex || "male", sterilized: v.sterilized !== "non", coat: v.coat, chip_id: v.chip, target_min: tmin, target_max: tmax, insurance: v.insurance, insurance_id: v.insurance_id, notes: v.notes } }];
  if (w != null) ops.push({ table: "weights", row: { cat_id: catId, date: key(TODAY), moment: "m", kg: Math.round(w * 100) / 100 } });
  await commit(ops);
  closeSheet(); toast(first ? `Bienvenue, ${v.name} !` : "Profil enregistré", "cat"); markPending();
  if (first) go("aujourdhui"); else render(false);
};

export function contactFormHTML(id) {
  const x = id ? get("contacts", id) : null;
  return form("contact", `${select("kind", "Type de contact", Object.entries(KIND), x?.kind || (vet() ? "urgence" : "vet"))}
    ${input("name", "Nom", { value: x?.name || "", placeholder: "ex. Dr Dupont" })}
    ${input("clinic", "Clinique (facultatif)", { value: x?.clinic || "" })}
    ${input("phone", "Téléphone", { type: "tel", value: x?.phone || "", inputmode: "tel", data: true })}
    ${input("email", "E-mail (facultatif)", { type: "email", value: x?.email || "" })}
    ${input("address", "Adresse (facultatif)", { value: x?.address || "" })}
    ${submit(x ? "Enregistrer" : "Ajouter le contact")}
    ${x ? `<button type="button" class="btn ghost block" data-act="delContact" data-id="${x.id}">${ico("x", "sm")}Supprimer ce contact</button>` : ""}`, `data-id="${id || ""}"`);
}
FORMS.contact = async (f, v) => {
  if (!v.name && !v.clinic) return formError(f, "Indique un nom ou une clinique.", "name");
  if (v.phone && !/^[\d+ ().\/-]{6,}$/.test(v.phone)) return formError(f, "Le numéro ne peut contenir que des chiffres, espaces et +.", "phone");
  await commit([{ table: "contacts", row: { id: f.dataset.id || undefined, cat_id: cat().id, kind: v.kind, name: v.name, clinic: v.clinic, phone: v.phone, email: v.email, address: v.address } }]);
  closeSheet(); toast("Contact enregistré", "phone"); markPending(); render(false);
};

export function allergyFormHTML(id) {
  const a = id ? get("allergies", id) : null;
  return form("allergy", `${input("name", "Allergie ou sensibilité", { value: a?.name || "", placeholder: "ex. Poulet" })}
    ${choices("kind", "Type", [["aliment", "Aliment"], ["medicament", "Médicament"], ["autre", "Autre"]], a?.kind || "aliment")}
    ${input("detail", "Ce qui se passe (facultatif)", { value: a?.detail || "", placeholder: "ex. démangeaisons autour du cou" })}
    ${input("since", "Depuis quand / comment repérée (facultatif)", { value: a?.since || "" })}
    ${submit(a ? "Enregistrer" : "Ajouter l'allergie")}
    ${a ? `<button type="button" class="btn ghost block" data-act="delAllergy" data-id="${a.id}">${ico("x", "sm")}Supprimer</button>` : ""}`, `data-id="${id || ""}"`);
}
FORMS.allergy = async (f, v) => {
  if (!v.name) return formError(f, "Indique l'allergie, par exemple « Poulet ».", "name");
  await commit([{ table: "allergies", row: { id: f.dataset.id || undefined, cat_id: cat().id, name: cap(v.name), kind: v.kind || "autre", detail: v.detail, since: v.since } }]);
  closeSheet(); toast("Allergie enregistrée", "alert"); markPending(); render(false);
};
