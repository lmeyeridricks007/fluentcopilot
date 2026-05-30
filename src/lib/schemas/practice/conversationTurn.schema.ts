/**
 * Conversation turn — planned or recorded turn structure (expectations, not full orchestration code).
 * Supports guided options, intents, and hooks for scoring without embedding AI logic.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { practiceConversationModeSchema } from '@/lib/schemas/practice/practiceShared.schema'

export const conversationSpeakerTypeSchema = z.enum(['ai', 'user', 'system'])

export const conversationTurnTypeSchema = z.enum([
  'opening',
  'prompt',
  'reply_expected',
  'repair',
  'closing',
  'branch_point',
  'system_notice',
])

export const supportToolIdSchema = z.enum([
  'hint',
  'simplify',
  'translate_fragment',
  'repeat_last',
  'slow_down',
  'phrase_bank',
])

/**
 * Lightweight hooks orchestration may fill after generation or user action.
 * Values are numeric flags or scores — avoid embedding model-specific blobs.
 */
export const scoringHooksSchema = z
  .object({
    /** Target objective ids considered addressed if this turn succeeds */
    objectiveIdsHit: z.array(idSchema).optional(),
    /** Expected skill ids contributing to measurement */
    skillWeightById: z.record(z.string(), z.number()).optional(),
    /** Hint usage penalises supportUsageScore when true */
    hintAllowed: z.boolean().optional(),
    maxPoints: z.number().nonnegative().optional(),
  })
  .passthrough()

export const suggestedReplySchema = z.object({
  id: idSchema,
  /** Dutch surface form shown in guided mode */
  textNl: z.string().min(1),
  translationEn: z.string().optional(),
  /** If true, UI may mark as “model” answer */
  isModel: z.boolean().optional(),
  metadata: metadataSchema,
})

export const conversationTurnSchema = z.object({
  id: idSchema,
  speakerType: conversationSpeakerTypeSchema,
  turnType: conversationTurnTypeSchema,
  /** Authoring: fixed line; runtime transcripts use outcome schema */
  promptText: z.string().optional(),
  /** Optional pre-authored assistant line for guided/scripted paths */
  generatedText: z.string().optional(),
  /** Modes where this turn applies (omit = all scenario modes) */
  modeFilter: z.array(practiceConversationModeSchema).optional(),
  expectedUserIntent: z.string().min(1).optional(),
  suggestedReplies: z.array(suggestedReplySchema).optional(),
  supportToolsAvailable: z.array(supportToolIdSchema).optional(),
  scoringHooks: scoringHooksSchema.optional(),
  metadata: metadataSchema,
})

export type ConversationSpeakerType = z.infer<typeof conversationSpeakerTypeSchema>
export type ConversationTurnType = z.infer<typeof conversationTurnTypeSchema>
export type SupportToolId = z.infer<typeof supportToolIdSchema>
export type ScoringHooks = z.infer<typeof scoringHooksSchema>
export type SuggestedReply = z.infer<typeof suggestedReplySchema>
export type ConversationTurn = z.infer<typeof conversationTurnSchema>
