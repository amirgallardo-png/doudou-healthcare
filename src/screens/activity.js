/* Écran Activité et GPS. */
import { ACTIVITY } from "../demo/fixture.js";
import { SCREENS } from "../screens/registry.js";
import { lvl } from "../screens/today.js";
import { chartBox } from "../ui/charts.js";
import { ico } from "../utils/core.js";

export function mapSVG() {
  return `<svg viewBox="0 0 340 220" role="img" aria-label="Carte stylisée : Doudou est dans le jardin, à 18 mètres de la maison.">
    <rect width="340" height="220" fill="var(--surface-tint)"/>
    <path d="M0 150H340M120 0V220M260 0V220" stroke="var(--surface)" stroke-width="16"/>
    <rect x="8" y="10" width="100" height="60" rx="8" fill="var(--line)"/><rect x="8" y="80" width="100" height="60" rx="8" fill="var(--line)"/>
    <rect x="272" y="10" width="62" height="130" rx="8" fill="var(--line)"/><rect x="8" y="162" width="100" height="52" rx="8" fill="var(--line)"/><rect x="132" y="162" width="116" height="52" rx="8" fill="var(--line)"/><rect x="272" y="162" width="62" height="52" rx="8" fill="var(--line)"/>
    <rect x="132" y="10" width="116" height="128" rx="10" fill="var(--ok-tint)"/>
    <circle cx="150" cy="30" r="9" fill="var(--ok)" opacity=".35"/><circle cx="232" cy="34" r="11" fill="var(--ok)" opacity=".35"/><circle cx="226" cy="118" r="8" fill="var(--ok)" opacity=".35"/>
    <rect x="140" y="92" width="44" height="38" rx="6" fill="var(--surface)" stroke="var(--soin)" stroke-width="2"/><path d="M140 96l22-16 22 16" fill="none" stroke="var(--soin)" stroke-width="2" stroke-linejoin="round"/>
    <text x="162" y="118" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="10" fill="var(--soin)">maison</text>
    <circle cx="170" cy="96" r="70" fill="none" stroke="var(--soin)" stroke-width="1.5" stroke-dasharray="5 5"/>
    <path d="M168 100C176 80 190 74 200 66S214 48 206 40 186 44 196 58" fill="none" stroke="var(--roux)" stroke-width="2.5" stroke-dasharray="1 6" stroke-linecap="round"/>
    <circle class="ping" cx="196" cy="58" r="10" fill="var(--roux)"/><circle cx="196" cy="58" r="8" fill="var(--roux)" stroke="var(--surface)" stroke-width="3"/>
    <text x="214" y="190" font-family="IBM Plex Mono,monospace" font-size="10" fill="var(--ink-muted)" opacity="0">.</text>
  </svg>`;
}
SCREENS.activite = () => {
  const pct = ACTIVITY.active / ACTIVITY.goal, C = 2 * Math.PI * 54;
  const main = `<div class="grid-2"><div class="col">
  <section class="card"><div class="ring-wrap"><div class="ring" role="img" aria-label="${ACTIVITY.active} minutes d'activité sur un objectif de ${ACTIVITY.goal}"><svg viewBox="0 0 132 132"><circle cx="66" cy="66" r="54" fill="none" stroke="var(--surface-tint)" stroke-width="14"/><circle cx="66" cy="66" r="54" fill="none" stroke="var(--soin)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 66 66)"/></svg><div class="r-in"><b>${ACTIVITY.active}</b><span class="small muted">/ ${ACTIVITY.goal} min</span></div></div>
    <div style="min-width:0"><h2 style="font-size:22px;line-height:28px">Activité du jour</h2><p class="small muted" style="margin-top:4px">Encore 7 minutes pour son objectif. Une petite séance de jeu ce soir ?</p></div></div>
    <div class="well" style="margin-top:16px"><div>${ico("yarn", "sm")}<b>${ACTIVITY.play} min</b><span class="small muted">jeu · ${ACTIVITY.sessions} séances</span></div><div>${ico("zzz", "sm")}<b>${ACTIVITY.sleep}</b><span class="small muted">sommeil</span></div><div>${ico("paw", "sm")}<b>${ACTIVITY.dist}</b><span class="small muted">parcourus</span></div></div></section>
  <section class="card"><div class="card-h"><h2>Bien-être</h2>${lvl("watch", "Moins joueur")}</div><p>Doudou est calme et dort un peu plus que d'habitude. Son activité a baissé de 20 % en 3 jours, en même temps que son appétit. À suivre ensemble.</p>${chartBox("activity", 170)}</section>
  </div><div class="col">
  <section class="card" style="padding:16px"><div class="card-h" style="padding:4px 8px 0"><h2>Où est Doudou ?</h2><span class="small muted">Traceur du collier</span></div>
    <div class="map">${mapSVG()}<div class="map-card"><span class="r-ico roux" style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--roux-tint);color:var(--roux-ink)">${ico("pin")}</span><span class="r-main"><b>${ACTIVITY.where}</b><br><span class="small muted">${ACTIVITY.seen} · dans la zone maison</span></span><span class="batt">${ico("tag", "sm")}${ACTIVITY.batt} %</span></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;padding:0 8px 8px"><button class="btn sm secondary" data-act="ring">${ico("sound", "sm")}Faire sonner le collier</button><button class="btn sm ghost" data-act="zone">${ico("pin", "sm")}Zone maison : 70 m</button></div></section>
  </div></div>`;
  const aside = `<div class="explain"><h4>${ico("info", "sm")}Pourquoi suivre l'activité ?</h4><p class="small">Un chat qui joue moins et dort plus peut simplement profiter du soleil. Associé à une baisse d'appétit, c'est un signe à noter pour le vétérinaire.</p></div>
    <div class="list"><div class="row"><span class="r-ico">${ico("clock")}</span><span class="r-main"><span class="r-title">Dernière sortie</span><br><span class="r-sub">10 h 12 → 11 h 05, jardin</span></span></div><div class="row"><span class="r-ico">${ico("zzz")}</span><span class="r-main"><span class="r-title">Sieste la plus longue</span><br><span class="r-sub">3 h 40, sur le canapé</span></span></div></div>`;
  return { main, aside, asideTitle: "Repères" };
};
