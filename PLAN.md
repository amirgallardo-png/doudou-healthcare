# Doudou Healthcare — Plan de construction (Phase 0)

> Rédigé le 2026-10-04. Statut : **validé par Amir le 2026-10-04** (D1 à D10 selon les recommandations ; D8 précisé en §7.1).
> D4 clos le 2026-10-05 : ancien historique abandonné, saisies réelles à partir de la visite vétérinaire.
> Ce document ne contient aucune donnée personnelle (le dépôt pourra devenir public pour GitHub Pages).

---

## 1. Résumé

Transformer le prototype Claude Design (un fichier HTML de 183 Ko, tout simulé) en vraie application :
design identique, vraies données, synchronisation PC ↔ Android, IA sourcée et sûre, installable (PWA).

Principe directeur : **local d'abord**. Chaque saisie est écrite immédiatement sur l'appareil (IndexedDB),
puis envoyée au serveur (Supabase, Francfort) quand le réseau le permet. L'appli marche hors ligne.

---

## 2. Ce que la Phase 0 a constaté

### 2.1 Prototype dans le navigateur (Playwright)

| Test | Résultat |
|---|---|
| 390 × 844 et 360 × 800, clair et sombre, les 10 écrans | 9 écrans sans débordement |
| **Journal à 360 et 390 px** | **Débordement réel** : calendrier en 7 colonnes fixes de 44 px + espaces = trop large ; la colonne du **dimanche est coupée** (comme « aujourd'hui » tombe un dimanche, il est invisible). Corrigé en Phase 1 (`minmax(0,1fr)` + hauteur 44 px) |
| Capture `rendu-mobile.png` coupée à droite | Défaut **de la capture** (prise plus large que l'écran), pas du design : l'écran Aujourd'hui s'affiche entièrement à 390 px |
| 1280 × 800 | Pas de débordement. Colonne centrale un peu serrée à 1280 (la référence a été prise à 1360) : conforme au prototype, on n'y touche pas |
| Console | Seule erreur : `favicon.ico` absent (réglé par le manifest PWA) |
| Polices | Chargées depuis Google Fonts → à servir en local (Phase 1) |
| Dépendances externes | Aucune autre (pas de librairie, graphiques en SVG maison) |

### 2.2 Vraies données (`donnees-reelles/doudou-backup-2026-06-11.json`)

| Table | Nombre | Remarque |
|---|---|---|
| profile | 1 | **Le nom du chat dans le profil n'est pas « Doudou »** → à clarifier. Photo JPEG 4000 × 3000 (3,3 Mo, c'est elle qui fait le poids du fichier) |
| consultations | 1 | avec coût → peut aussi créer une dépense |
| treatments | 1 | vermifuge actif, prochaine dose déjà passée |
| checkins | 2 | échelles **différentes** du prototype (appétit/activité sur 5, humeur en texte) |
| weights | 6 | une pesée par an au même jour ; **une pesée datée dans le futur** par rapport à la sauvegarde (probable faute de frappe d'année) |
| food | 5 | repas Matin / Midi / Soir |
| events | 1 | vomissement → fusionné dans le journal |
| activity | 1 | minutes, sommeil, zone, note |
| settings | 1 | thème |
| vaccins, analyses, prescriptions, allergies, finances | 0 | états vides du prototype |

Conséquence : avec si peu de données, l'appli réelle affichera surtout les **états vides** et des courbes
courtes. Les textes « intelligents » du prototype (« Doudou se repose », « 5 bonnes journées sur 7 »…) doivent être
**calculés** à partir des données, avec un repli honnête quand il n'y en a pas assez.

### 2.3 Ancien code (Drive) — idées reprises, pas le code

- Écritures atomiques (transaction Dexie : tout ou rien).
- Migration de version silencieuse.
- Export JSON complet + sauvegarde automatique (l'ancienne V1 a **déjà perdu 10 000 entrées** stockées en localStorage).
- Abandonné : build « un seul fichier HTML » (incompatible avec PWA + synchronisation), OPFS (remplacé par la base en ligne + sauvegarde PC).

---

## 3. Inventaire du prototype

### 3.1 Écrans (10) — route `#hash`

| Écran | Contenu | Données réelles nécessaires |
|---|---|---|
| Aujourd'hui | héros chat + statut (œil), saisie rapide 3 touches matin/soir, alerte douce, rappels, 4 chiffres (poids, activité, mangé, eau) | journal, poids, repas, rappels, activité |
| Journal | calendrier coloré, détail du jour, saisie détaillée (humeur, appétit, selles, vomi, eau, poids, note, photos) | journal, photos |
| Alimentation et poids | repas du jour, croquettes 7 j, produits, transition alimentaire, poids | repas, produits, transitions, poids |
| Activité et GPS | anneau d'activité, bien-être, **carte du traceur** | activité (manuelle) ; GPS : voir Phase 6 |
| Santé | verdict, 3 indicateurs, courbe de poids + zone idéale, tendances 7/30/90 j | poids, journal, zone cible du vétérinaire |
| Dossier médical | allergie, préparer la visite, calendrier vaccins 12 mois, filtres, chronologie, fiche | actes médicaux, allergies |
| Dr. Doudou | conversation, niveaux d'urgence, sources, bandeau urgence + appel | IA (Phase 4), historique |
| Finances | total annuel, graphe mensuel payé/prévu, catégories, prochaines dépenses, historique | dépenses |
| Profil | carte d'identité, allergies, carte de secours QR, contacts d'urgence | profil, contacts |
| Réglages et données | synchro, appareils connectés, sauvegardes, export, thème, animations | état de synchro réel, sessions |

### 3.2 Composants à conserver

Coquille (barre latérale ≥ 1024 px, barre basse mobile, volet de détail à droite sur PC, feuille glissante sur mobile),
toasts, squelettes de chargement, états vides illustrés, graphiques SVG mesurés au conteneur avec info-bulles,
illustrations du chat (5 humeurs), avatar Dr. Doudou, œil de statut, saisie « coussinets », résumé de visite
imprimable, carte de secours QR, thème clair/sombre/système, « réduire les animations » + `prefers-reduced-motion`,
fonction `esc()` (échappement) partout.

### 3.3 Données fictives à supprimer (aucune ne doit rester dans l'appli réelle)

`CAT` (Dr Martin, clinique, adresse, téléphones, puce, contacts, allergie poulet, zone 4,4–4,8 kg), `WEIGHTS`, `LOGS`
(90 jours générés), `RECORDS`, `REMINDERS`, `EXPENSES`, `PLANNED`, `FOOD`, `ACTIVITY`, `DEVICES`, `ANSWERS`/`FALLBACK`,
`QR_BITS` (QR figé), `TODAY` figé au 4 octobre 2026, textes narratifs en dur (héros, alerte, « Sa semaine »,
explications de la Santé, résumé de visite), section « Démo du prototype » et « Simuler l'état » des Réglages.

Elles seront gardées **uniquement** dans un fichier de démonstration de test (`tests/fixtures/demo.js`), jamais
inclus dans l'appli publiée, pour comparer les captures avec le prototype en Phase 1.

### 3.4 Fonctions simulées à brancher

| Simulé dans le prototype | Devient |
|---|---|
| `store` (localStorage) | repository IndexedDB (Dexie) |
| `markPending` / `setTimeout` | vraie file d'envoi + état réseau |
| `findAnswer` / `ANSWERS` | fonction serveur Supabase + règles d'urgence codées |
| `qrSVG` (QR figé) | QR généré en local à partir du vrai profil |
| export JSON partiel | export/import complet versionné |
| `DEVICES` | sessions de connexion réelles |
| « Me le rappeler », « C'est fait », « Plus tard » | rappels réels + notifications (Phase 5) |
| boutons « Ajouter un soin » (« disponible dans la version finale ») | formulaires d'ajout réels |
| « Faire sonner le collier », zone 70 m | retirés ou désactivés honnêtement (Phase 6) |

---

## 4. Architecture

```
 Téléphone Android (PWA)            PC (PWA / navigateur)
 ┌──────────────────────┐          ┌──────────────────────┐
 │ Écrans (design)      │          │ Écrans (design)      │
 │ repository.js        │          │ repository.js        │
 │ IndexedDB (Dexie)  ◄─┼─ local ─►│ IndexedDB (Dexie)    │
 │ outbox (file)        │          │ outbox (file)        │
 └─────────┬────────────┘          └──────────┬───────────┘
           │ HTTPS (clé publique + session)    │
           ▼                                   ▼
 ┌──────────────────────────────────────────────────────────┐
 │ Supabase — région UE (Francfort)                         │
 │  Auth (code par e-mail)  ·  Postgres + RLS  ·  Storage   │
 │  Realtime  ·  Edge Function « dr-doudou » (clé IA ici)   │
 └──────────────────────────────────────────────────────────┘
           ▲                                   │
           │ sauvegarde quotidienne JSON       ▼
 ┌─────────┴────────────┐          ┌──────────────────────┐
 │ PC : Planificateur   │          │ Modèle IA (Gemini    │
 │ de tâches (30 jours) │          │ Flash ou Claude)     │
 └──────────────────────┘          └──────────────────────┘
 Code publié sur GitHub Pages (fichiers statiques, aucune donnée).
```

### 4.1 Arborescence prévue

```
doudou-healthcare/
├─ index.html              coquille + sprite d'icônes
├─ public/                 polices locales, icônes PWA, manifest, page hors ligne
├─ src/
│  ├─ main.js              démarrage
│  ├─ styles/              tokens.css (variables inchangées), base, components, screens, print
│  ├─ ui/                  shell (routeur, feuille, volet, toasts, synchro), icons, illustrations, charts, qr
│  ├─ screens/             today, journal, food, activity, health, records, drdoudou, finances, profile, settings
│  ├─ domain/              calculs (tendances, verdicts, zone de poids, rappels), urgency-rules.js
│  ├─ data/                db.js (Dexie + migrations), repository.js, import-legacy.js, export.js, photos.js
│  ├─ sync/                supabase-client.js, outbox.js, sync-engine.js, status.js
│  └─ utils/               dates, format, esc
├─ supabase/               migrations SQL (tables + RLS), functions/dr-doudou, seed des sources
├─ tests/                  Vitest (données, synchro, règles) + Playwright (captures, mobile)
├─ tools/                  sauvegarde quotidienne (Node), restauration
├─ design/                 prototype de référence (non modifié)
└─ donnees-reelles/        IGNORÉ PAR GIT (données personnelles)
```

### 4.2 Choix techniques (simples)

| Besoin | Choix | Pourquoi |
|---|---|---|
| Outil de build | Vite, JavaScript modules ES, **sans framework** | garde le HTML/CSS du prototype tel quel |
| Base locale | Dexie (IndexedDB) | transactions atomiques, grand volume, hors ligne |
| Serveur | Supabase (offre gratuite) | base Postgres + connexion + fichiers + fonction IA au même endroit, région UE |
| Tests | Vitest + Playwright | logique et captures d'écran |
| QR | petite librairie locale (ex. `qrcode-generator`, ~20 Ko, sans réseau) | génération sur l'appareil |
| Hébergement | GitHub Pages + GitHub Actions | gratuit, HTTPS, comme Orbe |

---

## 5. Modèle de données

Colonnes communes à **toutes** les tables synchronisées :
`id uuid` · `user_id uuid` (propriétaire, RLS) · `created_at` · `updated_at` (heure de la modification, sert au
« le plus récent gagne ») · `deleted_at` (suppression douce) · `server_at` (posé par le serveur, sert à savoir quoi
redescendre).

| Table | Champs principaux | Source dans l'ancien JSON |
|---|---|---|
| `cats` | name, breed, sex, sterilized, birth_date, coat, chip_id, photo_path, target_weight_min/max, notes | profile |
| `contacts` | cat_id, kind (vet / garde / proche), name, clinic, phone, email, address, notes | profile.vet* |
| `allergies` | cat_id, name, kind (aliment / médicament / autre), detail, since | allergies (vide) ; profile.allergies (texte) |
| `records` (dossier unifié) | cat_id, type (consult / vaccin / traitement / analyse / ordonnance), date, title, vet, details (jsonb : motif, diagnostic, lot, résultat, posologie…), status, next_date, cost, explain | consultations, vaccins, treatments, analyses, prescriptions |
| `reminders` | cat_id, date, title, sub, icon, record_id, done_at, snoozed_to | treatments.nextDose, vaccins.nextDate |
| `journal_entries` | cat_id, date, moment (m / e), humeur 1–3, appetit 1–3, selles, vomi, eau, **unique (cat_id, date, moment)** | checkins, events |
| `day_notes` | cat_id, date, note, **unique (cat_id, date)** | checkins.notes, events.desc |
| `weights` | cat_id, date, moment, kg, context, **unique (cat_id, date, moment)** | weights |
| `meals` | cat_id, date, time, product_id, kind, qty_g, eaten (0–1) | food |
| `food_products` | cat_id, name, kind (croquettes / pâtée), daily_g, notes, active | food.brand |
| `food_transitions` | cat_id, from_product, to_product, start, end | — |
| `activities` | cat_id, date, minutes, play_min, sleep_h, distance_m, zone, notes, source (manuel) | activity |
| `expenses` | cat_id, date, label, category, amount, reimbursed, planned (oui/non), record_id | finances (vide), consultations.cout |
| `photos` | cat_id, date, storage_path, width, height, taken_at | profile.photo |
| `chat_messages` | conversation_id, role, text, level, sources (ids), context_line, error | — |
| `settings` | key, value (thème, animations) — **local seulement** | settings |
| `sources` *(serveur, lecture seule)* | id, publisher, name, base_url, verified_at, active | liste blanche validée |
| `knowledge` *(serveur, lecture seule)* | id, topic, keywords, summary (nos mots), source_id, url, verified_at | rédigé en Phase 4 |
| `ai_usage` *(serveur)* | user_id, day, requests, tokens, cost_eur | — |

Un seul chat au départ, mais la colonne `cat_id` évite de tout refaire si un deuxième chat arrive.

### 5.1 Mappage de l'import (champ par champ, à valider)

| Ancien champ | Nouveau | Règle |
|---|---|---|
| checkins.appetit (1–5) | journal.appetit (1–3) | 4–5 → 3 « Bien », 3 → 2 « Moyen », 1–2 → 1 « Peu » |
| checkins.humeur (texte) | journal.humeur (1–3) | « Joueur / Câlin / Content » → 3, « Normal / Calme » → 2, « Agressif / Grognon / Abattu » → 1 ; texte d'origine gardé dans la note |
| checkins.selles | journal.selles | « Normales » → ok, « Molles / Diarrhée » → molles, autre → non |
| checkins.boisson | journal.eau | « Normale » → normal, « Peu » → peu, « Beaucoup » → beaucoup |
| checkins.vomissements | journal.vomi | « Non » → false, sinon true (+ texte dans la note) |
| checkins (pas de moment) | journal.moment | heure d'enregistrement (Bruxelles) de 5 h à 15 h → matin, sinon soir (après minuit = saisie de la soirée) |
| checkins.activite (1–5) | activities | gardé tel quel en note (pas d'équivalent dans le design) |
| weights.value/date | weights.kg/date | moment = matin par défaut ; pesée datée dans le futur → **demander à Amir** |
| profile.weight (texte) | — | ignoré (le poids vient des pesées) ; signalé |
| profile.photo (4000 px) | photos + Storage | réduite à 1280 px, WebP qualité ~0,82 (JPEG si non supporté) |
| consultations.* | records type consult | motif, diagnostic, traitement → details ; cout → cost **et** une dépense « Consultations » |
| treatments.* | records type traitement + rappel | nextDose → reminder (même passé, marqué « en retard ») |
| food.* | meals + food_products | marques normalisées (espaces doublés, « ProPlan » → « Pro Plan ») ; « Tout » → 1 |
| events.* | day_notes (+ vomi si concerné) | type et suivi gardés dans la note |
| activity.* | activities | minutes, sleep (h), zones → zone, notes |
| settings.theme | settings local | — |
| ids, createdAt | id (uuid neuf si pas uuid), created_at | ids d'origine gardés dans `legacy_id` pour éviter les doublons si on réimporte |

Le fichier source n'est jamais modifié ; l'import affiche un rapport « importé / transformé / ignoré ».

---

## 6. Synchronisation

1. **Écriture** : l'écran appelle `repository.save()` → transaction Dexie : la ligne **et** une entrée dans
   `outbox` sont écrites ensemble (tout ou rien). L'écran se met à jour tout de suite.
2. **Envoi** : dès que le réseau est là (et à l'ouverture, au retour en avant-plan, toutes les 30 s), la file
   est envoyée par paquets. Le serveur n'accepte une ligne que si son `updated_at` est **plus récent** que celle
   qu'il a déjà (fonction SQL `upsert_if_newer`) → « la modification la plus récente gagne », ligne par ligne.
3. **Réception** : on demande au serveur les lignes dont `server_at` > dernier curseur (le curseur vient de
   l'heure du serveur, pas de l'appareil, pour ne rien rater si l'horloge du téléphone est fausse). Realtime
   prévient l'autre appareil en direct ; sinon rafraîchissement à l'ouverture.
4. **Unicité** : journal et pesées sont uniques par (date, moment) : deux saisies du même moment sur deux appareils
   donnent **une** ligne, la plus récente gagne.
5. **Suppression** : douce (`deleted_at`), propagée comme une modification.
6. **Indicateur** : « À jour il y a X min » / « N saisies en attente » / « Hors ligne », calculé sur la vraie file.
7. **Photos** : envoyées vers Supabase Storage (dossier privé par utilisateur), lien signé pour l'affichage,
   copie locale en cache.

Connexion : **code à 6 chiffres reçu par e-mail** (plutôt qu'un lien magique, voir décisions). Sécurité par ligne :
chaque table a `user_id = auth.uid()` en lecture et écriture.

### 6.1 Choix précis de la Phase 3 (2026-10-05)

- **Côté serveur, une seule table `public.rows`** (`tbl`, `id`, `user_id`, `data jsonb`, `updated_at`, `deleted_at`,
  `server_at`) : même schéma local et distant sans maintenir 15 tables SQL ; RLS `user_id = auth.uid()` ;
  fonction `push_rows()` qui n'écrit une ligne que si elle est plus récente ; `server_at` posé par le serveur.
- **Identifiants déterministes** pour les tables à clé métier (journal, notes du jour, pesées, activité) :
  l'id est calculé à partir de (chat, date, moment) → deux appareils produisent le même id, pas de doublon.
- **Photos** : bucket privé `photos`, dossier `<user_id>/`, envoi avant la ligne qui les décrit ; téléchargement
  à la demande sur l'autre appareil.
- **Appareils** : chaque appareil se déclare (nom, dernière activité) ; « Déconnecter les autres appareils »
  révoque les autres sessions.
- **Un seul utilisateur** : après la première connexion d'Amir, les inscriptions sont fermées.
- **Mise en place** : l'outil Supabase en ligne de commande est bloqué par Windows sur ce PC → script
  `tools/supabase-setup.mjs` via l'API officielle de gestion, avec un jeton temporaire collé par Amir dans
  `.env.local` (jamais affiché ni versionné). Clés de l'appli dans `.env.local` (`VITE_…`), jamais dans le code.
- **Ancien historique abandonné** (décision d'Amir du 2026-10-05) : les vraies saisies commencent à la visite
  vétérinaire ; l'import de la V1 reste disponible mais n'est plus utilisé.

---

## 7. Dr. Doudou (résumé, détaillé en Phase 4)

- Appli → Edge Function `dr-doudou` (session vérifiée) → modèle. La clé IA n'existe que dans les secrets Supabase.
- La fonction : 1) applique les **règles d'urgence codées** sur la question et le dossier ; 2) retrouve les fiches
  `knowledge` pertinentes (mots-clés) ; 3) appelle le modèle avec la question, un résumé du dossier et **seulement**
  ces fiches ; 4) refuse toute source absente de la liste ; 5) niveau final = le plus grave (règles, modèle) ;
  6) compte la dépense et bloque au plafond du jour.
- Sans fiche pertinente : « je n'ai pas de source fiable là-dessus, voici quand consulter ».
- Le modèle se change à un seul endroit (`MODEL` dans la config serveur).

### 7.1 Choix de la clé et maîtrise du coût (décision d'Amir, 2026-10-04)

- **Règle de choix** : au moment de la Phase 4, on prend le fournisseur (Claude, Gemini ou ChatGPT) **le moins
  consommé par ODIN**, mesuré dans `Projets\odin\config\ia-conso.json` (compteurs uniquement, jamais les clés).
  Photographie du 2026-10-04 (total depuis le 25.09) : ChatGPT ≈ 0,28 M jetons · Gemini ≈ 0,40 M · Claude ≈ 1,19 M.
- La clé est **collée par Amir** dans les secrets Supabase ; Claude ne la lit ni ne la copie.
- Plafond de dépense quotidien et mensuel côté serveur, coût affiché par réponse, estimation ×30 jours.
- **Mode de secours « prompt à copier »** (comme la V1, coût zéro) : si le coût devient trop élevé ou si le
  plafond est atteint, Dr. Doudou ne fait plus d'appel payant ; il prépare un prompt complet (question, dossier,
  fiches sources de la liste blanche, consignes de sécurité) qu'Amir copie dans ses propres IA. Les **règles
  d'urgence codées restent actives** dans ce mode (elles ne dépendent pas du modèle). Interrupteur dans Réglages
  + bascule automatique au plafond, avec message clair.

---

## 8. Phases et points d'arrêt

| Phase | Livrable | Point d'arrêt |
|---|---|---|
| 0 | Ce plan | ✋ Amir valide le plan et les décisions |
| 1 | Appli Vite identique au prototype (données de démo de test), polices locales, CSP, journal corrigé | ✋ Amir regarde l'appli en local |
| 2 | Base locale Dexie, écran de premier lancement, import des vraies données, export/import, tests | ✋ Amir voit les vraies données |
| 3 | Supabase UE, connexion, synchro, appareils, tests 2 appareils | ✋ Saisie PC visible sur le téléphone |
| 4 | Dr. Doudou réel : sources, fiches, règles d'urgence, plafond | ✋ Liste des sources, puis 10 questions réelles |
| 5 | PWA, hors ligne, mobile, rappels, GitHub Pages, Lighthouse | ✋ Installation sur le téléphone |
| 6 | Sauvegarde quotidienne PC, tout exporter / effacer, GPS honnête, README, CLAUDE.md | fin |

---

## 9. Risques

| Risque | Gravité | Parade |
|---|---|---|
| Perte de données (déjà vécue) | Haute | écriture locale atomique + serveur + sauvegarde PC quotidienne (30 jours) + export manuel ; test de restauration réel |
| Projet Supabase gratuit mis en pause après ~7 jours sans activité (à revérifier dans la doc officielle en Phase 3) | Moyenne | usage quotidien + la sauvegarde quotidienne touche la base ; l'appli reste utilisable hors ligne pendant une pause |
| Lien magique ouvert dans le navigateur au lieu de l'appli installée (Android) | Moyenne | code à 6 chiffres saisi dans l'appli |
| Horloges des appareils décalées → mauvais « plus récent » | Faible | curseur serveur pour la réception ; écart toléré documenté |
| Données réelles très maigres → écrans vides ou textes faux | Moyenne | textes calculés avec seuils minimaux (« pas encore assez de données ») |
| IA qui invente des sources ou rassure à tort | Haute | liste blanche vérifiée côté serveur, règles d'urgence codées et testées, niveau le plus grave retenu |
| Coût IA qui dérape | Moyenne | plafond quotidien + compteur ; modèle économique par défaut |
| Notifications PWA limitées sur Android (pas d'alarme locale programmée fiable) | Moyenne | Web Push envoyé par le serveur (planifié) ; à défaut rappels à l'ouverture + export calendrier |
| Données personnelles publiées par erreur sur GitHub | Haute | `donnees-reelles/` et `.env` ignorés par git, contrôle avant chaque publication |
| GPS / traceur sans accès officiel | Moyenne | pas de service non vérifié ; saisie manuelle et écran honnête |
| Parité visuelle cassée pendant le découpage | Moyenne | captures automatiques comparées au prototype, écran par écran |

---

## 10. Décisions à prendre (Amir)

| # | Décision | Ma recommandation |
|---|---|---|
| D1 | Le nom du chat dans les données n'est pas « Doudou » | L'appli garde le nom **« Doudou Healthcare »** et l'assistant **« Dr. Doudou »** ; partout ailleurs, le **nom vient du profil** |
| D2 | Illustration du chat : roux tigré dans le design | Phase 1 identique (roux). Ensuite, option « couleur de robe » qui ne change que 3 couleurs (pelage, rayures, crème), sans toucher au dessin |
| D3 | Pesée datée dans le futur dans l'ancien fichier | La corriger à l'année précédente **si tu confirmes**, sinon l'importer en la signalant |
| D4 | Y a-t-il des saisies plus récentes que le 11 juin (V1 encore utilisée sur ton téléphone ou ton PC) ? | Si oui, exporter d'abord depuis la V1 avant tout (les données du navigateur peuvent disparaître) |
| D5 | Serveur de synchro | **Supabase**, région Francfort, offre gratuite |
| D6 | Connexion | **Code à 6 chiffres par e-mail** (fonctionne dans l'appli installée), une seule adresse autorisée |
| D7 | Consultation avec coût à l'import | Créer aussi la dépense correspondante dans Finances |
| D8 | Modèle IA | **Validé** : clé du fournisseur le moins consommé par ODIN au moment de la Phase 4, plafond de coût, et mode de secours « prompt à copier » si trop cher (voir §7.1) |
| D9 | Rappels | Web Push programmé par le serveur (gratuit) ; à confirmer en Phase 5 après test sur ton téléphone |
| D10 | Hébergement du code | GitHub Pages (dépôt public = code seulement, aucune donnée) ; sinon dépôt privé + Cloudflare Pages |
