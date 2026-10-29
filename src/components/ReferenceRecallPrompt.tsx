import type { LiteraryReference } from '../types'
import { getReferencePhrase } from '../services/reference-revision'

export function ReferenceRecallPrompt({ reference }: { reference: LiteraryReference }) {
  return <span className="reference-recall-prompt">
    <span className="reference-recall-block"><strong>Phrase réutilisable</strong><span className="reference-recall-phrase">{getReferencePhrase(reference)}</span></span>
    <span className="reference-recall-block reference-recall-excerpt"><strong>Réplique / extrait – locuteur + phrase complète</strong><span className="reference-recall-excerpt-text">{reference.excerptText ?? 'Aucun extrait renseigné dans le classeur.'}</span></span>
  </span>
}
