import { BookOpen } from 'lucide-react'
import { Link } from 'react-router'
import type { ReactNode } from 'react'

export function EmptyState({ title, children, href = '/', label = 'Retour à mon espace' }: { title: string; children?: ReactNode; href?: string; label?: string }) {
  return <div className="empty-state surface"><span className="empty-icon"><BookOpen size={30} /></span><h2>{title}</h2><p>{children}</p><Link className="button primary" to={href}>{label}</Link></div>
}
