import { describe, expect, it } from 'vitest'
import type { ScenarioRuntimeConfig } from '../../models/contracts'
import {
  buildPublicTransportScenario,
  isPublicTransportSpeakLiveRuntimeOpeningStale,
  PUBLIC_TRANSPORT_SCENARIO_FAMILY,
  PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID,
  PUBLIC_TRANSPORT_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
} from './publicTransportScenario'

describe('buildPublicTransportScenario', () => {
  it('returns public_transport runtime with weighted goals for buying_ticket', () => {
    const rng = () => 0.01
    const s = buildPublicTransportScenario({
      level: 'A2',
      subType: 'tram',
      variation: 'buying_ticket',
      destination: 'Centraal Station',
      random: rng,
    })
    expect(s.id).toBe(PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID)
    expect(s.scenarioFamily).toBe(PUBLIC_TRANSPORT_SCENARIO_FAMILY)
    expect(s.subType).toBe('tram')
    expect(s.variation).toBe('buying_ticket')
    expect(s.destinationDisplay).toBe('Centraal Station')
    expect(s.goals.length).toBe(4)
    expect(s.goals[0].id).toBe('ASK_FOR_TICKET_CLEARY')
    expect(s.goals[0].weight).toBe(35)
    expect(s.evaluationContract?.variationId).toBe('buying_ticket')
    expect(s.evaluationContract?.completionRequiredPassGoalIds).toEqual([
      'ASK_FOR_TICKET_CLEARY',
      'CONFIRM_TICKET_DETAIL',
    ])
    expect(s.publicTransportLearnerSpeaksFirst).toBe(true)
    expect(s.publicTransportOpeningContractVersion).toBeGreaterThanOrEqual(1)
    expect(s.openingLine).toBeUndefined()
  })
})

describe('isPublicTransportSpeakLiveRuntimeOpeningStale', () => {
  it('returns false for fresh public_transport learner-first runtime', () => {
    expect(
      isPublicTransportSpeakLiveRuntimeOpeningStale('train-station', {
        scenarioRuntimeConfig: {
          id: PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID,
          publicTransportLearnerSpeaksFirst: true,
          publicTransportOpeningContractVersion: PUBLIC_TRANSPORT_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
        } as ScenarioRuntimeConfig,
      })
    ).toBe(false)
  })

  it('returns true when learner-first flag is missing', () => {
    expect(
      isPublicTransportSpeakLiveRuntimeOpeningStale('train-station', {
        scenarioRuntimeConfig: {
          id: PUBLIC_TRANSPORT_SCENARIO_RUNTIME_ID,
          publicTransportOpeningContractVersion: PUBLIC_TRANSPORT_SPEAK_LIVE_OPENING_CONTRACT_VERSION,
        } as ScenarioRuntimeConfig,
      })
    ).toBe(true)
  })
})
