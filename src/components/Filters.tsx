import { SlidersHorizontal } from 'lucide-react'
import { useId } from 'react'
import type { Card } from '../types'

type Props = {
  cards: Card[]
  category: string
  subcategory: string
  onChange: (category: string, subcategory: string) => void
}
export function Filters({ cards, category, subcategory, onChange }: Props) {
  const id = useId()
  const categories = [...new Set(cards.map(card => card.category))]
  const subcategories = [...new Set(cards.filter(card => !category || card.category === category).map(card => card.subcategory))]
  return <div className="filters"><span className="filter-caption"><SlidersHorizontal size={16} /> Affiner ma sélection</span><div className="filter-fields">
    <div><label htmlFor={`${id}-category`}>Catégorie</label><select id={`${id}-category`} value={category} onChange={event => onChange(event.target.value, '')}><option value="">Toutes les catégories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></div>
    <div><label htmlFor={`${id}-subcategory`}>Sous-catégorie</label><select id={`${id}-subcategory`} value={subcategory} onChange={event => onChange(category, event.target.value)}><option value="">Toutes les sous-catégories</option>{subcategories.map(value => <option key={value}>{value}</option>)}</select></div>
  </div></div>
}
