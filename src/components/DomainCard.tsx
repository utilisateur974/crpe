import { ArrowUpRight, Layers } from 'lucide-react'
import { Link } from 'react-router'
import type { Domain } from '../types'
import { getDomainCards } from '../services/content'
import { useProgress } from '../hooks/useProgress'
import { getStats, plural } from '../utils/progress'
import { DomainIcon } from './DomainIcon'
import { ProgressBar } from './ProgressBar'

export function DomainCard({ domain }: { domain: Domain }) {
  const { progress } = useProgress()
  const deck = getDomainCards(domain.id)
  const stats = getStats(deck, progress)
  const categories = [...new Set(deck.map(card => card.category))]
  return <Link className={`domain-card surface ${domain.color}`} to={`/domaine/${domain.id}`}><div className="domain-card-top"><span className="domain-icon"><DomainIcon name={domain.icon} size={29} /></span><ArrowUpRight className="domain-arrow" size={21} /></div><h3>{domain.name}</h3><p className="domain-description">{domain.description}</p><div className="category-tags">{categories.slice(0, 2).map(category => <span key={category}>{category}</span>)}{categories.length > 2 && <span>+ {categories.length - 2} chapitres</span>}</div><div className="domain-card-meta"><span><Layers size={15} /> {plural(deck.length, 'carte')}</span><span>{plural(categories.length, 'catégorie')}</span></div><div className="domain-card-progress"><span>Cartes maîtrisées</span><strong>{stats.percent} %</strong></div><ProgressBar value={stats.percent} tone={domain.color} label={`Maîtrise du domaine ${domain.name}`} /><div className="domain-card-bottom"><span>{deck.some(card => card.demo) ? 'Données de démonstration' : `${stats.known} / ${stats.total} cartes maîtrisées`}</span><span>Explorer le domaine <span aria-hidden="true">→</span></span></div></Link>
}
