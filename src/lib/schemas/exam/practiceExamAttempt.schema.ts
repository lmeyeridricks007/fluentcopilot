import { z } from 'zod'
import { rubricDomainKeySchema } from '@/lib/schemas/exam/examType.schema'

/**
 * Persisted practice exam attempt (localStorage). Mirrors `PracticeExamAttemptStored` in code.
 * @see src/lib/exam-prep/practice-exams/types.ts
 */
export const practiceExamAttemptStoredSchema = z.object({
  id: z.string(),
  setId: z.string(),
  module: rubricDomainKeySchema,
  contentVersion: z.number().int().positive(),
  sessionId: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  averagePercent: z.number().min(0).max(100),
  passedRatio: z.number().min(0).max(1),
  taskCount: z.number().int().positive(),
  meta: z.record(z.unknown()).optional(),
})

export type PracticeExamAttemptStoredSchema = z.infer<typeof practiceExamAttemptStoredSchema>
