/**
 * Lightweight learner state machine for tone, density of support, and emphasis.
 * Inputs can be expanded (exam date, streak, error rates) without changing call sites.
 */

export type UserLearningStateId =
  | 'starting'
  | 'practicing'
  | 'stuck'
  | 'improving'
  | 'preparing'

export type UserLearningStateVm = {
  id: UserLearningStateId
  /** Short label for UI chips */
  label: string
  /** Coach / Talk copy tone */
  toneHint: string
  /** Prefer more inline hints and structured scenarios */
  preferGuidedFlow: boolean
  /** Surface exam readiness and simulations more prominently */
  emphasizeExamSurfaces: boolean
}

export type UserLearningStateSignals = {
  /** Days with at least one session */
  streakDays: number
  /** Rough proxy for volume */
  totalXp: number
  /** Count of open weak areas if available */
  weakAreaCount: number
  /** User indicated exam focus in profile or study context */
  examFocus: boolean
}

const DEFAULT: UserLearningStateVm = {
  id: 'practicing',
  label: 'Building rhythm',
  toneHint: 'Steady practice — small wins add up.',
  preferGuidedFlow: false,
  emphasizeExamSurfaces: false,
}

export function resolveUserLearningState(signals: UserLearningStateSignals): UserLearningStateVm {
  const { streakDays, totalXp, weakAreaCount, examFocus } = signals

  if (examFocus) {
    return {
      id: 'preparing',
      label: 'Exam focus',
      toneHint: 'We will connect drills to exam tasks and keep practice purposeful.',
      preferGuidedFlow: true,
      emphasizeExamSurfaces: true,
    }
  }

  if (weakAreaCount >= 3 && streakDays >= 2) {
    return {
      id: 'stuck',
      label: 'Unstick patterns',
      toneHint: 'A few patterns are looping — short fixes beat long sessions.',
      preferGuidedFlow: true,
      emphasizeExamSurfaces: false,
    }
  }

  if (totalXp < 120 || streakDays === 0) {
    return {
      id: 'starting',
      label: 'Getting started',
      toneHint: 'Low pressure, clear next steps — we go at your pace.',
      preferGuidedFlow: true,
      emphasizeExamSurfaces: false,
    }
  }

  if (weakAreaCount === 0 && streakDays >= 5) {
    return {
      id: 'improving',
      label: 'Gaining ground',
      toneHint: 'Keep the thread — stretch with real-life scenarios.',
      preferGuidedFlow: false,
      emphasizeExamSurfaces: false,
    }
  }

  return DEFAULT
}
