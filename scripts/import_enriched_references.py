"""Importe les cinq colonnes du classeur enrichi sans modifier les textes source.

La migration de schéma 006 remplace les anciennes tables ; ce script produit
uniquement les insertions de la migration 007. Les variantes argumentatives
d’une même œuvre restent des fiches distinctes.
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
HEADERS = ['Référence', 'Phrase réutilisable', 'Thèmes possibles',
           'Réplique / extrait – locuteur + phrase complète', 'Source de l’extrait']
SOURCE_ID = 'references-crpe-enrichies-word-ghibli'

def value_sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, int):
        return str(value)
    return "'" + value.replace("'", "''") + "'"

def insert(table, columns, values):
    return f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(map(value_sql, values))});"

def extract(path):
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=False)
    try:
        if workbook.sheetnames != ['Feuil1']:
            raise ValueError('Ce profil attend la feuille Feuil1 du classeur enrichi.')
        sheet = workbook['Feuil1']
        if [sheet.cell(1, index).value for index in range(1, 6)] != HEADERS:
            raise ValueError('Les cinq en-têtes attendus ne correspondent pas au classeur.')
        entries = []
        for cells in sheet.iter_rows(min_row=2, max_col=5):
            if all(cell.value is None for cell in cells):
                continue
            line = cells[0].row
            if any(cell.data_type == 'f' for cell in cells):
                raise ValueError(f'Formule refusée à la ligne {line}.')
            if any(cell.value is not None and not isinstance(cell.value, str) for cell in cells):
                raise ValueError(f'Une cellule de la ligne {line} n’est pas du texte.')
            label, original_text, source_themes, excerpt, excerpt_source = [cell.value for cell in cells]
            match = re.fullmatch(r'(.+) [–-] (.+) \(([^()]*)\)', (label or '').strip())
            if not match or not original_text or not original_text.strip():
                raise ValueError(f'Titre, signature, date ou développement non reconnu à la ligne {line}.')
            title, creator, date = [part.strip() for part in match.groups()]
            text = original_text.strip()
            marker = re.search(r'\bCette référence\b', text)
            presentation = text[:marker.start()].strip() if marker else text
            analysis = text[marker.start():].strip() if marker else None
            if not presentation.startswith('On peut également penser'):
                presentation = f'On peut également penser à l’œuvre {title}, de {creator} ({date}) : {presentation}'
            themes = list(dict.fromkeys(theme.strip() for theme in (source_themes or '').split(',') if theme.strip()))
            entries.append({
                'id': f'literature-enriched-r{line:03}', 'title': title, 'creator': creator,
                'publication_date': date, 'reference_text': presentation, 'analysis_text': analysis,
                'excerpt_text': excerpt, 'excerpt_source': excerpt_source,
                'source_reference': label, 'source_text': original_text, 'source_themes': source_themes,
                'sheet_name': sheet.title, 'source_row': line, 'position': len(entries) + 1, 'themes': themes,
            })
        if not entries:
            raise ValueError('Le classeur ne contient aucune référence à importer.')
        return entries, len(workbook.sheetnames)
    finally:
        workbook.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'database/migrations/007-enriched-literary-references-data.sql')
    args = parser.parse_args()
    entries, sheet_count = extract(args.workbook)
    incomplete = sum(not entry['analysis_text'] for entry in entries)
    missing_excerpts = sum(not entry['excerpt_text'] or entry['excerpt_text'].startswith('À compléter') for entry in entries)
    interpretation_label = 'Une interprétation' if incomplete == 1 else f'{incomplete} interprétations'
    note = f'{len(entries)} fiches issues du classeur enrichi, avec dates, thèmes et extraits. {interpretation_label} et {missing_excerpts} citations restent à compléter dans la source.'
    sql = ['-- Nouveau classeur : toutes les lignes et les cinq colonnes sont conservées.',
           '-- Les anciennes références ont été retirées par la migration 006.',
           insert('literary_sources', ['id', 'title', 'filename', 'sha256', 'sheet_count'], [SOURCE_ID, 'Références CRPE enrichies — Word et Ghibli', args.workbook.name, hashlib.sha256(args.workbook.read_bytes()).hexdigest(), sheet_count]),
           "UPDATE domains SET description = 'Des œuvres, leurs auteurs et des formulations pour enrichir vos développements.', note = " + value_sql(note) + " WHERE id = 'references';"]
    columns = ['id', 'title', 'creator', 'publication_date', 'reference_text', 'analysis_text', 'excerpt_text', 'excerpt_source', 'source_reference', 'source_text', 'source_themes', 'sheet_name', 'source_row', 'position']
    for entry in entries:
        sql.append(insert('literary_references', ['domain_id', 'source_id', *columns], ['references', SOURCE_ID, *[entry[key] for key in columns]]))
        for position, theme in enumerate(entry['themes'], 1):
            sql.append(insert('literary_reference_themes', ['reference_id', 'theme', 'position'], [entry['id'], theme, position]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('\n'.join(sql) + '\n', encoding='utf-8')
    print(f'{len(entries)} fiches, {len(set((entry["title"], entry["creator"], entry["publication_date"]) for entry in entries))} œuvres ; {incomplete} interprétation à compléter.')
    print(f'Migration : {args.output}')

if __name__ == '__main__':
    main()
