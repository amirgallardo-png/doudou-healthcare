/* Test de fumée : clique les interactions principales sur le build et signale toute erreur JavaScript.
   Usage : npm run build && node tests/visual/smoke.mjs */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const srv = createServer(async (req, res) => {
  const p = normalize(join(DIST, new URL(req.url, "http://x").pathname));
  const file = p.endsWith("\\") || p.endsWith("/") ? join(p, "index.html") : p;
  try { res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => srv.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${srv.address().port}/`;

const browser = await chromium.launch();
const results = [];
async function run(label, viewport, steps) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(URL0 + "#aujourdhui", { waitUntil: "networkidle" });
  for (const [name, fn] of steps) {
    const before = errors.length;
    let ok = true, why = "";
    // Sur mobile, une feuille restée ouverte recouvre l'écran : on la referme comme le ferait l'utilisateur.
    if (!name.startsWith("Visite") && !name.startsWith("Rappel : c")) { await page.keyboard.press("Escape"); await page.waitForTimeout(320); }
    try { await fn(page); } catch (e) { ok = false; why = e.message.split("\n")[0]; }
    if (errors.length > before) { ok = false; why = errors.slice(before).join(" | "); }
    results.push({ appareil: label, action: name, résultat: ok ? "OK" : "ÉCHEC", détail: why.slice(0, 110) });
  }
  await ctx.close();
}
const click = sel => async p => { await p.locator(sel).first().click(); await p.waitForTimeout(450); };
const seen = sel => async p => { await p.locator(sel).first().waitFor({ state: "visible", timeout: 4000 }); };

const common = [
  ["Saisie rapide : humeur", click('[data-act="qpick"][data-k="h"][data-v="3"]')],
  ["Saisie rapide : appétit", click('[data-act="qpick"][data-k="a"][data-v="2"]')],
  ["Saisie rapide : selles (enregistre)", async p => { await click('[data-act="qpick"][data-k="s"][data-v="ok"]')(p); await seen(".toast")(p); }],
  ["Rappel : ouvrir", click('[data-act="reminder"]')],
  ["Rappel : c'est fait", async p => { await click('[data-act="doneReminder"]')(p); }],
  ["Santé : période 7 j", async p => { await p.goto(URL0 + "#sante"); await p.waitForTimeout(900); await click('[data-act="period"][data-v="7"]')(p); }],
  ["Santé : explication poids", click('[data-act="explainInd"][data-k="poids"]')],
  ["Dossier : filtre vaccins", async p => { await p.goto(URL0 + "#dossier"); await p.waitForTimeout(900); await click('[data-act="filter"][data-v="vaccin"]')(p); }],
  ["Dossier : fiche", click('[data-act="rec"]')],
  ["Dossier : résumé de visite", async p => { await click('[data-act="visit"]')(p); await seen(".visit-doc")(p); }],
  ["Visite : ajouter une question", click('[data-act="addQ"]')],
  ["Visite : fermer", click('[data-act="closeVisit"]')],
  ["Journal : jour", async p => { await p.goto(URL0 + "#journal"); await p.waitForTimeout(500); await click('[data-act="day"]')(p); }],
  ["Journal : mois précédent", click('[data-act="calPrev"]')],
  ["Journal : saisie détaillée + enregistrer", async p => { await p.goto(URL0 + "#journal"); await p.waitForTimeout(500); await click('.visit-cta[data-act="form"]')(p);
    for (const [f, v] of [["h", "3"], ["a", "3"], ["s", "ok"]]) await click(`[data-act="fpick"][data-f="${f}"][data-v="${v}"]`)(p);
    await p.locator("#fWeight").fill("4,7"); await p.locator('#dayForm button[type="submit"]').click(); await seen(".toast")(p); }],
  ["Alimentation : noter un repas", async p => { await p.goto(URL0 + "#alimentation"); await p.waitForTimeout(500); await click('[data-act="meal"][data-i="2"]')(p); await click('[data-act="mealSet"]')(p); }],
  ["Finances : ajouter une dépense", async p => { await p.goto(URL0 + "#finances"); await p.waitForTimeout(900); await click('[data-act="addExpense"]')(p);
    await p.locator("#eLabel").fill("Test <b>échappé</b>"); await p.locator("#eAmt").fill("12,5"); await p.locator('#expForm button[type="submit"]').click(); await seen(".toast")(p);
    if (await p.locator("#view b:text('échappé')").count()) throw new Error("texte non échappé"); }],
  ["Profil : QR en grand", async p => { await p.goto(URL0 + "#profil"); await p.waitForTimeout(500); await click('[data-act="bigQR"]')(p); }],
  ["Réglages : thème sombre", async p => { await p.goto(URL0 + "#reglages"); await p.waitForTimeout(500); await click('[data-act="theme"][data-v="dark"]')(p);
    if (await p.evaluate(() => document.documentElement.dataset.theme) !== "dark") throw new Error("thème non appliqué"); }],
  ["Réglages : export", async p => { await click('[data-act="export"]')(p); await seen("pre.json")(p); }],
  ["Réglages : états vides", async p => { await p.goto(URL0 + "#reglages"); await p.waitForTimeout(400); await click('[data-act="demoEmpty"]')(p); await p.goto(URL0 + "#journal"); await p.waitForTimeout(400); await seen(".empty-state")(p); }],
  ["Dr. Doudou : question urgente", async p => { await p.goto(URL0 + "#drdoudou"); await p.waitForTimeout(400);
    await p.locator("#composer-main").fill("Il va à la litière mais n'arrive pas à faire pipi"); await p.keyboard.press("Enter"); await seen(".urgent-band")(p); }]
];
await run("mobile 390", { width: 390, height: 844 }, [...common, ["Menu Plus", async p => { await p.goto(URL0 + "#aujourdhui"); await click("#moreTab")(p); await seen(".more-grid")(p); }]]);
await run("PC 1280", { width: 1280, height: 800 }, [...common, ["Volet Dr. Doudou", async p => { await p.goto(URL0 + "#aujourdhui"); await click("#dockChat")(p); await seen("#composer-pane")(p); }]]);
await browser.close(); srv.close();
console.table(results);
const ko = results.filter(r => r.résultat !== "OK");
console.log(ko.length ? `${ko.length} échec(s)` : `Tout fonctionne (${results.length} actions).`);
process.exitCode = ko.length ? 1 : 0;
