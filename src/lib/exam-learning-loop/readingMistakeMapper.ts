/**
 * Reading MCQ outcomes → scanning vs comprehension signals.
 */
import type { ExamLearningSignal } from '@/lib/exam-learning-loop/types'

export function mapReadingOutcomeToSignals(input: {
  itemId: string
  readingSkill: 'scanning' | 'comprehension'
  correct: boolean
}): ExamLearningSignal[] {
  if (input.correct) return []
  return [
    {
      category: 'reading',
      subkind: input.readingSkill,
      weight: 3,
      dedupeKey: 'mcq-miss',
      weakTag: input.readingSkill === 'scanning' ? 'exam-reading-scanning-miss' : 'exam-reading-comprehension-miss',
      reviewHint: {
        type: 'grammar',
        prompt:
          input.readingSkill === 'scanning'
            ? 'Lezen — zoek het feit snel in korte teksten (examengericht).'
            : 'Lezen — let op betekenis en bedoeling van de tekst.',
        expectedAnswer: 'Oefen met korte mededelingen en e-mails in het Nederlands.',
        tags: ['exam_prep', 'reading', input.readingSkill],
      },
    },
  ]
}
