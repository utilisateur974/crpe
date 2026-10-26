import { describe, expect, it } from 'vitest'
import { filterCards, validateContent } from '../../src/services/content'
import { cards, domains } from '../fixtures'
import { buildQuiz, getQuizOptions } from '../../src/services/quiz'
import { shuffle } from '../../src/utils/shuffle'

const scienceCard = cards.find(card => card.id === 'demo-sc-01')!

describe('Contenus et sélection', () => {
  it('valide les fichiers livrés et identifie toutes les cartes comme fictives', () => {
    expect(validateContent(domains, cards).cards.length).toBe(12)
    expect(cards.every(card => card.demo && card.source)).toBe(true)
  })
  it('refuse les doublons, les domaines inconnus et les réponses vides', () => {
    expect(() => validateContent(domains, [cards[0], cards[0]])).toThrow()
    expect(() => validateContent(domains, [{ ...cards[0], domain: 'inconnu' }])).toThrow()
    expect(() => validateContent(domains, [{ ...cards[0], answer: '' }])).toThrow()
  })
  it('combine catégorie et sous-catégorie et accepte une sélection vide', () => {
    expect(filterCards(cards, 'Matière', 'Jeu des symboles')).toHaveLength(4)
    expect(filterCards(cards, 'Matière', 'Jeu des couleurs')).toHaveLength(0)
    expect(filterCards(cards, '', '')).toHaveLength(12)
  })
})

describe('Quiz sans génération pédagogique', () => {
  it('utilise exclusivement quatre réponses distinctes provenant des cartes référencées', () => {
    const questions = buildQuiz(cards, cards)
    expect(questions).toHaveLength(12)
    for (const { card, options } of questions) {
      expect(options).toHaveLength(4)
      expect(new Set(options.map(option => option.answer)).size).toBe(4)
      expect(options.filter(option => option.id === card.id)).toHaveLength(1)
      expect(options.every(option => cards.some(item => item.id === option.id && item.answer === option.answer && item.domain === card.domain))).toBe(true)
      expect(options.every(option => option.id === card.id || card.quiz?.distractorIds.includes(option.id))).toBe(true)
    }
  })
  it('écarte une carte sans configuration ou sans trois distracteurs valides', () => {
    expect(getQuizOptions({ ...cards[0], quiz: undefined }, cards)).toBeNull()
    expect(getQuizOptions({ ...cards[0], quiz: { distractorIds: ['absent', 'demo-sc-02', 'demo-sc-03'] } }, cards)).toBeNull()
    expect(buildQuiz([{ ...cards[0], quiz: undefined }], cards)).toHaveLength(0)
  })
  it('écarte les doublons de réponses, les autoréférences et les autres domaines', () => {
    const duplicatedAnswerBank = cards.map(card => card.id === 'demo-sc-02' ? { ...card, answer: ` ${scienceCard.answer.toLowerCase()} ` } : card)
    expect(getQuizOptions(scienceCard, duplicatedAnswerBank)).toBeNull()
    expect(getQuizOptions({ ...scienceCard, quiz: { distractorIds: ['demo-ref-01', 'demo-sc-02', 'demo-sc-03', scienceCard.id] } }, cards)).toBeNull()
  })
  it('autorise une sélection d’une carte avec ses distracteurs approuvés dans la banque', () => {
    expect(buildQuiz([cards[0]], cards)).toHaveLength(1)
  })
  it('écarte les notions identiques, les doublons d’espaces et les distracteurs à vérifier', () => {
    const sameConcept = cards.map(card => card.id === 'demo-sc-02' ? { ...card, concept: 'Alpha' } : card)
    expect(getQuizOptions({ ...scienceCard, concept: 'Alpha' }, sameConcept)).toBeNull()
    const flagged = cards.map(card => card.id === 'demo-sc-02' ? { ...card, reviewNote: 'À vérifier' } : card)
    expect(getQuizOptions(scienceCard, flagged)).toBeNull()
    const spacing = cards.map(card => card.id === 'demo-sc-02' ? { ...card, answer: 'première   réponse' } : card)
    expect(getQuizOptions({ ...scienceCard, answer: 'première réponse' }, spacing)).toBeNull()
  })
})

describe('Mélange', () => {
  it('préserve toutes les cartes et ne modifie pas la source', () => {
    const original = [1, 2, 3, 4]
    const result = shuffle(original, () => 0)
    expect(result).not.toEqual(original)
    expect([...result].sort()).toEqual(original)
    expect(original).toEqual([1, 2, 3, 4])
    expect(shuffle([])).toEqual([])
  })
})
