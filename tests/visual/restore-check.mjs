/* Restauration réelle d'un fichier de sauvegarde dans une appli vierge (mode local, sans serveur).
   N'affiche que des comptages. Usage : npm run build (sans Supabase) puis node tests/visual/restore-check.mjs <fichier.json> */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const FILE = process.argv[2];
const expected = JSON.parse(readFileSync(FILE, "utf8")).tables;
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const srv = createServer(async (q, r) => { const p = normalize(join(DIST, new URL(q.url, "http://x").pathname)); const f = p.endsWith("\\") || p.endsWith("/") ? join(p, "index.html") : p; let b; try { b = await readFile(f); } catch { r.writeHead(404).end(); return; } r.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" }).end(b); });
await new Promise(r => srv.listen(0, "127.0.0.1", r));
const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", e => errors.push(e.message));
await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
const chooser = page.waitForEvent("filechooser");
await page.click('[data-act="importFile"]'); await (await chooser).setFiles(FILE);
await page.locator("text=Import terminé").waitFor({ timeout: 15000 });
const counts = await page.evaluate(() => new Promise(res => { const req = indexedDB.open("doudou-healthcare"); req.onsuccess = async () => { const db = req.result, out = {}; for (const t of db.objectStoreNames) { if (t === "outbox" || t === "meta") continue; out[t] = await new Promise(r2 => { const q = db.transaction(t).objectStore(t).count(); q.onsuccess = () => r2(q.result); }); } res(out); }; }));
await page.keyboard.press("Escape"); await page.evaluate(() => { location.hash = "profil"; }); await page.waitForTimeout(800);
const photoShown = await page.locator("#view .id-photo img").count();
await b.close(); srv.close();
let ok = true;
for (const [t, list] of Object.entries(expected)) { const n = counts[t] ?? 0; const good = n === list.length; ok &&= good; if (list.length || n) console.log(`${good ? "✓" : "✗"} ${t}: ${n} / ${list.length}`); }
console.log(`${photoShown ? "✓" : "✗"} photo du profil affichée après restauration`);
console.log(errors.length ? "Erreurs : " + errors.join(" | ") : "Aucune erreur.");
console.log(ok && photoShown && !errors.length ? "RESTAURATION RÉELLE OK" : "RESTAURATION INCOMPLÈTE");
