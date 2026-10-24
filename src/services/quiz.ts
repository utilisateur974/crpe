import type { Card, QuizQuestion } from '../types'
import { shuffle } from '../utils/shuffle'

const normalize = (value: string) => value.trim().toLocaleLowerCase('fr').normalize('NFC')

export function getQuizOptions(card: Card, bank: Card[]): QuizQuestion['options'] | null {
  if (!card.quiz || card.reviewNote) return null
  const seen = new Set([normalize(card.answer)])
  const distractors: Card[] = []
  for (const id of card.quiz.distractorIds) {
    const candidate = bank.find(item => item.id === id)
    if (!candidate || candidate.reviewNote || candidate.domain !== card.domain || candidate.id === card.id || seen.has(normalize(candidate.answer))) continue
    seen.add(normalize(candidate.answer))
    distractors.push(candidate)
  }
  // Trois distracteurs approuvés par l’auteur sont nécessaires ; aucune réponse n’est inventée.
  if (distractors.length < 3) return null
  return [{ id: card.id, answer: card.answer }, ...distractors.slice(0, 3).map(item => ({ id: item.id, answer: item.answer }))]
}

export function buildQuiz(deck: Card[], bank: Card[]): QuizQuestion[] {
  return shuffle(deck).flatMap(card => {
    const options = getQuizOptions(card, bank)
    return options ? [{ card, options: shuffle(options) }] : []
  })
}
