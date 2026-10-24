import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import initSqlJs from 'sql.js'
import { hydrateContent } from '../../src/services/content'
import { readDatabaseContent } from '../../src/services/database-reader'
import type { DatabaseContent } from '../../src/services/database-reader'
import { getQuizOptions } from '../../src/services/quiz'
import { cards as demoCards } from '../fixtures'

let content: DatabaseContent
beforeAll(async () => {
  const SQL = await initSqlJs()
  const db = new SQL.Database(readFileSync('database/crpe.sqlite'))
  content = readDatabaseContent(db)
  db.close()
})

describe('Base SQLite des définitions', () => {
  it('charge 120 notions, 17 chapitres et leurs pages, sans carte fictive', () => {
    expect(content.definitions).toHaveLength(120)
    expect(new Set(content.definitions.map(item => item.chapter)).size).toBe(17)
    expect(content.cards).toHaveLength(120)
    expect(content.cards.every(card => !card.demo && !card.id.startsWith('demo-'))).toBe(true)
    expect(content.definitions.every(item => item.sourcePage >= 4 && item.sourcePage <= 39 && item.sourceExcerpt.length > 0)).toBe(true)
  })
  it('préserve les définitions du document et sépare les trois rôles des nutriments', () => {
    expect(content.definitions.find(item => item.concept === 'Digestion')).toMatchObject({ chapter: 'Digestion et absorption intestinale', definition: 'ensemble des transformations mécaniques et chimiques des aliments dans le tube digestif.', sourcePage: 8 })
    expect(content.definitions.find(item => item.concept === 'Neurone')?.definition).toContain('dendrites')
    expect(content.definitions.filter(item => ['Glucides', 'Lipides', 'Protéines'].includes(item.concept))).toHaveLength(3)
  })
  it('conserve la formulation du glucagon et signale l’incohérence du PDF', () => {
    const glucagon = content.definitions.find(item => item.concept === 'Glucagon')!
    expect(glucagon.definition).toContain('hypoglycémiante')
    expect(glucagon.reviewNote).toContain('Incohérence dans le PDF')
    expect(content.cards.find(card => card.id === glucagon.id)?.reviewNote).toBe(glucagon.reviewNote)
  })
  it('n’invente pas de QCM pour les définitions importées et écarte les textes à vérifier', () => {
    expect(content.cards.every(card => getQuizOptions(card, content.cards) === null)).toBe(true)
    expect(getQuizOptions({ ...demoCards[0], reviewNote: 'À vérifier' }, demoCards)).toBeNull()
  })
  it('relie les données SQLite aux flashcards de l’application', async () => {
    hydrateContent(content)
    const { cards, domains, getDomainCards } = await import('../../src/services/content')
    expect(domains.map(domain => domain.id)).toEqual(['sciences', 'references'])
    expect(getDomainCards('sciences')).toHaveLength(120)
    expect(getDomainCards('references')).toHaveLength(0)
    expect(cards.every(card => card.question === card.concept && card.answer.length > 0)).toBe(true)
  })
  it('les migrations reconstruisent la base avec les contraintes et les trois colonnes demandées', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec('PRAGMA foreign_keys = ON')
      db.exec(readFileSync('database/migrations/001-schema.sql', 'utf8'))
      db.exec(readFileSync('database/migrations/002-corps-humain-sante.sql', 'utf8'))
      const rows = db.prepare('SELECT chapter_title, concept, definition FROM definition_catalog').all()
      expect(rows).toHaveLength(120)
      expect(db.prepare('PRAGMA integrity_check').get()?.integrity_check).toBe('ok')
      expect(db.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0)
      const source = db.prepare('SELECT sha256 FROM sources').get()
      expect(String(source?.sha256)).toMatch(/^[a-f0-9]{64}$/)
      expect(fileURLToPath(new URL('../../database/crpe.sqlite', import.meta.url))).toContain('crpe.sqlite')
    } finally { db.close() }
  })
})
