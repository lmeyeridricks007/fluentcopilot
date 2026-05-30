/**
 * One learner submission for one exam exercise (runtime).
 */
import { z } from 'zod'
import { idSchema, metadataSchema, isoDateTimeSchema } from '@/lib/schemas/shared.schema'
import { examModeSchema, examResponseModalitySchema } from '@/lib/schemas/exam/examShared.schema'
import { rubricDomainKeySchema } from '@/lib/schemas/exam/examType.schema'
import {
  speakingAttemptPayloadSchema,
} from '@/lib/schemas/exam/speakingExam.schema'
import {
  writingAttemptPayloadSchema,
} from '@/lib/schemas/exam/writingExam.schema'
import { examScoringResultSchema } from '@/lib/schemas/exam/scoringResult.schema'

export const examRawResponseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    text: z.string(),
    metadata: metadataSchema,
  }),
  z.object({
    kind: z.literal('audio'),
    audioRef: z.string().min(1),
    metadata: metadataSchema,
  }),
  z.object({
    kind: z.literal('audio_with_transcript'),
    audioRef: z.string().min(1),
    transcript: z.string().optional(),
    metadata: metadataSchema,
  }),
  z.object({
    kind: z.literal('selection'),
    selectedIndices: z.array(z.number().int().min(0)),
    metadata: metadataSchema,
  }),
  z.object({
    kind: z.literal('form'),
    fieldValues: z.record(z.string(), z.string()),
    metadata: metadataSchema,
  }),
])

/**
 * Canonical shape for evaluators (derived from raw + type-specific payloads).
 */
export const examNormalizedResponseSchema = z.object({
  text: z.string().optional(),
  transcript: z.string().optional(),
  audioRef: z.string().optional(),
  selectedIndices: z.array(z.number().int().min(0)).optional(),
  fieldValues: z.record(z.string(), z.string()).optional(),
  metadata: metadataSchema,
})

export const examSupportUsedSchema = z.object({
  hintIndicesRevealed: z.array(z.number().int().min(0)).optional(),
  hintCount: z.number().int().nonnegative().optional(),
  phraseBankOpened: z.boolean().optional(),
  translationRevealed: z.boolean().optional(),
  coachExpanded: z.boolean().optional(),
  metadata: metadataSchema,
})

export const examAttemptSchema = z.object({
  id: idSchema,
  userId: idSchema,
  /** Parent session when part of a multi-item flow. */
  examSessionId: idSchema.optional(),
  examExerciseId: idSchema,
  examType: rubricDomainKeySchema,
  mode: examModeSchema,
  startedAt: isoDateTimeSchema,
  submittedAt: isoDateTimeSchema.optional(),
  rawResponse: examRawResponseSchema,
  normalizedResponse: examNormalizedResponseSchema.optional(),
  modality: examResponseModalitySchema,
  supportUsed: examSupportUsedSchema.optional(),
  speakingPayload: speakingAttemptPayloadSchema.optional(),
  writingPayload: writingAttemptPayloadSchema.optional(),
  /** Present after evaluation (may be stored separately in DB; embedded for fixtures). */
  scoringResult: examScoringResultSchema.optional(),
  feedbackBlockId: idSchema.optional(),
  metadata: metadataSchema,
})

export type ExamRawResponse = z.infer<typeof examRawResponseSchema>
export type ExamNormalizedResponse = z.infer<typeof examNormalizedResponseSchema>
export type ExamSupportUsed = z.infer<typeof examSupportUsedSchema>
export type ExamAttempt = z.infer<typeof examAttemptSchema>
