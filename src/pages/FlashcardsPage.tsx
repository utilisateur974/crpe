import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Keyboard, RotateCcw, RotateCw, Shuffle, Trophy } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'react-router'
import type { Card, CardStatus, Domain } from '../types'
import { useStudySelection } from '../hooks/useStudySelection'
import { useProgress } from '../hooks/useProgress'
import { shuffle } from '../utils/shuffle'
import { plural } from '../utils/progress'
import { EmptyState } from '../components/EmptyState'
import { ProgressBar } from '../components/ProgressBar'
import { DemoNotice } from '../components/DemoNotice'
import { ReferenceRecallPrompt } from '../components/ReferenceRecallPrompt'

export function FlashcardsPage() {
  const selection = useStudySelection()
  if (!selection.domain) return <EmptyState title="Ce domaine est introuvable." />
  return <FlashcardSession key={selection.sessionKey} initialDeck={selection.deck} domain={selection.domain} backUrl={selection.backUrl} />
}

function FlashcardSession({ initialDeck, domain, backUrl }: { initialDeck: Card[]; domain: Domain; backUrl: string }) {
  const [deck, setDeck] = useState(initialDeck)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [complete, setComplete] = useState(false)
  const [evaluated, setEvaluated] = useState<Record<string, CardStatus>>({})
  const { progress, markViewed, markStatus } = useProgress()
  const reducedMotion = useReducedMotion()
  const card = deck[index]
  useEffect(() => { if (card && !complete) markViewed(card.id) }, [card?.id, complete, markViewed])
  const move = useCallback((direction: number) => {
    setIndex(previous => Math.max(0, Math.min(deck.length - 1, previous + direction)))
    setFlipped(false)
  }, [deck.length])
  useEffect(() => {
    if (complete) return
    function handleKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (event.altKey || event.ctrlKey || event.metaKey || target?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.code === 'Space' && !target?.closest('button, a')) { event.preventDefault(); setFlipped(value => !value) }
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [complete, move])
  if (!card) return <EmptyState title="Aucune carte à réviser." href={backUrl} label="Modifier ma sélection">Cette sélection ne contient pas de cartes. Vous pouvez ajuster les filtres.</EmptyState>
  function rate(status: CardStatus) {
    markStatus(card.id, status)
    setEvaluated(previous => ({ ...previous, [card.id]: status }))
    if (index === deck.length - 1) setComplete(true)
    else move(1)
  }
  function restart(onlyReview = false) {
    const next = onlyReview ? deck.filter(item => progress.cards[item.id]?.status === 'review') : deck
    if (!next.length) return
    setDeck(next); setIndex(0); setFlipped(false); setComplete(false); setEvaluated({})
  }
  const reviewCount = deck.filter(item => progress.cards[item.id]?.status === 'review').length
  if (complete) return <div className="session-page"><Link to={backUrl} className="back-link"><ArrowLeft size={16} /> Retour au domaine</Link><div className="session-result surface"><span className="result-icon"><Trophy size={34} /></span><p className="eyebrow">UN PAS DE PLUS</p><h1>Série terminée !</h1><p>Vous avez évalué {plural(Object.keys(evaluated).length, 'carte')} sur {deck.length} dans cette série.</p><div className="result-summary"><span><strong>{Object.values(evaluated).filter(status => status === 'known').length}</strong>Je connais</span><span><strong>{Object.values(evaluated).filter(status => status === 'review').length}</strong>À revoir</span></div><div className="result-actions"><button className="button primary" onClick={() => restart()}><RotateCcw size={17} /> Refaire la série</button>{reviewCount > 0 && <button className="button secondary" onClick={() => restart(true)}>Revoir {plural(reviewCount, 'carte')}</button>}<Link className="text-link" to={backUrl}>Retour au domaine <ArrowRight size={16} /></Link></div></div></div>
  return <div className="session-page"><Link to={backUrl} className="back-link"><ArrowLeft size={16} /> Retour à ma sélection</Link><div className="page-heading"><div><p className="eyebrow">{domain.name.toLocaleUpperCase('fr')} · FLASHCARDS</p><h1>Une carte, un déclic.</h1><p>Prenez le temps de chercher avant de retourner la carte.</p></div><button className="button secondary shuffle-button" onClick={() => { setDeck(shuffle(deck)); setIndex(0); setFlipped(false) }}><Shuffle size={17} /> Mélanger</button></div>
    {card.demo && <DemoNotice compact />}
    {card.reviewNote && <div className="definition-review-note flashcard-review-note" role="note"><strong>À vérifier dans la source.</strong> {card.reviewNote}</div>}
    {card.reference && !card.reference.isComplete && <p className="reference-completion-notice">Référence à compléter : certaines parties ne sont pas renseignées dans le classeur.</p>}
    <div className="session-progress"><span>Carte <strong>{index + 1}</strong> / {deck.length}</span><span>{card.category} <span aria-hidden="true">·</span> {card.subcategory}</span></div><ProgressBar value={(index + 1) / deck.length * 100} label="Position dans la série" />
    <div className="flashcard-stage"><motion.button type="button" className={`flashcard ${card.reference ? 'reference-flashcard' : ''} ${reducedMotion ? 'reduced-motion' : ''}`} animate={{ rotateY: reducedMotion ? 0 : flipped ? 180 : 0 }} transition={{ duration: .5, ease: [.2, .65, .3, 1] }} onClick={() => setFlipped(value => !value)} aria-label={`${flipped ? 'Réponse' : 'Question'} : ${flipped ? `${card.answer} ${card.explanation ?? ''}` : card.question}. Retourner la carte.`} aria-pressed={flipped}>
      <span className="card-face card-front" aria-hidden={flipped} style={reducedMotion ? { visibility: flipped ? 'hidden' : 'visible' } : undefined}><span className="card-face-top"><span className="card-kind">{card.reference ? 'À IDENTIFIER' : 'LA QUESTION'}</span><span className="card-tag">{card.demo ? 'Fictif · Démonstration' : card.category}</span></span>{card.reference ? <span className="card-question-content"><ReferenceRecallPrompt reference={card.reference} /></span> : <span className="card-question">{card.question}</span>}<span className="flip-hint"><RotateCw size={17} /> Cliquez pour découvrir la réponse</span></span>
      <span className="card-face card-back" aria-hidden={!flipped} style={reducedMotion ? { visibility: flipped ? 'visible' : 'hidden', transform: 'none' } : undefined}><span className="card-face-top"><span className="card-kind"><Check size={15} /> {card.reference ? 'LA RÉFÉRENCE' : 'LA RÉPONSE'}</span><span className="card-tag">{card.demo ? 'Fictif · Démonstration' : card.category}</span></span><span className="card-answer-content"><span className="card-answer">{card.answer}</span>{card.explanation && <span className="card-explanation">{card.explanation}</span>}{card.example && <span className="card-example"><strong>Par exemple</strong>{card.example}</span>}{card.source && <span className="card-source">Source : {card.source}</span>}</span><span className="flip-hint"><RotateCw size={17} /> Revenir à la question</span></span>
    </motion.button></div>
    <p className="sr-only" aria-live="polite">Carte {index + 1} sur {deck.length}. {flipped ? `Réponse : ${card.answer}. ${card.explanation ?? ''}` : card.question}</p>
    <div className="flashcard-controls"><button className="button secondary" onClick={() => move(-1)} disabled={index === 0}><ChevronLeft size={17} /><span>Précédent</span></button><button className="button secondary flip-button" onClick={() => setFlipped(value => !value)}><RotateCw size={17} /> Retourner</button><button className="button secondary" onClick={() => { if (index === deck.length - 1) setComplete(true); else move(1) }}><span>{index === deck.length - 1 ? 'Terminer' : 'Suivant'}</span><ChevronRight size={17} /></button></div>
    <div className="rate-controls"><button className={`button review-button ${progress.cards[card.id]?.status === 'review' ? 'is-rated' : ''}`} onClick={() => rate('review')}><RotateCcw size={18} /> À revoir</button><button className={`button known-button ${progress.cards[card.id]?.status === 'known' ? 'is-rated' : ''}`} onClick={() => rate('known')}><Check size={19} /> Je connais</button></div><p className="rating-help">Votre choix est enregistré et passe à la carte suivante.</p>
    <div className="keyboard-help"><Keyboard size={17} /><span><kbd>Espace</kbd> retourner</span><span><kbd>←</kbd> précédente</span><span><kbd>→</kbd> suivante</span></div>
  </div>
}
