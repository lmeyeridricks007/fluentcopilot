/**
 * Vocabulary target (lemma/chunk). Lessons reference by `id` for SRS extraction.
 *
 * @example
 * ```ts
 * const v = vocabTargetSchema.parse({
 *   id: 'lemma-bon',
 *   word: 'bon',
 *   lemma: 'bon',
 *   translation: 'receipt',
 *   partOfSpeech: 'noun',
 *   example: { nl: 'Mag ik de bon?', en: 'May I have the receipt?' },
 *   tags: ['shopping', 'A2.1'],
 * })
 * ```
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const vocabExampleSchema = z.object({
  nl: z.string().min(1),
  en: z.string().optional(),
})

export const vocabTargetSchema = z.object({
  id: idSchema,
  /** Surface form shown to learner (may equal lemma). */
  word: z.string().min(1),
  lemma: z.string().min(1),
  translation: z.string().min(1),
  partOfSpeech: z.string().min(1),
  example: vocabExampleSchema.optional(),
  audioRef: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  metadata: metadataSchema,
})

export type VocabTarget = z.infer<typeof vocabTargetSchema>
export type VocabExample = z.infer<typeof vocabExampleSchema>
