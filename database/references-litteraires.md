# Source des références littéraires

Le classeur fourni `référence.xlsx` contient **16 références** dans la feuille `Feuil1`, lignes 2 à 17. La copie de travail est `documents/references-litteraires.xlsx` ; elle est exclue de Git. Le contenu est stocké dans la base SQLite du projet, avec son empreinte SHA-256 et la provenance de chaque ligne.

## Structure

- `literary_sources` : titre de la source, fichier, empreinte et nombre de feuilles. Cette table décrit les classeurs, distinctement des sources PDF à pagination.
- `literary_references` : titre, auteur/réalisateur, présentation de la référence, interprétation, thème de rattachement au domaine, texte et intitulé Excel d’origine, feuille et numéro de ligne.
- `literary_reference_themes` : thèmes multiples, avec leur ordre d’origine.
- `literary_reference_catalog` : vue de consultation avec la source et l’état du contenu.

La colonne `domain_id` rattache toutes ces entrées au domaine `references`. Les thèmes ne sont pas inventés lorsque la colonne C du classeur est vide.

```sql
SELECT title AS titre, creator AS auteur_realisateur,
       reference_text AS presentation, analysis_text AS interpretation,
       sheet_name AS feuille, source_row AS ligne, is_complete AS contenu_complet
FROM literary_reference_catalog
ORDER BY position;
```

Les sources et références littéraires sont ajoutées par les migrations `004-literary-references-schema.sql` et `005-literary-references-data.sql`. Le schéma SQLite passe à la version 2 ; les définitions scientifiques et leurs associations QCM sont conservées.

## Les deux parties d’une référence

La présentation commence par **« On peut également penser… »**, puis reprend l’œuvre et son développement. L’interprétation commence par **« Cette référence montre que… »**, avec la contraction **« qu’… »** lorsque le texte l’utilise.

Les textes sont découpés à ce second connecteur, sans réécriture des développements. Lorsque la présentation ne contient pas de connecteur, une identification est construite uniquement à partir du titre et de la signature déjà présents dans le classeur, puis suivie de la description originale. Cela concerne les entrées de Goya, Picasso, Monet, Yourcenar et Eco. Les intitulés de titre et de signature sont structurés depuis les colonnes A et B ; l’intitulé original est toujours conservé.

Le classeur comporte aussi des tableaux et un texte religieux. Ils sont conservés parmi les références fournies. L’étiquette « Auteur / réalisateur » peut donc désigner l’artiste ou la signature du texte. Pour la Passion du Christ, « Matthieu » est repris de l’intitulé « Évangile selon Matthieu » présent dans la phrase source ; il ne s’agit pas d’une vérification externe de l’attribution.

## Contenu incomplet

**13 références disposent des deux parties et 3 restent à compléter :**

| Ligne | Œuvre | Éléments absents |
| --- | --- | --- |
| 12 | El tres de mayo de 1808 en Madrid — Francisco de Goya | Interprétation « Cette référence montre que… » |
| 15 | Comment Wang-Fô fut sauvé — Marguerite Yourcenar | Développement de présentation et interprétation |
| 17 | Le Nom de la rose — Umberto Eco | Interprétation « Cette référence montre que… » ; la courte note originale est conservée comme présentation |

Les interprétations manquantes restent `NULL`. L’application les affiche « À compléter » et n’ajoute aucun argument absent du classeur. Les références incomplètes restent consultables et disponibles en flashcards.

## Consultation et révision

La page `/references` permet de rechercher dans les titres, signatures, textes et thèmes, et de filtrer par auteur/réalisateur, thème et état du contenu. Chaque fiche présente les deux parties et la ligne du classeur. « Réviser cette référence » ouvre une session limitée à cette fiche.

Le domaine Références fournit 16 flashcards. Le recto affiche le titre et la signature ; le verso reprend les deux parties, ou signale le contenu à compléter. La maîtrise est sauvegardée avec des identifiants propres aux références. Aucun QCM ni distracteur n’est fabriqué pour ces textes.

## Reproduire l’import

```powershell
python -m pip install --target .tools/python -r scripts/requirements-references.txt
python -X utf8 scripts/import_references.py documents/references-litteraires.xlsx --output artifacts/extraction/references-verifiees.sql
```

Le profil contrôle la feuille, les en-têtes, les 16 identifications de lignes et le type texte des cellules ; les formules sont refusées. Il est spécifique au classeur fourni. Pour un classeur modifié ou une nouvelle source, adapter le profil et créer une nouvelle migration plutôt que modifier une migration déjà appliquée.

Appliquer les nouvelles migrations avec `npm.cmd run db:migrate`, puis compiler et redéployer le projet. Aucun outil Python n’est requis pour consulter le site ou reconstruire SQLite à partir des migrations déjà livrées.
