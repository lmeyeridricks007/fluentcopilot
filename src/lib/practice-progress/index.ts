export { processPracticeScenarioCompletion } from '@/lib/practice-progress/practiceProgressService'
export { processSkillTrackSessionProgress } from '@/lib/practice-progress/practiceSkillTrackProgress'
export {
  readPracticeCompletionUi,
  clearPracticeCompletionUi,
  type PracticeCompletionUiPayload,
} from '@/lib/practice-progress/practiceProgressUiStorage'
export { calculateScenarioXp, practiceQualifiesForStreak } from '@/lib/practice-progress/practiceRewardCalculator'
export { applyPracticeUnlocks, practiceBreadthUnlockThreshold } from '@/lib/practice-progress/practiceUnlockService'
export type {
  PracticeScenarioCompletionResult,
  PracticeProgressHighlight,
} from '@/lib/practice-progress/types'
