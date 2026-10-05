/* Audit des zones tactiles (≥ 44 × 44 px recommandé) sur chaque écran, en taille téléphone. Build local requis.
   Usage : node tests/visual/tap-audit.mjs */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const srv = createServer(async (q, r) => { const p = normalize(join(DIST, new URL(q.url, "http://x").pathname)); const f = p.endsWith("\\") || p.endsWith("/") ? join(p, "index.html") : p; let body; try { body = await readFile(f); } catch { r.writeHead(404).end(); return; } r.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" }).end(body); });
await new Promise(r => srv.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${srv.address().port}/`;
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
page.on("pageerror", e => console.log("Erreur :", e.message));
page.on("console", m => { if (m.type() === "error") console.log("Console :", m.text().slice(0, 160)); });
await page.goto(URL0, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
if (!(await page.locator('[data-act="profileForm"]').count())) { console.log("Écran :", (await page.innerText("#view")).slice(0, 300)); process.exit(1); }
// profil minimal pour afficher les écrans remplis
await page.click('[data-act="profileForm"]'); await page.fill('#sheet [name="name"]', "Test"); await page.click('#sheet form[data-form="profile"] button[type="submit"]'); await page.waitForTimeout(500);
const out = {};
for (const r of ["aujourdhui", "journal", "alimentation", "activite", "sante", "dossier", "drdoudou", "finances", "profil", "reglages"]) {
  await page.evaluate(h => { location.hash = h; }, r); await page.waitForTimeout(450);
  out[r] = await page.evaluate(() => [...document.querySelectorAll("#view button, #view a, #view input, #view select, #view textarea, .tabbar button, .topbar button")]
    .filter(e => e.offsetParent).map(e => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), t: (e.getAttribute("aria-label") || e.textContent || e.name || e.className).trim().replace(/\s+/g, " ").slice(0, 30), c: e.className } })
    .filter(x => x.h < 44 || x.w < 44));
}
await b.close(); srv.close();
const summary = {};
for (const [r, list] of Object.entries(out)) for (const x of list) { const k = `${x.c.split(" ")[0] || "?"} (${x.w}×${x.h})`; summary[k] = summary[k] || new Set(); summary[k].add(r); }
for (const [k, s] of Object.entries(summary)) console.log(k.padEnd(34), [...s].join(", "));
