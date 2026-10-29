import { ArrowLeft, ArrowRight, Check, Circle, Layers, RotateCcw, Sparkles } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { domains, filterCards, getDomainCards } from '../services/content'
import { getQuizOptions } from '../services/quiz'
import { useProgress } from '../hooks/useProgress'
import { getStats, plural } from '../utils/progress'
import { DomainIcon } from '../components/DomainIcon'
import { Filters } from '../components/Filters'
import { ProgressBar } from '../components/ProgressBar'
import { DemoNotice } from '../components/DemoNotice'
import { EmptyState } from '../components/EmptyState'

export function DomainPage() {
  const { domainId } = useParams()
  const [params, setParams] = useSearchParams()
  const { progress } = useProgress()
  const domain = domains.find(item => item.id === domainId)
  if (!domain) return <EmptyState title="Ce domaine est introuvable." />
  const deck = getDomainCards(domain.id)
  const category = params.get('categorie') ?? ''
  const subcategory = params.get('sous-categorie') ?? ''
  const status = params.get('statut') ?? ''
  const filtered = filterCards(deck, category, subcategory).filter(card => !status || progress.cards[card.id]?.status === status)
  const stats = getStats(deck, progress)
  const quizCount = filtered.filter(card => getQuizOptions(card, deck)).length
  const query = params.size ? `?${params.toString()}` : ''
  return <div><Link to="/" className="back-link"><ArrowLeft size={16} /> Tous mes domaines</Link><div className="page-heading domain-page-heading"><div className={`heading-icon ${domain.color}`}><DomainIcon name={domain.icon} size={31} /></div><div><p className="eyebrow">MON DOMAINE DE RÉVISION</p><h1>{domain.name}</h1><p>{domain.description}</p></div></div>
    {deck.some(card => card.demo) && <DemoNotice />}
    {domain.note && <p className="domain-note">{domain.note}</p>}
    {deck.length > 0 && <Link className="text-link definitions-link" to={domain.id === 'references' ? '/references' : `/definitions?domaine=${domain.id}`}>{domain.id === 'references' ? 'Consulter les références littéraires' : 'Consulter les définitions par chapitre'} <ArrowRight size={15} /></Link>}
    <div className="domain-workspace"><div className="domain-content"><div className="surface filter-panel"><Filters cards={deck} category={category} subcategory={subcategory} onChange={(cat, sub) => { const next = new URLSearchParams(params); cat ? next.set('categorie', cat) : next.delete('categorie'); sub ? next.set('sous-categorie', sub) : next.delete('sous-categorie'); setParams(next) }} /><div className="status-filters" aria-label="Filtrer par maîtrise">{[['', 'Toutes les cartes'], ['review', 'À revoir'], ['known', 'Maîtrisées']].map(([value, label]) => <button key={value} className={status === value ? 'selected' : ''} aria-pressed={status === value} onClick={() => { const next = new URLSearchParams(params); value ? next.set('statut', value) : next.delete('statut'); setParams(next) }}>{label}</button>)}</div></div>
      <div className="section-heading compact-heading"><h2>Les cartes de ma sélection</h2><span className="section-meta">{plural(filtered.length, 'carte')}</span></div>
      {filtered.length ? <div className="card-list surface">{filtered.map(card => <div className="card-list-row" key={card.id}><span className={`list-status ${progress.cards[card.id]?.status ?? ''}`}>{progress.cards[card.id]?.status === 'known' ? <Check size={17} /> : progress.cards[card.id]?.status === 'review' ? <RotateCcw size={16} /> : <Layers size={17} />}</span><div><p>{card.reference?.title ?? card.question}</p><span>{card.category} <span aria-hidden="true">·</span> {card.subcategory}{card.demo ? ' · Fictif' : ''}</span></div><span className="status-label">{progress.cards[card.id]?.status === 'known' ? 'Maîtrisée' : progress.cards[card.id]?.status === 'review' ? 'À revoir' : progress.cards[card.id] ? 'Consultée' : 'À découvrir'}</span></div>)}</div> : <div className="surface no-results"><Circle size={25} /><h3>Aucune carte dans cette sélection</h3><p>Essayez une autre catégorie ou un autre état de maîtrise.</p><button className="button secondary" onClick={() => setParams({})}>Réinitialiser les filtres</button></div>}
    </div><aside className="study-panel surface"><span className="eyebrow">ON S’Y MET ?</span><h2>À vous de jouer.</h2><p>Deux façons de consolider vos connaissances.</p><div className="study-mode-label"><Layers size={18} /><strong>Les flashcards</strong></div><p className="small-copy">Prenez le temps de comprendre et mémorisez chaque notion.</p>{filtered.length ? <Link className="button primary full-width" to={`/domaine/${domain.id}/flashcards${query}`}>Réviser {plural(filtered.length, 'carte')}<ArrowRight size={17} /></Link> : <button className="button primary full-width" disabled>Aucune carte à réviser</button>}<div className="study-mode-label"><Sparkles size={18} /><strong>Le quiz</strong></div><p className="small-copy">Testez vos acquis avec une correction immédiate.</p>{quizCount ? <Link className="button secondary full-width" to={`/domaine/${domain.id}/quiz${query}`}>Lancer le quiz <span>{quizCount}</span></Link> : <><button className="button secondary full-width" disabled>Quiz indisponible</button><p className="small-copy">Aucune question avec trois distracteurs validés dans cette sélection.</p></>}<div className="panel-progress"><div><span>Maîtrise du domaine</span><strong>{stats.percent} %</strong></div><ProgressBar value={stats.percent} tone={domain.color} /><p>{stats.known} sur {stats.total} cartes maîtrisées</p></div></aside></div>
  </div>
}
