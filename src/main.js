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
import { $, ROUTES, applyTheme, buildSideNav, renderSync, render, go } from "./ui/shell.js";
import { initRepo, onChange, pendingCount } from "./data/repo.js";
import { weightPoints } from "./ui/charts.js";
import { refreshToday, ico } from "./utils/core.js";

/* ---------- Démarrage ---------- */
applyTheme();
buildSideNav();
renderSync();
const h0 = (location.hash || "").replace("#", "");
S.route = ROUTES[h0] ? h0 : "aujourdhui";
render(true);                                   // squelette pendant l'ouverture de la base
window.addEventListener("hashchange", () => { const h = location.hash.replace("#", ""); if (ROUTES[h] && h !== S.route) go(h); });

async function updatePending() { try { S.pending = await pendingCount(); } catch { /* sans effet */ } }

try {
  await initRepo();
  await updatePending();
  // Pesées rares (une par an) : la vue « Tout » est plus parlante que « 6 mois ».
  if (weightPoints(6).pts.length < 2) S.weightRange = 0;
  S.ready = true;
  render(true);
  onChange(() => { updatePending(); });
} catch (err) {
  console.error(err);
  $("#view").innerHTML = `<div class="view"><div class="empty-state"><h3>Impossible d'ouvrir les données</h3><p>Le navigateur refuse le stockage local (navigation privée ou espace plein ?). Ouvre l'appli dans une fenêtre normale. Détail : ${String(err.message || err).replace(/[<>&]/g, "")}</p><button class="btn primary" id="retryOpen">${ico("refresh")}Réessayer</button></div></div>`;
  $("#retryOpen").addEventListener("click", () => location.reload());
}

/* Changement de jour (appli restée ouverte après minuit) */
document.addEventListener("visibilitychange", () => { if (!document.hidden && refreshToday() && S.ready) render(false); });
setInterval(() => { if (refreshToday() && S.ready) render(false); }, 60000);
