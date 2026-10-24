import type { Database } from 'sql.js'
import type { Card, Definition, Domain } from '../types'
import { validateContent } from './content-validation'

export type DatabaseContent = { domains: Domain[]; cards: Card[]; definitions: Definition[] }

function rows(database: Database, query: string) {
  const result = database.exec(query)[0]
  return result ? result.values.map(values => Object.fromEntries(result.columns.map((column, index) => [column, values[index]]))) : []
}

export function readDatabaseContent(database: Database): DatabaseContent {
  if (database.exec('PRAGMA user_version')[0]?.values[0][0] !== 1) throw new Error('Version de base de données incompatible.')
  const domainRows = rows(database, 'SELECT id, name, description, icon, color, note FROM domains ORDER BY position, id')
  const definitionRows = rows(database, 'SELECT * FROM definition_catalog ORDER BY chapter_position, position, id')
  const distractorRows = rows(database, 'SELECT definition_id, distractor_id FROM quiz_distractors ORDER BY definition_id, position')
  const definitions: Definition[] = definitionRows.map(row => ({
    id: String(row.id), domain: String(row.domain_id), chapter: String(row.chapter_title), section: String(row.section),
    concept: String(row.concept), definition: String(row.definition), source: String(row.source_title),
    sourcePage: Number(row.source_page), sourceExcerpt: String(row.source_excerpt),
    ...(row.review_note ? { reviewNote: String(row.review_note) } : {}),
  }))
  const cards: Card[] = definitions.map(item => {
    const distractorIds = distractorRows.filter(row => row.definition_id === item.id).map(row => String(row.distractor_id))
    return {
      id: item.id, domain: item.domain, category: item.chapter, subcategory: item.section,
      chapter: item.chapter, concept: item.concept, question: item.concept, answer: item.definition,
      source: `${item.source} — p. ${item.sourcePage}`,
      ...(item.reviewNote ? { reviewNote: item.reviewNote } : {}),
      ...(distractorIds.length ? { quiz: { distractorIds } } : {}),
    }
  })
  const validDomains = domainRows.map(row => ({ ...row, ...(row.note === null ? { note: undefined } : {}) }))
  const validated = validateContent(validDomains, cards)
  return { ...validated, definitions }
}
