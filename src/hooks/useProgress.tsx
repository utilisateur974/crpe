import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { CardStatus, Progress, QuizResult } from '../types'
import { loadProgress, persistProgress } from '../services/storage'

type ProgressContextValue = {
  progress: Progress
  storageError: string | null
  markViewed: (id: string) => void
  markStatus: (id: string, status: CardStatus) => void
  saveQuiz: (result: QuizResult) => void
}
const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadProgress)
  const [progress, setProgress] = useState(initial.progress)
  const [storageError, setStorageError] = useState(initial.error)
  useEffect(() => {
    if (!persistProgress(progress)) setStorageError('La sauvegarde locale est bloquée. Votre progression sera conservée uniquement pendant cette session.')
  }, [progress])
  const markViewed = useCallback((id: string) => {
    const date = new Date().toISOString()
    setProgress(previous => ({ ...previous, lastReviewedAt: date, cards: { ...previous.cards, [id]: { ...previous.cards[id], viewedAt: date } } }))
  }, [])
  const markStatus = useCallback((id: string, status: CardStatus) => {
    const date = new Date().toISOString()
    setProgress(previous => ({ ...previous, lastReviewedAt: date, cards: { ...previous.cards, [id]: { viewedAt: date, status } } }))
  }, [])
  const saveQuiz = useCallback((result: QuizResult) => {
    setProgress(previous => previous.quizzes.some(quiz => quiz.id === result.id) ? previous : { ...previous, lastReviewedAt: result.date, quizzes: [...previous.quizzes, result] })
  }, [])
  return <ProgressContext.Provider value={{ progress, storageError, markViewed, markStatus, saveQuiz }}>{children}</ProgressContext.Provider>
}

export function useProgress() {
  const context = useContext(ProgressContext)
  if (!context) throw new Error('Le suivi de progression doit être utilisé dans son fournisseur.')
  return context
}
