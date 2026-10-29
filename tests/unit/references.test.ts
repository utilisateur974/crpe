import { beforeAll, describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import initSqlJs from 'sql.js'
import { readDatabaseContent } from '../../src/services/database-reader'
import type { DatabaseContent } from '../../src/services/database-reader'
import { buildQuiz, getQuizOptions, getQuizPrompt } from '../../src/services/quiz'
import { getReferenceQuestion, getReferenceWorkKey } from '../../src/services/reference-revision'

let content: DatabaseContent
beforeAll(async () => {
  const SQL = await initSqlJs()
  const db = new SQL.Database(readFileSync('database/crpe.sqlite'))
  content = readDatabaseContent(db)
  db.close()
})

describe('Source des références littéraires', () => {
  it('remplace les anciennes références par les 170 lignes du nouveau classeur', () => {
    expect(content.references).toHaveLength(170)
    expect(new Set(content.references.map(item => item.id)).size).toBe(170)
    expect(content.references.every(item => item.id.startsWith('literature-enriched-') && item.title && item.creator && item.sheetName === 'Feuil1')).toBe(true)
    expect(content.references.map(item => item.sourceRow)).toEqual(Array.from({ length: 170 }, (_, index) => index + 2))
    expect(content.references.every(item => item.sourceFilename === 'references_CRPE_enrichies_word_ghibli.xlsx')).toBe(true)
    expect(content.references.find(item => item.title === 'Le Petit Prince')).toMatchObject({ creator: 'Antoine de Saint-Exupéry', publicationDate: '1943', sourceRow: 2 })
  })
  it('sépare les deux passages et conserve les formulations « que » et « qu’un »', () => {
    for (const reference of content.references) {
      expect(reference.referenceText.startsWith('On peut également penser')).toBe(true)
      if (reference.analysisText) expect(reference.analysisText).toMatch(/^Cette référence /)
    }
    const hugo = content.references.find(item => item.title === 'Les Misérables')!
    expect(hugo.analysisText).toContain('Cette référence montre qu’un individu')
    expect(`${hugo.referenceText} ${hugo.analysisText}`).toBe(hugo.originalText)
    const prince = content.references.find(item => item.title === 'Le Petit Prince')!
    expect(`${prince.referenceText} ${prince.analysisText}`).toBe(prince.originalText)
  })
  it('conserve la seule interprétation manquante et les anciennes entrées complétées', () => {
    const incomplete = content.references.filter(item => !item.isComplete)
    expect(incomplete.map(item => item.sourceRow)).toEqual([12])
    expect(incomplete.every(item => item.analysisText === null)).toBe(true)
    const yourcenar = content.references.find(item => item.creator === 'Marguerite Yourcenar')!
    expect(yourcenar.title).toBe('« Comment Wang-Fô fut sauvé »')
    expect(yourcenar.originalText).toContain('le peintre transforme le réel')
    expect(yourcenar.analysisText).toContain('il peut le recréer')
    expect(content.references.find(item => item.title === 'Le Nom de la rose (film)')).toMatchObject({ creator: 'Jean-Jacques Annaud', publicationDate: '1986', isComplete: true })
    expect(content.references.filter(item => item.isComplete)).toHaveLength(169)
  })
  it('préserve les thèmes multiples sans en ajouter aux cellules vides', () => {
    expect(content.references.find(item => item.title === 'Le Petit Prince')?.themes).toContain('ouverture aux autres')
    expect(content.references.find(item => item.creator === 'Francisco de Goya')?.themes).toEqual(['guerre'])
    expect(content.references.find(item => item.title === 'Guernica')?.themes).toContain('transformation du réel')
    expect(content.references.every(item => item.themes.length > 0)).toBe(true)
  })
  it('affiche phrase et extrait au recto et la référence complète au verso', () => {
    const cards = content.cards.filter(card => card.domain === 'references')
    expect(cards).toHaveLength(170)
    for (const card of cards) {
      expect(card.question).toBe(getReferenceQuestion(card.reference!))
      expect(card.question).toContain(card.reference!.originalText)
      expect(card.question).toContain(card.reference!.excerptText)
      expect(card.answer).toBe(card.reference?.originalLabel)
      expect(card.explanation).toBeUndefined()
      expect(card.source).toContain(`ligne ${card.reference?.sourceRow}`)
    }
    expect(buildQuiz(cards, content.cards)).toHaveLength(170)
  })
  it('propose quatre œuvres existantes distinctes et exclut les variantes de la bonne réponse', () => {
    const questions = buildQuiz(content.cards.filter(card => card.reference), content.cards)
    expect(questions).toHaveLength(170)
    for (const { card, options } of questions) {
      expect(getQuizPrompt(card)).toBe('À quelle référence correspondent ces éléments ?')
      expect(options).toHaveLength(4)
      expect(new Set(options.map(option => option.answer)).size).toBe(4)
      expect(options.filter(option => option.id === card.id)).toHaveLength(1)
      const originals = options.map(option => content.cards.find(item => item.id === option.id)!)
      expect(new Set(originals.map(item => getReferenceWorkKey(item.reference!))).size).toBe(4)
      expect(new Set(originals.map(item => item.reference!.creator)).size).toBe(4)
      for (const option of options) expect(option.answer).toBe(content.references.find(item => item.id === option.id)?.originalLabel)
    }
  })
  it('conserve quatre choix pour une seule question sélectionnée et refuse une variante comme distracteur', () => {
    const [card] = content.cards.filter(item => item.reference?.title === 'Princesse Mononoké')
    expect(buildQuiz([card], content.cards)).toHaveLength(1)
    const firstDistractor = card.quiz!.distractorIds[0]
    const invalidBank = content.cards.map(item => item.id === firstDistractor ? {
      ...item, reference: { ...item.reference!, title: card.reference!.title, creator: card.reference!.creator },
    } : item)
    expect(getQuizOptions(card, invalidBank)).toBeNull()
  })
  it('conserve les variantes argumentatives d’une même œuvre', () => {
    expect(new Set(content.references.map(item => `${item.title}|${item.creator}|${item.publicationDate}`)).size).toBe(146)
    const mononoke = content.references.filter(item => item.title === 'Princesse Mononoké')
    expect(mononoke).toHaveLength(8)
    expect(new Set(mononoke.map(item => item.referenceText)).size).toBe(8)
  })
  it('importe dates, répliques et sources en distinguant les extraits manquants', () => {
    expect(content.references.filter(item => item.excerptStatus === 'provided')).toHaveLength(83)
    expect(content.references.filter(item => item.excerptStatus === 'missing')).toHaveLength(80)
    expect(content.references.filter(item => item.excerptStatus === 'not-applicable')).toHaveLength(7)
    expect(content.references.find(item => item.title === 'Le Petit Prince')).toMatchObject({ excerptText: 'Le Renard : « On ne voit bien qu’avec le cœur. »', excerptSource: 'https://fr.wikiquote.org/wiki/Le_Petit_Prince' })
    const antiquity = content.references.find(item => item.title === 'L’Odyssée')!
    expect(antiquity.publicationDate).toBe('vers 700 av. J.-C.')
    expect(content.references.some(item => item.analysisText?.startsWith('Cette référence peut être mobilisée'))).toBe(true)
  })
  it('supprime et recrée les tables littéraires sans conserver les anciennes lignes', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec('PRAGMA foreign_keys = ON')
      for (const name of readdirSync('database/migrations').filter(name => name.endsWith('.sql') && name < '006-').sort()) {
        db.exec(readFileSync(`database/migrations/${name}`, 'utf8'))
      }
      expect(db.prepare('SELECT COUNT(*) AS total FROM literary_references').get()?.total).toBe(16)
      const scienceBefore = db.prepare('SELECT * FROM definitions ORDER BY id').all()
      const quizBefore = db.prepare('SELECT * FROM quiz_distractors ORDER BY definition_id, position').all()
      db.exec('BEGIN')
      db.exec(readFileSync('database/migrations/006-replace-literary-references-schema.sql', 'utf8'))
      db.exec(readFileSync('database/migrations/007-enriched-literary-references-data.sql', 'utf8'))
      db.exec('COMMIT')
      expect(db.prepare('SELECT COUNT(*) AS total FROM literary_references').get()?.total).toBe(170)
      expect(db.prepare("SELECT COUNT(*) AS total FROM literary_references WHERE id LIKE 'literature-feuil1-%'").get()?.total).toBe(0)
      expect(db.prepare('SELECT COUNT(*) AS total FROM literary_sources').get()?.total).toBe(1)
      expect(db.prepare('SELECT filename FROM literary_sources').get()?.filename).toBe('references_CRPE_enrichies_word_ghibli.xlsx')
      expect(db.prepare('SELECT * FROM definitions ORDER BY id').all()).toEqual(scienceBefore)
      expect(db.prepare('SELECT * FROM quiz_distractors ORDER BY definition_id, position').all()).toEqual(quizBefore)
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    } finally { db.close() }
  })
})
