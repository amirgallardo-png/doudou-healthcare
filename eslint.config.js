import globals from "globals";

/* Contrôle minimal : un nom utilisé sans être défini fait planter un écran (no-undef) ;
   un import inutilisé est signalé pour garder des modules propres. */
export default [
  { ignores: ["dist/**", "node_modules/**", "design/**"] },
  {
    files: ["src/**/*.js", "tests/**/*.js", "tests/**/*.mjs", "tools/**/*.mjs"],
    languageOptions: { ecmaVersion: 2023, sourceType: "module", globals: { ...globals.browser, ...globals.node } },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }],
      "no-import-assign": "error",
      "no-dupe-keys": "error",
      "no-redeclare": "error"
    }
  }
];
