import { describe, expect, it } from 'vitest'
import {
  getScenarioListeningTrack,
  resolveListeningTrackForScenario,
  SCENARIO_LISTENING_TRACKS,
} from '@/lib/listening-mode/scenarioListeningTracks'

describe('scenarioListeningTracks', () => {
  it('defines 13 scenario-linked tracks', () => {
    expect(SCENARIO_LISTENING_TRACKS.length).toBe(13)
  })

  it('resolves cafe to food ordering track', () => {
    const t = resolveListeningTrackForScenario('cafe')
    expect(t?.id).toBe('listen_food_order')
  })

  it('resolves train to transport track', () => {
    const t = resolveListeningTrackForScenario('train')
    expect(t?.id).toBe('listen_transport')
  })

  it('resolves unknown scenario by catalog category', () => {
    const t = resolveListeningTrackForScenario('restaurant')
    expect(t?.catalogCategory).toBe('food')
  })

  it('getScenarioListeningTrack returns undefined for bad id', () => {
    expect(getScenarioListeningTrack('nope')).toBeUndefined()
  })
})
