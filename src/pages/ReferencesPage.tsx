import { useState } from 'react'
import { ArrowLeft, ArrowRight, LibraryBig, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { references } from '../services/content'
import { ReferencePassages } from '../components/ReferencePassages'
import { plural } from '../utils/progress'

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr')
const PAGE_SIZE = 8

export function ReferencesPage() {
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const query = params.get('recherche') ?? ''
  const creator = params.get('auteur') ?? ''
  const theme = params.get('theme') ?? ''
  const status = params.get('etat') ?? ''
  const creators = [...new Set(references.map(item => item.creator))].sort((a, b) => a.localeCompare(b, 'fr'))
  const themes = [...new Set(references.flatMap(item => item.themes))].sort((a, b) => a.localeCompare(b, 'fr'))
  const filtered = references.filter(item => (!creator || item.creator === creator)
    && (!theme || (theme === '__none__' ? item.themes.length === 0 : item.themes.includes(theme)))
    && (!status || (status === 'complete' ? item.isComplete : !item.isComplete))
    && normalize([item.title, item.creator, item.referenceText, item.analysisText ?? '', ...item.themes].join(' ')).includes(normalize(query.trim())))
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(0, pageCount - 1))
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const incomplete = references.filter(item => !item.isComplete).length
  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    setParams(next, { replace: true })
    setPage(0)
  }
  return <div>
    <Link className="back-link" to="/domaine/references"><ArrowLeft size={16} /> Retour au domaine Références</Link>
    <div className="page-heading"><div><p className="eyebrow">DES ŒUVRES POUR NOURRIR VOTRE RÉFLEXION</p><h1>Mes références littéraires</h1><p>Le titre, l’auteur ou réalisateur, et une formulation à mobiliser dans vos développements.</p></div><span className="heading-icon terracotta"><LibraryBig size={28} /></span></div>
    <div className="reference-filters surface">
      <div className="reference-search"><label htmlFor="reference-search">Rechercher une référence</label><div className="search-field"><Search size={17} /><input id="reference-search" type="search" placeholder="Titre, auteur, idée…" value={query} onChange={event => update('recherche', event.target.value)} /></div></div>
      <div><label htmlFor="reference-creator">Auteur / réalisateur</label><select id="reference-creator" value={creator} onChange={event => update('auteur', event.target.value)}><option value="">Tous les auteurs et réalisateurs</option>{creators.map(value => <option key={value}>{value}</option>)}</select></div>
      <div><label htmlFor="reference-theme">Thème</label><select id="reference-theme" value={theme} onChange={event => update('theme', event.target.value)}><option value="">Tous les thèmes</option>{themes.map(value => <option key={value}>{value}</option>)}<option value="__none__">Sans thème renseigné</option></select></div>
      <div><label htmlFor="reference-status">État du contenu</label><select id="reference-status" value={status} onChange={event => update('etat', event.target.value)}><option value="">Toutes les références</option><option value="complete">Complètes</option><option value="incomplete">À compléter</option></select></div>
    </div>
    <div className="section-heading"><h2>{plural(filtered.length, 'référence')}</h2><span className="section-meta">{incomplete} à compléter dans la source</span></div>
    {visible.length ? <div className="reference-list">{visible.map(item => <article key={item.id} className="reference-entry surface">
      <header><div><h2>{item.title}</h2><p className="reference-creator"><span>Auteur / réalisateur</span>{item.creator}</p></div><span className={`reference-status ${item.isComplete ? 'complete' : 'incomplete'}`}>{item.isComplete ? 'Complète' : 'À compléter'}</span></header>
      <div className="category-tags">{item.themes.length ? item.themes.map(value => <span key={value}>{value}</span>) : <span>Thèmes non renseignés</span>}</div>
      <ReferencePassages reference={item} />
      <footer><span>Source : {item.sourceFilename} · {item.sheetName}, ligne {item.sourceRow}</span><Link className="text-link" to={`/domaine/references/flashcards?reference=${encodeURIComponent(item.id)}`}>Réviser cette référence <ArrowRight size={15} /></Link></footer>
    </article>)}</div> : <div className="surface no-results"><Search size={25} /><h2>Aucune référence dans cette sélection</h2><p>Essayez un autre auteur, thème ou mot-clé.</p><button className="button secondary" onClick={() => { setParams({}); setPage(0) }}>Réinitialiser les filtres</button></div>}
    {pageCount > 1 && <nav className="definition-pagination" aria-label="Pages de références"><button className="button secondary" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeft size={16} /> Précédent</button><span aria-live="polite">Page {currentPage + 1} / {pageCount}</span><button className="button secondary" disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)}>Suivant <ArrowRight size={16} /></button></nav>}
    <p className="extraction-note">Les textes proviennent du classeur fourni, y compris les références artistiques et religieuses. Les développements absents restent à compléter ; aucun contenu n’a été ajouté pour les remplacer.</p>
  </div>
}
