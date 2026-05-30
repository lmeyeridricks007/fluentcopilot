/**
 * Listening MCQ outcomes → signals (gist/detail/intent + replay dependence).
 */
import type { ExamLearningSignal } from '@/lib/exam-learning-loop/types'
import type { ListeningQuestionType } from '@/lib/schemas/exam/listeningTrainingItem.schema'

export function mapListeningOutcomeToSignals(input: {
  itemId: string
  questionType: ListeningQuestionType
  correct: boolean
  replayCount: number
  maxReplay: number
}): ExamLearningSignal[] {
  const { questionType, correct, replayCount, maxReplay } = input
  const signals: ExamLearningSignal[] = []

  if (!correct) {
    signals.push({
      category: 'listening',
      subkind: questionType,
      weight: 3,
      dedupeKey: 'mcq-miss',
      weakTag: `exam-listening-${questionType}-miss`,
      reviewHint: {
        type: 'listening',
        prompt: `Luisteren — oefen ${questionType}: herhaal het juiste antwoord in het hoofd.`,
        expectedAnswer: `Focus op ${questionType === 'gist' ? 'hoofdidee' : questionType === 'detail' ? 'details' : 'bedoeling van de spreker'}.`,
        tags: ['exam_prep', 'listening', questionType],
      },
    })
  }

  const replayRatio = maxReplay > 0 ? replayCount / maxReplay : 0
  if (replayRatio >= 0.66 && maxReplay > 0) {
    signals.push({
      category: 'listening',
      subkind: 'replay-dependence',
      weight: correct ? 1 : 2,
      dedupeKey: 'replay-heavy',
      weakTag: 'exam-listening-replay-heavy',
    })
  }

  return signals
}
