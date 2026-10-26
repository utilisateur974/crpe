import type { Card, QuizOption, QuizQuestion } from '../types'
import { shuffle } from '../utils/shuffle'

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr').normalize('NFC')
const conceptOf = (card: Card) => card.concept ?? card.question
const toOption = (card: Card): QuizOption => ({ id: card.id, answer: card.answer, concept: conceptOf(card), source: card.source })

export const getQuizPrompt = (card: Card) => card.concept
  ? `Quelle définition correspond à la notion « ${card.concept} » ?`
  : card.question

export function getQuizOptions(card: Card, bank: Card[]): QuizQuestion['options'] | null {
  if (!card.quiz || card.reviewNote) return null
  const seen = new Set([normalize(card.answer)])
  const seenConcepts = new Set([normalize(conceptOf(card))])
  const distractors: Card[] = []
  for (const id of card.quiz.distractorIds) {
    const candidate = bank.find(item => item.id === id)
    if (!candidate || candidate.reviewNote || candidate.domain !== card.domain || candidate.id === card.id
      || seen.has(normalize(candidate.answer)) || seenConcepts.has(normalize(conceptOf(candidate)))) continue
    seen.add(normalize(candidate.answer))
    seenConcepts.add(normalize(conceptOf(candidate)))
    distractors.push(candidate)
  }
  // Trois distracteurs approuvés par l’auteur sont nécessaires ; aucune réponse n’est inventée.
  if (distractors.length < 3) return null
  return [card, ...distractors.slice(0, 3)].map(toOption)
}

export function buildQuiz(deck: Card[], bank: Card[]): QuizQuestion[] {
  return shuffle(deck).flatMap(card => {
    const options = getQuizOptions(card, bank)
    return options ? [{ card, options: shuffle(options) }] : []
  })
}
