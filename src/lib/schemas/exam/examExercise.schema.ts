/**
 * Single exam task definition (content). Deterministic id + rubric ref; mode flags control hints/support.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { cefrBandSchema } from '@/lib/schemas/practice/practiceShared.schema'
import { examModeSchema } from '@/lib/schemas/exam/examShared.schema'
import {
  speakingExerciseSpecSchema,
} from '@/lib/schemas/exam/speakingExam.schema'
import {
  writingExerciseSpecSchema,
} from '@/lib/schemas/exam/writingExam.schema'

/** MCQ-style specs for listening / reading / KMN. */
export const closedResponseExerciseSpecSchema = z.object({
  responseKind: z.enum(['single_select', 'multi_select', 'true_false']),
  options: z.array(z.string().min(1)).min(2),
  /** For `single_select` / `true_false` (true_false: two options). */
  correctIndex: z.number().int().min(0).optional(),
  /** For `multi_select`. */
  correctIndices: z.array(z.number().int().min(0)).min(1).optional(),
  /** Optional short context text shown above options (reading/kmn). */
  contextTextDutch: z.string().min(1).optional(),
  /** Optional audio for listening. */
  stimulusAudioRef: z.string().min(1).optional(),
  metadata: metadataSchema,
})

/** Shared fields for all exercise variants (`examType` discriminant per branch). */
const examExerciseBaseSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  /** Learner-facing Dutch prompt. */
  promptDutch: z.string().min(1),
  promptEnglishOptional: z.string().min(1).optional(),
  instructions: z.string().min(1).optional(),
  bulletRequirements: z.array(z.string().min(1)).optional(),
  level: cefrBandSchema.optional(),
  /** Which modes may run this item (authoring constraint). */
  modesAllowed: z.array(examModeSchema).min(1),
  /** If true, hints must not be surfaced in simulation even if present in content. */
  hintsAllowedInContent: z.boolean().optional(),
  /** Progressive hints (training only; UI must gate by session mode). */
  hints: z.array(z.string().min(1)).optional(),
  /** Extra coaching copy / phrase bank ids (training). */
  trainingSupport: z
    .object({
      phraseBankRef: z.string().min(1).optional(),
      coachNotesMarkdown: z.string().min(1).optional(),
      metadata: metadataSchema,
    })
    .optional(),
  /** References `RubricDefinition.id` (version resolved at evaluation time). */
  scoringRubricId: idSchema,
  /** Optional link to canonical model answer document. */
  modelAnswerId: idSchema.optional(),
  tags: z.array(z.string().min(1)).optional(),
  timeLimitSecondsPrep: z.number().int().min(0).optional(),
  timeLimitSecondsResponse: z.number().int().positive().optional(),
  metadata: metadataSchema,
})

export const examExerciseSchema = z.discriminatedUnion('examType', [
  examExerciseBaseSchema.extend({
    examType: z.literal('speaking'),
    speakingSpec: speakingExerciseSpecSchema,
  }),
  examExerciseBaseSchema.extend({
    examType: z.literal('writing'),
    writingSpec: writingExerciseSpecSchema,
  }),
  examExerciseBaseSchema.extend({
    examType: z.literal('listening'),
    closedSpec: closedResponseExerciseSpecSchema,
  }),
  examExerciseBaseSchema.extend({
    examType: z.literal('reading'),
    closedSpec: closedResponseExerciseSpecSchema,
  }),
  examExerciseBaseSchema.extend({
    examType: z.literal('kmn'),
    closedSpec: closedResponseExerciseSpecSchema,
  }),
])

export type ClosedResponseExerciseSpec = z.infer<typeof closedResponseExerciseSpecSchema>
export type ExamExercise = z.infer<typeof examExerciseSchema>
