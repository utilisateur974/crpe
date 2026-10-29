# Base de définitions CRPE

La source applicative est **`crpe.sqlite`**, une base SQLite réelle. Les fichiers JSON fictifs de la première version sont conservés dans `tests/fixtures/` et ne sont plus importés par l’application.

La base contient également **170 fiches littéraires et artistiques pour 146 œuvres**, issues du nouveau classeur enrichi. Leurs développements, dates, thèmes, extraits, sources et lignes de provenance sont décrits dans [references-litteraires.md](references-litteraires.md). Une interprétation et 80 citations restent à compléter dans le fichier. Le schéma est en version 3 et contient 290 cartes au total : 120 notions scientifiques et 170 fiches de référence. Les anciennes tables littéraires ont été supprimées puis recréées par la migration 006, avant l’import du nouveau contenu par la migration 007.

## Contenu importé

- Livret fourni : *Sciences et technologie — Le corps humain et la santé*, Objectif CRPE, fichier nommé `17_06_2026.pdf` par l’utilisateur.
- 40 pages PDF ; les pages citées correspondent à l’ordre des pages dans le fichier, couverture comprise.
- 17 chapitres : les titres de fiches figurant sous l’intitulé thématique de chaque page.
- 118 puces « À retenir », soit **120 notions et définitions** après séparation des trois rôles des nutriments (glucides, lipides, protéines, page 10).
- Les schémas, objectifs, liens externes et exercices ne sont pas transformés en définitions supplémentaires.

| Chapitre | Page PDF | Notions |
| --- | ---: | ---: |
| Adaptations cardiovasculaires et respiratoires | 4 | 7 |
| Récupération et entraînement | 6 | 7 |
| Digestion et absorption intestinale | 8 | 7 |
| Besoins énergétiques et apports | 10 | 9 |
| Organisation du système nerveux | 12 | 7 |
| Réflexe et commande volontaire | 14 | 7 |
| Puberté et fonctionnement du système reproducteur | 17 | 7 |
| Fécondation et embryogenèse | 20 | 7 |
| Rôle du placenta | 22 | 7 |
| Contraception naturelle, mécanique, hormonale | 24 | 7 |
| Principes de la procréation médicalement assistée | 26 | 6 |
| IST et prévention | 28 | 7 |
| Respect et consentement | 30 | 6 |
| Immunité innée et adaptative | 32 | 8 |
| Vaccination et mémoire immunitaire | 35 | 6 |
| Rôle des hormones et de l’homéostasie | 37 | 7 |
| Régulation de la glycémie et température corporelle | 39 | 8 |

## Les trois champs demandés

La vue `definition_catalog` expose directement les titres de chapitre, les concepts et les définitions :

```sql
SELECT
  chapter_title AS titre_du_chapitre,
  concept AS nom_concept,
  definition
FROM definition_catalog
ORDER BY chapter_position, position;
```

La structure relationnelle conserve aussi la provenance :

- `domains` : domaines de révision.
- `chapters` : titre, rubrique thématique du livret, ordre, domaine.
- `definitions` : concept, définition, chapitre, page, numéro de puce, extrait original et éventuelle note de vérification.
- `sources` : titre du document, nom de fichier, empreinte SHA-256 et nombre de pages.
- `quiz_distractors` : **324 associations explicites de distracteurs pour 108 questions** du livret, ajoutées par `003-quiz-associations.sql`.
- `migrations` : historique et empreintes des migrations appliquées.

## Fidélité de l’extraction

Les retours à la ligne, espaces multiples et caractères invisibles d’extraction ont été normalisés. Les titres sont en casse de phrase ; les formulations des définitions sont conservées. Pour les puces sans « concept : définition », un intitulé a été relevé manuellement dans le contexte et la phrase source est conservée intégralement. La puce des nutriments est décomposée sans ajout de texte. `source_excerpt` conserve toujours la puce d’origine complète.

**Point signalé, sans correction silencieuse :** à la page 39, le texte du glucagon contient « hormone hypoglycémiante » tout en décrivant une libération de glucose. La formulation originale reste en base et `review_note` signale l’incohérence. Cette note apparaît dans la consultation et dans les flashcards. L’extraction n’est pas une validation scientifique du livret.

## Mettre à jour la base

### Questions à quatre choix

La migration `003-quiz-associations.sql` associe chaque notion retenue à trois autres définitions du livret. Les textes de définition restent inchangés. Les associations sont explicites et ont été choisies d’après les formulations de la source ; aucun tirage arbitraire de distracteurs n’est effectué au lancement d’un quiz.

Les 17 chapitres disposent de questions. Les associations restent principalement dans le même chapitre. Pour des notions générales comme le placenta ou la contraception, elles utilisent parfois des notions de chapitres proches afin de ne pas proposer comme fausse réponse une description partielle également applicable à la notion demandée.

Exemple : **Neurone** a pour distracteurs **Cerveau**, **Moelle épinière** et **Système nerveux périphérique (SNP)**. Après une réponse, les quatre définitions sont accompagnées de leur notion et de leur page source, dans le même ordre que les propositions.

Les douze notions suivantes ne sont pas proposées comme questions : Lien respiration–circulation ; Rôle de la circulation ; Fonction du système nerveux ; Comparaison (réflexe/volontaire) ; Fonction commune des systèmes reproducteurs ; Embryogenèse précoce ; Absence de refus et consentement ; Consentement et intégrité de la personne ; Principe immunitaire de la vaccination ; Lien système nerveux / hormonal ; Régulation de la glycémie ; Glucagon. Les formulations générales ou qui recouvrent d’autres propositions sont conservées en flashcards. Le glucagon, marqué à vérifier, est également exclu de tous les distracteurs.

Les tests contrôlent les références, l’unicité des quatre réponses, la conservation exacte des textes et des sources, la présence d’une seule réponse ciblée et l’exclusion des notes de vérification. Ces contrôles structurels complètent le choix éditorial des associations ; ils ne constituent pas une validation scientifique indépendante du livret.

### Migrations

```powershell
npm.cmd run db:migrate
```

Les migrations de `database/migrations/` s’appliquent dans l’ordre, dans des transactions, une seule fois. Une migration déjà appliquée ne doit pas être modifiée : une empreinte détecte ce cas. Ajouter une nouvelle migration pour ajouter des chapitres, corriger une définition ou enrichir un domaine. Le fichier SQLite est livré avec le projet et peut également être ouvert dans un gestionnaire SQLite.

La commande peut reconstruire une base absente à partir des migrations. Elle ne réinitialise et ne supprime pas les données existantes. Recompiler après une mise à jour pour que la base modifiée soit déployée.

## Reproduire l’extraction du PDF

La copie locale du document est `documents/corps-humain-sante.pdf` ; les PDF et outils Python locaux sont exclus de Git et du déploiement. L’extracteur est spécifique à la structure de ce livret, avec contrôle des pages et des nombres de puces.

```powershell
python -m pip install --target .tools/python -r scripts/requirements-pdf.txt
python -X utf8 scripts/extract_definitions.py documents/corps-humain-sante.pdf --output artifacts/extraction/import-verifie.sql
```

La sortie SQL peut être comparée à `002-corps-humain-sante.sql` sans modifier l’historique de la base. Un CSV de contrôle est aussi généré dans `artifacts/extraction/definitions.csv`.

## Utilisation dans le site

Vite copie la base `.sqlite` et le moteur WebAssembly `sql.js` dans les fichiers de production. Le navigateur télécharge et interroge réellement SQLite au démarrage ; les cartes sont ensuite conservées en mémoire pour la session. Il n’y a plus de chargement de contenu depuis des JSON.

La base du site est **en lecture seule**. Les modifications se font dans les migrations ou le fichier SQLite du projet, suivies d’une compilation et d’un déploiement. Aucun serveur de base de données, secret ou abonnement n’est requis. Cette base de contenus est distincte de la progression personnelle, qui reste dans `localStorage`.
