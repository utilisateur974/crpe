import type { Database } from 'sql.js'
import type { Card, Definition, Domain, LiteraryReference } from '../types'
import { validateContent } from './content-validation'
import { getReferenceQuestion } from './reference-revision'

export type DatabaseContent = { domains: Domain[]; cards: Card[]; definitions: Definition[]; references: LiteraryReference[] }

function rows(database: Database, query: string) {
  const result = database.exec(query)[0]
  return result ? result.values.map(values => Object.fromEntries(result.columns.map((column, index) => [column, values[index]]))) : []
}

export function readDatabaseContent(database: Database): DatabaseContent {
  if (database.exec('PRAGMA user_version')[0]?.values[0][0] !== 4) throw new Error('Version de base de données incompatible. Appliquer les migrations du projet.')
  const domainRows = rows(database, 'SELECT id, name, description, icon, color, note FROM domains ORDER BY position, id')
  const definitionRows = rows(database, 'SELECT * FROM definition_catalog ORDER BY chapter_position, position, id')
  const distractorRows = rows(database, 'SELECT definition_id, distractor_id FROM quiz_distractors ORDER BY definition_id, position')
  const referenceRows = rows(database, 'SELECT * FROM literary_reference_catalog ORDER BY position, id')
  const themeRows = rows(database, 'SELECT reference_id, theme FROM literary_reference_themes ORDER BY reference_id, position')
  const referenceDistractors = rows(database, 'SELECT reference_id, distractor_id FROM literary_quiz_distractors ORDER BY reference_id, position')
  const references: LiteraryReference[] = referenceRows.map(row => ({
    id: String(row.id), domain: String(row.domain_id), title: String(row.title), creator: String(row.creator),
    publicationDate: String(row.publication_date),
    referenceText: String(row.reference_text), analysisText: row.analysis_text === null ? null : String(row.analysis_text),
    themes: themeRows.filter(theme => theme.reference_id === row.id).map(theme => String(theme.theme)),
    source: String(row.source_title), sourceFilename: String(row.source_filename),
    sheetName: String(row.sheet_name), sourceRow: Number(row.source_row),
    originalLabel: String(row.source_reference), originalText: row.source_text === null ? null : String(row.source_text),
    originalThemes: row.source_themes === null ? null : String(row.source_themes),
    excerptText: row.excerpt_text === null ? null : String(row.excerpt_text),
    excerptSource: row.excerpt_source === null ? null : String(row.excerpt_source),
    excerptStatus: row.excerpt_status as LiteraryReference['excerptStatus'],
    isComplete: row.is_complete === 1,
  }))
  const definitions: Definition[] = definitionRows.map(row => ({
    id: String(row.id), domain: String(row.domain_id), chapter: String(row.chapter_title), section: String(row.section),
    concept: String(row.concept), definition: String(row.definition), source: String(row.source_title),
    sourcePage: Number(row.source_page), sourceExcerpt: String(row.source_excerpt),
    ...(row.review_note ? { reviewNote: String(row.review_note) } : {}),
  }))
  const scienceCards: Card[] = definitions.map(item => {
    const distractorIds = distractorRows.filter(row => row.definition_id === item.id).map(row => String(row.distractor_id))
    return {
      id: item.id, domain: item.domain, category: item.chapter, subcategory: item.section,
      chapter: item.chapter, concept: item.concept, question: item.concept, answer: item.definition,
      source: `${item.source} — p. ${item.sourcePage}`,
      ...(item.reviewNote ? { reviewNote: item.reviewNote } : {}),
      ...(distractorIds.length ? { quiz: { distractorIds } } : {}),
    }
  })
  const referenceCards: Card[] = references.map(reference => {
    const distractorIds = referenceDistractors.filter(row => row.reference_id === reference.id).map(row => String(row.distractor_id))
    return {
      id: reference.id, domain: reference.domain, category: 'Références littéraires et artistiques',
      subcategory: reference.themes[0] ?? 'Sans thème', question: getReferenceQuestion(reference),
      answer: reference.originalLabel,
      ...(distractorIds.length ? { quiz: { distractorIds } } : {}),
      tags: reference.themes, source: `${reference.source} — ${reference.sheetName}, ligne ${reference.sourceRow}`,
      reference,
    }
  })
  const validDomains = domainRows.map(row => ({ ...row, ...(row.note === null ? { note: undefined } : {}) }))
  const validated = validateContent(validDomains, [...scienceCards, ...referenceCards])
  return { ...validated, definitions, references }
}
