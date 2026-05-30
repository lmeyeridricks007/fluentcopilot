import type { CoachingBlock } from './speakingAssessmentTypes'

/** FE-friendly grouping for speaking-coaching UI (no scores — copy only). */
export type SpeakingCoachingSurface = {
  headline: string
  howItSounded: { label: string; confidence: string }
  wentWell: string[]
  improve: string[]
  retryNow: { phrase: string | null; reason: string | null }
  levelNotes: string[]
}

export function toSpeakingCoachingSurface(coaching: CoachingBlock): SpeakingCoachingSurface {
  return {
    headline: coaching.shortSummary,
    howItSounded: {
      label: coaching.dutchSoundingLabel,
      confidence: coaching.confidenceNarrative,
    },
    wentWell: coaching.whatWentWell,
    improve: coaching.improveNext,
    retryNow: { phrase: coaching.retryTarget, reason: coaching.retryWhy },
    levelNotes: coaching.levelAlignedNotes,
  }
}
