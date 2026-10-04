/* Illustrations SVG : Doudou, Dr. Doudou, œil de statut, états vides, photos, QR. */
import { QR_BITS } from "../demo/fixture.js";

export function catSVG(mood = "content", opts = {}) {
  const eyeL = 44, eyeR = 76, ey = 64;
  let eyes = "";
  if (mood === "endormi") {
    eyes = `<path d="M${eyeL - 8} ${ey} q8 6 16 0M${eyeR - 8} ${ey} q8 6 16 0" stroke="var(--ink)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else if (mood === "malade") {
    eyes = `<path d="M${eyeL - 8} ${ey + 2} q8 -5 16 0M${eyeR - 8} ${ey + 2} q8 -5 16 0" stroke="var(--ink)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  } else {
    const ry = mood === "boudeur" ? 4.5 : 8.5, pr = mood === "curieux" ? 3.6 : (mood === "content" ? 2.6 : 2);
    const one = cx => `<g class="lid"><ellipse cx="${cx}" cy="${ey}" rx="7.5" ry="${ry}" fill="var(--eye)"/><ellipse cx="${cx}" cy="${ey}" rx="${pr}" ry="${Math.max(ry - 2, 2.5)}" fill="var(--ink)"/><circle cx="${cx + 2.5}" cy="${ey - 3}" r="1.6" fill="#FFFFFF"/></g>`;
    eyes = one(eyeL) + one(eyeR);
    if (mood === "boudeur") eyes += `<path d="M${eyeL - 9} ${ey - 6} l17 3M${eyeR + 9} ${ey - 6} l-17 3" stroke="var(--fur-dark)" stroke-width="3" stroke-linecap="round"/>`;
  }
  const mouth = mood === "malade" || mood === "boudeur"
    ? `<path d="M54 87 q6 -3 12 0" stroke="var(--ink)" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : `<path d="M60 80.5v3.5M60 84q-4 4.5-8.5 1.5M60 84q4 4.5 8.5 1.5" stroke="var(--ink)" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  return `<svg class="cat" viewBox="0 0 120 120" role="img" aria-label="${opts.label || "Illustration de Doudou, chat tigré roux"}" ${opts.id ? `id="${opts.id}"` : ""}>
    ${opts.bg ? `<circle cx="60" cy="60" r="60" fill="${opts.bg}"/>` : ""}
    <ellipse cx="60" cy="116" rx="34" ry="18" fill="var(--cream)"/>
    <path d="M20 52 L28 12 L56 34 Z" fill="var(--fur)"/><path d="M29 42 L32 22 L47 34 Z" fill="var(--nose)" opacity=".55"/>
    <path d="M100 52 L92 12 L64 34 Z" fill="var(--fur)"/><path d="M91 42 L88 22 L73 34 Z" fill="var(--nose)" opacity=".55"/>
    <ellipse cx="60" cy="68" rx="44" ry="38" fill="var(--fur)"/>
    <path d="M60 31v12M49 33l3 10M71 33l-3 10M17 64h10M18 73h8M103 64H93M102 73h-8" stroke="var(--fur-dark)" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="60" cy="86" rx="19" ry="13.5" fill="var(--cream)"/>
    ${eyes}
    <path d="M55.5 76.5h9l-4.5 4.5z" fill="var(--nose)" stroke="var(--nose)" stroke-width="1.5" stroke-linejoin="round"/>
    ${mouth}
    <path d="M42 84L14 80M42 88L15 91M78 84l28-4M78 88l27 3" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round" opacity=".45"/>
    ${mood === "malade" ? `<ellipse cx="38" cy="80" rx="6" ry="3.5" fill="var(--nose)" opacity=".4"/><ellipse cx="82" cy="80" rx="6" ry="3.5" fill="var(--nose)" opacity=".4"/>` : ""}
  </svg>`;
}
export function drSVG(cls = "av") {
  return `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="60" fill="var(--surface-tint)"/>
    <g transform="translate(14 16) scale(.77)">${catSVG("content").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>
    <path d="M38 98c0 10 10 16 22 16s22-6 22-16" stroke="var(--soin)" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="92" cy="92" r="16" fill="var(--soin)"/><path d="M92 84v16M84 92h16" stroke="var(--on-soin)" stroke-width="4" stroke-linecap="round"/></svg>`;
}
export function eyeStatus(level) {
  /* l'œil de chat : pupille ronde = tout va bien ; fendue = à surveiller ; très fine = consulter */
  const col = { ok: "var(--ok)", watch: "var(--miel)", soon: "var(--roux)", urgent: "var(--urgent)" }[level];
  const rx = { ok: 7, watch: 3.2, soon: 1.8, urgent: 1.4 }[level];
  return `<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M2 17C6 8 11 5 17 5s11 3 15 12c-4 9-9 12-15 12S6 26 2 17z" fill="${col}"/><ellipse cx="17" cy="17" rx="${rx}" ry="9" fill="var(--ink)"/><circle cx="20" cy="13" r="1.8" fill="#FFFFFF"/></svg>`;
}
export function emptyIll(kind) {
  const base = `<svg class="ill" viewBox="0 0 132 110" aria-hidden="true"><ellipse cx="66" cy="100" rx="52" ry="8" fill="var(--surface-tint)"/>`;
  const items = {
    journal: `<rect x="34" y="22" width="64" height="72" rx="10" fill="var(--surface-tint)"/><path d="M46 44h40M46 56h28M46 68h34" stroke="var(--line)" stroke-width="5" stroke-linecap="round"/><g transform="translate(78 54) scale(.4)">${catSVG("curieux").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`,
    dossier: `<rect x="30" y="18" width="58" height="76" rx="10" fill="var(--surface-tint)"/><path d="M59 40v20M49 50h20" stroke="var(--soin)" stroke-width="6" stroke-linecap="round"/><g transform="translate(74 52) scale(.42)">${catSVG("endormi").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`,
    finances: `<circle cx="52" cy="58" r="26" fill="var(--surface-tint)"/><text x="52" y="67" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="26" fill="var(--soin)">€</text><g transform="translate(70 46) scale(.46)">${catSVG("content").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`,
    today: `<g transform="translate(30 6) scale(.62)">${catSVG("curieux").replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`
  };
  return base + (items[kind] || items.today) + `</svg>`;
}
export function photoSVG(kind) {
  const scenes = {
    sleep: `<rect width="100" height="100" fill="var(--miel-tint)"/><rect y="62" width="100" height="38" fill="var(--surface-tint)"/><ellipse cx="50" cy="66" rx="30" ry="14" fill="var(--fur)"/><circle cx="72" cy="58" r="12" fill="var(--fur)"/><path d="M64 50l3-8 5 6M76 48l4-6 2 8" fill="var(--fur)"/><path d="M68 58q3 2 6 0M76 58q3 2 6 0" stroke="var(--ink)" stroke-width="1.6" fill="none"/><path d="M22 66q-8 6 2 10" stroke="var(--fur-dark)" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="84" cy="22" r="9" fill="var(--miel)"/>`,
    window: `<rect width="100" height="100" fill="var(--surface-tint)"/><rect x="18" y="12" width="64" height="56" rx="4" fill="var(--bg)" stroke="var(--soin)" stroke-width="3"/><path d="M50 12v56M18 40h64" stroke="var(--soin)" stroke-width="3"/><rect y="68" width="100" height="32" fill="var(--line)"/><ellipse cx="50" cy="72" rx="16" ry="12" fill="var(--fur)"/><circle cx="50" cy="56" r="11" fill="var(--fur)"/><path d="M41 49l1-9 6 5M59 49l-1-9-6 5" fill="var(--fur)"/>`,
    bowl: `<rect width="100" height="100" fill="var(--roux-tint)"/><path d="M20 58h60a30 22 0 0 1-60 0z" fill="var(--soin)"/><ellipse cx="50" cy="58" rx="30" ry="6" fill="var(--soin-strong)"/><circle cx="42" cy="56" r="3" fill="var(--miel)"/><circle cx="52" cy="55" r="3" fill="var(--miel)"/><circle cx="58" cy="57" r="3" fill="var(--miel)"/>`
  };
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Photo illustrée">${scenes[kind] || scenes.sleep}</svg>`;
}
export function qrSVG() {
  const n = Math.round(Math.sqrt(QR_BITS.length));
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (QR_BITS[y * n + x] === "1") d += `M${x} ${y}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR code de la carte de secours de Doudou"><path d="${d}" fill="#13302D"/></svg>`;
}
