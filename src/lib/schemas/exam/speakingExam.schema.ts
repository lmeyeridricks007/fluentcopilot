/**
 * Speaking-specific exercise specs, attempt payloads, rubric category keys, and speech metrics.
 */
import { z } from 'zod'
import { metadataSchema } from '@/lib/schemas/shared.schema'

export const speakingExerciseSubtypeSchema = z.enum([
  'preference_question',
  'daily_life_question',
  'opinion_with_reason',
  'picture_description',
  'situational_answer',
  'information_gap',
])

/** Authoring extension on a speaking exercise. */
export const speakingExerciseSpecSchema = z.object({
  subtype: speakingExerciseSubtypeSchema,
  /** Suggested prep time before recording starts (seconds). */
  preparationTimeSeconds: z.number().int().min(0).optional(),
  /** Max recording length (seconds). */
  maxResponseSeconds: z.number().int().positive().optional(),
  /** Show image URL or content ref for picture description tasks. */
  visualPromptRef: z.string().min(1).optional(),
  /** Optional scripted prompt audio ref (TTS or recorded). */
  promptAudioRef: z.string().min(1).optional(),
  metadata: metadataSchema,
})

/**
 * Speaking rubric dimension keys.
 * - `execution` — formal A2 speaking rubric (0–3); preferred for scoring engine.
 * - `task_execution` — legacy alias (same semantic as execution in older fixtures).
 */
export const speakingRubricCategoryKeySchema = z.enum([
  'execution',
  'task_execution',
  'vocabulary',
  'grammar',
  'fluency',
  'clearness',
  'clarity',
  'pronunciation',
  'coherence',
])

export const speechMetricsSchema = z.object({
  /** Total recorded duration (ms). */
  durationMs: z.number().int().nonnegative().optional(),
  /** Estimated words per minute if derivable. */
  wordsPerMinute: z.number().nonnegative().optional(),
  /** Simple pause / silence aggregates (future ASR). */
  pauseCount: z.number().int().nonnegative().optional(),
  silenceMsTotal: z.number().int().nonnegative().optional(),
  /** Hesitation flag from engine heuristics. */
  hesitationFlag: z.boolean().optional(),
  metadata: metadataSchema,
})

/** Runtime payload attached to `ExamAttempt` for speaking. */
export const speakingAttemptPayloadSchema = z.object({
  /** Storage ref or blob URL (client) — not the binary in JSON fixtures. */
  audioRef: z.string().min(1).optional(),
  /** ASR or learner-edited transcript. */
  transcript: z.string().optional(),
  transcriptConfidence: z.number().min(0).max(1).optional(),
  transcriptLocale: z.string().min(1).optional(),
  speechMetrics: speechMetricsSchema.optional(),
  /** Number of re-records before submit. */
  rerecordCount: z.number().int().nonnegative().optional(),
  metadata: metadataSchema,
})

/** Per-category scores for speaking (mirrors rubric category keys used in evaluation). */
export const speakingRubricScoresSchema = z.record(
  speakingRubricCategoryKeySchema,
  z.object({
    score: z.number().nonnegative(),
    maxScore: z.number().positive(),
    levelKey: z.string().min(1).optional(),
    evidence: z.string().min(1).optional(),
    metadata: metadataSchema,
  })
)

export type SpeakingExerciseSubtype = z.infer<typeof speakingExerciseSubtypeSchema>
export type SpeakingExerciseSpec = z.infer<typeof speakingExerciseSpecSchema>
export type SpeakingRubricCategoryKey = z.infer<typeof speakingRubricCategoryKeySchema>
export type SpeechMetrics = z.infer<typeof speechMetricsSchema>
export type SpeakingAttemptPayload = z.infer<typeof speakingAttemptPayloadSchema>
export type SpeakingRubricScores = z.infer<typeof speakingRubricScoresSchema>
