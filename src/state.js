/* État de l'interface (écran courant, filtres, saisie en cours, conversation). Aucune donnée du chat ici. */
import { TODAY, key } from "./utils/core.js";
import { store } from "./utils/store.js";

export const S = {
  ready: false,                       // base locale ouverte
  route: "aujourdhui",
  theme: store.get("theme", "system"),
  calm: store.get("calm", false),
  sync: "local", lastSync: null, pending: 0,
  slot: new Date().getHours() >= 15 ? "e" : "m",
  quick: { step: 0, h: null, a: null, s: null },
  period: 30, weightRange: 6,
  filter: "tout", selRec: null,
  calMonth: [TODAY.getFullYear(), TODAY.getMonth()], selDay: key(TODAY),
  chat: [], chatBusy: false, chatPinned: false,
  visitQs: store.get("visitQs", []),
  draftPhotos: [],
  importReport: null
};
