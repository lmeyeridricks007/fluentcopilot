/**
 * Reusable exercise payloads embedded in lesson steps (MCQ, reorder, etc.).
 * Discriminated by `type` for engine routing without `any`.
 *
 * @example
 * ```ts
 * const ex = exerciseSchema.parse({
 *   id: 'ex-mcq-01',
 *   type: 'multiple_choice',
 *   question: 'Kies het juiste antwoord.',
 *   options: ['Ik wil', 'Ik ben', 'Ik heb'],
 *   correctAnswer: 'Ik wil',
 *   explanation: 'wil + infinitive expresses want',
 *   difficulty: 'A2_mid',
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const exerciseDifficultySchema = z.enum(['A2_low', 'A2_mid', 'A2_high'])

const exerciseBaseSchema = z.object({
  id: idSchema,
  question: z.string().min(1),
  explanation: z.string().optional(),
  difficulty: exerciseDifficultySchema,
  metadata: metadataSchema,
})

export const exerciseSchema = z.discriminatedUnion('type', [
  exerciseBaseSchema.extend({
    type: z.literal('multiple_choice'),
    options: z.array(z.string().min(1)).min(2),
    correctAnswer: z.string().min(1),
  }),
  exerciseBaseSchema.extend({
    type: z.literal('reorder'),
    /** Tokens in display order; correctAnswer = ordered join or indices in interactionConfig */
    options: z.array(z.string().min(1)).min(2),
    correctAnswer: z.string().min(1),
  }),
  exerciseBaseSchema.extend({
    type: z.literal('fill_blank'),
    /** e.g. "Ik ___ graag een koffie." */
    options: z.array(z.string().min(1)).min(1),
    correctAnswer: z.string().min(1),
  }),
  exerciseBaseSchema.extend({
    type: z.literal('match'),
    /** Left/right pairs: keys = left labels, values = right (or use interactionConfig for pairs). */
    options: z.array(z.object({ left: z.string(), right: z.string() })).min(2),
    correctAnswer: z.record(z.string(), z.string()),
  }),
  exerciseBaseSchema.extend({
    type: z.literal('speech'),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().min(1),
  }),
  exerciseBaseSchema.extend({
    type: z.literal('short_text'),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().min(1),
  }),
])

export type Exercise = z.infer<typeof exerciseSchema>
export type ExerciseDifficulty = z.infer<typeof exerciseDifficultySchema>
