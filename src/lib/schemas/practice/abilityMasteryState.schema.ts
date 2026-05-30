/**
 * Client-persisted practical ability mastery (real-life capability, not grammar completion).
 */
import { z } from 'zod'
import { idSchema } from '@/lib/schemas/shared.schema'

export const abilityMasteryBandSchema = z.enum(['weak', 'improving', 'strong'])

export const abilityConfidenceTrendUiSchema = z.enum([
  'improving',
  'stable',
  'slipping',
  'needs_refresh',
])

export const abilityProgressSnapshotSchema = z.object({
  /** Smoothed session quality 0–1 */
  emaQuality: z.number().min(0).max(1).nullable(),
  touchCount: z.number().int().nonnegative(),
  lastPracticedAt: z.string().nullable(),
  scoreHistory: z.array(z.number().min(0).max(1)).max(12).optional(),
})

export const abilityMasteryStateSchema = z.object({
  version: z.literal(1),
  userId: idSchema,
  byAbility: z.record(z.string(), abilityProgressSnapshotSchema),
})

export type AbilityMasteryBand = z.infer<typeof abilityMasteryBandSchema>
export type AbilityConfidenceTrendUi = z.infer<typeof abilityConfidenceTrendUiSchema>
export type AbilityProgressSnapshot = z.infer<typeof abilityProgressSnapshotSchema>
export type AbilityMasteryState = z.infer<typeof abilityMasteryStateSchema>
