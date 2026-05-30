/**
 * Content engine — Zod schemas for generation requests and batch config.
 */

import { z } from 'zod'

export const artifactTypeSchema = z.enum([
  'VocabularyItem',
  'PhraseItem',
  'Dialogue',
  'LessonBlueprint',
  'LessonInstance',
  'ExerciseInstance',
  'PronunciationTarget',
  'ExamTask',
  'ReflectionLessonDraft',
])

export const generationRequestSchema = z.object({
  id: z.string().optional(),
  artifact_type: artifactTypeSchema,
  locale: z.string().min(1),
  params: z.record(z.unknown()),
  batch_id: z.string().optional(),
  priority: z.number().optional(),
})

export const batchOptionsSchema = z.object({
  chunk_size: z.number().min(1).max(1000).default(10),
  concurrency: z.number().min(1).max(20).default(3),
  rate_limit_rpm: z.number().min(1).optional(),
  max_cost_usd: z.number().positive().optional(),
  resume_from_checkpoint: z.boolean().default(false),
  stop_on_first_failure: z.boolean().default(false),
})

export const batchJobSchema = z.object({
  batch_id: z.string().uuid(),
  job_type: z.string(),
  requests: z.array(generationRequestSchema),
  options: batchOptionsSchema,
})

export type GenerationRequestInput = z.infer<typeof generationRequestSchema>
export type BatchOptionsInput = z.infer<typeof batchOptionsSchema>
