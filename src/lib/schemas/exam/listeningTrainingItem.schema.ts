/**
 * Exam Prep — Listening training items (data-driven MCQ after audio / TTS script).
 * @see docs/product/exam-prep-schema-overview.md
 */
import { z } from 'zod'
import { idSchema, metadataSchema } from '@/lib/schemas/shared.schema'

export const listeningQuestionTypeSchema = z.enum(['gist', 'detail', 'intent'])

/** A2 band on the item (content complexity); combined with user difficulty preset in policy. */
export const listeningDifficultyBandSchema = z.number().int().min(1).max(3)

export const listeningMcqOptionSchema = z.object({
  id: z.string().min(1),
  labelNl: z.string().min(1),
  metadata: metadataSchema,
})

export const listeningTrainingItemSchema = z
  .object({
    id: idSchema,
    questionType: listeningQuestionTypeSchema,
    /** For analytics / weak areas */
    scenarioTag: z.string().min(1),
    difficultyBand: listeningDifficultyBandSchema,
    /** Setting (Dutch), shown before listen */
    contextNl: z.string().min(1),
    /** Exam-style question line (Dutch) */
    instructionNl: z.string().min(1),
    /**
     * When set, HTML5 audio is used (production path).
     * Otherwise browser TTS uses `scriptLines` or `scriptNl` (mock / fallback).
     */
    audioUrl: z.string().url().optional(),
    /** Single-speaker script for TTS mock. */
    scriptNl: z.string().min(1).optional(),
    /** Multi-line dialogue for TTS. */
    scriptLines: z.array(z.string().min(1)).min(1).optional(),
    options: z.array(listeningMcqOptionSchema).min(3).max(5),
    correctOptionId: z.string().min(1),
    feedbackCorrectNl: z.string().min(1),
    /** Shown on wrong answer; may reference key detail */
    feedbackIncorrectNl: z.string().min(1),
    /** Optional anchor phrase for feedback */
    keyPhraseNl: z.string().min(1).optional(),
    metadata: metadataSchema,
  })
  .superRefine((val, ctx) => {
    const hasAudio = Boolean(val.audioUrl)
    const hasScript = Boolean(val.scriptNl?.trim()) || Boolean(val.scriptLines?.length)
    if (!hasAudio && !hasScript) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'listening item needs audioUrl and/or scriptNl/scriptLines',
      })
    }
    if (!val.options.some((o) => o.id === val.correctOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'correctOptionId must match an option id',
        path: ['correctOptionId'],
      })
    }
  })

export type ListeningTrainingItem = z.infer<typeof listeningTrainingItemSchema>
export type ListeningQuestionType = z.infer<typeof listeningQuestionTypeSchema>
export type ListeningMcqOption = z.infer<typeof listeningMcqOptionSchema>
