/**
 * Guided scenario definition — structured turns, branching, freedom tiers, evaluation.
 * Content lives under `content/practice/guided/scenarios/*.json`.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const guidedFreedomTierSchema = z.enum(['full_support', 'reduced', 'light', 'open'])

/** Quality signal for evaluation when learner picks a branch */
export const branchQualitySchema = z.enum(['strong', 'ok', 'weak'])

export const guidedPhraseSchema = z.object({
  id: idSchema,
  nl: z.string().min(1),
  en: z.string().optional(),
})

export const guidedSuggestedReplySchema = z.object({
  id: idSchema,
  nl: z.string().min(1),
  en: z.string().optional(),
  branchQuality: branchQualitySchema.optional(),
})

export const guidedTurnSchema = z.object({
  id: idSchema,
  aiMessage: z.string().min(1),
  freedomTier: guidedFreedomTierSchema,
  suggestedReplies: z.array(guidedSuggestedReplySchema).min(1),
  allowCustomText: z.boolean(),
  customInputPlaceholder: z.string().optional(),
  /** When true, any non-empty custom text uses nextFallbackId */
  acceptAnyCustomText: z.boolean().optional(),
  /**
   * Optional routing when the learner sends **custom** text: if their line contains any term
   * (case-insensitive substring), go to `nextId`. First matching rule wins; otherwise `nextFallbackId` / `nextByReplyId` logic applies.
   */
  nextWhenCustomContains: z
    .array(
      z.object({
        terms: z.array(z.string().min(1)).min(1),
        nextId: idSchema,
      })
    )
    .optional(),
  /** Map suggested reply id → next turn id (omit when terminalAfterUser) */
  nextByReplyId: z.record(z.string(), idSchema).optional(),
  /** Used for custom text / unknown reply when not terminal */
  nextFallbackId: idSchema.optional(),
  /** After user responds, finish scenario (no further AI turn) */
  terminalAfterUser: z.boolean().optional(),
  /** Outcome when terminalAfterUser — drives evaluation headline */
  endOutcome: z.enum(['success', 'partial', 'needs_practice']).optional(),
})

export const guidedNextActionSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  variant: z.enum(['primary', 'secondary', 'ghost']).optional(),
})

export const guidedEvaluationSchema = z.object({
  successTitle: z.string().min(1),
  partialTitle: z.string().min(1),
  needsPracticeTitle: z.string().min(1),
  wentWellBullets: z.array(z.string().min(1)).min(1),
  improveBullets: z.array(z.string().min(1)).min(1),
  betterPhrases: z.array(z.object({ nl: z.string().min(1), en: z.string().optional() })).min(1),
  nextActions: z.array(guidedNextActionSchema).min(1),
})

export const guidedScenarioDefinitionSchema = z.object({
  scenarioId: idSchema,
  version: z.number().int().positive(),
  /** Optional denominator for conversation progress (user-visible steps). */
  progressTotal: z.number().int().positive().max(30).optional(),
  intro: z.object({
    headline: z.string().min(1),
    setting: z.string().min(1),
    yourRole: z.string().min(1),
    situation: z.string().min(1),
  }),
  goals: z.array(z.string().min(1)).min(1).max(6),
  phrases: z.array(guidedPhraseSchema).min(3).max(8),
  /** Optional short hint per turn id (support tool) */
  hintsByTurnId: z.record(z.string(), z.string()).optional(),
  startTurnId: idSchema,
  turns: z.array(guidedTurnSchema).min(2),
  evaluation: guidedEvaluationSchema,
  metadata: metadataSchema,
})

export type GuidedScenarioDefinition = z.infer<typeof guidedScenarioDefinitionSchema>
export type GuidedTurn = z.infer<typeof guidedTurnSchema>
export type GuidedPhrase = z.infer<typeof guidedPhraseSchema>
export type GuidedSuggestedReply = z.infer<typeof guidedSuggestedReplySchema>
export type GuidedFreedomTier = z.infer<typeof guidedFreedomTierSchema>
export type GuidedEvaluation = z.infer<typeof guidedEvaluationSchema>
