/** Stable logical keys under `writingDrafts` (user-scoped via draft document). */

export function writingTrainingTaskDraftKey(taskId: string): string {
  return `autosave/v1/writing-training/${taskId}`
}

export function writingSimulationDraftKey(scope: 'free' | string): string {
  return scope === 'free' ? 'autosave/v1/writing-simulation/free' : `autosave/v1/writing-simulation/pe/${scope}`
}

export function speakingSimulationDraftKey(scope: 'free' | string): string {
  return scope === 'free' ? 'autosave/v1/speaking-simulation/free' : `autosave/v1/speaking-simulation/pe/${scope}`
}

export function listeningPracticeExamDraftKey(setId: string): string {
  return `autosave/v1/listening-practice-exam/${setId}`
}

export function readingPracticeExamDraftKey(setId: string): string {
  return `autosave/v1/reading-practice-exam/${setId}`
}

export function freerPracticeTextDraftKey(stepKey: string): string {
  return `autosave/v1/text/freer-practice/${stepKey}`
}
