import { ArrowRight, CalendarDays, Check, Clock3, Layers, MoveUpRight, RotateCcw, Sprout } from 'lucide-react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { cards, domains } from '../services/content'
import { useProgress } from '../hooks/useProgress'
import { getStats, formatDate, plural } from '../utils/progress'
import { BookIllustration } from '../components/BookIllustration'
import { DomainCard } from '../components/DomainCard'
import { DemoNotice } from '../components/DemoNotice'

export function HomePage() {
  const { progress } = useProgress()
  const stats = getStats(cards, progress)
  const reviewCard = cards.find(card => progress.cards[card.id]?.status === 'review')
  const firstDomain = reviewCard?.domain ?? domains[0]?.id
  const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
    <div className="page-heading"><div><p className="eyebrow">VOTRE OBJECTIF, À VOTRE RYTHME</p><h1>CRPE – Espace de révision</h1><p>Un espace pour apprendre, s’entraîner et avancer avec confiance.</p></div><span className="date-chip"><CalendarDays size={15} />{date}</span></div>
    <section className="welcome-banner"><div className="welcome-copy"><span className="welcome-label"><span /> PETITS EFFORTS, GRANDS PROGRÈS</span><h2>Un peu chaque jour,<br />un grand pas vers le CRPE.</h2><p>Une carte, une notion, un déclic.<br />Construisez vos connaissances au fil des révisions.</p>{firstDomain && <Link className="button primary" to={`/domaine/${firstDomain}${reviewCard ? '?statut=review' : ''}`}>{reviewCard ? 'Revoir mes cartes' : stats.viewed ? 'Poursuivre mes révisions' : 'Commencer mes révisions'}<ArrowRight size={17} /></Link>}</div><BookIllustration /><span className="banner-caption">L’essentiel, c’est d’avancer.</span></section>
    <div className="stats-grid"><Link to="/progression" className="stat-card surface"><span className="stat-icon sage"><Layers size={22} /></span><div><span className="stat-label">Cartes consultées</span><strong>{stats.viewed}<small> / {stats.total}</small></strong><span className="stat-description">Votre parcours commence ici</span></div></Link><Link to="/progression?statut=known" className="stat-card surface"><span className="stat-icon blue"><Check size={22} /></span><div><span className="stat-label">Cartes maîtrisées</span><strong>{stats.known}</strong><span className="stat-description">Des acquis qui s’installent</span></div></Link><Link to="/progression?statut=review" className="stat-card surface"><span className="stat-icon terracotta"><RotateCcw size={21} /></span><div><span className="stat-label">À revoir</span><strong>{stats.review}</strong><span className="stat-description">Un peu de pratique, et ça viendra</span></div></Link></div>
    <section className="domains-section"><div className="section-heading"><div><h2>Mes domaines de révision <span className="count-badge">{domains.length}</span></h2><p>Choisissez un domaine et trouvez votre prochain déclic.</p></div><span className="section-meta">{plural(cards.length, 'carte')} à explorer</span></div><div className="domain-grid">{domains.map(domain => <DomainCard key={domain.id} domain={domain} />)}</div></section>
    {cards.some(card => card.demo) && <DemoNotice />}
    <div className="bottom-notes"><div className="rhythm-note"><span className="small-icon"><Sprout size={22} /></span><div><strong>La régularité fait la différence</strong><p>Quelques cartes chaque jour, à votre rythme.</p></div><Link to="/methode" className="text-link">Mes conseils <MoveUpRight size={15} /></Link></div><div className="last-session"><Clock3 size={16} /><span>{progress.lastReviewedAt ? `Dernière révision : ${formatDate(progress.lastReviewedAt)}` : 'Votre première révision vous attend'}</span></div></div>
  </motion.div>
}
