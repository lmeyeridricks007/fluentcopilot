/**
 * Full-length KNM exam plans (DUO-style counts) from seed content.
 */
import { shuffleDeterministic } from '@/lib/exam-prep/reading/readingTaskBuilder'
import { KMN_QUIZ_QUESTIONS } from '@/lib/exam-prep/kmn/kmnSeedContent'
import type { KmnQuizQuestion } from '@/lib/exam-prep/kmn/types'
import { DUO_KNM_DURATION_SEC, DUO_KNM_MCQ_COUNT, duoExamSeedFromSetId } from '@/lib/exam/duoExamStructure'

export function buildKmnDuoPracticeExamQuestions(setId: string): KmnQuizQuestion[] {
  const seed = duoExamSeedFromSetId(setId)
  const shuffled = shuffleDeterministic([...KMN_QUIZ_QUESTIONS], seed + 23)
  return Array.from({ length: DUO_KNM_MCQ_COUNT }, (_, i) => shuffled[i % shuffled.length]!)
}

export { DUO_KNM_DURATION_SEC, DUO_KNM_MCQ_COUNT }
