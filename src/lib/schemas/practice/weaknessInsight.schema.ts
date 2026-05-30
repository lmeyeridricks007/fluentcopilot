/**
 * Weakness-driven practice — portable payloads for UI + analytics.
 * Grounding signals stay in MistakeEvent / weak tags / session heuristics.
 */
import { z } from 'zod'
import { idSchema } from '@/lib/schemas/shared.schema'
export const weaknessTrendSchema = z.enum(['improving', 'stable', 'needs_attention'])

export const weaknessActionKindSchema = z.enum(['scenario', 'skill_track', 'review'])

export const weaknessActionSchema = z.object({
  id: idSchema,
  kind: weaknessActionKindSchema,
  label: z.string().min(1),
  href: z.string().min(1),
  /** ~minutes, for display */
  estimatedMinutes: z.number().positive().max(120).optional(),
})

export const weaknessInsightSchema = z.object({
  categoryId: idSchema,
  headline: z.string().min(1),
  coachLine: z.string().min(1),
  trend: weaknessTrendSchema,
  /** Plain-language grounding for “why we think this” */
  basedOn: z.string().min(1),
  score: z.number().nonnegative(),
  actions: z.array(weaknessActionSchema).min(1).max(4),
  sourceTags: z.array(z.string()).optional(),
})

export type WeaknessTrend = z.infer<typeof weaknessTrendSchema>
export type WeaknessActionKind = z.infer<typeof weaknessActionKindSchema>
export type WeaknessAction = z.infer<typeof weaknessActionSchema>
export type WeaknessInsight = z.infer<typeof weaknessInsightSchema>

export const weaknessSignalEventSchema = z.object({
  kind: z.literal('last_practice'),
  recordedAt: z.string(),
  scenarioId: idSchema,
  tags: z.array(z.string()),
  outcome: z.enum(['success', 'partial', 'needs_practice']).optional(),
})

export type WeaknessSignalEvent = z.infer<typeof weaknessSignalEventSchema>
