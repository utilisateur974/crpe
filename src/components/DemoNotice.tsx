import { Info } from 'lucide-react'

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return <div className={`demo-notice ${compact ? 'compact' : ''}`}><Info size={17} aria-hidden="true" /><p><strong>Contenu de démonstration.</strong> {compact ? 'Ces cartes sont fictives.' : 'Les cartes fictives servent uniquement à découvrir les révisions.'}</p></div>
}
