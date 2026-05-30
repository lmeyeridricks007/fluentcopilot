/**
 * Authoring row for Speaking Training vertical slice (subset of exam speaking exercise fields).
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const speakingTrainingQuestionSubtypeSchema = z.enum([
  'preference',
  'routine',
  'opinion',
  'explanation',
])

/** Real-life / exam-relevant themes for training sessions. */
export const speakingScenarioGroupIdSchema = z.enum([
  'daily_life',
  'transport',
  'shopping',
  'weather',
  'hobbies',
  'work',
  'health',
  'family',
  'dutch_life',
])

/** A2-safe demand level within a session (1 = lightest, 4 = strongest). */
export const speakingTrainingDifficultyBandSchema = z.number().int().min(1).max(4)

export const speakingTrainingItemSchema = z.object({
  id: idSchema,
  /** Product-facing question family */
  subtype: speakingTrainingQuestionSubtypeSchema,
  /** Maps to `speakingExerciseSubtypeSchema` when persisting full exercises */
  exerciseSubtypeKey: z.enum([
    'preference_question',
    'daily_life_question',
    'opinion_with_reason',
    'situational_answer',
  ]),
  promptDutch: z.string().min(1),
  /** Shown under prompt, e.g. answer in Dutch + give a reason */
  instructionNl: z.string().min(1),
  trainingTipsNl: z.string().min(1).optional(),
  modelAnswerDutch: z.string().min(1),
  modelAnswerNoteEn: z.string().min(1).optional(),
  /** Optional keywords to boost on-topic detection (lowercase) */
  topicKeywords: z.array(z.string().min(1)).optional(),
  /** If true, heuristic expects reason markers for top execution */
  expectsReason: z.boolean().optional(),
  /** Thematic group for multi-question sessions */
  scenarioGroupId: speakingScenarioGroupIdSchema,
  /** Progression step (1–4); higher = more detail / less scaffolding expected */
  difficultyBand: speakingTrainingDifficultyBandSchema,
  metadata: metadataSchema,
})

export type SpeakingTrainingItem = z.infer<typeof speakingTrainingItemSchema>
export type SpeakingTrainingQuestionSubtype = z.infer<typeof speakingTrainingQuestionSubtypeSchema>
export type SpeakingScenarioGroupId = z.infer<typeof speakingScenarioGroupIdSchema>
