/**
 * Maps domain training items to a normalized `ExamQuestion` (analytics / future UI).
 */
import type { ExamQuestion } from '@/lib/exam/examTypes'
import type { ReadingTrainingItem } from '@/lib/schemas/exam/readingTrainingItem.schema'

export function examQuestionFromReadingItem(item: ReadingTrainingItem, order: number): ExamQuestion {
  return {
    id: item.id,
    kind: 'mcq',
    examType: 'reading',
    order,
    promptNl: item.instructionNl,
    scoringWeight: 1,
    media: { type: 'text', ref: item.id },
    options: item.options.map((o) => ({ id: o.id, labelNl: o.labelNl })),
    correctOptionId: item.correctOptionId,
  }
}
