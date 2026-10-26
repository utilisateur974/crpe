import type { Card, Definition, Domain, LiteraryReference } from '../types'
import type { DatabaseContent } from './database-reader'
import { validateContent } from './content-validation'

// Le contenu est hydraté depuis SQLite avant le premier rendu de React.
export let domains: Domain[] = []
export let cards: Card[] = []
export let definitions: Definition[] = []
export let references: LiteraryReference[] = []

export function hydrateContent(content: DatabaseContent) {
  const validated = validateContent(content.domains, content.cards)
  domains = validated.domains
  cards = validated.cards
  definitions = content.definitions
  references = content.references
}

export { validateContent } from './content-validation'
export const getDomainCards = (id: string) => cards.filter(card => card.domain === id)
export function filterCards(deck: Card[], category: string, subcategory: string) {
  return deck.filter(card => (!category || card.category === category) && (!subcategory || card.subcategory === subcategory))
}
