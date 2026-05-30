import type { ExamTrainingSupport } from './types'

/** When true, answer phase uses a hard deadline and auto-submits like an exam. */
export function trainingUsesStrictAnswerTimer(support: ExamTrainingSupport, timedTraining: boolean): boolean {
  if (support === 'almost_exam') return true
  return timedTraining
}

export function showHintsInPrep(support: ExamTrainingSupport, hintRevealed: boolean): boolean {
  if (support === 'full_guidance') return true
  if (support === 'light_guidance') return true
  return hintRevealed
}

export function showHintsInAnswer(support: ExamTrainingSupport, hintRevealed: boolean): boolean {
  if (support === 'full_guidance') return true
  if (support === 'light_guidance') return false
  return hintRevealed
}

export function showExamples(support: ExamTrainingSupport, hintRevealed: boolean): boolean {
  if (support === 'full_guidance') return true
  if (support === 'light_guidance') return false
  return hintRevealed
}

export function showStructurePattern(support: ExamTrainingSupport): boolean {
  return support === 'full_guidance' || support === 'light_guidance'
}

export function showCoachingAfterTask(_support: ExamTrainingSupport): boolean {
  return true
}

/** Stronger coaching copy for light vs full. */
export function coachingVerbosity(support: ExamTrainingSupport): 'full' | 'light' | 'minimal' {
  if (support === 'full_guidance') return 'full'
  if (support === 'light_guidance') return 'light'
  return 'minimal'
}

export function maxTrainingRetries(support: ExamTrainingSupport): number {
  if (support === 'full_guidance') return 2
  if (support === 'light_guidance') return 1
  return 0
}

export function allowSkipPrep(support: ExamTrainingSupport): boolean {
  return support !== 'almost_exam'
}
