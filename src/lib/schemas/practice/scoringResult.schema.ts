/**
 * Scoring result — structured output after a practice session or checkpoint.
 * Feeds feedback UI, XP policy, and confidence updates.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { proficiencyBandSchema } from '@/lib/schemas/practice/practiceShared.schema'

export const skillSignalSchema = z.object({
  skillId: idSchema,
  /** 0–1 contribution or sub-score */
  score: z.number().min(0).max(1),
  weight: z.number().positive().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const weaknessSignalSchema = z.object({
  tag: z.string().min(1),
  /** Links to mistake taxonomy or grammar spine id */
  relatedTargetId: idSchema.optional(),
  severity: z.number().int().min(1).max(5).optional(),
  evidence: z.string().optional(),
})

export const scoringResultSchema = z.object({
  /** 0–1 holistic */
  overallScore: z.number().min(0).max(1),
  /** Named dimensions (fluency, accuracy, task completion, etc.) */
  subScores: z.record(z.string(), z.number().min(0).max(1)).optional(),
  fluencyScore: z.number().min(0).max(1).optional(),
  accuracyScore: z.number().min(0).max(1).optional(),
  completionScore: z.number().min(0).max(1).optional(),
  /** Penalise over-reliance on hints / support tools */
  supportUsageScore: z.number().min(0).max(1).optional(),
  confidenceEstimate: proficiencyBandSchema,
  skillSignals: z.array(skillSignalSchema).optional(),
  weaknessSignals: z.array(weaknessSignalSchema).optional(),
  strengths: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

export type SkillSignal = z.infer<typeof skillSignalSchema>
export type WeaknessSignal = z.infer<typeof weaknessSignalSchema>
export type ScoringResult = z.infer<typeof scoringResultSchema>
