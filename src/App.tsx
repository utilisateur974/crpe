import { Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { EmptyState } from './components/EmptyState'
import { HomePage } from './pages/HomePage'
import { DomainPage } from './pages/DomainPage'
import { FlashcardsPage } from './pages/FlashcardsPage'
import { QuizPage } from './pages/QuizPage'
import { ProgressPage } from './pages/ProgressPage'
import { MethodPage } from './pages/MethodPage'
import { DefinitionsPage } from './pages/DefinitionsPage'

export default function App() {
  return <Routes><Route element={<Layout />}><Route index element={<HomePage />} /><Route path="definitions" element={<DefinitionsPage />} /><Route path="domaine/:domainId" element={<DomainPage />} /><Route path="domaine/:domainId/flashcards" element={<FlashcardsPage />} /><Route path="domaine/:domainId/quiz" element={<QuizPage />} /><Route path="progression" element={<ProgressPage />} /><Route path="methode" element={<MethodPage />} /><Route path="*" element={<EmptyState title="Cette page est introuvable.">Revenez à votre espace pour poursuivre vos révisions.</EmptyState>} /></Route></Routes>
}
