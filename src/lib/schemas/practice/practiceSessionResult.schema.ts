/**
 * Practice session result — persisted outcome of one practice session (main Practice output contract).
 * Connects to gamification, review extraction, and mastery updates.
 */
import { z } from 'zod'
import { idSchema, metadataSchema, isoDateTimeSchema } from '@/lib/schemas/shared.schema'
import { mistakeErrorTypeSchema } from '@/lib/schemas/mistakeEvent.schema'
import { reviewItemSchema } from '@/lib/schemas/reviewItem.schema'
import {
  practiceConversationModeSchema,
  practiceActivityKindSchema,
  proficiencyBandSchema,
} from '@/lib/schemas/practice/practiceShared.schema'
import { conversationSpeakerTypeSchema } from '@/lib/schemas/practice/conversationTurn.schema'
import { scoringResultSchema } from '@/lib/schemas/practice/scoringResult.schema'
import { practiceFeedbackSchema } from '@/lib/schemas/practice/practiceFeedback.schema'
import { confidenceScoreSchema } from '@/lib/schemas/practice/confidenceScore.schema'

/** One executed turn (runtime), optionally linked to authored turn plan id. */
export const practiceTurnResultSchema = z.object({
  id: idSchema,
  /** References `conversationTurnSchema.id` when following a plan */
  planTurnId: idSchema.optional(),
  speakerType: conversationSpeakerTypeSchema,
  /** Learner or model text as produced in session */
  transcript: z.string().optional(),
  /** Guided mode: learner picked this option */
  selectedReplyId: idSchema.optional(),
  intentMatched: z.boolean().optional(),
  startedAt: isoDateTimeSchema.optional(),
  endedAt: isoDateTimeSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const practiceMistakeSignalSchema = z.object({
  errorType: mistakeErrorTypeSchema,
  tag: z.string().optional(),
  userFragment: z.string().optional(),
  expectedFragment: z.string().optional(),
  severity: z.number().int().min(1).max(5).optional(),
})

export const abilityProgressDeltaSchema = z.object({
  abilityId: idSchema,
  previousProficiency: proficiencyBandSchema.optional(),
  newProficiency: proficiencyBandSchema,
  evidenceSummary: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const streakImpactSchema = z.object({
  /** Session met product rules for streak credit */
  qualified: z.boolean(),
  /** Human-readable or analytics code */
  reason: z.string().optional(),
})

export const xpAwardSchema = z.object({
  amount: z.number().int().nonnegative(),
  /** Future: extend XpReason in retention types */
  reason: z.enum([
    'practice_session_complete',
    'practice_mastery_pass',
    'mission_bonus',
    'partial_practice',
  ]),
  ref: idSchema.optional(),
})

export const practiceSessionResultSchema = z.object({
  id: idSchema,
  userId: idSchema,
  activityKind: practiceActivityKindSchema,
  /** Set for scenario conversations */
  scenarioId: idSchema.optional(),
  drillId: idSchema.optional(),
  missionId: idSchema.optional(),
  mode: practiceConversationModeSchema.optional(),
  startTime: isoDateTimeSchema,
  endTime: isoDateTimeSchema,
  turnResults: z.array(practiceTurnResultSchema),
  scoringResult: scoringResultSchema,
  practiceFeedback: practiceFeedbackSchema,
  /** Existing review bank ids to enqueue */
  extractedReviewItemIds: z.array(idSchema).optional(),
  /** Newly authored cards from session (insert into bank) */
  draftReviewItems: z.array(reviewItemSchema).optional(),
  mistakeSignals: z.array(practiceMistakeSignalSchema).optional(),
  abilityProgress: z.array(abilityProgressDeltaSchema).optional(),
  confidenceChanges: z.array(confidenceScoreSchema).optional(),
  xpAwarded: z.array(xpAwardSchema).optional(),
  streakImpact: streakImpactSchema.optional(),
  metadata: metadataSchema,
})

export type PracticeTurnResult = z.infer<typeof practiceTurnResultSchema>
export type PracticeMistakeSignal = z.infer<typeof practiceMistakeSignalSchema>
export type AbilityProgressDelta = z.infer<typeof abilityProgressDeltaSchema>
export type StreakImpact = z.infer<typeof streakImpactSchema>
export type XpAward = z.infer<typeof xpAwardSchema>
export type PracticeSessionResult = z.infer<typeof practiceSessionResultSchema>
