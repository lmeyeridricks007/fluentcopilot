import { describe, expect, it } from 'vitest'
import { scenarioListeningWarmupForLaunch } from '@/lib/listening-mode/scenarioListeningWarmup'
import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'

const SCHEMA_VERSION = 1 as const

function stress(
  over: Partial<ListeningLearnerProfile['dimensionStress']> = {},
): ListeningLearnerProfile['dimensionStress'] {
  return {
    gist: 0.2,
    detail_accuracy: 0.2,
    fast_speech: 0.2,
    natural_reply: 0.2,
    response_readiness: 0.2,
    numbers_times: 0.2,
    route_place: 0.2,
    replay_dependence: 0.1,
    transcript_dependence: 0.1,
    ...over,
  }
}

function profile(over: Partial<ListeningLearnerProfile['dimensionStress']> = {}): ListeningLearnerProfile {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    dimensionStress: stress(over),
    sessionIds: [],
  }
}

describe('scenarioListeningWarmupForLaunch', () => {
  it('returns listening_gap variant when natural_reply stress is high', () => {
    const w = scenarioListeningWarmupForLaunch('cafe', profile({ natural_reply: 0.5 }))
    expect(w?.variant).toBe('listening_gap')
    expect(w?.href).toContain('track=listen_food_order')
    expect(w?.href).toContain('from=cafe')
  })

  it('returns clips_first when stress is low', () => {
    const w = scenarioListeningWarmupForLaunch('train', profile())
    expect(w?.variant).toBe('clips_first')
    expect(w?.href).toContain('track=listen_transport')
  })
})
