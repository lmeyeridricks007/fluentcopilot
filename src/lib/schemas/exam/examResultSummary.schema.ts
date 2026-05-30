/**
 * Aggregated report for a completed exam session.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { examTypeKeySchema } from '@/lib/schemas/exam/examType.schema'
import { nextBestActionSchema, reviewExtractionCandidateSchema } from '@/lib/schemas/exam/feedbackBlock.schema'

export const categoryBreakdownRowSchema = z.object({
  categoryKey: z.string().min(1),
  label: z.string().min(1).optional(),
  averageScore: z.number().nonnegative(),
  maxScore: z.number().positive(),
  weight: z.number().positive().optional(),
  metadata: metadataSchema,
})

export const readinessSignalSchema = z.object({
  band: z.enum(['not_ready', 'approaching', 'likely_ready', 'strong']),
  headline: z.string().min(1),
  detail: z.string().min(1).optional(),
  metadata: metadataSchema,
})

export const examResultSummarySchema = z.object({
  id: idSchema,
  examSessionId: idSchema,
  userId: idSchema,
  examType: examTypeKeySchema,
  examModuleId: idSchema.optional(),
  exerciseCount: z.number().int().positive(),
  totalScore: z.number().nonnegative(),
  maxScore: z.number().positive(),
  pass: z.boolean().optional(),
  categoryBreakdown: z.array(categoryBreakdownRowSchema).optional(),
  strengths: z.array(z.string().min(1)).optional(),
  weaknesses: z.array(z.string().min(1)).optional(),
  readinessSignal: readinessSignalSchema.optional(),
  reviewItemsGenerated: z.array(reviewExtractionCandidateSchema).optional(),
  suggestedNextSteps: z.array(nextBestActionSchema).optional(),
  metadata: metadataSchema,
})

export type CategoryBreakdownRow = z.infer<typeof categoryBreakdownRowSchema>
export type ReadinessSignal = z.infer<typeof readinessSignalSchema>
export type ExamResultSummary = z.infer<typeof examResultSummarySchema>
