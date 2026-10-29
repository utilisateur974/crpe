import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import initSqlJs from 'sql.js'
import { hydrateContent } from '../../src/services/content'
import { readDatabaseContent } from '../../src/services/database-reader'
import type { DatabaseContent } from '../../src/services/database-reader'
import { buildQuiz, getQuizOptions, getQuizPrompt } from '../../src/services/quiz'
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
    expect(content.cards.filter(card => card.domain === 'sciences')).toHaveLength(120)
    expect(content.cards).toHaveLength(290)
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
  it('charge les 108 associations préparées et garde quatre réponses issues du livret', () => {
    const questions = buildQuiz(content.cards.filter(card => card.domain === 'sciences'), content.cards)
    expect(questions).toHaveLength(108)
    expect(new Set(questions.map(question => question.card.category)).size).toBe(17)
    for (const { card, options } of questions) {
      expect(card.quiz?.distractorIds).toHaveLength(3)
      expect(options).toHaveLength(4)
      expect(new Set(options.map(option => option.answer)).size).toBe(4)
      expect(new Set(options.map(option => option.concept)).size).toBe(4)
      expect(options.filter(option => option.id === card.id)).toHaveLength(1)
      for (const option of options) {
        const original = content.cards.find(item => item.id === option.id)!
        expect(option.answer).toBe(original.answer)
        expect(option.concept).toBe(original.concept)
        expect(option.source).toBe(original.source)
        expect(original.reviewNote).toBeUndefined()
        expect(option.id === card.id || card.quiz?.distractorIds.includes(option.id)).toBe(true)
      }
    }
  })
  it('écarte les textes à vérifier et les questions générales non retenues', () => {
    for (const id of ['corps-sante-p39-05-1', 'corps-sante-p12-01-1', 'corps-sante-p20-05-1']) {
      expect(getQuizOptions(content.cards.find(card => card.id === id)!, content.cards)).toBeNull()
    }
    expect(getQuizOptions({ ...demoCards[0], reviewNote: 'À vérifier' }, demoCards)).toBeNull()
  })
  it('propose pour le neurone les trois notions distinctes annoncées, même dans une sélection d’une carte', () => {
    const neuron = content.cards.find(card => card.concept === 'Neurone')!
    const [question] = buildQuiz([neuron], content.cards)
    expect(getQuizPrompt(neuron)).toBe('Quelle définition correspond à la notion « Neurone » ?')
    expect(question.options.map(option => option.concept).sort()).toEqual(['Neurone', 'Cerveau', 'Moelle épinière', 'Système nerveux périphérique (SNP)'].sort())
  })
  it('relie les données SQLite aux flashcards de l’application', async () => {
    hydrateContent(content)
    const { cards, domains, getDomainCards } = await import('../../src/services/content')
    expect(domains.map(domain => domain.id)).toEqual(['sciences', 'references'])
    expect(getDomainCards('sciences')).toHaveLength(120)
    expect(getDomainCards('references')).toHaveLength(170)
    expect(cards.filter(card => card.domain === 'sciences').every(card => card.question === card.concept && card.answer.length > 0)).toBe(true)
  })
  it('les migrations reconstruisent la base avec les contraintes et les trois colonnes demandées', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec('PRAGMA foreign_keys = ON')
      db.exec(readFileSync('database/migrations/001-schema.sql', 'utf8'))
      db.exec(readFileSync('database/migrations/002-corps-humain-sante.sql', 'utf8'))
      const definitionsBefore = db.prepare('SELECT * FROM definitions ORDER BY id').all()
      for (const migration of readdirSync('database/migrations').filter(name => name.endsWith('.sql') && name > '002-corps-humain-sante.sql').sort()) {
        db.exec(readFileSync(`database/migrations/${migration}`, 'utf8'))
      }
      expect(db.prepare('SELECT * FROM definitions ORDER BY id').all()).toEqual(definitionsBefore)
      expect(db.prepare('SELECT COUNT(*) AS total FROM quiz_distractors').get()?.total).toBe(324)
      const rows = db.prepare('SELECT chapter_title, concept, definition FROM definition_catalog').all()
      expect(rows).toHaveLength(120)
      expect(db.prepare('PRAGMA integrity_check').get()?.integrity_check).toBe('ok')
      expect(db.prepare('PRAGMA foreign_key_check').all()).toHaveLength(0)
      const source = db.prepare('SELECT sha256 FROM sources').get()
      expect(String(source?.sha256)).toMatch(/^[a-f0-9]{64}$/)
    } finally { db.close() }
  })
})
