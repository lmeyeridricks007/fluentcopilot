/**
 * Skill Tracks — focused micro-practice (distinct from scenarios & SRS review).
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const skillTrackIdSchema = z.enum([
  'speaking_fluency',
  'listening_confidence',
  'reading_real_life',
  'writing_messages',
  'conversation_repair',
])

/** Four visible steps — maps to product copy Beginner → Confident */
export const skillTrackLevelIndexSchema = z.number().int().min(0).max(3)

export const skillTrackLevelLabelSchema = z.enum(['beginner', 'building', 'strong', 'confident'])

export const skillTrackExerciseKindSchema = z.enum([
  'mcq',
  'typed_check',
  'reading_mcq',
  'speaking_prompt',
  'repair_mcq',
])

const baseEx = {
  id: idSchema,
  title: z.string().min(1),
  instructions: z.string().min(1),
  estimatedSeconds: z.number().int().positive().max(300).optional(),
}

export const skillTrackExerciseSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('mcq'),
    ...baseEx,
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(6),
    correctIndex: z.number().int().min(0),
    feedbackCorrect: z.string().optional(),
    feedbackWrong: z.string().optional(),
  }),
  z.object({
    kind: z.literal('typed_check'),
    ...baseEx,
    prompt: z.string().min(1),
    placeholder: z.string().optional(),
    acceptableAnswers: z.array(z.string().min(1)).min(1),
    caseInsensitive: z.boolean().optional(),
    feedbackCorrect: z.string().optional(),
    feedbackWrong: z.string().optional(),
  }),
  z.object({
    kind: z.literal('reading_mcq'),
    ...baseEx,
    passage: z.string().min(1),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(5),
    correctIndex: z.number().int().min(0),
    feedbackCorrect: z.string().optional(),
    feedbackWrong: z.string().optional(),
  }),
  z.object({
    kind: z.literal('speaking_prompt'),
    ...baseEx,
    modelNl: z.string().min(1),
    modelEn: z.string().optional(),
    task: z.string().min(1),
    /** Shown after learner marks done — self-assessment, always counts as “practice” */
    selfCheckReminder: z.string().min(1),
  }),
  z.object({
    kind: z.literal('repair_mcq'),
    ...baseEx,
    contextNl: z.string().min(1),
    contextEn: z.string().optional(),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2).max(5),
    correctIndex: z.number().int().min(0),
    feedbackCorrect: z.string().optional(),
    feedbackWrong: z.string().optional(),
  }),
])

export const skillTrackLevelSchema = z.object({
  index: skillTrackLevelIndexSchema,
  label: skillTrackLevelLabelSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  /** Deeper levels can be premium-gated in UI */
  premiumLocked: z.boolean().optional(),
  exercises: z.array(skillTrackExerciseSchema).min(1).max(8),
  metadata: metadataSchema,
})

export const skillTrackDefinitionSchema = z.object({
  id: skillTrackIdSchema,
  title: z.string().min(1),
  purpose: z.string().min(1),
  icon: z.string().min(1),
  estimatedMinutesPerSession: z.number().positive().max(30),
  /** Default first session is free through level 0 always */
  premiumDeepLevels: z.boolean().optional(),
  levels: z.array(skillTrackLevelSchema).length(4),
  metadata: metadataSchema,
})

export const skillTrackCatalogSchema = z.object({
  version: z.number().int().positive(),
  tracks: z.array(skillTrackDefinitionSchema).min(1),
})

export const skillTrackSessionResultSchema = z.object({
  trackId: skillTrackIdSchema,
  levelIndex: skillTrackLevelIndexSchema,
  startedAt: z.string(),
  endedAt: z.string(),
  exerciseIds: z.array(idSchema),
  correctCount: z.number().int().nonnegative(),
  attemptedCount: z.number().int().nonnegative(),
  /** 0–1 session quality (speaking prompts weighted as participation) */
  score: z.number().min(0).max(1),
  passedLevelThreshold: z.boolean(),
  metadata: metadataSchema,
})

export type SkillTrackLevelLabel = z.infer<typeof skillTrackLevelLabelSchema>
export type SkillTrackId = z.infer<typeof skillTrackIdSchema>
export type SkillTrackExercise = z.infer<typeof skillTrackExerciseSchema>
export type SkillTrackLevel = z.infer<typeof skillTrackLevelSchema>
export type SkillTrackDefinition = z.infer<typeof skillTrackDefinitionSchema>
export type SkillTrackCatalog = z.infer<typeof skillTrackCatalogSchema>
export type SkillTrackSessionResult = z.infer<typeof skillTrackSessionResultSchema>
