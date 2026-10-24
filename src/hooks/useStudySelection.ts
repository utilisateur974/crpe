import { useParams, useSearchParams } from 'react-router'
import { domains, filterCards, getDomainCards } from '../services/content'
import { useProgress } from './useProgress'

export function useStudySelection() {
  const { domainId } = useParams()
  const [params] = useSearchParams()
  const { progress } = useProgress()
  const domain = domains.find(item => item.id === domainId)
  const bank = getDomainCards(domainId ?? '')
  const status = params.get('statut')
  const deck = filterCards(bank, params.get('categorie') ?? '', params.get('sous-categorie') ?? '')
    .filter(card => !status || progress.cards[card.id]?.status === status)
  return { domain, bank, deck, sessionKey: `${domainId}:${params.toString()}`, backUrl: `/domaine/${domainId}${params.size ? `?${params}` : ''}` }
}
