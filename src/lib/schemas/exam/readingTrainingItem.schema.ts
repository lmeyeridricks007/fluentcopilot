/**
 * Exam Prep — Reading training items (short practical text + structured MCQ).
 * @see docs/product/exam-prep-schema-overview.md
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

/** Locate explicit information vs interpret broader meaning / intent. */
export const readingSkillSchema = z.enum(['scanning', 'comprehension'])

/** A2 band on the item (length / density); combined with user difficulty preset in policy. */
export const readingDifficultyBandSchema = z.number().int().min(1).max(3)

export const readingMcqOptionSchema = z.object({
  id: z.string().min(1),
  labelNl: z.string().min(1),
  metadata: metadataSchema,
})

export const readingTrainingItemSchema = z
  .object({
    id: idSchema,
    /** Scanning (locate fact) vs comprehension (meaning / intent). */
    readingSkill: readingSkillSchema,
    /** Analytics / weak areas (e.g. notice, email, schedule). */
    scenarioTag: z.string().min(1),
    difficultyBand: readingDifficultyBandSchema,
    /** Short genre label shown above the text (Dutch). */
    textKindNl: z.string().min(1),
    /** Optional heading inside the text card (e.g. subject line). */
    textTitleNl: z.string().min(1).optional(),
    /** Main text; use \\n\\n between short paragraphs if needed. */
    bodyNl: z.string().min(1),
    /** Exam-style question line (Dutch). */
    instructionNl: z.string().min(1),
    options: z.array(readingMcqOptionSchema).min(3).max(5),
    correctOptionId: z.string().min(1),
    feedbackCorrectNl: z.string().min(1),
    feedbackIncorrectNl: z.string().min(1),
    /** Short quote or paraphrase anchored in the text (training feedback). */
    evidenceSnippetNl: z.string().min(1).optional(),
    metadata: metadataSchema,
  })
  .superRefine((val, ctx) => {
    if (!val.options.some((o) => o.id === val.correctOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correctOptionId must match an option id',
        path: ['correctOptionId'],
      })
    }
  })

export type ReadingTrainingItem = z.infer<typeof readingTrainingItemSchema>
export type ReadingMcqOption = z.infer<typeof readingMcqOptionSchema>
