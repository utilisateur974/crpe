import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { MotionConfig } from 'motion/react'
import { ProgressProvider } from './hooks/useProgress'
import App from './App'
import { initializeContent } from './services/database'
import './styles.css'
import './styles-definitions.css'

const root = createRoot(document.getElementById('root')!)
root.render(<div className="bootstrap-state" role="status">Chargement de vos définitions…</div>)

initializeContent().then(() => {
  root.render(<StrictMode><BrowserRouter><MotionConfig reducedMotion="user"><ProgressProvider><App /></ProgressProvider></MotionConfig></BrowserRouter></StrictMode>)
}).catch(error => {
  console.error('Chargement SQLite impossible', error)
  root.render(<main className="bootstrap-state"><h1>Les définitions n’ont pas pu être chargées.</h1><p>Vérifiez votre connexion puis réessayez.</p><button className="button primary" onClick={() => window.location.reload()}>Réessayer</button></main>)
})
