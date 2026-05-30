/**
 * Confidence score — per subject (skill, scenario track, ability) for dashboards and progression.
 */
import { z } from 'zod'
import { idSchema, metadataSchema, isoDateTimeSchema } from '@/lib/schemas/shared.schema'
import { confidenceTrendSchema, proficiencyBandSchema } from '@/lib/schemas/practice/practiceShared.schema'

/** What the confidence row attaches to. */
export const confidenceSubjectKindSchema = z.enum([
  'expected_skill',
  'ability',
  'scenario',
  'scenario_stage',
  'mission',
])

export const confidenceSubjectRefSchema = z.object({
  kind: confidenceSubjectKindSchema,
  id: idSchema,
})

export const confidenceScoreSchema = z.object({
  /** Stable row id for persistence (optional if embedded in session result only). */
  id: idSchema.optional(),
  subject: confidenceSubjectRefSchema,
  /** Normalized level for UI. */
  confidenceLevel: proficiencyBandSchema,
  trend: confidenceTrendSchema,
  /** Raw signals that informed this score (e.g. accuracy 0.82, hint_count 2). */
  sourceSignals: z.record(z.string(), z.number()).optional(),
  lastUpdated: isoDateTimeSchema,
  metadata: metadataSchema,
})

export type ConfidenceSubjectKind = z.infer<typeof confidenceSubjectKindSchema>
export type ConfidenceSubjectRef = z.infer<typeof confidenceSubjectRefSchema>
export type ConfidenceScore = z.infer<typeof confidenceScoreSchema>
