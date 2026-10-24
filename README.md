# CRPE – Espace de révision

Application en français avec React, TypeScript, Vite, Tailwind CSS, Motion, React Router, Lucide React et **SQLite**. La progression personnelle reste sauvegardée dans le navigateur.

Le PDF *Le corps humain et la santé* a été intégré : **120 notions dans 17 chapitres**, issues des encadrés « À retenir ». Les 118 entrées donnent 120 notions après séparation des trois rôles des nutriments. Les textes sont conservés avec leur page et leur extrait d’origine. Une incohérence du livret sur le glucagon (page 39) est signalée dans l’interface.

## Lancer le projet

Node.js 22.13 ou supérieur (Node 24 recommandé), npm.

```powershell
cd D:\workstation\crpe
npm.cmd install
npm.cmd run dev
```

Ouvrir **http://127.0.0.1:5173**, ou l’adresse indiquée par Vite si ce port est occupé. Sur Windows, `npm.cmd` évite les restrictions PowerShell sur `npm.ps1`. Sur macOS/Linux, utiliser `npm`.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

La compilation vérifie TypeScript, puis produit `dist/`. Le serveur de prévisualisation utilise normalement http://127.0.0.1:4173.

## Fonctionnalités

- Tableau de bord, domaines Sciences et Références, statistiques.
- **Mes définitions** (`/definitions`) : colonnes « Titre du chapitre », « Nom / concept », « Définition », recherche sans sensibilité aux accents, filtres et pagination.
- Domaine Sciences : filtres de catégorie (titre de chapitre), sous-catégorie (rubrique thématique du livret) et maîtrise.
- Flashcards 3D : concept au recto, définition et source au verso, précédent/suivant, mélange, « Je connais » et « À revoir », bilan de série.
- Raccourcis flashcards : Espace pour retourner, flèches gauche/droite pour naviguer. Les boutons et champs gardent leurs commandes natives.
- Quiz : correction immédiate, score, historique et reprise des erreurs **lorsque des distracteurs validés sont disponibles**.
- Thème clair/sombre persistant, navigation clavier, affichage ordinateur/mobile, respect du mouvement réduit.

**Aucun QCM n’est fabriqué à partir de définitions sans distracteurs explicitement validés.** Le livret importé est donc utilisable en consultation et flashcards ; son quiz reste indisponible. Le domaine Références est conservé sans données fictives.

## Base de données

**Fichier : `database/crpe.sqlite`.** Le contenu pédagogique n’est plus chargé depuis des fichiers JSON. Le navigateur lit la base SQLite avec `sql.js`, dont le moteur WebAssembly est inclus dans la compilation, sans service externe. Les données sont ensuite gardées en mémoire pour la session.

Les trois champs demandés sont disponibles directement :

```sql
SELECT chapter_title, concept, definition
FROM definition_catalog
ORDER BY chapter_position, position;
```

La base conserve aussi le domaine, la rubrique, l’ordre, la page PDF, le numéro de puce, l’extrait source, l’empreinte SHA-256 du document et les notes de vérification.

Voir **[database/README.md](database/README.md)** pour la liste des chapitres, le schéma, la méthode d’extraction et les commandes de reproduction.

```powershell
npm.cmd run db:migrate
```

Cette commande applique uniquement les migrations nouvelles. La base préremplie est livrée ; une base absente peut être reconstruite depuis `database/migrations/`. Le module SQLite natif de Node peut afficher un avertissement expérimental selon la version de Node.

Pour ajouter un domaine, insérer une ligne dans `domains` via une nouvelle migration SQL, puis ses chapitres et définitions. Les couleurs disponibles sont `sage`, `terracotta`, `blue`, les icônes `flask`, `library`, `book` (icône générique pour une autre valeur). La navigation et les pages s’adaptent aux domaines présents en base.

Pour ajouter des cartes, insérer les chapitres dans `chapters`, la provenance dans `sources`, puis les notions dans `definitions`. Garder des identifiants stables pour conserver la progression. Les cartes sont dérivées des concepts et définitions, sans réécriture du texte pédagogique.

Pour autoriser un QCM, référencer au moins trois autres définitions pertinentes du même domaine dans `quiz_distractors`. La rédaction doit vérifier qu’une seule proposition répond à la question. Les références absentes, les réponses identiques, les autres domaines et les notions marquées à vérifier sont écartés. Aucun distracteur n’est généré automatiquement.

Les modifications de contenu se font dans la base du projet, puis nécessitent une nouvelle compilation et un déploiement. Le site consulte la base en lecture seule.

## Architecture

```text
database/
  crpe.sqlite           Base de contenus
  migrations/           Schéma et import SQL versionnés
  README.md             Dictionnaire, provenance et extraction
scripts/
  database.mjs          Application transactionnelle des migrations
  extract_definitions.py Extraction contrôlée du livret fourni
src/
  components/           Éléments réutilisables et structure
  pages/                Accueil, domaines, définitions, flashcards, quiz, progression
  services/             Lecture SQLite, validation, quiz et sauvegarde
  hooks/                Progression, thème et sélection
  types/                Modèles de définitions, cartes, domaines et progression
  utils/                Mélange, statistiques et formatage
tests/
  fixtures/             Anciennes cartes JSON fictives, uniquement pour les tests
  unit/                 Contenu, SQLite, migrations, distracteurs et sauvegarde
  e2e/                  Parcours navigateur ordinateur/mobile
```

Le PDF local est conservé dans `documents/corps-humain-sante.pdf`, exclu de Git et du déploiement. Son import initial est reproductible ; les nouveaux PDF peuvent demander un profil d’extraction différent.

## Progression

Clé `localStorage` : `crpe-progress-v1`. Elle conserve les cartes consultées horodatées, la maîtrise, les cartes à revoir, les scores de quiz, les erreurs et la dernière date de révision. Le thème utilise `crpe-theme`.

La maîtrise est la proportion de cartes marquées « Je connais ». Un score de quiz ne change pas l’autoévaluation. Le contenu d’une session reste stable pendant celle-ci, même si les cartes changent de statut.

La progression est liée au navigateur, à l’appareil et à l’origine du site ; elle n’est pas synchronisée. Une erreur de stockage s’affiche sans interrompre les révisions. Les anciennes progressions de démonstration sont conservées dans le stockage mais ne sont pas comptées pour les nouvelles notions, qui ont leurs propres identifiants.

## Tests navigateur

```powershell
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Playwright lance Vite et vérifie la lecture de SQLite, les trois colonnes, les 120 notions, les filtres, la recherche, les sources, la note sur le glucagon, les flashcards, la sauvegarde, le thème et le traitement d’une base indisponible. Les captures sont dans `artifacts/` et les traces d’échec dans `test-results/`.

Pour vérifier aussi les fichiers SQLite et WebAssembly de production, compiler puis définir `$env:PLAYWRIGHT_PRODUCTION = '1'` avant `npm.cmd run test:e2e`. Le serveur de test utilise alors `vite preview` sur le port 4173.

Un Chromium déjà installé peut être fourni :

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:\chemin\vers\chrome.exe'
npm.cmd run test:e2e
```

## Déploiement

Projet statique sans secret ni serveur applicatif :

- **Vercel** : préréglage Vite, compilation `npm run build`, sortie `dist`. `vercel.json` gère les routes React.
- **Netlify** : `netlify.toml` définit compilation, sortie et redirection SPA.

Déployer tout `dist/`, y compris les fichiers `.sqlite` et `.wasm` dans `assets/`. Le serveur doit servir WebAssembly avec son type MIME habituel `application/wasm` (pris en charge par Vercel et Netlify). L’application est prévue à la racine du domaine. Vérifier le rechargement de `/definitions` et `/domaine/sciences/flashcards`.

Aucun déploiement distant n’est effectué par les modifications locales.
