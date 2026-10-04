/* Import de l'ancienne sauvegarde V1 (doudou-backup-*.json) vers le nouveau modèle.
   Fonction pure : ne touche ni la base ni le fichier source ; renvoie des lignes prêtes à enregistrer + un rapport.
   Règles de mappage : PLAN.md §5.1. */

const TZ = "Europe/Brussels";
const LEGACY_SOURCE = "doudou-healthcare";

/* ---------- petites aides ---------- */
const clean = s => (s == null ? "" : String(s)).replace(/\s+/g, " ").trim();
const num = s => { const n = parseFloat(String(s ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const isoDate = s => (/^\d{4}-\d{2}-\d{2}/.test(String(s || "")) ? String(s).slice(0, 10) : null);
// Heure locale de Bruxelles (formatToParts : le format français écrit « 15 h », illisible comme nombre)
const hourIn = iso => {
  const d = new Date(iso); if (Number.isNaN(+d)) return null;
  const part = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }).formatToParts(d).find(x => x.type === "hour");
  return part ? +part.value : null;
};
const dayOf = iso => { const d = new Date(iso); return Number.isNaN(+d) ? null : new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); };
const pairs = list => list.filter(([, v]) => clean(v)).map(([k, v]) => [k, clean(v)]);
const asList = v => (Array.isArray(v) ? v : []);

/* Échelles de l'ancienne appli → échelles du design */
export function mapAppetit(v) { const n = num(v); if (n == null) return null; return n >= 4 ? 3 : n >= 3 ? 2 : 1; }
export function mapHumeur(v) {
  const t = clean(v).toLowerCase();
  if (!t) return null;
  if (/joueu|câlin|calin|content|joyeu|actif|énergi|energi/.test(t)) return 3;
  if (/normal|calme|tranquil|repos/.test(t)) return 2;
  if (/agress|grogn|abattu|triste|stress|ronchon|apath|léthar|lethar/.test(t)) return 1;
  return 2;
}
export function mapSelles(v) { const t = clean(v).toLowerCase(); if (!t) return null; if (/^normal/.test(t)) return "ok"; if (/moll|diarr|liquid/.test(t)) return "molles"; return "non"; }
export function mapEau(v) { const t = clean(v).toLowerCase(); if (/beaucoup|plus|soif/.test(t)) return "beaucoup"; if (/peu|moins/.test(t)) return "peu"; return "normal"; }
export const mapVomi = v => { const t = clean(v).toLowerCase(); return !!t && t !== "non" && t !== "0"; };
export function mapEaten(v) { const t = clean(v).toLowerCase(); if (/tout|fini|100/.test(t)) return 1; if (/moiti|50/.test(t)) return 0.5; if (/rien|^0/.test(t)) return 0; if (/peu/.test(t)) return 0.1; return null; }
export function normalizeBrand(s) { return clean(s).replace(/pro\s*plan/i, "Pro Plan"); }
const MEAL_TIME = { matin: "08:00", midi: "12:00", "après-midi": "15:00", soir: "19:00", nuit: "22:00" };
const FIN_CAT = { consultation: "Consultations", "médicament": "Médicaments", analyse: "Analyses", urgence: "Urgences", vaccin: "Vaccins", nourriture: "Nourriture", accessoire: "Accessoires", assurance: "Assurance" };

/* ---------- import ---------- */
/* opts.idFor(table, legacyId) → id existant si la donnée a déjà été importée (réimport sans doublon) */
export function mapLegacyBackup(json, opts = {}) {
  const idFor = opts.idFor || (() => null);
  const uuid = opts.uuid || (() => crypto.randomUUID());
  if (!json || typeof json !== "object" || !json.data || typeof json.data !== "object") throw new Error("Ce fichier n'est pas une sauvegarde de l'ancienne Doudou Healthcare.");
  if (json.source && json.source !== LEGACY_SOURCE) throw new Error("Ce fichier vient d'une autre application (" + clean(json.source) + ").");
  const d = json.data;
  const exportDay = isoDate(json.exportedAt) || dayOf(new Date().toISOString());
  const out = { cats: [], contacts: [], allergies: [], records: [], reminders: [], journal: [], day_notes: [], weights: [], food_products: [], meals: [], activities: [], expenses: [] };
  const report = [];
  const note = (kind, text) => report.push({ kind, text });
  const row = (table, legacyId, fields) => { const r = { id: idFor(table, legacyId) || uuid(), legacy_id: legacyId ? String(legacyId) : null, ...fields }; out[table].push(r); return r; };
  const created = o => ({ created_at: o?.createdAt || o?.savedAt || undefined });

  /* Profil */
  const p = asList(d.profile)[0] || (d.profile && !Array.isArray(d.profile) ? d.profile : null);
  if (!p) throw new Error("La sauvegarde ne contient pas de profil de chat.");
  const cat = row("cats", p.id || "main", {
    name: clean(p.name) || "Mon chat", breed: clean(p.breed), sex: /f/i.test(p.sex || "") ? "female" : "male",
    sterilized: !!p.sterilized, birth_date: isoDate(p.dob), coat: clean(p.color), chip_id: clean(p.chipId),
    insurance: clean(p.insurance), insurance_id: clean(p.insuranceId), notes: clean(p.notes),
    target_min: null, target_max: null, ...created(p)
  });
  const catId = cat.id;
  note("ok", `Profil importé : ${cat.name}.`);
  if (clean(p.weight)) note("ignoré", `Poids du profil (« ${clean(p.weight)} kg ») ignoré : le poids vient des pesées.`);
  if (p.chipped && !clean(p.chipId)) note("attention", "Le chat est pucé mais le numéro de puce est vide : à compléter dans le profil.");
  if (clean(p.vetName) || clean(p.vetPhone)) {
    row("contacts", "vet-main", { cat_id: catId, kind: "vet", name: clean(p.vetName), clinic: "", phone: clean(p.vetPhone), email: clean(p.vetEmail), address: clean(p.vetAddress), notes: clean(p.vetDossier) ? "Dossier n° " + clean(p.vetDossier) : "", ...created(p) });
    note("ok", "Vétérinaire référent importé dans les contacts.");
  }
  const allergyTexts = [clean(p.allergies)];
  const al = d.allergies;
  if (al && !Array.isArray(al)) { asList(al.list).forEach(x => allergyTexts.push(clean(x))); }
  asList(al).forEach(x => allergyTexts.push(clean(typeof x === "string" ? x : x?.name)));
  allergyTexts.join(",").split(/[,;]/).map(clean).filter(Boolean).forEach((a, i) => row("allergies", "allergy-" + i + "-" + a, { cat_id: catId, name: a, kind: "autre", detail: "", since: "" }));
  const photo = /^data:image\//.test(p.photo || "") ? { date: isoDate(p.savedAt) || exportDay, dataURL: p.photo } : null;

  /* Dossier médical */
  for (const c of asList(d.consultations)) {
    const cost = num(c.cout);
    const rec = row("records", c.id, { cat_id: catId, type: "consult", date: isoDate(c.date), title: clean(c.motif) || "Consultation", vet: clean(c.vet),
      fields: pairs([["Motif", c.motif], ["Diagnostic", c.diagnostic], ["Traitement", c.traitement], ["Notes", c.notes]]), status: null, next_date: null, cost, ...created(c) });
    if (cost) { row("expenses", "consult-" + c.id, { cat_id: catId, date: rec.date, label: rec.title, cat: "Consultations", amount: cost, reimbursed: 0, planned: false, record_id: rec.id, ...created(c) }); }
  }
  for (const v of asList(d.vaccins)) {
    const rec = row("records", v.id, { cat_id: catId, type: "vaccin", date: isoDate(v.date), title: clean(v.name) || "Vaccin", vet: "",
      fields: pairs([["Vaccin", v.name], ["Lot", v.lot], ["Notes", v.notes]]), status: null, next_date: isoDate(v.nextDate), cost: null, ...created(v) });
    if (rec.next_date) row("reminders", "vaccin-" + v.id, { cat_id: catId, date: rec.next_date, title: "Rappel " + rec.title, sub: "Vaccin à refaire", icon: "syringe", tone: "miel", record_id: rec.id, done_at: null });
  }
  for (const t of asList(d.treatments)) {
    const active = t.active !== false;
    const rec = row("records", t.id, { cat_id: catId, type: "traitement", date: isoDate(t.lastDose) || dayOf(t.createdAt), title: clean(t.name) || "Traitement", vet: "",
      fields: pairs([["Type", t.type], ["Rythme", t.frequency], ["Dernière dose", t.lastDose], ["Prochaine dose", t.nextDose], ["Notes", t.notes]]),
      status: active ? "en cours" : "terminé", next_date: isoDate(t.nextDose), cost: null, ...created(t) });
    if (active && rec.next_date) {
      row("reminders", "treat-" + t.id, { cat_id: catId, date: rec.next_date, title: rec.title, sub: clean(t.type) || "Prochaine dose", icon: "pipette", tone: "roux", record_id: rec.id, done_at: null });
      if (rec.next_date < exportDay) note("attention", `Traitement « ${rec.title} » : la prochaine dose (${rec.next_date}) était déjà passée dans la sauvegarde ; le rappel apparaîtra « en retard ».`);
    }
  }
  for (const a of asList(d.analyses)) {
    row("records", a.id, { cat_id: catId, type: "analyse", date: isoDate(a.date), title: clean(a.type) || "Analyse", vet: clean(a.lab),
      fields: pairs([["Laboratoire", a.lab], ["Résultat", a.result], ["Notes", a.notes]]), status: null, next_date: isoDate(a.nextDate), cost: null, ...created(a) });
  }
  for (const o of asList(d.prescriptions)) {
    row("records", o.id, { cat_id: catId, type: "ordonnance", date: isoDate(o.date), title: clean(o.description).slice(0, 60) || "Ordonnance", vet: clean(o.vet),
      fields: pairs([["Prescrit par", o.vet], ["Contenu", o.description], ["Notes", o.notes]]), status: null, next_date: null, cost: null, ...created(o) });
    if (o.photo) note("ignoré", "Photo d'ordonnance non reprise (à rajouter à la main si besoin).");
  }

  /* Journal (check-ins) */
  const notesByDay = {};
  const addNote = (day, text) => { if (!day || !clean(text)) return; (notesByDay[day] = notesByDay[day] || []).push(clean(text)); };
  for (const c of asList(d.checkins)) {
    const date = isoDate(c.date); if (!date) continue;
    const h = hourIn(c.savedAt || c.createdAt);
    // 15 h → 5 h du matin = soir (une saisie faite après minuit est celle de la soirée)
    const moment = h != null && (h >= 15 || h < 5) ? "e" : "m";
    row("journal", c.id || date, { cat_id: catId, date, moment, h: mapHumeur(c.humeur), a: mapAppetit(c.appetit), s: mapSelles(c.selles), vomi: mapVomi(c.vomissements), eau: mapEau(c.boisson), ...created(c) });
    addNote(date, c.notes);
    const extra = [clean(c.humeur) && `humeur « ${clean(c.humeur)} »`, num(c.appetit) != null && `appétit ${num(c.appetit)}/5`, num(c.activite) != null && `activité ${num(c.activite)}/5`, mapVomi(c.vomissements) && `vomissements « ${clean(c.vomissements)} »`].filter(Boolean);
    if (extra.length) addNote(date, `Ancienne saisie : ${extra.join(", ")}.`);
  }
  if (asList(d.checkins).length) note("transformé", `${asList(d.checkins).length} saisie(s) du journal converties (appétit sur 5 → 3 niveaux, humeur en mots → 3 niveaux, moment déduit de l'heure d'enregistrement : de 15 h à 5 h = soir ; valeurs d'origine gardées dans la note du jour).`);
  for (const e of asList(d.events)) addNote(isoDate(e.date), `${clean(e.type) && clean(e.type) !== "Autre" ? clean(e.type) + " : " : ""}${clean(e.desc)}${clean(e.suivi) ? " (suivi : " + clean(e.suivi) + ")" : ""}`);
  for (const [date, list] of Object.entries(notesByDay)) row("day_notes", "note-" + date, { cat_id: catId, date, note: list.join("\n"), photo_ids: [] });

  /* Pesées : une date dans le futur par rapport à la sauvegarde est une faute de frappe d'année (décision D3) */
  const wDates = new Set(asList(d.weights).map(w => isoDate(w.date)));
  for (const w of asList(d.weights)) {
    let date = isoDate(w.date); const kg = num(w.value);
    if (!date || kg == null) { note("ignoré", "Une pesée sans date ou sans valeur a été ignorée."); continue; }
    if (date > exportDay) {
      const fixed = String(+date.slice(0, 4) - 1) + date.slice(4);
      if (!wDates.has(fixed) && fixed <= exportDay) { note("transformé", `Pesée du ${date} (dans le futur) corrigée au ${fixed}.`); date = fixed; }
      else note("attention", `Pesée du ${date} dans le futur, gardée telle quelle : à vérifier.`);
    }
    row("weights", w.id, { cat_id: catId, date, moment: "m", kg, context: clean(w.context), ...created(w) });
  }

  /* Alimentation : aliments distincts + repas historiques */
  const products = {};
  for (const f of asList(d.food)) {
    const name = normalizeBrand(f.brand) || clean(f.type) || "Aliment";
    const kind = /p[âa]t[ée]e/i.test(f.type || "") ? "patee" : /friand/i.test(f.type || "") ? "friandise" : /croq/i.test(f.type || "") ? "croquettes" : "extra";
    const k = name.toLowerCase() + "|" + kind;
    if (!products[k]) products[k] = row("food_products", "product-" + k, { cat_id: catId, name, kind, notes: "", active: true });
    row("meals", f.id, { cat_id: catId, date: isoDate(f.date), plan_id: null, time: MEAL_TIME[clean(f.moment).toLowerCase()] || "12:00", product_id: products[k].id, qty_g: num(f.qty), eaten: mapEaten(f.eaten), ...created(f) });
  }
  if (asList(d.food).length) note("transformé", `${asList(d.food).length} repas importés, ${Object.keys(products).length} aliment(s) distinct(s) (noms de marque harmonisés). Le programme de repas quotidien reste à saisir.`);

  /* Activité */
  for (const a of asList(d.activity)) {
    row("activities", a.id || a.date, { cat_id: catId, date: isoDate(a.date), minutes: num(a.minutes), play_min: null, sleep_h: num(a.sleep), distance_m: num(a.distance), zone: clean(a.zones), notes: clean(a.notes), ...created(a) });
  }

  /* Finances */
  for (const f of asList(d.finances)) {
    const amount = num(f.amount); if (!amount) continue;
    row("expenses", f.id, { cat_id: catId, date: isoDate(f.date), label: clean(f.desc) || clean(f.cat) || "Dépense", cat: FIN_CAT[clean(f.cat).toLowerCase()] || clean(f.cat) || "Autre", amount, reimbursed: num(f.reimb) || 0, planned: false, record_id: null, ...created(f) });
  }

  for (const t of ["vaccins", "analyses", "prescriptions", "finances"]) if (!asList(d[t]).length) note("ok", `Aucun élément « ${t} » dans la sauvegarde (écran vide prévu).`);
  const theme = asList(d.settings).find(s => s.key === "theme")?.value;
  for (const t of Object.keys(out)) out[t].forEach(r => { if (r.created_at === undefined) delete r.created_at; });
  return { tables: out, photo, settings: { theme: ["light", "dark"].includes(theme) ? theme : null }, report, counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])) };
}
