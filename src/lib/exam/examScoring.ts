/**
 * Pass thresholds and score interpretation for exam-style simulations.
 */
import {
  DUO_KNM_MCQ_COUNT,
  DUO_KNM_PASS_CORRECT,
  DUO_LISTENING_MCQ_COUNT,
  DUO_LISTENING_PASS_CORRECT,
  DUO_READING_MCQ_COUNT,
  DUO_READING_PASS_CORRECT,
} from '@/lib/exam/duoExamStructure'

export type McqPassResult = {
  correctCount: number
  totalQuestions: number
  passThreshold: number
  passed: boolean
  accuracyPercent: number
  passLikelihoodLabelNl: string
}

function likelihoodNl(passed: boolean, correctCount: number, threshold: number): string {
  if (passed && correctCount >= threshold + 2) return 'Hoog — u zit ruim boven de typische grens.'
  if (passed) return 'Redelijk — rond de gebruikelijke slaaggrens.'
  return `Lager — oefen verder; gebruikelijk is ongeveer ${threshold} of meer goede antwoorden.`
}

export function scoreReadingMcqExam(correctCount: number): McqPassResult {
  const total = DUO_READING_MCQ_COUNT
  const passThreshold = DUO_READING_PASS_CORRECT
  const passed = correctCount >= passThreshold
  return {
    correctCount,
    totalQuestions: total,
    passThreshold,
    passed,
    accuracyPercent: Math.round((correctCount / Math.max(1, total)) * 100),
    passLikelihoodLabelNl: likelihoodNl(passed, correctCount, passThreshold),
  }
}

export function scoreListeningMcqExam(correctCount: number): McqPassResult {
  const total = DUO_LISTENING_MCQ_COUNT
  const passThreshold = DUO_LISTENING_PASS_CORRECT
  const passed = correctCount >= passThreshold
  return {
    correctCount,
    totalQuestions: total,
    passThreshold,
    passed,
    accuracyPercent: Math.round((correctCount / Math.max(1, total)) * 100),
    passLikelihoodLabelNl: likelihoodNl(passed, correctCount, passThreshold),
  }
}

export function scoreKmnMcqExam(correctCount: number, totalQuestions: number = DUO_KNM_MCQ_COUNT): McqPassResult {
  const passThreshold = DUO_KNM_PASS_CORRECT
  const passed = correctCount >= passThreshold
  return {
    correctCount,
    totalQuestions,
    passThreshold,
    passed,
    accuracyPercent: Math.round((correctCount / Math.max(1, totalQuestions)) * 100),
    passLikelihoodLabelNl: likelihoodNl(passed, correctCount, passThreshold),
  }
}
