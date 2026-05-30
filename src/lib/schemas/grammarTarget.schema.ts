/**
 * Grammar learning target — aligns with product spine IDs (e.g. a2.1-modals-requests).
 * Referenced by id from lessons/modules.
 *
 * @example
 * ```ts
 * const g = grammarTargetSchema.parse({
 *   id: 'a2.1-modals-requests',
 *   name: 'Modals for requests',
 *   description: 'willen/kunnen/mogen in service contexts',
 *   examples: [{ nl: 'Mag ik een bon?', en: 'May I have a receipt?' }],
 *   cefrLevel: 'A2',
 *   rules: { summary: 'Use modal + infinitive', points: ['Polite u in shops'] },
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const grammarExampleSchema = z.object({
  nl: z.string().min(1),
  en: z.string().optional(),
})

export const grammarTargetSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  examples: z.array(grammarExampleSchema).min(1),
  cefrLevel: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
  /** Structured rule hints for generation / reference UI (optional). */
  rules: z.record(z.string(), z.unknown()).optional(),
  metadata: metadataSchema,
})

export type GrammarTarget = z.infer<typeof grammarTargetSchema>
export type GrammarExample = z.infer<typeof grammarExampleSchema>
