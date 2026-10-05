import { defineConfig, loadEnv } from "vite";

/* Politique de sécurité du contenu (CSP), posée en <meta> car GitHub Pages ne permet pas d'en-têtes HTTP.
   - scripts : uniquement ceux de l'appli (aucun script en ligne, aucun eval, aucun domaine tiers) ;
   - styles : 'unsafe-inline' reste nécessaire, car le design du prototype pose de nombreux attributs style="".
     Le risque est limité : tout texte affiché passe par esc(), et aucun script en ligne n'est autorisé ;
   - en développement seulement : la connexion WebSocket du rechargement à chaud de Vite. */
function csp(dev, sbUrl) {
  // Supabase (si configuré dans .env.local) : API https et temps réel wss du seul projet de l'appli.
  const sb = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(sbUrl || "") ? [sbUrl, sbUrl.replace("https://", "wss://")] : [];
  const connect = ["'self'", ...sb, ...(dev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : [])];
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connect.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self'"
  ].join("; ");
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
  // Relatif : l'appli fonctionne aussi bien à la racine qu'à l'adresse GitHub Pages /doudou-healthcare/.
  base: "./",
  plugins: [{
    name: "doudou-csp",
    transformIndexHtml: html => html.replace("%CSP%", csp(command === "serve", env.VITE_SUPABASE_URL))
  }],
  server: { port: 5173, strictPort: true, host: "127.0.0.1" },
  test: { environment: "node", include: ["tests/unit/**/*.test.js"] }
  };
});
