/* État de l'interface (écran courant, filtres, saisie en cours, conversation). */
import { TODAY, addDays, key } from "./utils/core.js";
import { store } from "./utils/store.js";

/* ---------- ÉTAT ---------- */
export const S = {
  route: "aujourdhui",
  theme: store.get("theme", "system"),
  calm: store.get("calm", false),
  sync: "ok", lastSync: Date.now() - 2 * 60000, pending: 0,
  empty: false, demoError: false,
  slot: new Date().getHours() >= 15 ? "e" : "m",
  quick: { step: 0, h: null, a: null, s: null },
  period: 30, weightRange: 6,
  filter: "tout", selRec: "r1",
  calMonth: [2026, 9], selDay: key(addDays(TODAY, -1)),
  chat: [], chatBusy: false, chatPinned: false, pendingQ: null,
  loaded: {}, visitQs: ["Faut-il examiner ses dents plus tôt que le contrôle de novembre ?", "Que surveiller à la maison si l'appétit ne revient pas ?"],
  draftPhotos: []
};
