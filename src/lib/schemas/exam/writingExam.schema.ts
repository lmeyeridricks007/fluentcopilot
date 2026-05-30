/**
 * Writing-specific exercise specs, content checks, and attempt payloads.
 */
import { z } from 'zod'
import { metadataSchema } from '@/lib/schemas/shared.schema'

export const writingExerciseSubtypeSchema = z.enum(['form', 'message', 'text_to_audience'])

export const writingFormFieldSpecSchema = z.object({
  id: z.string().min(1),
  labelDutch: z.string().min(1),
  placeholderDutch: z.string().optional(),
  required: z.boolean().optional(),
  maxLength: z.number().int().positive().optional(),
  metadata: metadataSchema,
})

/** Authoring extension on a writing exercise. */
export const writingExerciseSpecSchema = z.object({
  subtype: writingExerciseSubtypeSchema,
  /** Target length band for learner guidance (not hard validation unless enforced). */
  minWords: z.number().int().nonnegative().optional(),
  maxWords: z.number().int().positive().optional(),
  minCharacters: z.number().int().nonnegative().optional(),
  maxCharacters: z.number().int().positive().optional(),
  /** Structured form layout (subtype `form`). */
  formFields: z.array(writingFormFieldSpecSchema).optional(),
  /** Bullet points the answer must address (checker + rubric evidence). */
  requiredContentChecks: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

export const writingRubricCategoryKeySchema = z.enum([
  'execution',
  'task_execution',
  'grammar',
  'spelling',
  'clearness',
  'clarity',
  'vocabulary',
  'coherence',
  'register',
])

/** Runtime payload attached to `ExamAttempt` for writing. */
export const writingAttemptPayloadSchema = z.object({
  /** Free-form message / essay text. */
  bodyText: z.string().optional(),
  /** Form subtype: field id → value. */
  fieldValues: z.record(z.string(), z.string()).optional(),
  /** Word / character counts at submit (deterministic checks). */
  wordCount: z.number().int().nonnegative().optional(),
  characterCount: z.number().int().nonnegative().optional(),
  metadata: metadataSchema,
})

export const writingRubricScoresSchema = z.record(
  writingRubricCategoryKeySchema,
  z.object({
    score: z.number().nonnegative(),
    maxScore: z.number().positive(),
    levelKey: z.string().min(1).optional(),
    evidence: z.string().min(1).optional(),
    metadata: metadataSchema,
  })
)

export type WritingExerciseSubtype = z.infer<typeof writingExerciseSubtypeSchema>
export type WritingFormFieldSpec = z.infer<typeof writingFormFieldSpecSchema>
export type WritingExerciseSpec = z.infer<typeof writingExerciseSpecSchema>
export type WritingRubricCategoryKey = z.infer<typeof writingRubricCategoryKeySchema>
export type WritingAttemptPayload = z.infer<typeof writingAttemptPayloadSchema>
export type WritingRubricScores = z.infer<typeof writingRubricScoresSchema>
