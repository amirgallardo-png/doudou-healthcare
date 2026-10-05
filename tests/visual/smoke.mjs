/* Parcours complet sur une appli vierge (build), comme un vrai premier lancement. Signale toute erreur JavaScript,
   tout débordement horizontal et toute action qui échoue.
   Usage : npm run build && node tests/visual/smoke.mjs [chemin/vers/sauvegarde.json] [--shots]
   Par défaut : sauvegarde FICTIVE tests/fixtures/legacy-sample.json. --shots : captures dans test-results/screens/. */
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const DIST = join(ROOT, "dist");
const BACKUP = resolve(process.argv.slice(2).find(a => !a.startsWith("--")) || join(ROOT, "tests/fixtures/legacy-sample.json"));
const SHOTS = process.argv.includes("--shots");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
const srv = createServer(async (req, res) => {
  const p = normalize(join(DIST, new URL(req.url, "http://x").pathname));
  const file = p.endsWith("\\") || p.endsWith("/") ? join(p, "index.html") : p;
  try { res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" }).end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => srv.listen(0, "127.0.0.1", r));
const URL0 = `http://127.0.0.1:${srv.address().port}/`;
const ROUTES = ["aujourdhui", "journal", "alimentation", "activite", "sante", "dossier", "drdoudou", "finances", "profil", "reglages"];
if (SHOTS) await mkdir(join(ROOT, "test-results", "screens"), { recursive: true });

const browser = await chromium.launch();
const results = [];
async function run(label, viewport) {
  const ctx = await browser.newContext({ viewport, reducedMotion: "reduce", acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const step = async (name, fn) => {
    const before = errors.length; let ok = true, why = "";
    try { await fn(); } catch (e) { ok = false; why = e.message.split("\n")[0]; }
    if (errors.length > before) { ok = false; why = errors.slice(before).join(" | "); }
    results.push({ appareil: label, action: name, résultat: ok ? "OK" : "ÉCHEC", détail: why.slice(0, 120) });
  };
  const click = async sel => { await page.locator(sel).first().click(); await page.waitForTimeout(350); };
  const seen = (sel, t = 4000) => page.locator(sel).first().waitFor({ state: "visible", timeout: t });
  const esc = async () => { await page.keyboard.press("Escape"); await page.waitForTimeout(320); };
  const fill = (sel, v) => page.locator(sel).first().fill(v);
  const sheet = (s = "") => (viewport.width < 1024 ? (s.startsWith("text=") ? "#sheet >> " : "#sheet ") : "") + s;
  const route = async r => { await page.evaluate(h => { location.hash = h; }, r); await page.waitForTimeout(450); };

  await page.goto(URL0, { waitUntil: "networkidle" });
  await step("Premier lancement : accueil", async () => { await seen("text=Bienvenue !"); });
  await step("Import de la sauvegarde", async () => {
    const chooser = page.waitForEvent("filechooser");
    await click('[data-act="importFile"]');
    await (await chooser).setFiles(BACKUP);
    await seen("text=Import terminé", 15000);
    await esc();
  });
  await step("Dossier : fiches importées", async () => { await route("dossier"); if (await page.locator(".rec").count() < 2) throw new Error("moins de 2 fiches"); });
  await step("Programme de repas : créer avec un nouvel aliment", async () => {
    await route("alimentation"); await click('[data-act="planEdit"]'); await click('[data-act="planItem"][data-id=""]');
    await page.locator(sheet('select[name="product"]')).selectOption("__new");
    await fill(sheet('[name="newName"]'), "Croquettes Test Saumon"); await fill(sheet('[name="time"]'), "07:30"); await fill(sheet('[name="qty"]'), "25");
    await click(sheet('form[data-form="planitem"] button[type="submit"]'));
    await seen(sheet("text=Croquettes Test Saumon")); await esc();
    await seen("#view .meal");
  });
  await step("Repas : noter « la moitié »", async () => { await click("#view .meal"); await click(sheet('[data-act="mealSet"][data-v="0.5"]')); await seen("#view .meal >> text=la moitié"); });
  await step("Repas : changer pour aujourd'hui", async () => { await click("#view .meal"); await click(sheet('[data-act="mealChange"]')); await fill(sheet('[name="qty"]'), "30"); await click(sheet('form[data-form="mealday"] button[type="submit"]')); await seen("#view .meal >> text=changé aujourd'hui"); });
  await step("Repas : ajouter un extra", async () => { await click('[data-act="extraAdd"]'); await fill(sheet('[name="qty"]'), "5"); await click(sheet('form[data-form="mealday"] button[type="submit"]')); await seen("#view .meal >> text=extra"); });
  await step("Saisie rapide (3 touches)", async () => { await route("aujourdhui"); await click('[data-act="qpick"][data-k="h"][data-v="3"]'); await click('[data-act="qpick"][data-k="a"][data-v="2"]'); await click('[data-act="qpick"][data-k="s"][data-v="ok"]'); await seen(".toast"); await page.waitForTimeout(500); await seen("#quick .main-pad.done"); });
  await step("Saisie détaillée avec poids", async () => { await route("journal"); await esc(); await click('.visit-cta[data-act="form"]');
    for (const [f, v] of [["h", "3"], ["a", "3"], ["s", "ok"]]) await click(`[data-act="fpick"][data-f="${f}"][data-v="${v}"]`);
    await fill("#fWeight", "5,95"); await fill("#fNote", "Test <b>échappé</b>"); await click('#dayForm button[type="submit"]'); await seen(".toast");
    await route("sante"); if (!(await page.locator("#view").innerText()).includes("5,95")) throw new Error("poids absent de Santé"); });
  await step("Texte saisi bien échappé", async () => { await route("journal"); if (await page.locator("#view b:text('échappé'), #pane b:text('échappé')").count()) throw new Error("texte interprété comme du HTML"); });
  await step("Soin avec rappel → visible sur Aujourd'hui", async () => { await route("dossier"); await click('[data-act="addRec"]'); await click(sheet('[data-act="choose"][data-v="vaccin"]'));
    await fill(sheet('[name="title"]'), "Typhus coryza test"); await fill(sheet('[name="next"]'), "2099-01-15"); await fill(sheet('[name="cost"]'), "55");
    await click(sheet('form[data-form="record"] button[type="submit"]')); await route("aujourdhui"); await seen("text=Rappel Typhus coryza test"); });
  await step("Dépense créée par le soin + dépense manuelle", async () => { await route("finances"); await seen("#view >> text=Typhus coryza test"); await click('[data-act="addExpense"]');
    await fill(sheet('[name="label"]'), "Litière"); await fill(sheet('[name="amount"]'), "12,5"); await click(sheet('form[data-form="expense"] button[type="submit"]')); await seen("#view >> text=Litière"); });
  await step("Profil : zone de poids + contact + allergie", async () => { await route("profil"); await click('#view [data-act="profileForm"]');
    await fill(sheet('[name="tmin"]'), "5,5"); await fill(sheet('[name="tmax"]'), "6,5"); await click(sheet('form[data-form="profile"] button[type="submit"]'));
    await click('[data-act="contactForm"][data-id=""]'); await page.locator(sheet('select[name="kind"]')).selectOption("urgence"); await fill(sheet('[name="name"]'), "Garde test"); await fill(sheet('[name="phone"]'), "+32 2 000 00 00"); await click(sheet('form[data-form="contact"] button[type="submit"]'));
    await click('[data-act="allergyForm"][data-id=""]'); await fill(sheet('[name="name"]'), "poulet"); await click(sheet('form[data-form="allergy"] button[type="submit"]'));
    await seen("#view >> text=Poulet"); await seen("#view >> text=Garde test"); });
  await step("Activité notée", async () => { await route("activite"); await click('#view [data-act="activityForm"]'); await fill(sheet('[name="minutes"]'), "40"); await fill(sheet('[name="goal"]'), "45"); await click(sheet('form[data-form="activity"] button[type="submit"]')); await seen("#view .ring >> text=40"); });
  await step("Dr. Doudou : numéros d'urgence réels, pas de fausse réponse", async () => { await route("drdoudou"); await seen("#view >> text=Garde test"); if (await page.locator("#composer-main:not([disabled])").count()) throw new Error("champ de question actif"); });
  for (const r of ROUTES) await step(`Pas de débordement : ${r}`, async () => {
    await route(r); await page.waitForTimeout(250);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (o > 1) {
      const who = await page.evaluate(() => { const vw = document.documentElement.clientWidth; return [...document.querySelectorAll("#view *")].filter(el => el.getBoundingClientRect().right > vw + 1 && !el.closest(".chips")).slice(0, 3).map(el => el.tagName + "." + (typeof el.className === "string" ? el.className : "")).join(", "); });
      throw new Error(`déborde de ${o} px : ${who}`);
    }
    if (SHOTS) await page.screenshot({ path: join(ROOT, "test-results", "screens", `${label.replace(/\W+/g, "-")}-${r}.png`), fullPage: true });
  });
  await step("Export (téléchargement JSON)", async () => { await route("reglages"); const dl = page.waitForEvent("download"); await click('#view [data-act="export"]'); const d = await dl; if (!/doudou-sauvegarde-\d{4}-\d{2}-\d{2}\.json/.test(d.suggestedFilename())) throw new Error(d.suggestedFilename()); });
  await step("Données gardées après rechargement", async () => { await page.reload({ waitUntil: "networkidle" }); await route("finances"); await seen("#view >> text=Litière"); });
  await step("Tout effacer (EFFACER)", async () => { await route("reglages"); await click('[data-act="wipeAsk"]'); await fill(sheet('[name="word"]'), "EFFACER"); await click(sheet('form[data-form="wipe"] button[type="submit"]')); await seen("text=Bienvenue !"); });
  await ctx.close();
}
await run("mobile 360", { width: 360, height: 800 });
await run("PC 1280", { width: 1280, height: 800 });
await browser.close(); srv.close();
console.table(results);
const ko = results.filter(r => r.résultat !== "OK");
console.log(ko.length ? `${ko.length} échec(s)` : `Tout fonctionne (${results.length} actions).`);
process.exitCode = ko.length ? 1 : 0;
