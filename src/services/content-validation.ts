import type { Card, Domain } from '../types'

export function validateContent(domainInput: unknown, cardInput: unknown): { domains: Domain[]; cards: Card[] } {
  if (!Array.isArray(domainInput) || !Array.isArray(cardInput)) throw new Error('Les domaines et les cartes doivent être des listes.')
  const domainIds = new Set<string>()
  for (const domain of domainInput) {
    if (!domain || typeof domain.id !== 'string' || !/^[a-z0-9-]+$/.test(domain.id) || domainIds.has(domain.id)
      || typeof domain.name !== 'string' || !domain.name.trim() || typeof domain.description !== 'string'
      || typeof domain.icon !== 'string' || !['sage', 'terracotta', 'blue'].includes(domain.color)
      || (domain.note !== undefined && typeof domain.note !== 'string')) {
      throw new Error('Un domaine est invalide ou son identifiant est dupliqué.')
    }
    domainIds.add(domain.id)
  }
  const ids = new Set<string>()
  for (const card of cardInput) {
    const fields = ['id', 'domain', 'category', 'subcategory', 'question', 'answer']
    if (!card || fields.some(key => typeof card[key] !== 'string' || !card[key].trim())
      || ids.has(card.id) || !domainIds.has(card.domain)
      || ['explanation', 'example', 'source'].some(key => card[key] !== undefined && typeof card[key] !== 'string')
      || (card.demo !== undefined && typeof card.demo !== 'boolean')
      || (card.tags !== undefined && (!Array.isArray(card.tags) || card.tags.some((tag: unknown) => typeof tag !== 'string')))
      || (card.quiz !== undefined && (!card.quiz || !Array.isArray(card.quiz.distractorIds) || card.quiz.distractorIds.some((id: unknown) => typeof id !== 'string')))) {
      throw new Error(`Carte invalide ou identifiant dupliqué : ${card?.id ?? 'inconnu'}.`)
    }
    ids.add(card.id)
  }
  return { domains: domainInput as Domain[], cards: cardInput as Card[] }
}

