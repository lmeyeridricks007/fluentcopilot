import type { PracticalAbilityDefinition } from '@/lib/mastery/types'
import type { AbilityMasteryBand } from '@/lib/schemas/practice/abilityMasteryState.schema'
import type { AbilityConfidenceTrendUi } from '@/lib/schemas/practice/abilityMasteryState.schema'
import { getPracticeScenarioHref } from '@/lib/practice/getPracticeScenarioHref'

export type AbilityNextPracticeVm = {
  label: string
  href: string
  detail: string
}

export function buildAbilityNextPractice(input: {
  def: PracticalAbilityDefinition
  band: AbilityMasteryBand
  trend: AbilityConfidenceTrendUi
}): AbilityNextPracticeVm {
  const firstScenario = input.def.scenarioIds[0]
  const secondScenario = input.def.scenarioIds[1]
  const guidedHref = firstScenario ? getPracticeScenarioHref(firstScenario) : '/app/practice/scenarios'
  const semiHref = firstScenario ? `/app/practice/semi/${encodeURIComponent(firstScenario)}` : guidedHref
  const freeHref = firstScenario ? `/app/practice/free/${encodeURIComponent(firstScenario)}` : guidedHref

  if (input.trend === 'needs_refresh') {
    return {
      label: 'Quick refresh',
      href: '/app/review/daily',
      detail: 'You were strong here — a short review keeps it automatic.',
    }
  }

  if (input.band === 'weak') {
    return {
      label: 'Practice this now',
      href: guidedHref,
      detail: 'Guided first — build the pattern, then go freer in the same scene.',
    }
  }

  if (input.band === 'improving') {
    if (input.trend === 'slipping') {
      return {
        label: 'Fix mistakes',
        href: '/app/review/mistakes',
        detail: 'Tighten slips fast, then retry the situation with lighter coaching.',
      }
    }
    return {
      label: 'Go semi-guided',
      href: secondScenario ? `/app/practice/semi/${encodeURIComponent(secondScenario)}` : semiHref,
      detail: 'Same goal — more of your own wording, or a 3-minute skill track.',
    }
  }

  /* strong */
  if (input.trend === 'slipping') {
    return {
      label: 'Quick semi tune-up',
      href: semiHref,
      detail: 'One light pass usually brings this back before it drifts.',
    }
  }

  return {
    label: 'Try free speaking',
    href: freeHref,
    detail: 'Stress-test without prompts — or open a related skill track.',
  }
}

export function secondaryAbilityPractice(def: PracticalAbilityDefinition): AbilityNextPracticeVm | null {
  const tid = def.skillTrackIds[0]
  if (!tid) return null
  return {
    label: 'Improve with a track',
    href: `/app/practice/tracks/${encodeURIComponent(tid)}`,
    detail: 'Short coached reps alongside full scenarios.',
  }
}
