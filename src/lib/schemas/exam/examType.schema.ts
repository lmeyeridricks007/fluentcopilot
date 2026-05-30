/**
 * Exam domain (skill) — stable keys for catalog, analytics, and rubric routing.
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'
import { examModeSchema } from '@/lib/schemas/exam/examShared.schema'

/**
 * Canonical exam-type keys (Dutch A2 prep domains).
 * `mixed` — session or summary spanning more than one domain (e.g. training pack).
 */
export const examTypeKeySchema = z.enum(['speaking', 'writing', 'listening', 'reading', 'kmn', 'mixed'])

/** Rubrics always belong to a single domain (not `mixed`). */
export const rubricDomainKeySchema = z.enum(['speaking', 'writing', 'listening', 'reading', 'kmn'])

/**
 * Declarative row for UI / policy (optional content bundle).
 * `scoringStrategyKey` routes to an evaluation profile (deterministic vs rubric vs hybrid).
 */
export const examTypeDefinitionSchema = z.object({
  id: idSchema,
  key: rubricDomainKeySchema,
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  modesSupported: z.array(examModeSchema).min(1),
  /** Engine profile id, e.g. `a2_speaking_rubric_v1`, `mcq_deterministic_v1`. */
  scoringStrategyKey: z.string().min(1),
  /** Primary learner input channel for this domain. */
  inputType: z.enum(['speech', 'text', 'selection', 'composite']),
  /** Primary artifact stored on attempt. */
  outputType: z.enum(['audio', 'text', 'selection', 'structured_form']),
  metadata: metadataSchema,
})

export type ExamTypeKey = z.infer<typeof examTypeKeySchema>
export type RubricDomainKey = z.infer<typeof rubricDomainKeySchema>
export type ExamTypeDefinition = z.infer<typeof examTypeDefinitionSchema>
