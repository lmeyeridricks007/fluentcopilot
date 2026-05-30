/**
 * Lesson step — primary discriminator for the data-driven lesson engine.
 * Add new step types by extending the discriminated union (backward-compatible if clients use exhaustiveness checks).
 *
 * Shared optional fields hold prompts, media, and feedback; type-specific data may also live in `content`.
 *
 * @example
 * ```ts
 * const step = lessonStepSchema.parse({
 *   id: 'step-listen-01',
 *   type: 'listening',
 *   prompt: 'Luister naar het gesprek.',
 *   audioRefs: ['audio://sample/bakery-01'],
 *   interactionConfig: { maxPlays: 3 },
 *   feedbackConfig: { hint: 'Focus op het product.' },
 * })
 * ```
 */
import { z } from 'zod'
import { feedbackConfigSchema } from '@/lib/schemas/feedback.schema'
import { exerciseSchema } from '@/lib/schemas/exercise.schema'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

/** Arbitrary structured payload per step type (engine interprets by `type`). */
const stepContentSchema = z.record(z.string(), z.unknown()).optional()

const stepInteractionSchema = z.record(z.string(), z.unknown()).optional()

const correctAnswersSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])),
])

const lessonStepBaseSchema = z.object({
  id: idSchema,
  prompt: z.string().optional(),
  content: stepContentSchema,
  interactionConfig: stepInteractionSchema,
  correctAnswers: correctAnswersSchema.optional(),
  hints: z.array(z.string()).optional(),
  feedbackConfig: feedbackConfigSchema.optional(),
  audioRefs: z.array(z.string().min(1)).optional(),
  /** Nested exercises for mcq / composite steps */
  exercises: z.array(exerciseSchema).optional(),
  metadata: metadataSchema,
})

export const lessonStepSchema = z.discriminatedUnion('type', [
  lessonStepBaseSchema.extend({ type: z.literal('preview') }),
  lessonStepBaseSchema.extend({ type: z.literal('listening') }),
  lessonStepBaseSchema.extend({ type: z.literal('listen_read') }),
  lessonStepBaseSchema.extend({ type: z.literal('discovery') }),
  lessonStepBaseSchema.extend({ type: z.literal('grammar_card') }),
  lessonStepBaseSchema.extend({ type: z.literal('mcq') }),
  /** Sequential mix of mcq / reorder / fill_blank in one step (controlled practice density). */
  lessonStepBaseSchema.extend({ type: z.literal('practice_loop') }),
  lessonStepBaseSchema.extend({ type: z.literal('reorder') }),
  lessonStepBaseSchema.extend({ type: z.literal('fill_blank') }),
  lessonStepBaseSchema.extend({ type: z.literal('speaking') }),
  lessonStepBaseSchema.extend({ type: z.literal('writing') }),
  lessonStepBaseSchema.extend({ type: z.literal('scenario_chat') }),
  lessonStepBaseSchema.extend({ type: z.literal('recap') }),
])

export type LessonStep = z.infer<typeof lessonStepSchema>
export type LessonStepType = LessonStep['type']
