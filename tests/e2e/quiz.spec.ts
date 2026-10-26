import { test, expect } from '@playwright/test'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const chapter = 'Organisation du système nerveux'
const db = new DatabaseSync(fileURLToPath(new URL('../../database/crpe.sqlite', import.meta.url)), { readOnly: true })
const definitions = db.prepare('SELECT id, concept, definition FROM definition_catalog WHERE chapter_title = ?').all(chapter)
  .map(row => ({ id: String(row.id), concept: String(row.concept), answer: String(row.definition) }))
db.close()

test('quiz à quatre choix : définitions, correction, score et reprise des erreurs', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`/domaine/sciences?categorie=${encodeURIComponent(chapter)}`)
  await page.getByRole('link', { name: 'Lancer le quiz 6', exact: true }).click()
  let failedConcept = ''
  for (let index = 0; index < 6; index++) {
    const prompt = await page.locator('#quiz-question').innerText()
    const definition = definitions.find(item => prompt === `Quelle définition correspond à la notion « ${item.concept} » ?`)!
    expect(definition).toBeTruthy()
    await expect(page.locator('.quiz-option')).toHaveCount(4)
    await expect(page.locator('.quiz-explanations')).toHaveCount(0)
    await expect(page.getByRole('button', { name: index === 5 ? 'Voir mon résultat' : 'Question suivante' })).toBeDisabled()
    const correctOption = page.locator('.quiz-option').filter({ hasText: definition.answer })
    if (index === 0) {
      failedConcept = definition.concept
      await page.locator('.quiz-option').filter({ hasNotText: definition.answer }).first().click()
    } else await correctOption.click()
    await expect(page.locator('.quiz-option.correct')).toContainText(definition.answer)
    await expect(page.locator('.quiz-explanations li')).toHaveCount(4)
    await expect(page.getByRole('status')).toContainText(index === 0 ? 'Ce n’est pas la bonne définition.' : 'Bonne réponse !')
    for (const item of definitions) {
      if ((await page.locator('.quiz-explanations').innerText()).includes(item.answer)) {
        await expect(page.locator('.quiz-explanations')).toContainText(item.concept)
      }
    }
    if (index === 0) {
      await expect(page.locator('.quiz-explanations small')).toHaveCount(4)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await page.screenshot({ path: `artifacts/quiz-correction-${testInfo.project.name}.png`, fullPage: true })
    }
    await page.getByRole('button', { name: index === 5 ? 'Voir mon résultat' : 'Question suivante' }).click()
  }
  await expect(page.getByText('83 % de réussite')).toBeVisible()
  await page.getByRole('button', { name: 'Refaire l’erreur', exact: true }).click()
  await expect(page.locator('.session-progress')).toContainText('1 / 1')
  await expect(page.locator('#quiz-question')).toContainText(`« ${failedConcept} »`)
  const failedDefinition = definitions.find(item => item.concept === failedConcept)!
  await page.locator('.quiz-option').filter({ hasText: failedDefinition.answer }).click()
  await page.getByRole('button', { name: 'Voir mon résultat' }).click()
  await expect(page.getByText('100 % de réussite')).toBeVisible()
  await page.goto('/progression')
  await expect(page.locator('.quiz-history-row')).toHaveCount(2)
  await page.reload()
  await expect(page.locator('.quiz-history-row')).toHaveCount(2)
  const scores = await page.evaluate(() => JSON.parse(localStorage.getItem('crpe-progress-v1')!).quizzes)
  expect(scores.map((score: { correct: number; total: number }) => [score.correct, score.total])).toEqual([[5, 6], [1, 1]])
  expect(errors).toEqual([])
})
