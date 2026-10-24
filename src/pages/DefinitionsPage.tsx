import { useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { definitions, domains } from '../services/content'
import { plural } from '../utils/progress'

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
const PAGE_SIZE = 20

export function DefinitionsPage() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const domain = params.get('domaine') ?? ''
  const chapter = params.get('chapitre') ?? ''
  const query = params.get('recherche') ?? ''
  const chapters = [...new Set(definitions.filter(item => !domain || item.domain === domain).map(item => item.chapter))]
  const filtered = definitions.filter(item => (!domain || item.domain === domain) && (!chapter || item.chapter === chapter)
    && normalize(`${item.chapter} ${item.concept} ${item.definition}`).includes(normalize(query.trim())))
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(0, pageCount - 1))
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'domaine') next.delete('chapitre')
    setPage(0)
    setParams(next, { replace: true })
  }
  return <div><Link className="back-link" to="/domaine/sciences"><ArrowLeft size={16} /> Retour au domaine Sciences</Link>
    <div className="page-heading"><div><p className="eyebrow">LE CORPS HUMAIN ET LA SANTÉ</p><h1>Mes définitions</h1><p>Les notions du livret, regroupées par chapitre et accompagnées de leur page source.</p></div><span className="heading-icon sage"><BookOpen size={28} /></span></div>
    <div className="definition-filters surface"><div><label htmlFor="definition-search">Rechercher une notion</label><div className="search-field"><Search size={17} /><input id="definition-search" type="search" placeholder="Digestion, neurone, puberté…" value={query} onChange={event => update('recherche', event.target.value)} /></div></div><div><label htmlFor="definition-domain">Domaine</label><select id="definition-domain" value={domain} onChange={event => update('domaine', event.target.value)}><option value="">Tous les domaines</option>{domains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div><label htmlFor="definition-chapter">Titre du chapitre</label><select id="definition-chapter" value={chapter} onChange={event => update('chapitre', event.target.value)}><option value="">Tous les chapitres</option>{chapters.map(value => <option key={value}>{value}</option>)}</select></div></div>
    <div className="section-heading"><h2>{plural(filtered.length, 'notion')}</h2><span className="section-meta">{plural(chapters.length, 'chapitre')} dans le livret</span></div>
    {visible.length ? <div className="surface definition-table-wrap"><table className="definition-table"><caption className="sr-only">Définitions extraites du livret Le corps humain et la santé</caption><thead><tr><th scope="col">Titre du chapitre</th><th scope="col">Nom / concept</th><th scope="col">Définition</th></tr></thead><tbody>{visible.map(item => <tr key={item.id}><td data-label="Titre du chapitre">{item.chapter}</td><th scope="row" data-label="Nom / concept">{item.concept}</th><td data-label="Définition"><p>{item.definition}</p><small>{item.source} · p. {item.sourcePage}</small>{item.reviewNote && <p className="definition-review-note"><strong>À vérifier dans la source.</strong> {item.reviewNote}</p>}</td></tr>)}</tbody></table></div> : <div className="surface no-results"><Search size={25} /><h2>Aucune définition dans cette sélection</h2><p>Essayez un autre chapitre ou un autre mot-clé.</p><button className="button secondary" onClick={() => { setParams({}); setPage(0) }}>Réinitialiser les filtres</button></div>}
    {pageCount > 1 && <nav className="definition-pagination" aria-label="Pages de définitions"><button className="button secondary" disabled={currentPage === 0} onClick={() => setPage(value => value - 1)}><ArrowLeft size={16} /> Précédent</button><span aria-live="polite">Page {currentPage + 1} / {pageCount}</span><button className="button secondary" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Suivant <ArrowRight size={16} /></button></nav>}
    <p className="extraction-note">Les 118 entrées des encadrés « À retenir » donnent 120 notions : les rôles des glucides, lipides et protéines ont été séparés. Les schémas et les exercices ne sont pas convertis en définitions. Les formulations du PDF sont conservées.</p>
  </div>
}
