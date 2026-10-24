import { afterEach, describe, expect, it, vi } from 'vitest'
import { emptyProgress, loadProgress, parseProgress, persistProgress, STORAGE_KEY } from '../../src/services/storage'
import { getStats } from '../../src/utils/progress'
import { cards } from '../fixtures'

afterEach(() => vi.unstubAllGlobals())
const date = '2026-10-25T12:00:00.000Z'

describe('Sauvegarde et progression', () => {
  it('conserve consultations, maîtrise, cartes à revoir, scores et dernière date', () => {
    const state = emptyProgress()
    state.cards[cards[0].id] = { viewedAt: date, status: 'known' }
    state.cards[cards[1].id] = { viewedAt: date, status: 'review' }
    state.quizzes = [{ id: 'session-1', domain: 'sciences', date, total: 4, correct: 3, incorrectIds: [cards[1].id] }]
    state.lastReviewedAt = date
    expect(parseProgress(JSON.stringify(state))).toEqual(state)
    expect(getStats(cards, state)).toEqual({ total: 12, viewed: 2, known: 1, review: 1, percent: 8 })
  })
  it('ignore les entrées invalides et les scores impossibles', () => {
    const raw = { ...emptyProgress(), cards: { bad: { viewedAt: 'hier', status: 'known' }, valid: { viewedAt: date, status: 'unknown' } }, quizzes: [{ id: 'bad', domain: 'sciences', date, total: 4, correct: 9, incorrectIds: [] }] }
    expect(parseProgress(JSON.stringify(raw)).cards).toEqual({ valid: { viewedAt: date } })
    expect(parseProgress(JSON.stringify(raw)).quizzes).toEqual([])
    expect(parseProgress(null)).toEqual(emptyProgress())
  })
  it('signale les données corrompues ou le stockage interdit sans interrompre la session', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{cassé', setItem: () => { throw new Error('Quota') } })
    expect(loadProgress().error).toBeTruthy()
    expect(loadProgress().progress).toEqual(emptyProgress())
    expect(persistProgress(emptyProgress())).toBe(false)
  })
  it('écrit la sauvegarde sous une clé versionnée', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem, getItem: () => null })
    expect(persistProgress(emptyProgress())).toBe(true)
    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(emptyProgress()))
  })
})
