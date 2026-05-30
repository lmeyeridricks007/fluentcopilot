import { describe, expect, it } from 'vitest'
import { listeningTopRecommendations } from '@/lib/listening-mode/listeningRecommendations'
import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { LISTENING_PROFILE_DIMENSIONS } from '@/lib/listening-mode/listeningSkillModel'

function emptyProfile(): ListeningLearnerProfile {
  const dimensionStress = Object.fromEntries(LISTENING_PROFILE_DIMENSIONS.map((d) => [d, 0.35])) as Record<
    (typeof LISTENING_PROFILE_DIMENSIONS)[number],
    number
  >
  return {
    schemaVersion: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
    dimensionStress,
    sessionIds: [],
  }
}

describe('listeningTopRecommendations', () => {
  it('returns up to three cards with pack ids', () => {
    const recs = listeningTopRecommendations(emptyProfile(), { level: 'A2' })
    expect(recs.length).toBeGreaterThanOrEqual(1)
    expect(recs.length).toBeLessThanOrEqual(3)
    for (const r of recs) {
      expect(r.packId.length).toBeGreaterThan(3)
      expect(r.title.length).toBeGreaterThan(2)
      expect(r.reason.length).toBeGreaterThan(3)
    }
  })

  it('excludes a pack when excludePackId matches', () => {
    const recs = listeningTopRecommendations(emptyProfile(), {
      level: 'A2',
      excludePackId: 'pack-cafe-burst',
    })
    expect(recs.every((r) => r.packId !== 'pack-cafe-burst')).toBe(true)
  })

  it('respects level in recommendation context (B1 still returns cards)', () => {
    const b1 = listeningTopRecommendations(emptyProfile(), { level: 'B1' })
    expect(b1.length).toBeGreaterThanOrEqual(1)
  })
})
