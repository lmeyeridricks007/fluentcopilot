/**
 * Deterministic MCQ evaluation for listening training (no LLM).
 */
import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'
import type { ListeningEvaluationResult } from '@/lib/exam-prep/listening/types'

export function evaluateListeningMcq(input: {
  item: ListeningTrainingItem
  selectedOptionId: string
}): ListeningEvaluationResult {
  const { item, selectedOptionId } = input
  const correct = selectedOptionId === item.correctOptionId

  return {
    correct,
    selectedOptionId,
    correctOptionId: item.correctOptionId,
    headlineNl: correct ? 'Goed gehoord' : 'Niet helemaal',
    bodyNl: correct ? item.feedbackCorrectNl : item.feedbackIncorrectNl,
    keyPhraseNl: item.keyPhraseNl,
  }
}

export function weakTagForListeningMiss(questionType: ListeningTrainingItem['questionType']): string {
  return `exam-listening-${questionType}-miss`
}
