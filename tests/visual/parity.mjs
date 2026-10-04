/* Parité visuelle : compare l'appli (build Vite) au prototype de référence, écran par écran.
   Usage : npm run build && npm run test:visual
   Résultat : test-results/parity/ (captures + images de différences) et un tableau dans la console. */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUT = join(ROOT, "test-results", "parity");
const ROUTES = ["aujourdhui", "journal", "alimentation", "activite", "sante", "dossier", "drdoudou", "finances", "profil", "reglages"];
const SIZES = [{ name: "mobile", width: 390, height: 844 }, { name: "pc", width: 1280, height: 800 }];
const SCHEMES = ["light", "dark"];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml" };

/* Petit serveur de fichiers statiques (lecture seule, limité au dossier donné). */
function serve(dir) {
  return new Promise(resolve => {
    const srv = createServer(async (req, res) => {
      const path = normalize(join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname)));
      if (!path.startsWith(normalize(dir))) { res.writeHead(403).end(); return; }
      const file = path.endsWith("\\") || path.endsWith("/") ? join(path, "index.html") : path;
      try { const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(body); }
      catch { res.writeHead(404).end(); }
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

async function shot(page, url, route) {
  await page.goto(`${url}#${route}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1100); // squelettes du prototype (650 ms) + dessin des graphiques
  return page.screenshot({ fullPage: true, animations: "disabled" });
}

const proto = await serve(join(ROOT, "design"));
const app = await serve(join(ROOT, "dist"));
const protoURL = `http://127.0.0.1:${proto.address().port}/prototype-claude-design.html`;
const appURL = `http://127.0.0.1:${app.address().port}/`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const rows = [];
for (const size of SIZES) for (const scheme of SCHEMES) {
  const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, colorScheme: scheme, reducedMotion: "reduce", deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
  for (const route of ROUTES) {
    const a = PNG.sync.read(await shot(page, protoURL, route));
    const b = PNG.sync.read(await shot(page, appURL, route));
    const w = Math.max(a.width, b.width), h = Math.max(a.height, b.height);
    const pad = img => { if (img.width === w && img.height === h) return img; const p = new PNG({ width: w, height: h }); PNG.bitblt(img, p, 0, 0, img.width, img.height, 0, 0); return p; };
    const A = pad(a), B = pad(b), diff = new PNG({ width: w, height: h });
    const n = pixelmatch(A.data, B.data, diff.data, w, h, { threshold: 0.1 });
    const tag = `${size.name}-${scheme}-${route}`;
    await writeFile(join(OUT, `${tag}-diff.png`), PNG.sync.write(diff));
    if (n) { await writeFile(join(OUT, `${tag}-proto.png`), PNG.sync.write(A)); await writeFile(join(OUT, `${tag}-app.png`), PNG.sync.write(B)); }
    rows.push({ écran: tag, "pixels différents": n, "%": +(n / (w * h) * 100).toFixed(3), "taille proto": `${a.width}×${a.height}`, "taille appli": `${b.width}×${b.height}` });
  }
  if (errors.length) rows.push({ écran: `${size.name}-${scheme} ERREURS`, "pixels différents": errors.length, "%": 0, "taille proto": errors.slice(0, 2).join(" | ").slice(0, 120), "taille appli": "" });
  await ctx.close();
}
await browser.close(); proto.close(); app.close();
console.table(rows);
const bad = rows.filter(r => r["pixels différents"] > 0);
console.log(bad.length ? `${bad.length} écran(s) avec des différences — voir ${OUT}` : "Parité parfaite sur les 40 captures.");
