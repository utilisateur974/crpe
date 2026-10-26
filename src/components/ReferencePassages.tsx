import type { LiteraryReference } from '../types'

function Passage({ text, prefix, className }: { text: string; prefix: string; className: string }) {
  return <span className={className}>{text.startsWith(prefix)
    ? <><strong>{prefix}</strong>{text.slice(prefix.length)}</>
    : text}</span>
}

export function ReferencePassages({ reference }: { reference: LiteraryReference }) {
  return <span className="reference-passages">
    <Passage text={reference.referenceText} prefix="On peut également penser" className="reference-presentation" />
    {reference.analysisText
      ? <Passage text={reference.analysisText} prefix="Cette référence montre" className="reference-analysis" />
      : <span className="reference-missing"><strong>Cette référence montre que…</strong>Interprétation non renseignée dans le classeur.</span>}
    {!reference.originalText && <span className="reference-missing">Le classeur contient uniquement l’identification de l’œuvre. Son développement reste à compléter.</span>}
  </span>
}
