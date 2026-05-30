import type { ListeningLearnerProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { listeningTrackSetupHref } from '@/lib/routing/appRoutes'
import { resolveListeningTrackForScenario } from '@/lib/listening-mode/scenarioListeningTracks'

export type ScenarioListeningWarmupSuggestion = {
  title: string
  body: string
  ctaLabel: string
  href: string
  /** Distinct copy variants for analytics / future A-B */
  variant: 'clips_first' | 'listening_gap'
}

function missesFastReplies(profile: ListeningLearnerProfile): boolean {
  const n = profile.dimensionStress.natural_reply ?? 0
  const f = profile.dimensionStress.fast_speech ?? 0
  return n >= 0.42 || f >= 0.45
}

/**
 * Optional card on scenario launch — same life-area listening before speaking.
 * Returns null if no track can be resolved (should not happen for catalog scenarios).
 */
export function scenarioListeningWarmupForLaunch(
  scenarioId: string,
  profile: ListeningLearnerProfile,
): ScenarioListeningWarmupSuggestion | null {
  const track = resolveListeningTrackForScenario(scenarioId)
  if (!track) return null
  const href = listeningTrackSetupHref({ trackId: track.id, fromScenario: scenarioId })

  if (missesFastReplies(profile)) {
    return {
      variant: 'listening_gap',
      title: 'Listening first (recommended)',
      body: `Recommended because quick replies in this scenario still slip by — two short clips in the same life area prime your ear before you speak.`,
      ctaLabel: 'Listening warm-up',
      href,
    }
  }

  return {
    variant: 'clips_first',
    title: 'Warm up with listening (optional)',
    body: `Two quick clips in the same FluentCopilot category — gist, a detail, then you jump into the scene with a calmer ear.`,
    ctaLabel: 'Warm up first',
    href,
  }
}
