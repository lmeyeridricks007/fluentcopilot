/**
 * Pure helpers for speaking exam simulation flow (testable, no React).
 */
export type SimulationAdvance = 'next_question' | 'session_report'

export function afterQuestionStored(questionIndex: number, totalQuestions: number): SimulationAdvance {
  return questionIndex + 1 >= totalQuestions ? 'session_report' : 'next_question'
}
