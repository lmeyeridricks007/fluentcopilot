/**
 * Mission — daily/weekly bundled practice objectives (habit + gamification).
 * Progress and rewards integrate with retention service via missionType + rewards keys.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { practiceActivityKindSchema } from '@/lib/schemas/practice/practiceShared.schema'

export const missionTimeScopeSchema = z.enum(['daily', 'weekly', 'seasonal'])

export const missionTypeSchema = z.enum([
  'complete_scenario',
  'complete_mode',
  'drill_count',
  'speaking_minutes',
  'review_link',
  'fix_weakness',
  'mastery_attempt',
  'composite',
])

export const missionRequirementSchema = z.object({
  /** What to count toward completion */
  activityKind: practiceActivityKindSchema,
  /** e.g. scenario id, drill type, or wildcard * */
  targetId: idSchema.optional(),
  /** Required count or minutes depending on missionType */
  targetCount: z.number().positive().optional(),
  targetMinutes: z.number().positive().optional(),
  /** Modes that qualify (for complete_mode missions) */
  conversationModes: z.array(z.enum(['guided', 'semi_guided', 'free'])).optional(),
  metadata: metadataSchema,
})

export const missionRewardsSchema = z.object({
  xp: z.number().int().nonnegative().optional(),
  /** If true, completing mission can count toward streak policy (product rules) */
  countsForStreak: z.boolean().optional(),
  unlockIds: z.array(idSchema).optional(),
  metadata: metadataSchema,
})

export const missionEligibilityRulesSchema = z.object({
  minCefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  requiresPremium: z.boolean().optional(),
  /** Feature flag or cohort keys */
  cohortTags: z.array(z.string()).optional(),
  metadata: metadataSchema,
})

export const missionProgressModelSchema = z.object({
  /** Current progress units (interpretation depends on missionType) */
  current: z.number().nonnegative(),
  target: z.number().positive(),
  /** Partial credit allowed for UX */
  unitLabel: z.enum(['sessions', 'minutes', 'turns', 'drills', 'composite']).optional(),
  metadata: metadataSchema,
})

export const missionSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  missionType: missionTypeSchema,
  timeScope: missionTimeScopeSchema,
  objective: z.string().min(1),
  requirements: z.array(missionRequirementSchema).min(1),
  rewards: missionRewardsSchema,
  eligibilityRules: missionEligibilityRulesSchema.optional(),
  progressModel: missionProgressModelSchema.optional(),
  metadata: metadataSchema,
})

export type Mission = z.infer<typeof missionSchema>
export type MissionTimeScope = z.infer<typeof missionTimeScopeSchema>
export type MissionType = z.infer<typeof missionTypeSchema>
export type MissionRequirement = z.infer<typeof missionRequirementSchema>
export type MissionRewards = z.infer<typeof missionRewardsSchema>
