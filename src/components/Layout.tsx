import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { ArrowUpRight, BookOpen, ChartNoAxesCombined, ChevronRight, CircleHelp, House, Menu, Moon, ShieldCheck, Sun, X } from 'lucide-react'
import { domains } from '../services/content'
import { useTheme } from '../hooks/useTheme'
import { useProgress } from '../hooks/useProgress'
import { DomainIcon } from './DomainIcon'

export function Layout() {
  const { dark, toggleTheme } = useTheme()
  const { storageError } = useProgress()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const domain = domains.find(item => pathname.startsWith(`/domaine/${item.id}`))
  useEffect(() => {
    setMenuOpen(false)
    if (previousPath.current !== pathname) {
      main.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
      previousPath.current = pathname
    }
    document.title = `${domain?.name ?? (pathname === '/progression' ? 'Ma progression' : pathname === '/definitions' ? 'Mes définitions' : pathname === '/references' ? 'Références littéraires' : 'CRPE')} – Espace de révision`
  }, [pathname, domain])
  return <div className="app-shell"><a className="skip-link" href="#main-content">Aller au contenu</a>
    <aside id="sidebar" className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <Link to="/" className="brand" aria-label="CRPE, accueil"><span className="brand-icon"><BookOpen size={25} strokeWidth={1.7} /></span><span>CRPE<span className="brand-caption">Un pas vers l’enseignement</span></span></Link>
      <div className="sidebar-divider" />
      <nav aria-label="Navigation principale"><span className="nav-section-label">MON ESPACE</span><NavLink to="/" end className="nav-item"><House size={19} /> Tableau de bord</NavLink><NavLink to="/progression" className="nav-item"><ChartNoAxesCombined size={19} /> Ma progression</NavLink>
        <NavLink to="/definitions" className="nav-item"><BookOpen size={19} /> Mes définitions</NavLink>
        <NavLink to="/references" className="nav-item"><BookOpen size={19} /> Mes références</NavLink>
        <span className="nav-section-label domain-label">MES DOMAINES</span>{domains.map(item => <NavLink to={`/domaine/${item.id}`} key={item.id} className="nav-item"><DomainIcon name={item.icon} size={19} />{item.name}<ChevronRight className="nav-chevron" size={15} /></NavLink>)}
      </nav>
      <Link to="/methode" className="sidebar-tip"><span className="tip-heading"><CircleHelp size={18} /> Trouver son rythme <ArrowUpRight size={15} /></span><span>Quelques conseils pour des révisions qui durent.</span></Link>
      <div className="sidebar-footer"><span className="avatar">C</span><span>Mon espace personnel<small>Objectif CRPE</small></span><span className="online-dot" title="Espace local" /></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-controls="sidebar" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button><Link to="/">Mon espace</Link><ChevronRight size={14} /><span>{domain?.name ?? (pathname === '/progression' ? 'Ma progression' : pathname === '/definitions' ? 'Mes définitions' : pathname === '/references' ? 'Références littéraires' : pathname === '/methode' ? 'Conseils de révision' : 'Tableau de bord')}</span></div><div className="topbar-actions"><span className="local-status"><span className="online-dot" /> Espace personnel</span><button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div></header>
      <main id="main-content" ref={main} tabIndex={-1} className="main-content">{storageError && <p role="alert" className="storage-error">{storageError}</p>}<Outlet /></main>
      <footer className="page-footer"><span>Chaque révision compte.</span><span><ShieldCheck size={14} />{storageError ? 'Progression disponible pour cette session' : 'Progression enregistrée sur cet appareil'}</span></footer>
    </div>
  </div>
}
