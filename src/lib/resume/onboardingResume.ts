import { resolveOnboardingState } from '@/lib/bootstrap/onboardingStateResolver'
import type { LearnerProfileRecord } from '@/lib/bootstrap/types'
import { ROUTES } from '@/lib/routing/authRedirects'
import { ONBOARDING_LAST_STEP_INDEX } from '@/store/onboardingStore'
import { RESUME_PRIORITY_RANK } from './resumePriority'
import type { ResumableFlow } from './resumeTypes'

export function buildOnboardingResumable(
  profile: LearnerProfileRecord | null,
  onboardingComplete: boolean
): ResumableFlow | null {
  if (!profile || onboardingComplete || profile.onboardingComplete) return null

  const r = resolveOnboardingState(profile)
  const totalSteps = ONBOARDING_LAST_STEP_INDEX + 1
  const lastUpdatedAt = profile.updatedAt ?? null

  if (r.kind === 'resume') {
    return {
      kind: 'onboarding',
      priorityRank: RESUME_PRIORITY_RANK.onboarding,
      title: 'Finish onboarding',
      summary: `Step ${Math.min(r.step + 1, totalSteps)} of ${totalSteps} — your answers are saved.`,
      lastUpdatedAt,
      continueHref: ROUTES.onboarding,
      allowRestart: false,
    }
  }

  if (r.kind === 'fresh') {
    return {
      kind: 'onboarding',
      priorityRank: RESUME_PRIORITY_RANK.onboarding,
      title: 'Finish onboarding',
      summary: 'A few quick questions personalize your plan.',
      lastUpdatedAt,
      continueHref: ROUTES.onboarding,
      allowRestart: false,
    }
  }

  // `complete` only when profile flag is set; guarded above.
  return null
}
