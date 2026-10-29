import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from import_enriched_references import HEADERS, extract
import openpyxl


class EnrichedReferencesImportTests(unittest.TestCase):
    def workbook(self, rows):
        directory = tempfile.TemporaryDirectory(prefix='crpe-import-')
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / 'references.xlsx'
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = 'Feuil1'
        sheet.append(HEADERS)
        for row in rows:
            sheet.append(row)
        workbook.save(path)
        workbook.close()
        return path

    def test_preserves_variants_and_all_five_columns(self):
        label = 'Œuvre (film) – Auteur (vers 700 av. J.-C.)'
        text = 'Une scène du récit. Cette référence peut être mobilisée pour montrer que le personnage évolue.'
        quote = 'Personnage : « Une réplique. »'
        path = self.workbook([
            [label, text, 'identité, voyage', quote, 'https://example.com/source'],
            [label, 'Autre scène. Cette référence permet d’interroger la liberté.', 'liberté', 'À compléter : citation.', 'Note source'],
        ])
        entries, sheets = extract(path)
        self.assertEqual(sheets, 1)
        self.assertEqual(len(entries), 2)
        self.assertNotEqual(entries[0]['id'], entries[1]['id'])
        self.assertEqual(entries[0]['source_reference'], label)
        self.assertEqual(entries[0]['title'], 'Œuvre (film)')
        self.assertEqual(entries[0]['publication_date'], 'vers 700 av. J.-C.')
        self.assertEqual(entries[0]['source_text'], text)
        self.assertEqual(entries[0]['source_themes'], 'identité, voyage')
        self.assertEqual(entries[0]['excerpt_text'], quote)
        self.assertEqual(entries[0]['excerpt_source'], 'https://example.com/source')
        self.assertEqual(entries[0]['themes'], ['identité', 'voyage'])
        self.assertTrue(entries[1]['analysis_text'].startswith('Cette référence permet'))

    def test_leaves_missing_interpretation_empty(self):
        path = self.workbook([['Titre – Auteur (2001)', 'Description seule.', 'nature', None, None]])
        entries, _ = extract(path)
        self.assertIsNone(entries[0]['analysis_text'])
        self.assertTrue(entries[0]['reference_text'].endswith('Description seule.'))
        self.assertIsNone(entries[0]['excerpt_text'])

    def test_rejects_formulas_and_malformed_identification(self):
        formula = self.workbook([['Titre – Auteur (2001)', '=1+1', 'nature', None, None]])
        with self.assertRaisesRegex(ValueError, 'Formule refusée'):
            extract(formula)
        invalid = self.workbook([['Sans signature ni date', 'Description.', 'nature', None, None]])
        with self.assertRaisesRegex(ValueError, 'non reconnu'):
            extract(invalid)


if __name__ == '__main__':
    unittest.main()
