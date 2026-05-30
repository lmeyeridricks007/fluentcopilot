import { describe, expect, it } from 'vitest'
import {
  buildListeningFocusRecommendationCards,
  buildListeningRecommendationContext,
  practiceTagsToListeningBoost,
} from '@/lib/listening-mode/listeningPersonalizedRecommendations'
import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'

function profile(stress: Partial<ListeningLearnerProfile['dimensionStress']>): ListeningLearnerProfile {
  const base: ListeningLearnerProfile['dimensionStress'] = {
    gist: 0.35,
    detail_accuracy: 0.35,
    fast_speech: 0.35,
    natural_reply: 0.35,
    response_readiness: 0.35,
    numbers_times: 0.35,
    route_place: 0.35,
    replay_dependence: 0.2,
    transcript_dependence: 0.2,
  }
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    dimensionStress: { ...base, ...stress },
    sessionIds: [],
  }
}

describe('listeningPersonalizedRecommendations', () => {
  it('boosts route stress from practice tags', () => {
    const b = practiceTagsToListeningBoost(['transport', 'route', 'listen'])
    expect((b.route_place ?? 0) > 0).toBe(true)
  })

  it('surfaces fast Dutch card when fast_speech stress is high', () => {
    const p = profile({
      fast_speech: 0.62,
      route_place: 0.2,
      natural_reply: 0.2,
      response_readiness: 0.2,
    })
    const ctx = buildListeningRecommendationContext(p, 'A2')
    const cards = buildListeningFocusRecommendationCards(ctx, 2)
    expect(cards[0]?.packId).toBe('pack-shop-fast')
  })

  it('prefers route pack when route stress dominates', () => {
    const p = profile({
      route_place: 0.58,
      fast_speech: 0.25,
      natural_reply: 0.22,
      response_readiness: 0.22,
    })
    const ctx = buildListeningRecommendationContext(p, 'A2')
    const cards = buildListeningFocusRecommendationCards(ctx, 1)
    expect(cards[0]?.id).toBe('route_place')
  })
})
