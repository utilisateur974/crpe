import type { LiteraryReference } from '../types'

function sourceUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch { return null }
}

export function ReferenceExcerpt({ reference, links }: { reference: LiteraryReference; links: boolean }) {
  const url = sourceUrl(reference.excerptSource)
  return <span className={`reference-excerpt ${reference.excerptStatus}`}>
    <strong>{reference.excerptStatus === 'missing' ? 'Extrait à compléter' : reference.excerptStatus === 'not-applicable' ? 'Œuvre sans locuteur' : 'Réplique / extrait du classeur'}</strong>
    <span className="reference-excerpt-text">{reference.excerptText ?? 'Aucun extrait renseigné dans le classeur.'}</span>
    {reference.excerptSource && <span className="reference-excerpt-source">Source de l’extrait : {links && url
      ? <a href={url} target="_blank" rel="noopener noreferrer">{reference.excerptSource}</a>
      : reference.excerptSource}</span>}
  </span>
}
