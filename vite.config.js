import { defineConfig } from "vite";

/* Politique de sécurité du contenu (CSP), posée en <meta> car GitHub Pages ne permet pas d'en-têtes HTTP.
   - scripts : uniquement ceux de l'appli (aucun script en ligne, aucun eval, aucun domaine tiers) ;
   - styles : 'unsafe-inline' reste nécessaire, car le design du prototype pose de nombreux attributs style="".
     Le risque est limité : tout texte affiché passe par esc(), et aucun script en ligne n'est autorisé ;
   - en développement seulement : la connexion WebSocket du rechargement à chaud de Vite. */
function csp(dev) {
  const connect = ["'self'", ...(dev ? ["ws://localhost:*", "ws://127.0.0.1:*"] : [])];
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

export default defineConfig(({ command }) => ({
  // Relatif : l'appli fonctionne aussi bien à la racine qu'à l'adresse GitHub Pages /doudou-healthcare/.
  base: "./",
  plugins: [{
    name: "doudou-csp",
    transformIndexHtml: html => html.replace("%CSP%", csp(command === "serve"))
  }],
  server: { port: 5173, strictPort: true, host: "127.0.0.1" },
  test: { environment: "node", include: ["tests/unit/**/*.test.js"] }
}));
