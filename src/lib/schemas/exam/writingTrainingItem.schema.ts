/**
 * Authoring row for Writing Exam Prep — Training vertical slice.
 * Aligns with `writingExerciseSubtypeSchema` / `writingExerciseSpecSchema` when persisting full exercises.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { writingExerciseSubtypeSchema } from '@/lib/schemas/exam/writingExam.schema'

export const writingTrainingFormFieldSchema = z.object({
  id: z.string().min(1),
  labelDutch: z.string().min(1),
  placeholderDutch: z.string().optional(),
  required: z.boolean().optional(),
  metadata: metadataSchema,
})

/** Single point the learner must cover (keywords) or a form field that must be filled. */
export const writingTrainingRequirementSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('content'),
    id: z.string().min(1),
    /** Shown as bullet in UI */
    textNl: z.string().min(1),
    /** Lowercase tokens/phrases; at least one should appear in the answer for “hit” */
    matchTerms: z.array(z.string().min(1)).min(1),
    metadata: metadataSchema,
  }),
  z.object({
    kind: z.literal('form_field'),
    id: z.string().min(1),
    fieldId: z.string().min(1),
    textNl: z.string().min(1),
    metadata: metadataSchema,
  }),
])

export const writingTrainingItemSchema = z.object({
  id: idSchema,
  subtype: writingExerciseSubtypeSchema,
  /** Short label in hub / analytics */
  titleNl: z.string().min(1),
  /** Situation / context (Dutch) */
  scenarioNl: z.string().min(1),
  /** What to do (Dutch), exam-style */
  instructionNl: z.string().min(1),
  /** Ordered checks for execution scoring + bullets in UI */
  requirements: z.array(writingTrainingRequirementSchema).min(1),
  /** Subtype `form`: labelled inputs */
  formFields: z.array(writingTrainingFormFieldSchema).optional(),
  modelAnswerDutch: z.string().min(1),
  modelAnswerNoteEn: z.string().min(1).optional(),
  /** Soft guidance only */
  minWordsHint: z.number().int().positive().optional(),
  maxWordsHint: z.number().int().positive().optional(),
  metadata: metadataSchema,
})

export type WritingTrainingItem = z.infer<typeof writingTrainingItemSchema>
export type WritingTrainingFormField = z.infer<typeof writingTrainingFormFieldSchema>
export type WritingTrainingRequirement = z.infer<typeof writingTrainingRequirementSchema>
