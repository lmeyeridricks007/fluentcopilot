/**
 * User mastery aggregate — skill rubric + per-target maps (updated from lessons + review).
 * Map values: suggested 0–1 mastery probability or 0–100 score (document in API).
 *
 * @example
 * ```ts
 * const m = userMasterySchema.parse({
 *   userId: 'user_01',
 *   vocabMasteryMap: { 'lemma-bon': 0.72 },
 *   grammarMasteryMap: { 'a2.1-modals-requests': 0.55 },
 *   skillLevels: { listening: 3, speaking: 2, writing: 2, reading: 3 },
 *   streak: 5,
 *   lastActive: new Date().toISOString(),
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema, isoDateTimeSchema } from '@/lib/schemas/shared.schema'

const masteryScoreSchema = z.number().min(0).max(1)

export const skillLevelsSchema = z.object({
  listening: z.number().int().min(0).max(5),
  speaking: z.number().int().min(0).max(5),
  writing: z.number().int().min(0).max(5),
  reading: z.number().int().min(0).max(5),
})

export const userMasterySchema = z.object({
  userId: idSchema,
  vocabMasteryMap: z.record(z.string(), masteryScoreSchema),
  grammarMasteryMap: z.record(z.string(), masteryScoreSchema),
  skillLevels: skillLevelsSchema,
  streak: z.number().int().nonnegative(),
  lastActive: isoDateTimeSchema,
  metadata: metadataSchema,
})

export type UserMastery = z.infer<typeof userMasterySchema>
export type SkillLevels = z.infer<typeof skillLevelsSchema>
