import type { Card, Progress } from '../types'

export function getStats(deck: Card[], progress: Progress) {
  const known = deck.filter(card => progress.cards[card.id]?.status === 'known').length
  const review = deck.filter(card => progress.cards[card.id]?.status === 'review').length
  const viewed = deck.filter(card => progress.cards[card.id]).length
  return { total: deck.length, known, review, viewed, percent: deck.length ? Math.round(known / deck.length * 100) : 0 }
}

export const formatDate = (date: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date))
export const plural = (count: number, singular: string, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`
