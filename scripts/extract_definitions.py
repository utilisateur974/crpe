"""Extraction reproductible des encadrés À retenir du livret fourni.

Produit une migration SQL, sans générer ni compléter de définition.
Les intitulés sans deux-points ont été relevés manuellement dans le contexte.
"""
import argparse
import csv
import hashlib
import re
from pathlib import Path

try:
    import pymupdf
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / '.tools/python'))
    import pymupdf

ROOT = Path(__file__).resolve().parents[1]
CHAPTER_PAGES = [4, 6, 8, 10, 12, 14, 17, 20, 22, 24, 26, 28, 30, 32, 35, 37, 39]
# Nombre de puces vérifié sur chaque encadré du document de 40 pages.
EXPECTED_COUNTS = [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 6, 7, 6, 8, 6, 7, 8]
CONCEPTS_WITHOUT_COLON = {
    26: ['Procréation médicalement assistée (PMA)', 'Indications de la PMA', 'Lieu de la fécondation en PMA', 'Insémination artificielle', 'Fécondation in vitro (FIV)', 'Bases biologiques de la PMA'],
    28: ['Infection sexuellement transmissible (IST)', 'Transmission des IST', 'IST asymptomatiques', 'Exemples d’IST', 'Préservatif et IST', 'Dépistage des IST', 'Prévention des IST'],
    30: ['Consentement', 'Caractère explicite du consentement', 'Réversibilité du consentement', 'Absence de refus et consentement', 'Respect', 'Consentement et intégrité de la personne'],
    32: ['Immunité innée', 'Mécanismes de l’immunité innée', 'Réaction inflammatoire', 'Immunité adaptative', 'Lymphocytes et reconnaissance spécifique', 'Lymphocytes B', 'Lymphocytes T', 'Mémoire de l’immunité adaptative'],
    35: ['Vaccination', 'Antigène', 'Lymphocytes mémoire', 'Mémoire immunitaire adaptative', 'Protection individuelle et collective', 'Principe immunitaire de la vaccination'],
}

def normalize(text):
    return re.sub(r'\s+', ' ', text.replace('\u200b', '').replace('\ufeff', '')).strip()

def sql_value(value):
    return 'NULL' if value is None else str(value) if isinstance(value, int) else "'" + value.replace("'", "''") + "'"

def insert(table, columns, values):
    return f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({', '.join(map(sql_value, values))});"

def extract(pdf):
    document = pymupdf.open(pdf)
    if len(document) != 40:
        raise ValueError('Ce profil d’extraction est prévu pour le livret fourni de 40 pages.')
    chapters, entries = [], []
    for order, (page_number, expected) in enumerate(zip(CHAPTER_PAGES, EXPECTED_COUNTS), 1):
        text = document[page_number - 1].get_text(sort=True).replace('\u200b', '')
        header = text.split('Objectif', 1)[0]
        lines = [line.strip() for line in header.splitlines() if line.strip()]
        section = lines[1]
        # Conserver l’intitulé et ses accents, en casse de phrase.
        title = normalize(' '.join(lines[2:])).capitalize()
        # Les acronymes sont conservés lorsqu’ils apparaissent dans les titres.
        title = title.replace('Ist et prévention', 'IST et prévention')
        chapter_id = f'corps-sante-ch{order:02}'
        chapters.append((chapter_id, title, section, order))
        match = re.search(r'A retenir\s*\n(.*?)(?:Je m.auto.évalue|Objectif CRPE)', text, re.S)
        if not match:
            raise ValueError(f'Encadré manquant à la page {page_number}.')
        bullets = [normalize(item) for item in match[1].split('●') if item.strip()]
        if len(bullets) != expected:
            raise ValueError(f'Page {page_number}: {len(bullets)} puces au lieu de {expected}.')
        for item_number, excerpt in enumerate(bullets, 1):
            if page_number in CONCEPTS_WITHOUT_COLON:
                concept = CONCEPTS_WITHOUT_COLON[page_number][item_number - 1]
                definition = excerpt
            else:
                concept, separator, definition = excerpt.partition(':')
                if not separator:
                    raise ValueError(f'Définition sans intitulé page {page_number}: {excerpt}')
                concept, definition = concept.strip(), definition.strip()
            # Trois définitions déjà présentes dans une même puce sont séparées.
            if page_number == 10 and concept == 'Rôle des nutriments':
                pieces = re.findall(r'–\s*(glucides|lipides|protéines)\s*:\s*(.*?)(?=\s*;?\s*–|$)', definition)
                if len(pieces) != 3:
                    raise ValueError('Les trois rôles des nutriments n’ont pas été reconnus.')
                definitions = [(name.capitalize(), value.rstrip(' ;').strip()) for name, value in pieces]
            else:
                definitions = [(concept, definition)]
            for split_number, (concept, definition) in enumerate(definitions, 1):
                review_note = None
                if page_number == 39 and concept == 'Glucagon':
                    review_note = 'Incohérence dans le PDF : le glucagon est qualifié d’hypoglycémiant alors que la même phrase décrit une libération de glucose. Texte source conservé ; formulation à vérifier avant mémorisation.'
                entries.append({
                    'id': f'corps-sante-p{page_number:02}-{item_number:02}-{split_number}',
                    'chapter_id': chapter_id, 'chapter_title': title, 'concept': concept,
                    'definition': definition, 'page': page_number, 'source_item': item_number,
                    'excerpt': excerpt, 'review_note': review_note, 'position': item_number * 10 + split_number,
                })
    document.close()
    if len(chapters) != 17 or len(entries) != 120:
        raise ValueError('Le relevé doit couvrir 17 chapitres et 120 entrées après séparation des nutriments.')
    return chapters, entries

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'database/migrations/002-corps-humain-sante.sql')
    args = parser.parse_args()
    chapters, entries = extract(args.pdf)
    source_title = 'Sciences et technologie — Le corps humain et la santé — Objectif CRPE'
    sql = ['-- Extraction des 118 puces « À retenir » ; la puce des nutriments est séparée en 3 notions.', '-- Les définitions sont reprises du PDF, sans ajout pédagogique.',
        insert('domains', ['id', 'name', 'description', 'icon', 'color', 'note', 'position'], ['sciences', 'Sciences', 'Explorer le corps humain et la santé, une notion après l’autre.', 'flask', 'sage', 'Définitions extraites des encadrés « À retenir » du livret Le corps humain et la santé. Les numéros de page renvoient au PDF fourni.', 1]),
        insert('domains', ['id', 'name', 'description', 'icon', 'color', 'note', 'position'], ['references', 'Références', 'Retrouver les repères et les références utiles à votre préparation.', 'library', 'terracotta', 'Aucun contenu de référence importé pour le moment.', 2]),
        insert('sources', ['id', 'title', 'filename', 'sha256', 'page_count'], ['corps-humain-sante', source_title, 'corps-humain-sante.pdf', hashlib.sha256(args.pdf.read_bytes()).hexdigest(), 40]),
    ]
    for chapter_id, title, section, position in chapters:
        sql.append(insert('chapters', ['id', 'domain_id', 'title', 'section', 'position'], [chapter_id, 'sciences', title, section, position]))
    for entry in entries:
        sql.append(insert('definitions', ['id', 'chapter_id', 'concept', 'definition', 'source_id', 'source_page', 'source_item', 'source_excerpt', 'review_note', 'position'], [entry['id'], entry['chapter_id'], entry['concept'], entry['definition'], 'corps-humain-sante', entry['page'], entry['source_item'], entry['excerpt'], entry['review_note'], entry['position']]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('\n'.join(sql) + '\n', encoding='utf-8')
    report = ROOT / 'artifacts/extraction/definitions.csv'
    report.parent.mkdir(parents=True, exist_ok=True)
    with report.open('w', newline='', encoding='utf-8-sig') as handle:
        writer = csv.writer(handle, delimiter=';')
        writer.writerow(['Titre du chapitre', 'Nom / concept', 'Définition', 'Page PDF', 'Note de vérification'])
        writer.writerows([entry['chapter_title'], entry['concept'], entry['definition'], entry['page'], entry['review_note'] or ''] for entry in entries)
    print(f'{len(entries)} notions extraites dans {len(chapters)} chapitres. Migration : {args.output}')
    for entry in entries:
        if entry['review_note']:
            print(f"À vérifier — page {entry['page']}, {entry['concept']}: {entry['review_note']}")

if __name__ == '__main__':
    main()
