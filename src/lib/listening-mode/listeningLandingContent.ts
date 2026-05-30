import {
  getAllScenarioListeningTracks,
  pickVariation,
  trackCategoryLine,
  trackEstimatedMinutes,
} from '@/lib/listening-mode/scenarioListeningTracks'

export { estimatePackDurationMinutes } from '@/lib/listening-mode/catalog'

/** Landing row — mirrors scenario track + setup entry. */
export type ListeningLandingTrack = {
  trackId: string
  packId: string
  title: string
  category: string
  levelsLabel: string
  reason: string
  durationMin: number
  visualEmoji: string
  skillTags: readonly string[]
}

export function listeningLandingTracks(): ListeningLandingTrack[] {
  return getAllScenarioListeningTracks().map((t) => {
    const v = pickVariation(t, null)
    return {
      trackId: t.id,
      packId: v.packId,
      title: t.title,
      category: trackCategoryLine(t),
      levelsLabel: t.levelsSupported.join(' · '),
      reason: t.subtitle,
      durationMin: trackEstimatedMinutes(t, v.id),
      visualEmoji: t.visualEmoji,
      skillTags: t.skillFocusTags,
    }
  })
}

/** Small “skill rail” items → direct session (power users); main grid uses setup. */
export const LISTENING_SKILL_FOCUS_ITEMS: Array<{
  id: string
  label: string
  hint: string
  packId: string
}> = [
  {
    id: 'fast',
    label: 'Fast Dutch',
    hint: 'Quicker lines at the shelf',
    packId: 'pack-shop-fast',
  },
  {
    id: 'times',
    label: 'Times & numbers',
    hint: 'Prices, slots, quantities',
    packId: 'pack-cafe-burst',
  },
  {
    id: 'route',
    label: 'Route details',
    hint: 'Platforms, turns, exits',
    packId: 'pack-train-platform',
  },
  {
    id: 'service',
    label: 'Short service replies',
    hint: 'Natural counter answers',
    packId: 'pack-cafe-burst',
  },
]
