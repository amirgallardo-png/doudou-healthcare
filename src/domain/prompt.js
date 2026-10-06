/* Mode « prompt à copier » (gratuit) : la question + le dossier + les fiches vérifiées, prêts pour les IA d'Amir.
   Fonctions pures, testées (tests/unit/prompt.test.js). La recherche de fiches est la même que côté serveur. */
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’`]/g, "'");
/* Même logique que la fonction serveur : fiches dont les mots-clés apparaissent dans la question. */
export function retrieveLocal(question, fiches, max = 3) {
  const q = " " + norm(question) + " ";
  return fiches.map(f => ({ f, score: (f.mots || []).reduce((s, m) => s + (q.includes(norm(m)) ? (norm(m).length > 6 ? 2 : 1) : 0), 0) }))
    .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, max).map(x => x.f);
}
export function promptFor(question, dossier, fiches = []) {
  const useful = retrieveLocal(question, fiches);
  return `Tu es un assistant d'information sur la santé des chats. Règles : pas de diagnostic, pas de médicament ni de dose ; appuie-toi sur des sources vétérinaires reconnues (International Cat Care, Cornell Feline Health Center, AAFP, WSAVA, Merck Veterinary Manual) et cite-les ; indique un niveau : rien d'inquiétant / à surveiller / consulter bientôt / URGENCE ; rappelle quand consulter un vétérinaire.

DOSSIER :
${dossier}
${useful.length ? `\nFICHES DE RÉFÉRENCE :\n${useful.map(f => `- ${f.titre} (${f.sources?.publisher || ""}, ${f.url}) : ${f.resume}`).join("\n")}\n` : ""}
QUESTION :
${question}`;
}
