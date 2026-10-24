import scienceCards from './sciences-demo.json'
import referenceCards from './references-demo.json'
import domainData from './domains-demo.json'
import type { Card, Domain } from '../../src/types'

// Les anciennes données fictives restent uniquement comme jeux de test.
export const cards: Card[] = [...scienceCards, ...referenceCards]
export const domains = domainData as Domain[]
