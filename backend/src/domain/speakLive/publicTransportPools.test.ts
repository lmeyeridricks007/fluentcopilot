import { describe, expect, it } from 'vitest'
import {
  PUBLIC_TRANSPORT_DESTINATION_POOLS,
  PUBLIC_TRANSPORT_TICKET_TERMS,
  PUBLIC_TRANSPORT_VOCABULARY_BY_SUBTYPE,
  examplePublicTransportRandomizedRuns,
  pickPublicTransportDestination,
} from './publicTransportPools'
import { buildPublicTransportScenario } from './publicTransportScenario'

describe('publicTransportPools', () => {
  it('destination pick returns only known pool strings', () => {
    const rng = () => 0.5
    const d = pickPublicTransportDestination(rng, 'buying_ticket')
    const all = [
      ...PUBLIC_TRANSPORT_DESTINATION_POOLS.hub,
      ...PUBLIC_TRANSPORT_DESTINATION_POOLS.city,
      ...PUBLIC_TRANSPORT_DESTINATION_POOLS.stop_line,
    ]
    expect(all).toContain(d)
  })

  it('vocabulary and ticket pools contain expected Dutch items', () => {
    expect(PUBLIC_TRANSPORT_VOCABULARY_BY_SUBTYPE.train).toContain('perron')
    expect(PUBLIC_TRANSPORT_VOCABULARY_BY_SUBTYPE.bus).toContain('buslijn')
    expect(PUBLIC_TRANSPORT_TICKET_TERMS).toContain('enkele reis')
  })

  it('examplePublicTransportRandomizedRuns returns five rows', () => {
    const runs = examplePublicTransportRandomizedRuns()
    expect(runs).toHaveLength(5)
    for (const r of runs) {
      expect(r.destination.length).toBeGreaterThan(0)
      expect(r.starters.length).toBeGreaterThan(0)
      expect(r.vocabularySnippet.length).toBeGreaterThan(0)
    }
  })

  it('buildPublicTransportScenario uses pool-backed destination when not overridden', () => {
    const s = buildPublicTransportScenario({
      level: 'A2',
      subType: 'tram',
      variation: 'route_and_platform',
      random: () => 0.33,
    })
    const allDest = [
      ...PUBLIC_TRANSPORT_DESTINATION_POOLS.hub,
      ...PUBLIC_TRANSPORT_DESTINATION_POOLS.city,
      ...PUBLIC_TRANSPORT_DESTINATION_POOLS.stop_line,
    ]
    expect(allDest).toContain(s.destinationDisplay)
    expect(s.context).toMatch(/Woordenbank/)
    expect(s.hints?.length).toBeGreaterThan(0)
  })
})
