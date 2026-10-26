export type Domain = {
  id: string
  name: string
  description: string
  icon: string
  color: 'sage' | 'terracotta' | 'blue'
  note?: string
}

export type Card = {
  id: string
  domain: string
  category: string
  subcategory: string
  question: string
  answer: string
  explanation?: string
  example?: string
  tags?: string[]
  source?: string
  demo?: boolean
  chapter?: string
  concept?: string
  reviewNote?: string
  quiz?: { distractorIds: string[] }
  reference?: LiteraryReference
}

export type CardStatus = 'known' | 'review'
export type LiteraryReference = {
  id: string
  domain: string
  title: string
  creator: string
  referenceText: string
  analysisText: string | null
  themes: string[]
  source: string
  sourceFilename: string
  sheetName: string
  sourceRow: number
  originalLabel: string
  originalText: string | null
  isComplete: boolean
}
export type Definition = {
  id: string
  domain: string
  chapter: string
  section: string
  concept: string
  definition: string
  source: string
  sourcePage: number
  sourceExcerpt: string
  reviewNote?: string
}
export type CardProgress = { viewedAt: string; status?: CardStatus }
export type QuizResult = {
  id: string
  domain: string
  date: string
  correct: number
  total: number
  incorrectIds: string[]
}
export type Progress = {
  version: 1
  cards: Record<string, CardProgress>
  quizzes: QuizResult[]
  lastReviewedAt: string | null
}
export type QuizOption = { id: string; answer: string; concept: string; source?: string }
export type QuizQuestion = { card: Card; options: QuizOption[] }
