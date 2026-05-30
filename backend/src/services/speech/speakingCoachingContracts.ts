import { z } from 'zod'

/** How the client surfaces speaking coaching relative to the conversation flow. */
export type SpeakingCoachingFeedbackMode = 'after_each' | 'at_end'

export const SpeakingCoachingRankSchema = z.enum(['strong', 'ok', 'needs_work'])

export type SpeakingCoachingRank = z.infer<typeof SpeakingCoachingRankSchema>

export const SavePhraseCandidateSchema = z.object({
  phrase: z.string().min(1).max(200),
  contextNote: z.string().max(200).optional(),
})

export type SavePhraseCandidate = z.infer<typeof SavePhraseCandidateSchema>

/**
 * Request for transcript-only speaking coaching (no audio / pronunciation scoring).
 */
export interface SpeakingCoachingEvaluateRequest {
  transcript: string
  scenarioId: string
  scenarioTitle: string
  scenarioDescription?: string
  scenarioGoals?: string[]
  learnerLevelCefr: 'A1' | 'A2' | 'B1'
  feedbackMode: SpeakingCoachingFeedbackMode
  conversationTurnIndex: number
  lastAssistantTurn?: string | null
  threadSummary?: string | null
  expectedIntent?: string | null
}

export const SpeakingCoachingEvaluateBodySchema = z
  .object({
    transcript: z.string().min(1).max(16_000),
    scenarioId: z.string().min(1).max(200),
    scenarioTitle: z.string().min(1).max(300),
    scenarioDescription: z.string().max(2000).optional().nullable(),
    scenarioGoals: z.array(z.string().max(400)).max(24).optional(),
    learnerLevelCefr: z.enum(['A1', 'A2', 'B1']),
    feedbackMode: z.enum(['after_each', 'at_end', 'turn', 'end']).transform((m): SpeakingCoachingFeedbackMode => {
      if (m === 'turn' || m === 'after_each') return 'after_each'
      return 'at_end'
    }),
    conversationTurnIndex: z.number().int().min(0).max(5000),
    lastAssistantTurn: z.string().max(16_000).optional().nullable(),
    threadSummary: z.string().max(16_000).optional().nullable(),
    expectedIntent: z.string().max(500).optional().nullable(),
  })
  .strict()

export const SpeakingCoachingEvaluateResponseSchema = z.object({
  shortVerdict: z.string().max(400),
  naturalnessSuggestion: z.string().max(500).nullable().optional(),
  correctedAlternative: z.string().max(900).nullable().optional(),
  whyItMatters: z.string().max(500).nullable().optional(),
  cefrLevelAppropriateness: z.enum(['below_level', 'on_level', 'above_level']),
  coachNote: z.string().max(500),
  encouragement: z.string().max(400),
  intentMatch: SpeakingCoachingRankSchema,
  naturalness: SpeakingCoachingRankSchema,
  clarity: SpeakingCoachingRankSchema,
  levelFit: SpeakingCoachingRankSchema,
  savePhraseCandidates: z.array(SavePhraseCandidateSchema).max(6),
  coachingSignals: z.array(z.string().max(80)).max(24),
  scenarioIntentMet: z.boolean().optional(),
  /** Fixed server/client copy — transcript scope only. */
  evaluationScope: z.literal('transcript_only').optional(),
})

export type SpeakingCoachingEvaluateResponse = z.infer<typeof SpeakingCoachingEvaluateResponseSchema>

export interface ISpeakingCoachingService {
  evaluateTranscriptAsync(request: SpeakingCoachingEvaluateRequest): Promise<SpeakingCoachingEvaluateResponse>
}
