import { z } from 'zod'

export const listeningLevelSchema = z.enum(['A1', 'A2', 'B1'])
export type ListeningLevel = z.infer<typeof listeningLevelSchema>

export const listeningDrillTypeSchema = z.enum([
  'gist',
  'detail_catch',
  'listen_respond',
  'order_instruction',
  'fast_dutch',
  'replay_reveal',
  'weak_area',
])
export type ListeningDrillType = z.infer<typeof listeningDrillTypeSchema>

export const listeningSubskillSchema = z.string().min(1)

export const listeningClipSchema = z.object({
  id: z.string().min(1),
  scenarioId: z.string().min(1),
  level: listeningLevelSchema,
  drillType: listeningDrillTypeSchema,
  /** English — always safe to show (no transcript leak). */
  instructionEn: z.string().min(1),
  /** Spoken Dutch lines in order (browser TTS until real clips ship). */
  speakLinesNl: z.array(z.string().min(1)).min(1),
  /** Full Dutch transcript — only after reveal policy. */
  transcriptNl: z.string().min(1),
  /** Short coach explanation in English after reveal. */
  meaningEn: z.string().min(1),
  /** MCQ or tap options (English for gist/detail/order; may be Dutch for listen_respond). */
  optionLabels: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
  /** Primary listening tags for reports + personalization. */
  listeningTags: z.array(listeningSubskillSchema).default([]),
  /** Browser speech rate (listening level rules may override at runtime). */
  speechRate: z.number().min(0.72).max(1.12).default(0.92),
  /** Optional detail facet for coach copy. */
  detailFacet: z
    .enum(['time', 'platform', 'route', 'quantity', 'symptom', 'slot', 'price', 'other'])
    .optional(),
})
export type ListeningClip = z.infer<typeof listeningClipSchema>

export const listeningPackSchema = z.object({
  id: z.string().min(1),
  scenarioId: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  /** Default CEFR band for this pack (clips may vary slightly). */
  level: listeningLevelSchema,
  /** Ordered drills; `weak_area` resolved at session start from learner profile. */
  clipIds: z.array(z.string()).min(1),
})
export type ListeningPack = z.infer<typeof listeningPackSchema>

export const listeningSessionMetaSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().min(1),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }).optional(),
  level: listeningLevelSchema,
  packId: z.string().min(1),
  scenarioId: z.string().min(1),
  drillTypesUsed: z.array(listeningDrillTypeSchema),
})
export type ListeningSessionMeta = z.infer<typeof listeningSessionMetaSchema>

export const listeningAnswerDeliverySchema = z.enum(['tap', 'typed', 'spoken'])
export type ListeningAnswerDelivery = z.infer<typeof listeningAnswerDeliverySchema>

export const listeningClipAttemptSchema = z.object({
  clipId: z.string(),
  drillType: listeningDrillTypeSchema,
  scenarioId: z.string(),
  correct: z.boolean(),
  selectedIndex: z.number().int().optional(),
  playsBeforeAnswer: z.number().int().min(0),
  playsSlowAfterAnswer: z.number().int().min(0),
  transcriptRevealed: z.boolean(),
  /** Learner opened Dutch text via explicit help before locking in (policy signal). */
  transcriptPeekBeforeAnswer: z.boolean().optional(),
  revealedMeaning: z.boolean(),
  listeningTags: z.array(z.string()),
  answerDelivery: listeningAnswerDeliverySchema.optional(),
  typedAttempt: z.string().max(500).optional(),
})
export type ListeningClipAttempt = z.infer<typeof listeningClipAttemptSchema>

/** Snapshot for coach report + review mistakes (written at session end). */
export const listeningSessionReviewClipSchema = z.object({
  clipId: z.string(),
  drillType: listeningDrillTypeSchema,
  scenarioId: z.string(),
  instructionEn: z.string(),
  meaningEn: z.string(),
  transcriptNl: z.string(),
  optionLabels: z.array(z.string()),
  correctIndex: z.number().int().min(0),
  speakLinesNl: z.array(z.string()).min(1),
  attemptCorrect: z.boolean(),
  selectedIndex: z.number().int().optional(),
  hadTranscriptReveal: z.boolean(),
})
export type ListeningSessionReviewClip = z.infer<typeof listeningSessionReviewClipSchema>

export const listeningSessionRecordSchema = listeningSessionMetaSchema.extend({
  attempts: z.array(listeningClipAttemptSchema),
  /** Aggregate coach headline (no numeric test sheet). */
  coachSummary: z.string(),
  /** Per-clip coach context — optional for legacy stored sessions. */
  reviewClips: z.array(listeningSessionReviewClipSchema).optional(),
})
export type ListeningSessionRecord = z.infer<typeof listeningSessionRecordSchema>
