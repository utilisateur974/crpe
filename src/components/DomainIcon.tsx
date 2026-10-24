import { BookOpen, FlaskConical, LibraryBig, Sparkles } from 'lucide-react'

export function DomainIcon({ name, size = 24 }: { name: string; size?: number }) {
  const Icon = { flask: FlaskConical, library: LibraryBig, book: BookOpen }[name] ?? Sparkles
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />
}
