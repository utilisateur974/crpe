import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleX, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { Link } from 'react-router'
import type { Card, Domain } from '../types'
import { buildQuiz } from '../services/quiz'
import { useStudySelection } from '../hooks/useStudySelection'
import { useProgress } from '../hooks/useProgress'
import { EmptyState } from '../components/EmptyState'
import { DemoNotice } from '../components/DemoNotice'
import { ProgressBar } from '../components/ProgressBar'
import { plural } from '../utils/progress'

export function QuizPage() {
  const selection = useStudySelection()
  if (!selection.domain) return <EmptyState title="Ce domaine est introuvable." />
  return <QuizSession key={selection.sessionKey} initialDeck={selection.deck} bank={selection.bank} domain={selection.domain} backUrl={selection.backUrl} />
}

function QuizSession({ initialDeck, bank, domain, backUrl }: { initialDeck: Card[]; bank: Card[]; domain: Domain; backUrl: string }) {
  const [questions, setQuestions] = useState(() => buildQuiz(initialDeck, bank))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<{ id: string; correct: boolean }[]>([])
  const [complete, setComplete] = useState(false)
  const [runId, setRunId] = useState(() => crypto.randomUUID())
  const { markViewed, saveQuiz } = useProgress()
  const current = questions[index]
  useEffect(() => { if (current && !complete) markViewed(current.card.id) }, [current, complete, markViewed])
  if (!current) return <EmptyState title="Pas de quiz pour cette sélection." href={backUrl} label="Retour à ma sélection">Un quiz nécessite une bonne réponse et trois distracteurs pertinents, explicitement référencés dans les données. Vous pouvez utiliser les flashcards.</EmptyState>
  const correctCount = answers.filter(answer => answer.correct).length
  const incorrectIds = answers.filter(answer => !answer.correct).map(answer => answer.id)
  function next() {
    if (!selected) return
    if (index === questions.length - 1) {
      saveQuiz({ id: runId, domain: domain.id, date: new Date().toISOString(), correct: correctCount, total: questions.length, incorrectIds })
      setComplete(true)
    } else { setIndex(value => value + 1); setSelected(null) }
  }
  function restart(onlyIncorrect: boolean) {
    const deck = onlyIncorrect ? initialDeck.filter(card => incorrectIds.includes(card.id)) : initialDeck
    setQuestions(buildQuiz(deck, bank)); setIndex(0); setAnswers([]); setSelected(null); setComplete(false); setRunId(crypto.randomUUID())
  }
  if (complete) return <div className="session-page"><Link to={backUrl} className="back-link"><ArrowLeft size={16} /> Retour au domaine</Link><div className="session-result surface"><span className="result-icon"><Trophy size={35} /></span><p className="eyebrow">QUIZ TERMINÉ</p><h1>{correctCount === questions.length ? 'Tout juste, bravo !' : 'Chaque essai fait progresser.'}</h1><div className="score-circle"><strong>{correctCount}<span> / {questions.length}</span></strong><span>{Math.round(correctCount / questions.length * 100)} % de réussite</span></div><p>{plural(correctCount, 'bonne réponse')} sur {questions.length}. Votre score est enregistré.</p>{questions.some(question => question.card.demo) && <p className="small-copy">Ce score porte sur un jeu fictif de démonstration.</p>}<div className="result-actions">{incorrectIds.length > 0 && <button className="button primary" onClick={() => restart(true)}><RotateCcw size={17} /> Refaire les {plural(incorrectIds.length, 'erreur')}</button>}<button className={`button ${incorrectIds.length ? 'secondary' : 'primary'}`} onClick={() => restart(false)}>Refaire tout le quiz</button><Link className="text-link" to="/progression">Voir ma progression <ArrowRight size={16} /></Link></div></div></div>
  const correct = selected === current.card.id
  return <div className="session-page"><Link to={backUrl} className="back-link"><ArrowLeft size={16} /> Retour à ma sélection</Link><div className="page-heading"><div><p className="eyebrow">{domain.name.toLocaleUpperCase('fr')} · QUIZ</p><h1>À vous de trouver.</h1><p>Une seule bonne réponse. Un nouvel acquis à chaque question.</p></div><span className="quiz-score"><Sparkles size={17} />{correctCount} / {answers.length} juste{correctCount > 1 ? 's' : ''}</span></div>{current.card.demo && <DemoNotice compact />}
    <div className="session-progress"><span>Question <strong>{index + 1}</strong> / {questions.length}</span><span>{current.card.category}</span></div><ProgressBar value={(index + 1) / questions.length * 100} label="Progression du quiz" />
    <div className="quiz-card surface"><span className="eyebrow">À VOUS DE JOUER</span><h2 id="quiz-question">{current.card.question}</h2><div className="quiz-options" role="group" aria-labelledby="quiz-question">{current.options.map((option, optionIndex) => {
      const isCorrect = selected !== null && option.id === current.card.id
      const isWrong = selected === option.id && !isCorrect
      return <button key={option.id} className={`quiz-option ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}`} disabled={selected !== null} onClick={() => { if (selected !== null) return; setSelected(option.id); setAnswers(previous => [...previous, { id: current.card.id, correct: option.id === current.card.id }]) }}><span className="option-letter">{'ABCD'[optionIndex]}</span><span>{option.answer}</span>{isCorrect && <CircleCheck size={21} />}{isWrong && <CircleX size={21} />}{isCorrect && <span className="sr-only">Bonne réponse</span>}{isWrong && <span className="sr-only">Réponse incorrecte</span>}</button>
    })}</div>{selected !== null && <div className={`quiz-correction ${correct ? 'success' : 'error'}`} role="status"><strong>{correct ? <Check size={19} /> : <CircleX size={19} />}{correct ? 'Bonne réponse !' : `La bonne réponse est : ${current.card.answer}`}</strong>{current.card.explanation && <p>{current.card.explanation}</p>}{current.card.example && <p><b>Exemple :</b> {current.card.example}</p>}{current.card.source && <small>Source : {current.card.source}</small>}</div>}<div className="quiz-next"><span>{selected === null ? 'Choisissez une proposition pour la corriger.' : 'Prenez un instant pour retenir la réponse.'}</span><button className="button primary" disabled={selected === null} onClick={next}>{index === questions.length - 1 ? 'Voir mon résultat' : 'Question suivante'}<ArrowRight size={17} /></button></div></div>
  </div>
}
