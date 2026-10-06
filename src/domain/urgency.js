/* Règles d'urgence de Dr. Doudou — décidées par le CODE, jamais laissées à l'IA (liste validée par Amir le 2026-10-06).
   Le niveau final affiché = le plus grave entre ces règles et l'avis du modèle.
   Fonction pure : question (texte libre) + contexte (sexe du chat, journal, pesées) → { level, rules }. */

export const ORDER = ["ok", "watch", "soon", "urgent"];
export const graver = (a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a);

/* minuscules, sans accents, apostrophes unifiées : « Il n’arrive pas à faire pipi » → « il n'arrive pas a faire pipi » */
export const normalize = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’`]/g, "'").replace(/\s+/g, " ");

const R = (id, level, label, test) => ({ id, level, label, test });
const has = (t, re) => re.test(t);

export const RULES = [
  R("urinaire", "urgent", "Mâle qui force à la litière ou n'urine pas : risque de blocage urinaire", (t, c) =>
    has(t, /(force|pousse|forcer|pousser)[^.]{0,40}(litiere|bac|pipi|urin)|(n'?arrive|parvient) (pas|plus) a (uriner|faire (son )?pipi)|ne (fait|peut) (plus|pas) (de )?pipi|n'urine (plus|pas)|goutte a goutte|rien ne sort|(pipi|urine)[^.]{0,25}(rien|goutte|bloque)|bloque[^.]{0,20}(urin|vessie)/) && c.sex !== "female"),
  R("urinaire-femelle", "soon", "Difficulté à uriner (femelle) : consulter rapidement", (t, c) =>
    c.sex === "female" && has(t, /(force|pousse)[^.]{0,40}(litiere|bac|pipi|urin)|(n'?arrive|parvient) (pas|plus) a (uriner|faire (son )?pipi)|ne (fait|peut) (plus|pas) (de )?pipi|n'urine (plus|pas)/)),
  R("respiration", "urgent", "Difficulté à respirer", t =>
    has(t, /du mal a respirer|respire (mal|tres vite|difficilement|par la bouche|bruyamment)|bouche ouverte|halete|haletant|suffoqu|etouff|n'?arrive (pas|plus) a respirer|manque d'air/)),
  R("toxique", "urgent", "Ingestion possible d'un toxique", t =>
    has(t, /\blys\b|\blis\b|lilium|paracetamol|doliprane|efferalgan|dafalgan|ibuprofene|advil|nurofen|aspirine|permethrine|(pipette|antiparasitaire|anti-puces?|collier)[^.]{0,20}(pour |de |du )?chien|raticide|mort.aux.rats|antigel|antigivre|medicament (humain|pour humain|de (ma|mon|la|sa))|(mange|avale|leche|croque|machouill)[^.]{0,40}(medicament|cachet|pilule|javel|produit menager|poison)|empoisonn|intoxi/)),
  R("traumatisme", "urgent", "Traumatisme (chute, accident, choc, morsure)", t =>
    has(t, /tombe (du|de la|d'un|par)|chute|accident|renverse|voiture|percute|ecrase|(s'est|a ete) (fait )?(mordu|griffe gravement)|morsure|blesse grave|coince (la|une|sa) patte/)),
  R("sang", "urgent", "Sang dans les vomissements, les urines ou les selles, ou saignement important", t =>
    has(t, /\bsang\b|sanglant|saign|hemorrag/)),
  R("neuro", "urgent", "Convulsions, perte de connaissance ou paralysie", t =>
    has(t, /convuls|crise d'?epilep|epilep|perte de connaissance|evanoui|inconscient|paralys|ne (peut|arrive) plus (marcher|se lever|bouger les pattes)|pattes arriere[^.]{0,30}(ne |plus|traine|bouge)/)),
  R("lethargie", "urgent", "Léthargie marquée (ne réagit plus, ne se lève plus)", t =>
    has(t, /ne (bouge|reagit|se leve) plus|ne reagit pas|amorphe|letharg|tres abattu|inerte|comme mort/)),
  R("vomi-repete", "urgent", "Vomissements répétés", t =>
    has(t, /vomi/) && has(t, /plusieurs fois|[3-9] fois|trois fois|quatre fois|cinq fois|sans arret|toute la (journee|nuit|matinee)|a repetition|repete|n'arrete pas|ne boit plus/)),
  R("jeune", "soon", "Ne mange plus depuis 24 h ou plus (risque pour le foie)", (t, c) =>
    (has(t, /ne mange (plus|rien|pas)|n'a (rien|pas) mange|refuse de manger|rien mange|plus rien mange|ne touche (plus|pas) (a )?sa gamelle/) && has(t, /24 ?h|depuis hier|un jour|1 jour|deux jours|2 jours|trois jours|3 jours|plusieurs jours|depuis (ce matin|hier|avant-hier|\d)/)) || c.lowAppetiteDays >= 2),
  R("diarrhee", "soon", "Diarrhée depuis plus de 48 h", t =>
    has(t, /diarrh/) && has(t, /2 jours|deux jours|3 jours|trois jours|plusieurs jours|une semaine|48 ?h|depuis (lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d+ jours)/)),
  R("soif", "soon", "Boit ou urine beaucoup plus que d'habitude", t =>
    has(t, /boit (beaucoup|enormement|plus|sans arret|tout le temps)|tres soif|toujours soif|urine (beaucoup|enormement|plus)|fait (beaucoup|plein) (de |plus de )?pipi/)),
  R("perte-poids", "soon", "Perte de poids rapide (plus de 10 % en un mois)", (t, c) => c.weightLossPct >= 10),
  R("vomi-journal", "soon", "Vomissement noté deux jours de suite dans le journal", (t, c) => c.vomitStreak >= 2)
];

/* Contexte tiré des données (calculé par l'appli) : { sex, lowAppetiteDays, weightLossPct, vomitStreak } */
export function checkUrgency(question, context = {}) {
  const t = normalize(question);
  const hits = RULES.filter(r => { try { return r.test(t, context); } catch { return false; } });
  const level = hits.reduce((l, r) => graver(l, r.level), "ok");
  return { level: hits.length ? level : null, rules: hits.map(r => ({ id: r.id, level: r.level, label: r.label })) };
}
