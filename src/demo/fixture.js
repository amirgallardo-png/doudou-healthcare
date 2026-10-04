/* DONNÉES DE DÉMONSTRATION FICTIVES du prototype. Servent uniquement à vérifier la parité visuelle
   en Phase 1. Seront retirées de l'appli en Phase 2 (déplacées dans tests/fixtures). */
import { TODAY, addDays, key, parse } from "../utils/core.js";

export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const CAT = {
  name: "Doudou", breed: "Européen à poil court", sex: "Mâle stérilisé", birth: "12 mai 2020", age: "6 ans",
  color: "Tigré roux et crème", weight: 4.6, chip: "250 26 0000 0048 21", chipNote: "numéro fictif",
  vet: { name: "Dr Martin", clinic: "Clinique des Quatre Pattes", phone: "+32 2 000 12 34", addr: "Rue des Tilleuls 12, Bruxelles" },
  emergency: { name: "Garde vétérinaire 24 h/24", phone: "+32 2 000 99 00" },
  contacts: [{ name: "Amir (propriétaire)", role: "Propriétaire", phone: "+32 470 00 00 01" }, { name: "Léa", role: "Voisine, pet-sitter", phone: "+32 470 00 00 02" }],
  allergies: [{ name: "Poulet", detail: "Démangeaisons et grattage autour du cou", since: "Repérée en novembre 2024 (régime d'éviction)" }],
  noDrugAllergy: "Aucune allergie aux médicaments connue",
  target: [4.4, 4.8]
};

export const WEIGHTS = [["2026-04-05",4.42],["2026-04-19",4.45],["2026-05-03",4.50],["2026-05-17",4.55],["2026-05-31",4.61],["2026-06-14",4.68],["2026-06-28",4.74],["2026-07-12",4.78],["2026-07-26",4.80],["2026-08-04",4.76],["2026-08-23",4.70],["2026-09-06",4.66],["2026-09-20",4.64],["2026-10-03",4.60]].map(([d, v]) => ({ d: parse(d), v }));
/* Journal : 90 jours générés de façon déterministe + épisodes de l'histoire */
export const LOGS = {};
(function buildLogs() {
  const r = rng(46);
  for (let d = new Date(2026, 6, 6); d < TODAY; d = addDays(d, 1)) {
    const k = key(d);
    const mk = () => ({ h: r() < .55 ? 3 : (r() < .9 ? 2 : 1), a: r() < .78 ? 3 : 2, s: r() < .9 ? "ok" : (r() < .5 ? "molles" : "non") });
    LOGS[k] = { m: mk(), e: r() < .9 ? mk() : null, note: "", photos: [] };
  }
  const set = (k, slot, v) => { LOGS[k][slot] = Object.assign(LOGS[k][slot] || { h: 2, a: 3, s: "ok" }, v); };
  set("2026-09-16", "m", { s: "molles", a: 2 }); set("2026-09-17", "e", { s: "molles" });
  ["2026-09-28","2026-09-29"].forEach(k => { set(k, "m", { h: 3, a: 3, s: "ok" }); set(k, "e", { h: 3, a: 3, s: "ok" }); });
  set("2026-09-30", "m", { h: 3, a: 3, s: "ok" }); set("2026-09-30", "e", { h: 2, a: 3, s: "ok" });
  set("2026-10-01", "m", { h: 2, a: 2, s: "ok" }); set("2026-10-01", "e", { h: 2, a: 2, s: "ok" });
  set("2026-10-02", "m", { h: 2, a: 2, s: "ok" }); set("2026-10-02", "e", { h: 1, a: 1, s: "non" });
  set("2026-10-03", "m", { h: 2, a: 1, s: "ok" }); set("2026-10-03", "e", { h: 2, a: 1, s: "ok" });
  LOGS["2026-08-04"].note = "Bilan annuel chez le Dr Martin : tout va bien, un peu de tartre.";
  LOGS["2026-09-14"].note = "Début de la transition vers les croquettes « Stérilisé ».";
  LOGS["2026-09-24"].note = "Transition terminée, il mange les nouvelles croquettes sans problème.";
  LOGS["2026-10-02"].note = "A boudé sa pâtée du soir, il a juste léché la sauce.";
  LOGS["2026-10-03"].note = "Moins de croquettes mangées. Il dort beaucoup au soleil.";
  LOGS["2026-09-20"].photos = ["window"]; LOGS["2026-09-27"].photos = ["sleep"]; LOGS["2026-10-03"].photos = ["sleep", "bowl"];
  WEIGHTS.forEach(w => { const k = key(w.d); if (LOGS[k]) LOGS[k].w = w.v; });
})();

export const RECORDS = [
  { id: "r1", type: "consult", date: "2026-08-04", title: "Bilan annuel", sub: "Dr Martin · Clinique des Quatre Pattes", cost: 58,
    fields: [["Motif", "Contrôle annuel"], ["Examen", "Bon état général, cœur et poumons normaux"], ["Dents", "Léger tartre (stade 1)"], ["Poids", "4,76 kg"], ["Conseils", "Surveiller le poids, contrôle dentaire dans 3 mois"]],
    explain: "Tout va bien. Le « tartre stade 1 » est un petit dépôt sur les dents, sans gravité. On en reparle au contrôle de novembre." },
  { id: "r2", type: "analyse", date: "2026-08-04", title: "Bilan sanguin", sub: "Prise de sang · résultats normaux", cost: 72,
    fields: [["Reins (créatinine)", "1,4 mg/dL · norme 0,8–2,0"], ["Foie (ALAT)", "52 U/L · norme 12–130"], ["Sucre (glycémie)", "96 mg/dL · norme 70–150"], ["Globules rouges", "Normaux"]],
    explain: "Les reins, le foie et le sucre dans le sang sont dans les normes pour un chat de son âge." },
  { id: "r3", type: "ordonnance", date: "2026-08-04", title: "Ordonnance antiparasitaire", sub: "3 pipettes · valable 1 an", cost: 39,
    fields: [["Prescrit par", "Dr Martin"], ["Produit", "Pipette antiparasitaire (sélamectine)"], ["Posologie", "1 pipette par mois entre les omoplates"], ["Quantité", "3 pipettes"]],
    explain: "C'est l'ordonnance des pipettes en cours. À montrer en pharmacie pour le renouvellement en novembre." },
  { id: "r4", type: "traitement", date: "2026-08-06", title: "Antiparasitaire en pipette", sub: "En cours · dose 3 sur 3 le 6 oct.", status: "en cours", cost: 0,
    fields: [["Contre", "Puces, tiques, certains vers intestinaux"], ["Rythme", "1 fois par mois"], ["Faites", "6 août · 6 septembre"], ["Prochaine", "6 octobre (dernière dose)"]],
    explain: "La pipette protège contre les puces, les tiques et certains vers. Il reste une dose, le 6 octobre." },
  { id: "r5", type: "consult", date: "2026-05-12", title: "Œil qui coule", sub: "Dr Martin · conjonctivite légère", cost: 45,
    fields: [["Motif", "Œil droit qui coule depuis 2 jours"], ["Diagnostic", "Conjonctivite légère"], ["Suivi", "Guéri en une semaine"]],
    explain: "La conjonctivite est une inflammation de la fine membrane de l'œil. Elle était légère et a guéri en une semaine." },
  { id: "r6", type: "traitement", date: "2026-05-12", title: "Pommade pour les yeux", sub: "Terminé · 7 jours", status: "terminé", cost: 12,
    fields: [["Durée", "7 jours, 2 fois par jour"], ["Résultat", "Œil guéri"]],
    explain: "Traitement court terminé, sans effet indésirable." },
  { id: "r7", type: "vaccin", date: "2025-10-25", title: "Vaccin typhus + coryza", sub: "Rappel prévu le 25 oct. 2026", next: "2026-10-25", cost: 55,
    fields: [["Protège contre", "Typhus et coryza (virus fréquents)"], ["Fait le", "25 octobre 2025"], ["Rappel", "25 octobre 2026"], ["Lot", "Noté sur le carnet papier"]],
    explain: "Le typhus et le coryza sont des maladies virales fréquentes chez le chat. Le rappel se fait chaque année." },
  { id: "r8", type: "vaccin", date: "2025-03-14", title: "Vaccin leucose", sub: "Valable jusqu'en mars 2027", next: "2027-03-14", cost: 48,
    fields: [["Protège contre", "Leucose féline (virus transmis entre chats)"], ["Fait le", "14 mars 2025"], ["Rappel", "14 mars 2027"]],
    explain: "La leucose se transmet entre chats. Le vaccin est utile car Doudou sort au jardin." },
  { id: "r9", type: "analyse", date: "2024-11-20", title: "Régime d'éviction", sub: "Sensibilité au poulet repérée", cost: 0,
    fields: [["Méthode", "8 semaines sans poulet puis réintroduction"], ["Résultat", "Démangeaisons au retour du poulet"]],
    explain: "Un régime d'éviction consiste à retirer un aliment puis à le réintroduire pour voir s'il pose problème." }
];
export const REMINDERS = [
  { id: "m1", date: "2026-10-04", title: "Pesée du dimanche", sub: "Sur la balance de la salle de bain", i: "scale", c: "ok" },
  { id: "m2", date: "2026-10-06", title: "Pipette antiparasitaire", sub: "Dernière dose du traitement", i: "pipette", c: "roux", rec: "r4" },
  { id: "m3", date: "2026-10-25", title: "Rappel vaccin typhus + coryza", sub: "À réserver chez le Dr Martin", i: "syringe", c: "miel", rec: "r7" },
  { id: "m4", date: "2026-11-18", title: "Contrôle dentaire", sub: "Dr Martin · 10 h 30", i: "stetho", c: "", rec: "r1" }
];

export const EXPENSES = [
  { d: "2026-02-10", label: "Consultation démangeaisons", cat: "Consultations", amt: 38 },
  { d: "2026-04-08", label: "Vermifuge en comprimé", cat: "Médicaments", amt: 18 },
  { d: "2026-05-12", label: "Consultation œil", cat: "Consultations", amt: 45 },
  { d: "2026-05-12", label: "Pommade pour les yeux", cat: "Médicaments", amt: 12 },
  { d: "2026-08-04", label: "Bilan annuel", cat: "Consultations", amt: 58 },
  { d: "2026-08-04", label: "Bilan sanguin", cat: "Analyses", amt: 72 },
  { d: "2026-08-04", label: "Pipettes antiparasitaires ×3", cat: "Médicaments", amt: 39 }
];
export const PLANNED = [
  { d: "2026-10-25", label: "Rappel vaccin typhus + coryza", cat: "Vaccins", amt: 55 },
  { d: "2026-11-06", label: "Renouvellement pipettes ×3", cat: "Médicaments", amt: 39 },
  { d: "2026-11-18", label: "Contrôle dentaire", cat: "Consultations", amt: 45 }
];
export const FOOD = {
  dry: { name: "Félis Vital Stérilisé", kind: "Croquettes · au saumon, sans poulet", g: 50, note: "50 g par jour en 2 repas" },
  wet: { name: "Maison Minou Saumon", kind: "Pâtée · 1 sachet de 85 g le soir", g: 85 },
  water: "Fontaine à eau · environ 220 ml par jour",
  meals: [
    { t: "07:30", what: "Croquettes", qty: "25 g", eaten: .5, done: true },
    { t: "12:00", what: "Quelques croquettes (libre-service)", qty: "10 g", eaten: .4, done: true },
    { t: "19:00", what: "Pâtée Maison Minou", qty: "85 g", eaten: 0, done: false },
    { t: "21:30", what: "Croquettes", qty: "15 g", eaten: 0, done: false }
  ],
  transition: { from: "Félis Vital Adulte", to: "Félis Vital Stérilisé", start: "2026-09-14", end: "2026-09-24", steps: [["14–16 sept.", 25], ["17–19 sept.", 50], ["20–22 sept.", 75], ["23–24 sept.", 100]] },
  week: [50, 48, 52, 47, 41, 30, 26] /* g de croquettes mangées, 28 sept. → 4 oct. (aujourd'hui partiel) */
};

export const ACTIVITY = { active: 38, goal: 45, play: 14, sessions: 2, sleep: "14 h 20", dist: "1,2 km",
  week: [{ d: "lun.", v: 52 }, { d: "mar.", v: 47 }, { d: "mer.", v: 55 }, { d: "jeu.", v: 41 }, { d: "ven.", v: 34 }, { d: "sam.", v: 30 }, { d: "dim.", v: 38 }],
  where: "Dans le jardin", seen: "il y a 4 min", batt: 62 };

export const DEVICES = [
  { id: "tag", name: "Collier traceur", detail: "Activité et position", i: "tag", batt: 62, state: "ok" },
  { id: "scale", name: "Balance connectée", detail: "Pesée du dimanche", i: "scale", batt: 88, state: "ok" },
  { id: "fountain", name: "Fontaine à eau", detail: "Quantité bue", i: "water", batt: null, state: "off" }
];

export const SOURCES = {
  icc: { name: "International Cat Care", url: "https://icatcare.org/" },
  cornell: { name: "Cornell Feline Health Center", url: "https://www.vet.cornell.edu/departments-centers-and-institutes/cornell-feline-health-center" },
  aafp: { name: "AAFP", url: "https://catvets.com/" },
  merck: { name: "Merck Veterinary Manual", url: "https://www.merckvetmanual.com/" },
  wsava: { name: "WSAVA", url: "https://wsava.org/global-guidelines/" }
};
export const ANSWERS = [
  { id: "urine", re: /urin|pipi|bouch|n'arrive pas.*(litière|faire)|force.*litière/i, level: "urgent",
    ctx: ["Doudou est un mâle stérilisé : ce profil est plus exposé au blocage urinaire."],
    p: ["Un chat mâle qui va souvent à la litière sans réussir à uriner peut avoir l'urètre bouché (le petit canal qui évacue l'urine). C'est une urgence : sans soin, la situation peut devenir grave en quelques heures.", "Appelle un vétérinaire maintenant. Ne lui donne ni médicament ni nourriture en attendant."],
    src: ["cornell", "merck"] },
  { id: "respi", re: /respir|halète|convuls|empoison|saign|tomb[ée]|accident|lys|paracétamol/i, level: "urgent",
    ctx: ["Je n'ai pas besoin de son dossier pour celle-ci : ce signe demande un avis immédiat."],
    p: ["Une difficulté à respirer, une convulsion, un saignement important ou une possible intoxication sont des urgences vétérinaires.", "Appelle le vétérinaire tout de suite. Garde Doudou au calme et au chaud pendant le trajet."],
    src: ["merck", "icc"] },
  { id: "vomi", re: /vomi/i, level: "soon",
    ctx: ["D'après son journal : appétit en baisse depuis le 1er octobre."],
    p: ["Un vomissement isolé, souvent de poils, arrive à beaucoup de chats. Deux vomissements dans la même matinée, alors que son appétit baisse déjà, justifient d'appeler le Dr Martin aujourd'hui ou demain."],
    li: ["Retire la nourriture 2 à 3 heures et laisse l'eau à disposition.", "Note l'aspect (poils, nourriture, liquide) : c'est utile pour le vétérinaire.", "C'est une urgence s'il y a du sang, s'il vomit toute la journée ou s'il semble très abattu."],
    src: ["cornell", "merck"] },
  { id: "appetit", re: /mang|app[ée]tit|croquette|boude|faim|nourri/i, level: "watch",
    ctx: ["D'après son journal : appétit « moyen » le 1er octobre, puis « peu » les 2 et 3 octobre.", "D'après le poids des 3 derniers mois : de 4,80 à 4,60 kg (−4 %), toujours dans sa zone idéale."],
    p: ["Une baisse d'appétit sur 3 jours mérite un suivi attentif, sans s'alarmer. Chez Doudou, trois pistes simples :"],
    li: ["Ses dents : le Dr Martin a noté un léger tartre en août. Une gêne dans la bouche peut lui faire bouder les croquettes.", "Son eau et sa litière : boit-il comme d'habitude ? Ses selles étaient normales hier soir, c'est rassurant.", "La transition alimentaire s'est terminée le 24 septembre. Elle explique mal une baisse qui commence une semaine plus tard."],
    p2: ["Appelle le Dr Martin s'il ne mange presque plus rien pendant 24 heures, s'il vomit ou s'il se cache. Un chat qui jeûne peut développer un problème de foie (la lipidose hépatique)."],
    src: ["icc", "cornell"] },
  { id: "poids", re: /poids|kilo|\bkg\b|gros|maigr|pes/i, level: "ok",
    ctx: ["D'après ses 14 pesées depuis avril : de 4,42 à 4,80 kg, et 4,60 kg hier."],
    p: ["Son poids est bon : 4,60 kg, dans la zone idéale de 4,4 à 4,8 kg fixée avec le Dr Martin.", "Il a pris un peu de poids au printemps puis l'a reperdu depuis août, comme le conseillait le bilan annuel. Avec la baisse d'appétit actuelle, garde la pesée du dimanche pour vérifier que la courbe se stabilise."],
    src: ["wsava", "cornell"] },
  { id: "vaccin", re: /vaccin|rappel|typhus|coryza|leucose/i, level: "ok",
    ctx: ["D'après son dossier : dernier vaccin typhus + coryza le 25 octobre 2025."],
    p: ["Son rappel typhus + coryza est à faire vers le 25 octobre, dans 3 semaines. Tu peux appeler la clinique dès cette semaine pour réserver.", "Le vaccin leucose, lui, reste valable jusqu'en mars 2027."],
    src: ["aafp", "wsava"] }
];
export const FALLBACK = { id: "fallback", level: "watch",
  ctx: ["Je connais son dossier : poids, vaccins, traitement en cours et 90 jours de journal."],
  p: ["Je n'ai pas assez d'éléments pour te répondre précisément. Peux-tu me dire depuis quand tu as remarqué ce changement, et s'il mange, boit et va à la litière normalement ?", "En cas de doute, un appel à la clinique reste la bonne réponse."],
  src: ["icc"] };
export const SUGGESTIONS = ["Pourquoi mange-t-il moins depuis 3 jours ?", "Son poids est-il normal ?", "Quand refaire son vaccin ?", "Il a vomi deux fois ce matin", "Il va à la litière mais n'arrive pas à faire pipi"];

export const QR_BITS = "1111111001011100110001010101010001101110111011101110110100111111110000010100000010101010111111101010011000110010011000000101000001101110101110000101100010101111100101110100100001101110101010111011011101011001111100011110100011100000010101011100101101100101110110111010011111001011010010011011111110000011000111001000101011101100000100011101000000011110110100010111001100010011011100010000011111111010101010101010101010101010101010101010101010101010111111100000000101010010001101111101110001000000010110101000001100000000100000101100111000011010100110111110100110110111101100010110011100011110010000000010110100111101000010011000100110011001011000001111001011011101000011100110001101101011011100100001111101010101000110011000111001111010101101010000000100000100010100000000010000001010101011001001110010110101001011111001100111101111111010110111001011001011010111010110111010001000111011011101100010010101100101101101100110001111100100101011000010000101000110110110111110000110100100100010010001101010100011010111001000000000010100000100011011110111010111011100000111010010011111100100001111010100111000010111010000000011000101001101100110010110110111001010101100011001011101101001001010011101100100000100110001011101110111110100110111010010000111100110011001111100001100110101000001000000000000010111010111101000110001101111100011110111111111010010111101001110010111110010100001011110110111000001100001111000110001010100010110111011101111110010110000010100000000111000011110110000010001110010101011111010100101100011000011000000001101100111001101110100000101010111101010001100101101010010011110011001100110110001000100011000101010000100001001100101110101011110100101110010000100000101111111111111100000111011011001000111000110001000100110110001111100100101111010001000100000000100100101100110011001010001011100000111010100100011010100110011001010100101001011011110000101011010101010010010101010000111000001001110000111000101100001010111011101100100010100111110010100101101101110111111111111111110111010101111111001101011000101011100010110001100110001011100100011011100100100010011111010101111001011000000010000101011001010011111001010011010101100000100011100000100110001010101000100100010001000100010110001010111011111110000100000100010001011111100001011110100001011111111000011100001010000101101100010011001010100000010101101011110001011101100101001101000100110111111111111011111001101101011111001100011111100000110001000110101001000010110110110011011111111010010010001100000110011011001101011101011111110111100100100111101111010001100001110010100101011110111100010010001000111110101110001011111001011111111100110000111111100011011101010100100010110000001110001110100011000010000101001010111000100011100110101001001010011110100010001111110100001110110011000001010010011100110111001100011010101111101000100110101111110100101100100000101011000001001010101100111101101111011011001100111111111110110111111001100011100110101100100001000010011011010000100010100010010011011100110001001101101101010010011111001010100110100101001011011111010110011010011010110100010010011011111001011000100001100110100100011010000010110100111110011001100000001111000011010101110101001000110011001000100111111001111101111010101101111001100100010110111111110100011011000010100111110111001111010000110010011110110010110100010101110000111001001111000110111100001100011000011011001001100110111000001010001111011010110010011111111001101101111011111110100001111110100110000110101000001010001100010110011011001111101111110001110100000000100100011011101010011111011110111001001111011011011110001110111100111110010001101011100111000001101110101110110001000100011010011010100011010111000111011101110010010111110111111000000011101111111111100000000010101010000010101110011000100011111100111001101110001011111111110001010011110011010111110101110111100110000111011101011010100000100001010011110111001001100011101010111001000100101000110011011101001100001101011110101111111111011101000111010110011111000110111010000110000011010111011000100000110000100100000001110010100101110100101100101100111011110100010010000100101100000010110110101000001000000011101010101111010100011011101110111011101100111100011111110100111101110011011010110100011010110000011010110010011010";
