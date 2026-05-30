/**
 * Learner-facing coach output for Writing Exam Prep (training).
 * Corrections share the same shape as speaking coach items.
 */
import { z } from 'zod'
import { speakingCorrectionItemSchema } from '@/lib/schemas/exam/speakingCoachOutput.schema'

export const writingCoachRubricCategoryKeySchema = z.enum([
  'execution',
  'grammar',
  'spelling',
  'clearness',
  'vocabulary',
])

export const writingCategoryCoachEntrySchema = z.object({
  categoryKey: writingCoachRubricCategoryKeySchema,
  labelNl: z.string().min(1),
  score: z.number().nonnegative(),
  maxScore: z.number().positive(),
  learnerFeedbackNl: z.string().min(1),
  evidenceNl: z.string().min(1).optional(),
})

export const writingCoachOutputSchema = z.object({
  categoryEntries: z.array(writingCategoryCoachEntrySchema).min(1),
  corrections: z.array(speakingCorrectionItemSchema).max(6),
  improvedVersionDutch: z.string().min(1),
  improvedVersionNoteNl: z.string().min(1),
  idealAnswerDutch: z.string().min(1),
  idealAnswerNoteEn: z.string().min(1).optional(),
  nextStepNl: z.string().min(1),
  mistakeOrientedTags: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type WritingCategoryCoachEntry = z.infer<typeof writingCategoryCoachEntrySchema>
export type WritingCoachOutput = z.infer<typeof writingCoachOutputSchema>
