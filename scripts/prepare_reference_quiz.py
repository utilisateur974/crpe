"""Prépare les distracteurs du quiz littéraire depuis les références existantes.

Choisit trois œuvres distinctes, de signatures différentes, en privilégiant
les thèmes communs. Les variantes d’une même œuvre ne se concurrencent pas.
Aucun texte de réponse n’est créé : les choix reprennent la colonne Référence.
"""
import argparse
import re
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def normalize(value):
    return re.sub(r'\s+', ' ', value).strip().casefold()

def choose_distractors(question, bank):
    question_work = (normalize(question['title']), normalize(question['creator']))
    candidates = [candidate for candidate in bank
                  if candidate['id'] != question['id']
                  and (normalize(candidate['title']), normalize(candidate['creator'])) != question_work
                  and normalize(candidate['creator']) != normalize(question['creator'])
                  and normalize(candidate['source_reference']) != normalize(question['source_reference'])]
    candidates.sort(key=lambda candidate: (-len(question['themes'] & candidate['themes']), candidate['position'], candidate['id']))
    chosen, works, creators = [], {question_work}, {normalize(question['creator'])}
    for candidate in candidates:
        work = (normalize(candidate['title']), normalize(candidate['creator']))
        creator = normalize(candidate['creator'])
        if work in works or creator in creators:
            continue
        chosen.append(candidate['id'])
        works.add(work)
        creators.add(creator)
        if len(chosen) == 3:
            break
    return chosen

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--database', type=Path, default=ROOT / 'database/crpe.sqlite')
    parser.add_argument('--output', type=Path, default=ROOT / 'database/migrations/008-reference-quiz.sql')
    args = parser.parse_args()
    connection = sqlite3.connect(args.database.resolve().as_uri() + '?mode=ro', uri=True)
    connection.row_factory = sqlite3.Row
    try:
        bank = [dict(row) for row in connection.execute('SELECT id, title, creator, source_reference, position FROM literary_references ORDER BY position, id')]
        themes = {}
        for row in connection.execute('SELECT reference_id, theme FROM literary_reference_themes'):
            themes.setdefault(row['reference_id'], set()).add(normalize(row['theme']))
        for item in bank:
            item['themes'] = themes.get(item['id'], set())
        assignments = [(question['id'], choose_distractors(question, bank)) for question in bank]
        if any(len(distractors) != 3 for _, distractors in assignments):
            raise ValueError('Trois œuvres distinctes ne sont pas disponibles pour chaque question.')
        sql = ['-- Quiz : phrase réutilisable + extrait → référence complète du classeur.',
               '-- Les distracteurs sont des œuvres existantes, classées par proximité des thèmes.',
               'CREATE TABLE literary_quiz_distractors (',
               '  reference_id TEXT NOT NULL REFERENCES literary_references(id),',
               '  distractor_id TEXT NOT NULL REFERENCES literary_references(id),',
               '  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),',
               '  PRIMARY KEY (reference_id, distractor_id),',
               '  UNIQUE (reference_id, position),',
               '  CHECK (reference_id <> distractor_id)',
               ');']
        for reference_id, distractors in assignments:
            for position, distractor_id in enumerate(distractors, 1):
                sql.append(f"INSERT INTO literary_quiz_distractors (reference_id, distractor_id, position) VALUES ('{reference_id}', '{distractor_id}', {position});")
        sql.append('PRAGMA user_version = 4;')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text('\n'.join(sql) + '\n', encoding='utf-8')
        print(f'{len(assignments)} questions, {sum(len(items) for _, items in assignments)} distracteurs enregistrés dans {args.output}.')
    finally:
        connection.close()

if __name__ == '__main__':
    main()
