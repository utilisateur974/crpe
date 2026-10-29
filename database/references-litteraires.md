# Source des références littéraires

La source active est **`references_CRPE_enrichies_word_ghibli.xlsx`**, feuille `Feuil1`, lignes 2 à 171. Elle contient **170 fiches pour 146 œuvres** et remplace les 16 fiches de la première version.

La copie de travail est `documents/references_CRPE_enrichies_word_ghibli.xlsx`, exclue de Git. Les cinq colonnes sont conservées dans SQLite avec l’empreinte SHA-256 du classeur.

## Remplacement des tables

- `006-replace-literary-references-schema.sql` supprime la vue et les tables littéraires dépendantes, puis recrée `literary_sources`, `literary_references`, `literary_reference_themes` et `literary_reference_catalog`.
- `007-enriched-literary-references-data.sql` importe uniquement le nouveau classeur.
- Le schéma passe en version 3. Les anciennes migrations restent dans l’historique pour permettre la reconstruction de la base ; leurs anciennes références ne figurent plus dans les tables actives.
- Une sauvegarde locale préalable est conservée dans `artifacts/backups/`.
- Les données scientifiques et leurs associations de quiz restent identiques à la sauvegarde.

Les nouvelles fiches ont des identifiants `literature-enriched-rNNN`. Les anciennes évaluations locales ne sont donc pas affectées à une autre œuvre ou à un argument différent.

## Les cinq colonnes du classeur

| Colonne Excel | Stockage |
| --- | --- |
| Référence | `source_reference` conserve l’intitulé original ; `title`, `creator` et `publication_date` en extraient le titre, la signature et la date |
| Phrase réutilisable | `source_text` conserve le texte intégral ; `reference_text` et `analysis_text` en séparent les deux parties |
| Thèmes possibles | `source_themes` conserve la cellule originale ; `literary_reference_themes` contient les thèmes individuels |
| Réplique / extrait – locuteur + phrase complète | `excerpt_text` conserve intégralement le locuteur, l’extrait ou la mention « À compléter » |
| Source de l’extrait | `excerpt_source` conserve l’URL ou la note de provenance |

Les dates restent du texte : par exemple `vers 700 av. J.-C.`, `Antiquité` ou `XXe siècle` sont conservés sans conversion. Les feuilles, lignes et positions de chaque fiche sont enregistrées. `literary_sources` contient une seule source active, son nom de fichier et son empreinte.

```sql
SELECT title, creator, publication_date, reference_text, analysis_text,
       excerpt_text, excerpt_source, sheet_name, source_row
FROM literary_reference_catalog
ORDER BY position;
```

## Présentation et interprétation

Le texte est séparé à la première occurrence de « Cette référence ». Cela conserve aussi les variantes du fichier : « Cette référence montre que… », « Cette référence permet d’interroger… », « Cette référence peut être mobilisée pour montrer que… », etc.

Si la première partie ne comporte pas « On peut également penser… », cette introduction est construite uniquement avec le titre, la signature et la date déjà présents dans le classeur, puis suivie du texte original. Aucun développement ou argument n’est inventé. La cellule d’origine reste conservée intégralement.

Une même œuvre peut servir plusieurs arguments. Les huit fiches de **Princesse Mononoké** sont ainsi conservées séparément ; elles ne sont pas fusionnées selon leur titre.

## Données à compléter et extraits

- **169 développements** contiennent les deux parties.
- **1 interprétation** manque : *Le 3 mai 1808 à Madrid*, Francisco de Goya, ligne 12. Elle reste `NULL`.
- **83 fiches** contiennent un extrait fourni par le classeur.
- **80 fiches** contiennent une citation à compléter. Leur mention est conservée et affichée comme telle.
- **7 fiches** indiquent qu’il n’y a aucun locuteur, notamment pour les œuvres picturales.

La complétude du développement est distincte de celle de la citation. La vue fournit `is_complete` pour les deux parties et `excerpt_status` (`provided`, `missing`, `not-applicable`) pour l’extrait.

Les extraits et leurs attributions sont importés du classeur, sans vérification externe de leur exactitude. Une note comme « citation à vérifier » reste visible. Les URL HTTP/HTTPS peuvent être ouvertes depuis la consultation ; elles sont affichées en texte dans les flashcards pour éviter des liens imbriqués dans le bouton de retournement.

## Consultation et révision

`/references` affiche le titre, la signature, la date, les thèmes, les deux parties du développement, l’extrait et sa source, ainsi que la provenance Excel. La recherche couvre aussi les dates et les extraits. Les filtres d’auteur/réalisateur, de thème et d’état du développement restent disponibles.

Le domaine Références fournit 170 flashcards. Chaque variante possède sa propre progression. Les sciences conservent leurs 120 cartes et leurs 108 questions QCM. Aucun QCM n’est fabriqué à partir des références littéraires.

## Reproduire l’import

```powershell
python -m pip install --target .tools/python -r scripts/requirements-references.txt
python -X utf8 scripts/import_enriched_references.py documents/references_CRPE_enrichies_word_ghibli.xlsx --output artifacts/extraction/references-enrichies-verifiees.sql
```

L’importeur vérifie la feuille, les cinq en-têtes, le type texte des cellules et la forme « Titre – Signature (date) ». Il refuse les formules. Il conserve une fiche par ligne sans déduplication des œuvres.

La sortie peut être comparée à la migration 007. Les cinq cellules de chaque ligne, les thèmes et l’empreinte du fichier ont été comparés à la base après l’import.

```powershell
npm.cmd run db:migrate
npm.cmd test
python -X utf8 -m unittest discover -s tests/python
npm.cmd run build
```

Les migrations déjà appliquées ne doivent pas être modifiées. Pour remplacer à nouveau les données, préparer une nouvelle migration, vérifier le classeur et réaliser une sauvegarde. Les outils Python et les fichiers Excel ne sont pas requis pour consulter le site ou reconstruire la base à partir des migrations livrées.

Les modifications restent locales jusqu’à leur envoi sur GitHub et au redéploiement du site.
