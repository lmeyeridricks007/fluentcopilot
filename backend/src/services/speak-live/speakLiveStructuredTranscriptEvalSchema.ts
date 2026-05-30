/**
 * Zod schemas for Speak Live structured transcript evaluation (JSON-only model output).
 * Downstream report assembly still consumes {@link ./liveSessionEvaluationLlm.ts} `LiveEvalLlmSession`;
 * see {@link ./speakLiveStructuredTranscriptEvalMapper.ts} for the adapter.
 */
import { z } from 'zod'

export const SpeakLiveStructuredCefrBandSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Unknown'])

export const SpeakLiveStructuredCorrectionSchema = z.object({
  from: z.string().max(400),
  to: z.string().max(400),
  note: z.string().max(500).optional(),
})

export const SpeakLiveStructuredTurnEvalSchema = z.object({
  turnId: z.string().min(1).max(80),
  grammarScore: z.number().min(0).max(100),
  vocabularyScore: z.number().min(0).max(100),
  naturalnessScore: z.number().min(0).max(100),
  sentenceStructureScore: z.number().min(0).max(100),
  feedback: z.array(z.string().max(700)).max(14),
  corrections: z.array(SpeakLiveStructuredCorrectionSchema).max(10),
  strongerAlternative: z.string().max(2000).optional(),
  weakPatterns: z.array(z.string().max(400)).max(12),
})

export const SpeakLiveStructuredOverallEvalSchema = z.object({
  conversationFlow: z.number().min(0).max(100),
  taskCompletion: z.number().min(0).max(100),
  followUpQuality: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  grammarOverall: z.number().min(0).max(100),
  vocabularyOverall: z.number().min(0).max(100),
  naturalnessOverall: z.number().min(0).max(100),
  estimatedCEFR: SpeakLiveStructuredCefrBandSchema,
  strengths: z.array(z.string().max(500)).max(12),
  weaknesses: z.array(z.string().max(500)).max(12),
  coachingPriorities: z.array(z.string().max(600)).max(12),
})

export const SpeakLiveStructuredTranscriptEvalRootSchema = z.object({
  turns: z.array(SpeakLiveStructuredTurnEvalSchema).max(40),
  overall: SpeakLiveStructuredOverallEvalSchema,
})

export type SpeakLiveStructuredTurnEval = z.infer<typeof SpeakLiveStructuredTurnEvalSchema>
export type SpeakLiveStructuredOverallEval = z.infer<typeof SpeakLiveStructuredOverallEvalSchema>
export type SpeakLiveStructuredTranscriptEvalRoot = z.infer<typeof SpeakLiveStructuredTranscriptEvalRootSchema>

export function parseStructuredTranscriptEvalRootJson(raw: unknown) {
  return SpeakLiveStructuredTranscriptEvalRootSchema.safeParse(raw)
}
