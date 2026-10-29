import { test, expect } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const db = new DatabaseSync(fileURLToPath(new URL('../../database/crpe.sqlite', import.meta.url)), { readOnly: true })
const references = db.prepare('SELECT id, source_text, excerpt_text, source_reference FROM literary_references ORDER BY position').all()
  .map(row => ({ id: String(row.id), phrase: String(row.source_text), excerpt: String(row.excerpt_text), answer: String(row.source_reference) }))
db.close()

test('quiz références : phrase et extrait, quatre références, correction et reprise des erreurs', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const ids = references.slice(0, 2).map(item => item.id)
  await page.addInitScript((ids: string[]) => {
    if (localStorage.getItem('crpe-progress-v1')) return
    localStorage.setItem('crpe-progress-v1', JSON.stringify({ version: 1, cards: Object.fromEntries(ids.map(id => [id, { viewedAt: '2026-10-29T12:00:00.000Z', status: 'review' }])), quizzes: [], lastReviewedAt: null }))
  }, ids)
  await page.goto('/domaine/references?statut=review')
  await page.getByRole('link', { name: 'Lancer le quiz 2', exact: true }).click()
  let failedId = ''
  for (let index = 0; index < 2; index++) {
    await expect(page.locator('#quiz-question')).toHaveText('À quelle référence correspondent ces éléments ?')
    const phrase = await page.locator('#reference-quiz-prompt .reference-recall-phrase').innerText()
    const reference = references.find(item => item.phrase === phrase)!
    expect(reference).toBeTruthy()
    await expect(page.locator('#reference-quiz-prompt .reference-recall-excerpt-text')).toHaveText(reference.excerpt)
    await expect(page.locator('#reference-quiz-prompt a')).toHaveCount(0)
    const options = page.locator('.quiz-option')
    await expect(options).toHaveCount(4)
    const labels = await options.locator('span:nth-child(2)').allTextContents()
    expect(new Set(labels).size).toBe(4)
    expect(labels.filter(label => label === reference.answer)).toHaveLength(1)
    expect(labels.every(label => references.some(item => item.answer === label))).toBe(true)
    await expect(page.locator('.quiz-correction')).toHaveCount(0)
    if (index === 0) {
      failedId = reference.id
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `artifacts/reference-quiz-${testInfo.project.name}.png`, fullPage: true })
      await options.filter({ hasNotText: reference.answer }).first().click()
    } else await options.filter({ hasText: reference.answer }).click()
    await expect(page.getByRole('status')).toContainText(index === 0 ? 'Ce n’est pas la bonne référence.' : 'Bonne réponse !')
    await expect(page.locator('.quiz-correct-answer')).toContainText(reference.answer)
    await expect(page.locator('.quiz-option.correct')).toContainText(reference.answer)
    await page.getByRole('button', { name: index === 0 ? 'Question suivante' : 'Voir mon résultat' }).click()
  }
  await expect(page.getByText('50 % de réussite')).toBeVisible()
  await page.getByRole('button', { name: 'Refaire l’erreur', exact: true }).click()
  await expect(page.locator('.session-progress')).toContainText('1 / 1')
  const failed = references.find(item => item.id === failedId)!
  await expect(page.locator('.reference-recall-phrase')).toHaveText(failed.phrase)
  await page.locator('.quiz-option').filter({ hasText: failed.answer }).click()
  await page.getByRole('button', { name: 'Voir mon résultat' }).click()
  await expect(page.getByText('100 % de réussite')).toBeVisible()
  await page.goto('/progression')
  await expect(page.locator('.quiz-history-row')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.quiz-history-row')).toHaveCount(2)
  const scores = await page.evaluate(() => JSON.parse(localStorage.getItem('crpe-progress-v1')!).quizzes)
  expect(scores.map((score: { domain: string; correct: number; total: number }) => [score.domain, score.correct, score.total])).toEqual([['references', 1, 2], ['references', 1, 1]])
  const missingExcerpt = references.find(item => item.excerpt.startsWith('À compléter'))!
  await page.goto(`/domaine/references/quiz?reference=${missingExcerpt.id}`)
  await expect(page.locator('.session-progress')).toContainText('1 / 1')
  await expect(page.locator('.reference-recall-excerpt-text')).toHaveText(missingExcerpt.excerpt)
  await expect(page.locator('.quiz-option')).toHaveCount(4)
  expect(errors).toEqual([])
})
