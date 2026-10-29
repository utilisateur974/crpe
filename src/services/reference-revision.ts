import type { LiteraryReference } from '../types'

export function getReferencePhrase(reference: LiteraryReference): string {
  return reference.originalText ?? [reference.referenceText, reference.analysisText].filter(Boolean).join(' ')
}

export function getReferenceQuestion(reference: LiteraryReference): string {
  return [getReferencePhrase(reference), reference.excerptText ?? 'Aucun extrait renseigné dans le classeur.'].join('\n\n')
}

export function getReferenceWorkKey(reference: LiteraryReference): string {
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr').normalize('NFC')
  return `${normalize(reference.title)}|${normalize(reference.creator)}`
}
