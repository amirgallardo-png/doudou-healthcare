/* Point d'entrée de Doudou Healthcare.
   Ordre des styles = ordre du prototype (la cascade CSS en dépend). */
import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/shell.css";
import "./styles/components.css";
import "./styles/screens.css";
import "./styles/desktop.css";
import "./styles/motion-print.css";

/* Chaque module d'écran s'inscrit dans le registre SCREENS en étant importé. */
import "./screens/today.js";
import "./screens/health.js";
import "./screens/records.js";
import "./screens/journal.js";
import "./screens/food.js";
import "./screens/activity.js";
import "./screens/finances.js";
import "./screens/profile.js";
import "./screens/settings.js";
import "./screens/drdoudou.js";
import "./events.js";

import { S } from "./state.js";
import { ROUTES, applyTheme, buildSideNav, renderSync, render, go } from "./ui/shell.js";

/* ---------- Démarrage (identique au prototype) ---------- */
applyTheme();
buildSideNav();
renderSync();
const h0 = (location.hash || "").replace("#", "");
S.route = ROUTES[h0] ? h0 : "aujourdhui";
render(true);
window.addEventListener("hashchange", () => { const h = location.hash.replace("#", ""); if (ROUTES[h] && h !== S.route) go(h); });
