/* Génère les icônes PNG de l'appli (PWA) à partir des SVG de public/icons, sans service extérieur.
   Usage : node tools/make-icons.mjs */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../public/icons/", import.meta.url));
const jobs = [
  ["icon.svg", 192, "icon-192.png"], ["icon.svg", 512, "icon-512.png"],
  ["maskable.svg", 192, "maskable-192.png"], ["maskable.svg", 512, "maskable-512.png"],
  ["maskable.svg", 180, "apple-touch-icon.png"], ["icon.svg", 32, "favicon-32.png"]
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [src, size, out] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  const svg = readFileSync(dir + src, "utf8").replace("<svg ", `<svg width="${size}" height="${size}" `);
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: dir + out, omitBackground: true });
}
await browser.close();
console.log("Icônes générées dans public/icons/");
