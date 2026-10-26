import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import initSqlJs from 'sql.js'
import { readDatabaseContent } from '../../src/services/database-reader'
import type { DatabaseContent } from '../../src/services/database-reader'
import { buildQuiz } from '../../src/services/quiz'

let content: DatabaseContent
beforeAll(async () => {
  const SQL = await initSqlJs()
  const db = new SQL.Database(readFileSync('database/crpe.sqlite'))
  content = readDatabaseContent(db)
  db.close()
})

describe('Source des références littéraires', () => {
  it('importe les 16 lignes avec titre, auteur et provenance vérifiable', () => {
    expect(content.references).toHaveLength(16)
    expect(new Set(content.references.map(item => item.id)).size).toBe(16)
    expect(content.references.every(item => item.title && item.creator && item.sheetName === 'Feuil1' && item.sourceRow >= 2 && item.sourceRow <= 17)).toBe(true)
    expect(content.references.map(item => item.sourceRow)).toEqual(Array.from({ length: 16 }, (_, index) => index + 2))
    expect(content.references.find(item => item.title === 'Le Petit Prince')).toMatchObject({ creator: 'Antoine de Saint-Exupéry', sourceRow: 2 })
  })
  it('sépare les deux passages et conserve les formulations « que » et « qu’un »', () => {
    for (const reference of content.references) {
      expect(reference.referenceText.startsWith('On peut également penser')).toBe(true)
      if (reference.analysisText) expect(reference.analysisText).toMatch(/^Cette référence montre qu(?:e|’)/)
    }
    const hugo = content.references.find(item => item.title === 'Les Misérables')!
    expect(hugo.analysisText).toContain('Cette référence montre qu’un individu')
    expect(`${hugo.referenceText} ${hugo.analysisText}`).toBe(hugo.originalText)
    const prince = content.references.find(item => item.title === 'Le Petit Prince')!
    expect(`${prince.referenceText} ${prince.analysisText}`).toBe(prince.originalText)
  })
  it('laisse les trois interprétations manquantes à compléter', () => {
    const incomplete = content.references.filter(item => !item.isComplete)
    expect(incomplete.map(item => item.sourceRow)).toEqual([12, 15, 17])
    expect(incomplete.every(item => item.analysisText === null)).toBe(true)
    const yourcenar = content.references.find(item => item.creator === 'Marguerite Yourcenar')!
    expect(yourcenar.title).toBe('Comment Wang-Fô fut sauvé')
    expect(yourcenar.originalText).toBeNull()
    expect(yourcenar.originalLabel).toContain('Nouvelles orientales')
    expect(content.references.filter(item => item.isComplete)).toHaveLength(13)
  })
  it('préserve les thèmes multiples sans en ajouter aux cellules vides', () => {
    expect(content.references.find(item => item.title === 'Le Petit Prince')?.themes).toContain('ouverture aux autres')
    expect(content.references.find(item => item.creator === 'Francisco de Goya')?.themes).toEqual(['guerre'])
    expect(content.references.find(item => item.title === 'Guernica')?.themes).toEqual([])
  })
  it('restitue les références en flashcards sans fabriquer de quiz', () => {
    const cards = content.cards.filter(card => card.domain === 'references')
    expect(cards).toHaveLength(16)
    for (const card of cards) {
      expect(card.reference?.title).toBe(card.question)
      expect(card.reference?.referenceText).toBe(card.answer)
      expect(card.explanation ?? null).toBe(card.reference?.analysisText)
      expect(card.source).toContain(`ligne ${card.reference?.sourceRow}`)
    }
    expect(buildQuiz(cards, content.cards)).toEqual([])
  })
})
