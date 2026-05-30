import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { LISTENING_PACKS } from '@/lib/listening-mode/catalog'
import {
  buildListeningFocusRecommendationCards,
  buildListeningRecommendationContext,
} from '@/lib/listening-mode/listeningPersonalizedRecommendations'
import { pickWeakestDimension } from '@/lib/listening-mode/listeningSessionResolve'
import type { ListeningProfileDimension } from '@/lib/listening-mode/listeningSkillModel'
import type { ListeningLevel } from '@/lib/listening-mode/schema'

export type ListeningPersonalizedFocus = {
  /** Primary tension line — calm, editorial (not a score). */
  headline: string
  /** One supporting sentence — human, scenario-grounded. */
  supportingLine: string
  /** Highest-priority practice pack for “Practice now”. */
  primaryPackId: string
  /** Optional last session for “Review mistakes”. */
  lastSessionId: string | null
}

function stress(profile: ListeningLearnerProfile, d: ListeningProfileDimension): number {
  return profile.dimensionStress[d] ?? 0
}

function headlineFromProfile(profile: ListeningLearnerProfile, weakest: ListeningProfileDimension | null): string {
  const fast = stress(profile, 'fast_speech')
  const nums = stress(profile, 'numbers_times')
  const route = stress(profile, 'route_place')
  const nat = stress(profile, 'natural_reply')
  const detail = stress(profile, 'detail_accuracy')

  if (fast >= 0.52 && (nums >= 0.48 || route >= 0.48)) {
    return 'Fast Dutch is still the pinch — times and routes slip past when the pace jumps.'
  }
  if (fast >= 0.5) return 'Listening to fast Dutch still asks for a little extra patience.'
  if (nums >= 0.5 && route >= 0.5) {
    return 'You’re tightening gist — times and route details still deserve a gentle spotlight.'
  }
  if (nums >= 0.5) return 'Times and numbers are still the fragile beat in what you hear.'
  if (route >= 0.5) return 'Route details stay sticky when Dutch compresses on the move.'
  if (nat >= 0.5 || weakest === 'natural_reply') {
    return 'Short service replies still want a calmer, more natural shape in your ear.'
  }
  if (detail >= 0.5) return 'You catch the scene — specifics still like a second honest listen.'
  if (weakest === 'replay_dependence' || weakest === 'transcript_dependence') {
    return 'You’re building honesty on first listen — keep nudging away from over-replay.'
  }
  return 'Your ear is warming to real Dutch — keep one clear focus per session.'
}

function supportingLineFromProfile(profile: ListeningLearnerProfile): string {
  const w = pickWeakestDimension(profile.dimensionStress)
  if (w === 'numbers_times') return 'We’ll keep café and travel numbers close — they show up everywhere in the wild.'
  if (w === 'route_place') return 'Platforms, turns, and “where next” lines reward short, repeated reps.'
  if (w === 'fast_speech') return 'Shelf and counter Dutch speeds up — short bursts keep it humane.'
  if (w === 'natural_reply') return 'Service Dutch loves a tiny, warm reply — we model what fits the moment.'
  if (w === 'detail_accuracy') return 'One honest pass, then details — the rhythm real conversations use.'
  return 'Scenario-first drills keep Dutch grounded in places you’ll actually stand in.'
}

export function buildListeningPersonalizedFocus(
  profile: ListeningLearnerProfile,
  level: ListeningLevel = 'A2',
): ListeningPersonalizedFocus {
  const ctx = buildListeningRecommendationContext(profile, level)
  const cards = buildListeningFocusRecommendationCards(ctx, 1)
  const top = cards[0]
  const weakest = pickWeakestDimension(profile.dimensionStress)
  const lastSessionId = profile.sessionIds[0] ?? null

  if (top) {
    return {
      headline: top.title,
      supportingLine: top.explanation,
      primaryPackId: top.packId,
      lastSessionId,
    }
  }

  return {
    headline: headlineFromProfile(profile, weakest),
    supportingLine: supportingLineFromProfile(profile),
    primaryPackId: LISTENING_PACKS[0]?.id ?? 'pack-train-platform',
    lastSessionId,
  }
}
