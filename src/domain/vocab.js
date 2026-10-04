/* Vocabulaire de l'appli : échelles du journal, types d'actes, catégories de dépenses, niveaux d'urgence. */

export const HUMEUR = { 3: { w: "Joueur", i: "smile" }, 2: { w: "Calme", i: "meh" }, 1: { w: "Grognon", i: "frown" } };
export const APPETIT = { 3: { w: "Bien", i: "bfull" }, 2: { w: "Moyen", i: "bhalf" }, 1: { w: "Peu", i: "bempty" } };
export const SELLES = { ok: { w: "Normales", i: "litter" }, molles: { w: "Molles", i: "soft" }, non: { w: "Pas vues", i: "question" } };
export const TYPES = {
  consult: { w: "Consultation", pl: "Consultations", i: "stetho", c: "t-consult" },
  vaccin: { w: "Vaccin", pl: "Vaccins", i: "syringe", c: "t-vaccin" },
  traitement: { w: "Traitement", pl: "Traitements", i: "pipette", c: "t-traitement" },
  analyse: { w: "Analyse", pl: "Analyses", i: "flask", c: "t-analyse" },
  ordonnance: { w: "Ordonnance", pl: "Ordonnances", i: "file", c: "t-ordonnance" }
};
export const CATS = { Consultations: "var(--soin)", Analyses: "var(--miel)", "Médicaments": "var(--roux)", Vaccins: "var(--ok)", Urgences: "var(--urgent)" };
export const LEVELS = {
  ok: { w: "Rien d'inquiétant", i: "checkc", c: "ok" },
  watch: { w: "À surveiller", i: "eye", c: "watch" },
  soon: { w: "Consulter bientôt", i: "calgo", c: "soon" },
  urgent: { w: "URGENCE vétérinaire", i: "cross", c: "urgent" }
};
