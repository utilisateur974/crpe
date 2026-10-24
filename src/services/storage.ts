import type { CardStatus, Progress, QuizResult } from '../types'

export const STORAGE_KEY = 'crpe-progress-v1'
export const emptyProgress = (): Progress => ({ version: 1, cards: {}, quizzes: [], lastReviewedAt: null })
const isDate = (date: unknown): date is string => typeof date === 'string' && !Number.isNaN(Date.parse(date))
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress()
  const input: unknown = JSON.parse(raw)
  if (!isRecord(input) || input.version !== 1 || !isRecord(input.cards) || !Array.isArray(input.quizzes)) throw new Error('Format de sauvegarde incompatible.')
  const progress = emptyProgress()
  for (const [id, entry] of Object.entries(input.cards)) {
    if (id === '__proto__' || id === 'constructor' || !isRecord(entry) || !isDate(entry.viewedAt)) continue
    progress.cards[id] = { viewedAt: entry.viewedAt, ...(['known', 'review'].includes(String(entry.status)) ? { status: entry.status as CardStatus } : {}) }
  }
  progress.quizzes = input.quizzes.filter((entry): entry is QuizResult => isRecord(entry)
    && typeof entry.id === 'string' && typeof entry.domain === 'string' && isDate(entry.date)
    && Number.isInteger(entry.correct) && Number.isInteger(entry.total) && Number(entry.total) > 0
    && Number(entry.correct) >= 0 && Number(entry.correct) <= Number(entry.total)
    && Array.isArray(entry.incorrectIds) && entry.incorrectIds.every((id: unknown) => typeof id === 'string'))
  progress.lastReviewedAt = isDate(input.lastReviewedAt) ? input.lastReviewedAt : null
  return progress
}

export function loadProgress(): { progress: Progress; error: string | null } {
  try {
    return { progress: parseProgress(localStorage.getItem(STORAGE_KEY)), error: null }
  } catch {
    return { progress: emptyProgress(), error: 'La sauvegarde locale est indisponible ou illisible. Vos nouvelles révisions restent disponibles pendant cette session.' }
  }
}

export function persistProgress(progress: Progress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    return true
  } catch { return false }
}
