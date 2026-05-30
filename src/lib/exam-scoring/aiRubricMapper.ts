/**
 * Structured AI evaluation payloads → validated integer rubric scores.
 * LLM prompts must require JSON matching these shapes (no freeform grades).
 */
import { z } from 'zod'
import type { SpeakingRawScores } from '@/lib/exam-scoring/types'
import type { WritingRawScores } from '@/lib/exam-scoring/types'
import { clampSpeakingScores, speakingScoresZero } from '@/lib/exam-scoring/speakingScoringPolicy'
import { clampWritingScores, writingScoresZero } from '@/lib/exam-scoring/writingScoringPolicy'

/** Category-first scores from the model (integers within rubric maxima). */
export const aiSpeakingScoresSchema = z.object({
  execution: z.coerce.number(),
  vocabulary: z.coerce.number(),
  grammar: z.coerce.number(),
  fluency: z.coerce.number(),
  clearness: z.coerce.number(),
  pronunciation: z.coerce.number(),
})

export const aiSpeakingEvaluationPayloadSchema = z.object({
  scores: aiSpeakingScoresSchema,
  /** Shown to learner in training; keep concise. */
  rationales: z.record(z.string(), z.string().min(1)).optional(),
  /** Not for learner UI by default; logging / QA. */
  internalReasoning: z.string().optional(),
  /** Evaluator self-rated certainty 0–1. */
  certainty: z.number().min(0).max(1).optional(),
})

export const aiWritingScoresSchema = z.object({
  execution: z.coerce.number(),
  grammar: z.coerce.number(),
  spelling: z.coerce.number(),
  clearness: z.coerce.number(),
  vocabulary: z.coerce.number(),
})

export const aiWritingEvaluationPayloadSchema = z.object({
  scores: aiWritingScoresSchema,
  rationales: z.record(z.string(), z.string().min(1)).optional(),
  internalReasoning: z.string().optional(),
  certainty: z.number().min(0).max(1).optional(),
})

export type AiSpeakingEvaluationPayload = z.infer<typeof aiSpeakingEvaluationPayloadSchema>
export type AiWritingEvaluationPayload = z.infer<typeof aiWritingEvaluationPayloadSchema>

export function parseAiSpeakingEvaluation(raw: unknown):
  | { ok: true; data: AiSpeakingEvaluationPayload }
  | { ok: false; error: z.ZodError } {
  const p = aiSpeakingEvaluationPayloadSchema.safeParse(raw)
  return p.success ? { ok: true, data: p.data } : { ok: false, error: p.error }
}

export function parseAiWritingEvaluation(raw: unknown):
  | { ok: true; data: AiWritingEvaluationPayload }
  | { ok: false; error: z.ZodError } {
  const p = aiWritingEvaluationPayloadSchema.safeParse(raw)
  return p.success ? { ok: true, data: p.data } : { ok: false, error: p.error }
}

export function aiSpeakingPayloadToRawScores(payload: AiSpeakingEvaluationPayload): SpeakingRawScores {
  return clampSpeakingScores(payload.scores as SpeakingRawScores)
}

export function aiWritingPayloadToRawScores(payload: AiWritingEvaluationPayload): WritingRawScores {
  return clampWritingScores(payload.scores as WritingRawScores)
}

/**
 * Deterministic fallback when no AI: non-answer → zeros; otherwise stub for tests only.
 */
export function fallbackSpeakingScoresFromText(text: string): SpeakingRawScores {
  const t = text.trim()
  if (t.length < 1) return speakingScoresZero()
  return clampSpeakingScores({
    execution: 1,
    vocabulary: 1,
    grammar: 1,
    fluency: 1,
    clearness: 0,
    pronunciation: 1,
  })
}

export function fallbackWritingScoresFromText(text: string): WritingRawScores {
  const t = text.trim()
  if (t.length < 1) return writingScoresZero()
  return clampWritingScores({
    execution: 1,
    grammar: 1,
    spelling: 1,
    clearness: 0,
    vocabulary: 1,
  })
}
