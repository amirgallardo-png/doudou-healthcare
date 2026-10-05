/* Mise en place de Supabase via l'API officielle de gestion (l'outil en ligne de commande est bloqué par Windows ici).
   Usage :  node tools/supabase-setup.mjs          → crée/complète le projet (rejouable sans risque)
            node tools/supabase-setup.mjs --lock   → ferme les inscriptions (après la 1re connexion d'Amir)
   Lit SUPABASE_ACCESS_TOKEN dans .env.local (collé par Amir). N'AFFICHE JAMAIS aucune clé ni mot de passe. */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const ENV = join(ROOT, ".env.local");
const NAME = "doudou-healthcare", REGION = "eu-central-1";   // Francfort
const LOCK = process.argv.includes("--lock");

/* ---------- .env.local (lu et réécrit ligne par ligne, valeurs jamais affichées) ---------- */
const readEnv = () => Object.fromEntries((existsSync(ENV) ? readFileSync(ENV, "utf8") : "").split(/\r?\n/).filter(l => /^[A-Z0-9_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
function setEnv(key, value) {
  const lines = (existsSync(ENV) ? readFileSync(ENV, "utf8") : "").split(/\r?\n/);
  const i = lines.findIndex(l => l.startsWith(key + "="));
  if (i >= 0) lines[i] = `${key}=${value}`; else lines.push(`${key}=${value}`);
  writeFileSync(ENV, lines.join("\n").replace(/\n*$/, "\n"), "utf8");
}
const env = readEnv();
const TOKEN = env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN || !TOKEN.startsWith("sbp_")) { console.error("Jeton absent : colle-le dans .env.local après SUPABASE_ACCESS_TOKEN= (il commence par sbp_)."); process.exit(1); }
const step = msg => console.log("• " + msg);

/* ---------- appel de l'API de gestion ---------- */
async function api(method, path, body) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch("https://api.supabase.com" + path, { method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    if (r.status === 429 && attempt < 5) { await new Promise(res => setTimeout(res, 2000 * (attempt + 1))); continue; }
    const text = await r.text();
    if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 300).replace(/(sbp_|eyJ)[\w.-]+/g, "[masqué]")}`);
    return text ? JSON.parse(text) : null;
  }
}

/* ---------- textes de l'e-mail (code à 6 chiffres, en français) ---------- */
const mail = `<h2>Ton code Doudou Healthcare</h2><p>Saisis ce code dans l'appli pour te connecter :</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p><p>Il est valable une heure. Si tu n'as rien demandé, ignore cet e-mail.</p>`;

async function main() {
  if (LOCK) {
    if (!env.SUPABASE_PROJECT_REF) throw new Error("Projet inconnu : lance d'abord le script sans --lock.");
    await api("PATCH", `/v1/projects/${env.SUPABASE_PROJECT_REF}/config/auth`, { disable_signup: true });
    step("Inscriptions fermées : seul le compte déjà créé peut se connecter.");
    return;
  }
  // 1. Organisation
  const orgs = await api("GET", "/v1/organizations");
  if (!orgs.length) throw new Error("Aucune organisation sur ce compte Supabase : crée-en une dans le tableau de bord.");
  const org = orgs.find(o => o.id === env.SUPABASE_ORG_ID) || orgs[0];
  if (orgs.length > 1 && !env.SUPABASE_ORG_ID) step(`Plusieurs organisations : j'utilise « ${org.name} ».`);
  // 2. Projet (réutilisé s'il existe déjà)
  let ref = env.SUPABASE_PROJECT_REF;
  const projects = await api("GET", "/v1/projects");
  const existing = projects.find(p => p.id === ref || p.ref === ref || p.name === NAME);
  if (existing) { ref = existing.ref || existing.id; step(`Projet existant retrouvé (${existing.region}).`); }
  else {
    const pass = randomBytes(24).toString("base64url");
    setEnv("SUPABASE_DB_PASSWORD", pass);   // gardé seulement dans .env.local
    const p = await api("POST", "/v1/projects", { name: NAME, organization_id: org.id, region: REGION, db_pass: pass });
    ref = p.ref || p.id;
    step(`Projet « ${NAME} » créé à Francfort (${REGION}).`);
  }
  setEnv("SUPABASE_PROJECT_REF", ref);
  // 3. Attente qu'il soit prêt
  for (let i = 0; ; i++) {
    const p = await api("GET", `/v1/projects/${ref}`);
    if (p.status === "ACTIVE_HEALTHY") break;
    if (p.status === "INACTIVE" || p.status === "PAUSED") throw new Error("Le projet est en pause : réactive-le dans le tableau de bord Supabase, puis relance.");
    if (i > 60) throw new Error("Le projet met trop de temps à démarrer : relance le script dans quelques minutes.");
    if (i === 0) step("Démarrage du projet (1 à 3 minutes)…");
    await new Promise(res => setTimeout(res, 10000));
  }
  step("Projet prêt.");
  // 4. Structure de la base (rejouable)
  const sql = readFileSync(join(ROOT, "supabase", "migrations", "0001_sync.sql"), "utf8");
  await api("POST", `/v1/projects/${ref}/database/query`, { query: sql });
  step("Base, règles de sécurité par ligne, temps réel et espace photos privé appliqués.");
  // 5. Connexion par code à 6 chiffres
  await api("PATCH", `/v1/projects/${ref}/config/auth`, {
    external_email_enabled: true, mailer_otp_length: 6, mailer_otp_exp: 3600,
    mailer_subjects_magic_link: "Ton code Doudou Healthcare", mailer_templates_magic_link_content: mail,
    mailer_subjects_confirmation: "Ton code Doudou Healthcare", mailer_templates_confirmation_content: mail,
    site_url: "http://127.0.0.1:5173"
  });
  step("E-mail de connexion configuré (code à 6 chiffres, en français).");
  // 6. Clé PUBLIQUE de l'appli (la clé secrète n'est ni lue ni écrite)
  const keys = await api("GET", `/v1/projects/${ref}/api-keys`);
  const anon = keys.find(k => k.name === "anon") || keys.find(k => k.type === "publishable");
  if (!anon?.api_key) throw new Error("Clé publique introuvable dans la réponse de Supabase.");
  setEnv("VITE_SUPABASE_URL", `https://${ref}.supabase.co`);
  setEnv("VITE_SUPABASE_ANON_KEY", anon.api_key);
  step("Adresse et clé publique écrites dans .env.local (non affichées).");
  console.log("\nTerminé. Relance l'appli (npm run dev) : l'écran de connexion apparaît.");
}
main().catch(e => { console.error("Échec : " + e.message); process.exit(1); });
