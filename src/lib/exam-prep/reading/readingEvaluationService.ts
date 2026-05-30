/**
 * Deterministic MCQ evaluation for reading training (no LLM).
 */
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'
import type { ReadingEvaluationResult } from '@/lib/exam-prep/reading/types'

export function evaluateReadingMcq(input: {
  item: ReadingTrainingItem
  selectedOptionId: string
}): ReadingEvaluationResult {
  const { item, selectedOptionId } = input
  const correct = selectedOptionId === item.correctOptionId

  return {
    correct,
    selectedOptionId,
    correctOptionId: item.correctOptionId,
    headlineNl: correct ? 'Goed gelezen' : 'Niet helemaal',
    bodyNl: correct ? item.feedbackCorrectNl : item.feedbackIncorrectNl,
    evidenceSnippetNl: item.evidenceSnippetNl,
  }
}

export function weakTagForReadingMiss(skill: ReadingTrainingItem['readingSkill']): string {
  return skill === 'scanning' ? 'exam-reading-scanning-miss' : 'exam-reading-comprehension-miss'
}
