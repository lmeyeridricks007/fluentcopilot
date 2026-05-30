/**
 * KMN quiz/scenario/flash outcomes → topic-gap signals.
 */
import type { ExamLearningSignal } from '@/lib/exam-learning-loop/types'
import type { KmnTopicId } from '@/lib/exam-prep/kmn/types'

export function mapKmnOutcomeToSignals(input: {
  topicId: KmnTopicId
  surface: 'quiz' | 'scenario' | 'flashcard'
  conceptOrStepId: string
  correct: boolean
}): ExamLearningSignal[] {
  if (input.correct) return []
  const legacyWeak =
    input.surface === 'quiz'
      ? `kmn-${input.topicId}-quiz-miss`
      : input.surface === 'scenario'
        ? `kmn-${input.topicId}-scenario-miss`
        : `kmn-${input.topicId}-flash-miss`

  return [
    {
      category: 'kmn',
      subkind: `${input.surface}-${input.conceptOrStepId}`,
      weight: 2,
      dedupeKey: `${input.surface}-miss`,
      weakTag: legacyWeak,
      extraWeakTags: [`exam-kmn-${input.topicId}-${input.surface}-gap`],
      reviewHint: {
        type: 'phrase',
        prompt: `KNM — ${input.topicId}: herhaal het kernpunt van deze opdracht.`,
        expectedAnswer: 'Bestudeer de uitleg in KNM en de bijbehorende flashcard.',
        tags: ['exam_prep', 'kmn', input.topicId, input.surface],
      },
    },
  ]
}
