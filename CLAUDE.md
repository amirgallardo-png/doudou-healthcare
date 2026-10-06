# CLAUDE.md — Doudou Healthcare

Appli de suivi de santé du chat d'Amir (Madara dans les données ; l'appli garde le nom « Doudou Healthcare »).
Amir est Product Manager, ne lit pas le code : réponses en français, expliquer avant d'agir, faire valider.

## Repères
- Plan, décisions (D1–D10) et choix techniques : `PLAN.md` (§6.1 pour la synchro et l'hébergement).
- En ligne : https://doudou-healthcare.github.io/ — dépôt `doudou-healthcare/doudou-healthcare.github.io`
  (organisation dédiée = domaine dédié = stockage isolé des autres applis d'Amir). `git push` sur `main` publie.
- Supabase : projet `doudou-healthcare` (réf. `abfoogqwovxtqmdkqkpm`, Francfort), table unique `public.rows`
  + RLS, fonction `push_rows()`, bucket privé `photos`. Inscriptions fermées. Connexion e-mail + mot de passe.
- Récaps de session : `Obsidian Vault\Notes Claude Code\AAAA-MM-JJ - Doudou Healthcare*.md`,
  fiche `AI/Projets-Code/Doudou Healthcare` (lié_à exact).

## Règles du projet (non négociables)
1. **Secrets** : jamais dans le code, git, logs, captures. `.env.local` seulement (ignoré par git et par le Relais).
   Ne jamais lire/afficher une clé secrète ; Amir les colle lui-même. La clé publique (`sb_publishable_…`) est OK.
2. **Aucune donnée inventée** dans l'appli ; les données fictives du prototype vivent dans `tests/fixtures/`.
3. **Santé** : l'IA ne diagnostique pas, ne prescrit pas ; urgences détectées par des **règles codées et testées**
   (Phase 4, liste à faire valider par Amir) ; « ne remplace pas un vétérinaire ».
4. **Design** : `design/prototype-claude-design.html` est la référence visuelle ; ne pas modifier le design PC.
5. Données personnelles : `donnees-reelles/` jamais dans git ni copié au Relais. Jamais de données Holcim.
6. Simple plutôt que complexe ; points d'arrêt validés par Amir.

## Architecture (local d'abord)
- Écrans = fonctions de rendu synchrones qui lisent un cache mémoire (`src/data/repo.js`).
- Toute écriture passe par `commit()` : ligne + entrée `outbox` dans une même transaction Dexie.
- Clés métier (journal, notes du jour, pesées, activité) → identifiants stables (`stableId`) : pas de doublon entre appareils.
- Synchro : `src/sync/engine.js` (envoi → réception → pierres tombales → photos), « le plus récent gagne »
  par ligne, heures du serveur normalisées. `controller.js` : déclencheurs. `supabase.js` : accès réseau.
- Tout texte affiché passe par `esc()`. CSP stricte (scripts locaux uniquement, `connect-src` limité au projet).

## Commandes
- `npm run dev` · `npm test` (51+ tests) · `npx eslint src tests tools`
- Parcours complet : build sans Supabase puis `node tests/visual/smoke.mjs` (58 actions, 360 px + PC).
- Audit des zones tactiles : `node tests/visual/tap-audit.mjs`. Icônes : `node tools/make-icons.mjs`.
- Sauvegarde : `node tools/backup-daily.mjs` (clé de service requise) ; tâche « Doudou - Sauvegarde » (21:30).

## Pièges connus
- Windows : l'outil Supabase en ligne de commande est bloqué ; utiliser le tableau de bord (Claude in Chrome)
  ou l'API de gestion. Le service e-mail gratuit de Supabase n'envoie que des liens (modèles non modifiables).
- Dexie : un index unique compte aussi les lignes supprimées en douceur (voir `applyRemote`).
- Après un transfert de dépôt GitHub, la 1re publication peut rester bloquée en file : relancer par un commit.
- Le service worker met l'appli en cache : vérifier une nouvelle version après le bandeau « Nouvelle version ».

## Reste à faire
Voir la dernière note `Notes Claude Code/…Doudou Healthcare…` (cases à cocher) : installation Android,
Phase 4 (Dr. Doudou), rappels par notification, activation de la sauvegarde quotidienne.
