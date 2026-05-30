/**
 * Ideal or acceptable model answers for learner comparison (training + debrief).
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { rubricDomainKeySchema } from '@/lib/schemas/exam/examType.schema'

export const modelAnswerSchema = z.object({
  id: idSchema,
  examExerciseId: idSchema,
  examType: rubricDomainKeySchema,
  /** Primary Dutch model (spoken script or written text). */
  answerDutch: z.string().min(1),
  answerEnglishOptional: z.string().min(1).optional(),
  /** Other acceptable productions (e.g. register variants). */
  acceptableAnswersDutch: z.array(z.string().min(1)).min(1).optional(),
  notes: z.string().min(1).optional(),
  /** Rubric-aligned bullet features the answer demonstrates. */
  keyFeatures: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

export type ModelAnswer = z.infer<typeof modelAnswerSchema>
