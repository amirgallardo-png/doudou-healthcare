# Doudou Healthcare

Le suivi de santé de mon chat : journal du matin et du soir, dossier médical, repas, poids, activité, dépenses,
carte de secours. Appli web installable (PWA) qui marche **hors ligne**, synchronisée entre le PC et le téléphone.

- **Appli en ligne** : https://doudou-healthcare.github.io/
- **Code** : https://github.com/doudou-healthcare/doudou-healthcare.github.io (publication automatique)
- **Plan et décisions** : [`PLAN.md`](PLAN.md)

---

## 1. Utiliser l'appli

| Où | Comment |
|---|---|
| **PC** | Raccourci **Bureau › Dev App › Doudou Healthcare**, ou le lanceur « Doudou Healthcare » dans ODIN |
| **Téléphone (Android)** | Chrome › `doudou-healthcare.github.io` › menu **⋮** › **Ajouter à l'écran d'accueil** › Installer (attendre ~1 min) |
| **Connexion** | E-mail + mot de passe (une fois par appareil). Mot de passe oublié : lien sur l'écran de connexion |

- Chaque saisie est **enregistrée tout de suite sur l'appareil**, puis envoyée au serveur dès que le réseau est là.
  L'indicateur en haut à droite dit la vérité : « À jour », « N saisies en attente » ou « Hors ligne ».
- **Repas** : décris une fois la journée type (Alimentation › Créer le programme) ; elle est reprise chaque jour.
  Un jour différent : touche le repas › « Changer ce repas » ou « Ajouter un extra ».
- **Poids** : Santé › « Ajouter une pesée », ou le champ « Poids actuel » dans le profil.
- **Activité et GPS** : saisie manuelle. Tractive n'offre **aucun accès officiel** pour les développeurs ; les
  intégrations existantes sont non officielles, donc rien n'est branché (décision de prudence).
- **Dr. Doudou** (assistant IA) : arrive à l'étape 4 ; en attendant, l'écran affiche les vrais numéros d'urgence du profil.

## 2. Développer (première fois)

1. Installer **Node.js** (version 24 ou plus) depuis https://nodejs.org.
2. Ouvrir PowerShell dans le dossier du projet, puis :
   ```powershell
   npm install          # une seule fois
   npm run dev          # lance l'appli sur http://127.0.0.1:5173
   ```
3. Tests :
   ```powershell
   npm test                                   # tests automatiques (données, synchronisation, règles)
   npx vite build; node tests/visual/smoke.mjs  # parcours complet (58 actions, téléphone + PC)
   ```
   Le parcours complet se lance en mode « sans serveur » :
   `$env:VITE_SUPABASE_URL=''; $env:VITE_SUPABASE_ANON_KEY=''; npx vite build; node tests/visual/smoke.mjs`

## 3. Publier une nouvelle version

Il suffit d'envoyer le code sur GitHub (`git push`). GitHub lance alors les tests, construit l'appli et la publie
sur https://doudou-healthcare.github.io/ (2 à 3 minutes). **Si un test échoue, rien n'est publié.**
Sur les appareils, un bandeau « Nouvelle version disponible » propose la mise à jour.

## 4. Configuration (fichier `.env.local`, privé)

Ce fichier n'est **jamais** envoyé sur GitHub ni au Relais Gemini.

| Nom | Ce que c'est | Où le trouver |
|---|---|---|
| `VITE_SUPABASE_URL` | Adresse du projet Supabase | Supabase › projet `doudou-healthcare` › Settings › API |
| `VITE_SUPABASE_ANON_KEY` | Clé **publique** (faite pour être dans l'appli) | Supabase › Settings › API Keys › *Publishable key* |
| `SUPABASE_SERVICE_KEY` | Clé **secrète**, pour la sauvegarde du PC uniquement | Supabase › Settings › API Keys › *Secret keys* |

Pour la publication, l'adresse et la clé publique sont aussi des **variables** du dépôt GitHub
(Settings › Secrets and variables › Actions › Variables).

## 5. Sauvegardes

Trois niveaux : la copie sur chaque appareil, le serveur Supabase (Francfort), et une **copie quotidienne sur le PC**.

**Activer la sauvegarde quotidienne (une fois)**
1. Supabase › projet `doudou-healthcare` › **Settings › API Keys** › *Secret keys* › copier la clé (`sb_secret_…`).
2. Ouvrir `.env.local` avec le Bloc-notes, coller la clé après `SUPABASE_SERVICE_KEY=`, enregistrer.
3. Dans PowerShell, dossier du projet : `node tools/backup-daily.mjs` (premier essai), puis
   `powershell -File tools\installer-sauvegarde.ps1` (planifie la tâche « Doudou - Sauvegarde », chaque soir à 21:30).

- Fichiers : `Documents\Sauvegardes Doudou\doudou-sauvegarde-AAAA-MM-JJ.json` (photos comprises), **30 derniers gardés**.
- Journal : `Documents\Sauvegardes Doudou\journal-sauvegardes.txt`.
- L'appel quotidien empêche aussi la mise en pause du projet Supabase gratuit (pause après 7 jours sans activité).

**Exporter à la main** : Réglages › « Exporter toutes les données ».

## 6. Restaurer

Réglages › **Importer une sauvegarde** › choisir un fichier `doudou-sauvegarde-….json` (export manuel ou copie
quotidienne). La restauration remplace les données de l'appareil puis les renvoie au serveur.
« **Tout effacer sur cet appareil** » demande d'écrire EFFACER et propose d'exporter avant.

## 7. Sécurité et vie privée

- Domaine propre (`doudou-healthcare.github.io`) : stockage du navigateur **isolé** des autres applis.
- Serveur en Europe (Francfort) ; **sécurité par ligne** : chaque donnée appartient à son compte ; aucune lecture
  anonyme ; écritures uniquement via une fonction qui garde la version la plus récente ; photos privées.
- Inscriptions **fermées** (un seul compte). Règle de contenu (CSP) : aucun script extérieur, connexions limitées
  au seul projet Supabase. Tout texte affiché est échappé.
- Aucune clé secrète dans le code ni dans git ; données personnelles (`donnees-reelles/`) exclues de git et du Relais.

## 8. Organisation du code

| Dossier | Rôle |
|---|---|
| `src/screens/` | Les 10 écrans + connexion (design Claude Design repris à l'identique) |
| `src/data/` | Base sur l'appareil (IndexedDB), import, sauvegarde, photos |
| `src/sync/` | Synchronisation (moteur « local d'abord », Supabase, chef d'orchestre) |
| `src/domain/` | Calculs et textes (tendances, verdicts, repas) |
| `src/ui/`, `src/styles/` | Coquille, graphiques, formulaires, styles |
| `supabase/migrations/` | Structure et sécurité du serveur |
| `tests/` | Tests automatiques (`unit/`) et parcours dans un vrai navigateur (`visual/`) |
| `tools/` | Sauvegarde quotidienne, icônes, mise en place |
| `design/` | Prototype de référence (ne pas modifier) |

## 9. Coûts

Tout est gratuit à ce jour : GitHub Pages, Supabase (offre gratuite), aucune IA appelée. Dr. Doudou (étape 4)
utilisera une clé IA avec plafond de dépense, ou un mode « prompt à copier » sans coût.
