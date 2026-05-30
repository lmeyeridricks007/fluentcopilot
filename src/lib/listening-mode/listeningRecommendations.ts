import { LISTENING_PACKS, getListeningPack } from '@/lib/listening-mode/catalog'
import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import {
  buildListeningFocusRecommendationCards,
  buildListeningRecommendationContext,
} from '@/lib/listening-mode/listeningPersonalizedRecommendations'

export type ListeningRecCard = {
  title: string
  subtitle: string
  packId: string
  reason: string
}

/**
 * Ranked pack cards for hub/report — uses the same engine as Listening landing focus cards.
 */
export function listeningTopRecommendations(
  profile: ListeningLearnerProfile,
  opts?: { excludePackId?: string; level?: ListeningLevel },
): ListeningRecCard[] {
  const level = opts?.level ?? 'A2'
  const ctx = buildListeningRecommendationContext(profile, level)
  let cards = buildListeningFocusRecommendationCards(ctx, 6)
  if (opts?.excludePackId) {
    cards = cards.filter((c) => c.packId !== opts.excludePackId)
  }
  const mapped: ListeningRecCard[] = cards.slice(0, 3).map((c) => {
    const p = getListeningPack(c.packId)
    return {
      title: c.title,
      subtitle: p?.subtitle ?? '',
      packId: c.packId,
      reason: c.explanation,
    }
  })
  if (mapped.length >= 3) return mapped

  for (const p of LISTENING_PACKS) {
    if (mapped.length >= 3) break
    if (opts?.excludePackId && p.id === opts.excludePackId) continue
    if (mapped.some((m) => m.packId === p.id)) continue
    mapped.push({
      title: p.title,
      subtitle: p.subtitle,
      packId: p.id,
      reason: 'A fresh scenario-linked burst to keep variety.',
    })
  }
  return mapped.slice(0, 3)
}
