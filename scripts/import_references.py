"""Transforme le classeur fourni en une migration SQLite de références.

Le texte original et la ligne du classeur sont conservés. Seuls les titres,
signatures et connecteurs déjà présents sont structurés ; aucun développement
manquant n’est rédigé par l’importeur.
"""
import argparse
import hashlib
import re
from pathlib import Path

try:
    import openpyxl
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.tools/python'))
    import openpyxl

ROOT = Path(__file__).resolve().parents[1]
# Titres et signatures relevés dans les colonnes A et B du classeur fourni.
IDENTITIES = {
    2: ('Le Petit Prince', 'Antoine de Saint-Exupéry'),
    3: ('Candide', 'Voltaire'),
    4: ('L’Odyssée', 'Homère'),
    5: ('Les Misérables', 'Victor Hugo'),
    6: ('Le Journal d’Anne Frank', 'Anne Frank'),
    7: ('Germinal', 'Émile Zola'),
    8: ('Antigone', 'Sophocle'),
    9: ('Les Fables', 'La Fontaine'),
    10: ('Robinson Crusoé', 'Daniel Defoe'),
    11: ('Harry Potter', 'J. K. Rowling'),
    12: ('El tres de mayo de 1808 en Madrid', 'Francisco de Goya'),
    13: ('Guernica', 'Pablo Picasso'),
    14: ('Nymphéas', 'Claude Monet'),
    15: ('Comment Wang-Fô fut sauvé', 'Marguerite Yourcenar'),
    16: ('La Passion du Christ — Évangile selon Matthieu', 'Matthieu'),
    17: ('Le Nom de la rose', 'Umberto Eco'),
}
EXPECTED_LABELS = [
    'Le Petit Prince – Saint-Exupéry', 'Candide – Voltaire', 'L’Odyssée – Homère',
    'Les Misérables – Victor Hugo', 'Le Journal d’Anne Frank', 'Germinal – Émile Zola',
    'Antigone – Sophocle', 'Les Fables – La Fontaine', 'Robinson Crusoé – Daniel Defoe',
    'Harry Potter – J. K. Rowling', 'El tres de mayo de 1808 en Madrid - Francisco de Goya',
    'Guernica de Pablo Picasso', 'Nymphéas de Claude Monet',
    'Marguerite Yourcenar, Nouvelles orientales, « Comment Wang-Fô fut sauvé », Gallimard, 1963',
    'Evangile, le Chist', 'umberto Eco, le nom de la rose',
]
# Les lignes sans connecteur d’introduction reçoivent uniquement une phrase
# d’identification composée du titre et de la signature issus du classeur.
OPENINGS = {
    12: 'On peut également penser à El tres de mayo de 1808 en Madrid de Francisco de Goya',
    13: 'On peut également penser à Guernica de Pablo Picasso',
    14: 'On peut également penser aux Nymphéas de Claude Monet',
    15: 'On peut également penser à « Comment Wang-Fô fut sauvé » de Marguerite Yourcenar',
    17: 'On peut également penser au Nom de la rose d’Umberto Eco',
}

def sql_value(value):
    if value is None:
        return 'NULL'
    if isinstance(value, int):
        return str(value)
    return "'" + value.replace("'", "''") + "'"

def insert(table, columns, values):
    return f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(map(sql_value, values))});"

def extract(path):
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != ['Feuil1']:
            raise ValueError('Ce profil attend la feuille Feuil1 du classeur fourni.')
        sheet = workbook['Feuil1']
        if [sheet.cell(1, index).value for index in range(1, 4)] != ['Référence', 'Phrase réutilisable', 'Thèmes possibles']:
            raise ValueError('Les colonnes attendues ne correspondent pas au classeur.')
        rows = []
        for line in range(2, sheet.max_row + 1):
            cells = [sheet.cell(line, column) for column in range(1, 4)]
            if all(cell.value is None for cell in cells):
                continue
            if line not in IDENTITIES or any(cell.data_type == 'f' for cell in cells):
                raise ValueError(f'Ligne {line} non prévue ou contenant une formule : import interrompu.')
            if any(cell.value is not None and not isinstance(cell.value, str) for cell in cells):
                raise ValueError(f'Une cellule de la ligne {line} n’est pas du texte.')
            source_reference, source_text, theme_text = [cell.value for cell in cells]
            if not source_reference or source_reference.strip() != EXPECTED_LABELS[line - 2]:
                raise ValueError(f'Identification modifiée à la ligne {line} : adapter le profil d’import avant de continuer.')
            title, creator = IDENTITIES[line]
            text = (source_text or '').strip()
            marker = re.search(r'Cette référence montre qu(?:e\b|[’\x27])', text)
            reference_text = text[:marker.start()].strip() if marker else text
            analysis = text[marker.start():].strip() if marker else None
            if not reference_text.startswith('On peut également penser'):
                opening = OPENINGS.get(line)
                if not opening:
                    raise ValueError(f'Introduction non reconnue à la ligne {line}.')
                reference_text = f'{opening} : {reference_text}' if reference_text else f'{opening}.'
            if not source_reference:
                raise ValueError(f'Référence absente à la ligne {line}.')
            themes = list(dict.fromkeys(theme.strip() for theme in (theme_text or '').split(',') if theme.strip()))
            rows.append({
                'id': f'literature-feuil1-r{line:02}', 'title': title, 'creator': creator,
                'reference_text': reference_text, 'analysis_text': analysis,
                'source_reference': source_reference, 'source_text': source_text,
                'sheet_name': sheet.title, 'source_row': line, 'position': line - 1,
                'themes': themes,
            })
        if len(rows) != 16:
            raise ValueError(f'Le classeur doit fournir 16 références, reçu : {len(rows)}.')
        return rows, len(workbook.sheetnames)
    finally:
        workbook.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'database/migrations/005-literary-references-data.sql')
    args = parser.parse_args()
    references, sheet_count = extract(args.workbook)
    sql = ['-- Import fidèle du classeur référence.xlsx ; développements absents conservés à NULL.',
        insert('literary_sources', ['id', 'title', 'filename', 'sha256', 'sheet_count'], ['references-litteraires', 'Références littéraires — classeur de préparation CRPE', 'references-litteraires.xlsx', hashlib.sha256(args.workbook.read_bytes()).hexdigest(), sheet_count]),
        "UPDATE domains SET description = 'Des œuvres, leurs auteurs et des formulations pour enrichir vos développements.', note = 'Références importées du classeur fourni. Trois entrées sont à compléter ; les textes manquants ne sont pas inventés.' WHERE id = 'references';",
    ]
    for item in references:
        sql.append(insert('literary_references', ['id', 'domain_id', 'source_id', 'title', 'creator', 'reference_text', 'analysis_text', 'source_reference', 'source_text', 'sheet_name', 'source_row', 'position'], [item['id'], 'references', 'references-litteraires', item['title'], item['creator'], item['reference_text'], item['analysis_text'], item['source_reference'], item['source_text'], item['sheet_name'], item['source_row'], item['position']]))
        for position, theme in enumerate(item['themes'], 1):
            sql.append(insert('literary_reference_themes', ['reference_id', 'theme', 'position'], [item['id'], theme, position]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('\n'.join(sql) + '\n', encoding='utf-8')
    incomplete = [item for item in references if not item['analysis_text'] or not item['source_text']]
    print(f'{len(references)} références importées, dont {len(incomplete)} à compléter. Migration : {args.output}')
    for item in incomplete:
        print(f"À compléter — {item['sheet_name']} ligne {item['source_row']} : {item['title']}")

if __name__ == '__main__':
    main()
