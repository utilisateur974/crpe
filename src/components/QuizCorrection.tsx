import { Check, CircleX } from 'lucide-react'
import type { QuizQuestion } from '../types'

export function QuizCorrection({ question, selectedId }: { question: QuizQuestion; selectedId: string }) {
  const correct = selectedId === question.card.id
  return <section className={`quiz-correction ${correct ? 'success' : 'error'}`} aria-label="Correction de la question">
    <div role="status">
      <strong>{correct ? <Check size={19} /> : <CircleX size={19} />}{correct ? 'Bonne réponse !' : 'Ce n’est pas la bonne définition.'}</strong>
      <p className="quiz-correct-answer"><b>{question.card.concept ?? question.card.question}</b> : {question.card.answer}</p>
      {question.card.explanation && <p>{question.card.explanation}</p>}
      {question.card.example && <p><b>Exemple :</b> {question.card.example}</p>}
    </div>
    <h3>À quelles notions correspondent les propositions ?</h3>
    <ol className="quiz-explanations">
      {question.options.map((option, index) => <li key={option.id} className={option.id === question.card.id ? 'is-correct' : ''}>
        <span className="option-letter" aria-label={`Proposition ${'ABCD'[index]}`}>{'ABCD'[index]}</span>
        <div><span className="quiz-explanation-title"><b>{option.concept}</b>{option.id === question.card.id && <span className="quiz-answer-badge">Bonne réponse</span>}{option.id === selectedId && <span className="quiz-selection-badge">Votre choix</span>}</span>
          <p>{option.answer}</p>
          {option.source && <small>Source : {option.source}</small>}
        </div>
      </li>)}
    </ol>
  </section>
}
