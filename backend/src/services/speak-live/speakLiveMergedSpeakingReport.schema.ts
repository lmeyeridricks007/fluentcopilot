/**
 * FluentCopilot merged speaking report (transcript LLM + Azure Speech + scenario).
 * Versioned payload attached to {@link LiveSessionEvaluation.mergedSpeakingReportV1}.
 */
import { z } from 'zod'

/** Weights for {@link MergedSpeakingReportV1.mergedScores.overall} (sum = 1). */
export const MERGED_OVERALL_SCORE_WEIGHTS = {
  pronunciation: 0.22,
  fluency: 0.18,
  conversation: 0.18,
  vocabulary: 0.14,
  grammar: 0.14,
  pacing: 0.08,
  scenarioSuccess: 0.06,
} as const

export function mergedOverallWeightsSummary(): string {
  const w = MERGED_OVERALL_SCORE_WEIGHTS
  return `overall=${Math.round(w.pronunciation * 100)}%pron+${Math.round(w.fluency * 100)}%flu+${Math.round(w.conversation * 100)}%conv+${Math.round(w.vocabulary * 100)}%voc+${Math.round(w.grammar * 100)}%gr+${Math.round(w.pacing * 100)}%pace+${Math.round(w.scenarioSuccess * 100)}%scenario`
}

export const MergedSpeakingReportV1Schema = z.object({
  version: z.literal(1),
  mergedAt: z.string(),
  mergedScores: z.object({
    overall: z.number().min(0).max(100),
    pronunciation: z.number().min(0).max(100),
    fluency: z.number().min(0).max(100),
    conversation: z.number().min(0).max(100),
    vocabulary: z.number().min(0).max(100),
    grammar: z.number().min(0).max(100),
    pacing: z.number().min(0).max(100),
    scenarioSuccess: z.number().min(0).max(100),
  }),
  insights: z.object({
    strengths: z.array(z.string().max(400)).max(16),
    weaknesses: z.array(z.string().max(400)).max(20),
    weakWords: z.array(z.string().max(120)).max(48),
    recurringGrammarIssues: z.array(z.string().max(280)).max(16),
    hesitationPatterns: z.array(z.string().max(280)).max(12),
    suggestedDrills: z.array(z.string().max(400)).max(20),
    recommendedNextScenarios: z.array(z.string().max(200)).max(12),
  }),
  adaptiveLearningSignalsV1: z.object({
    weakPatterns: z.array(z.string().max(240)).max(24),
    pronunciationIssues: z.array(z.string().max(200)).max(24),
    pacingIssues: z.array(z.string().max(240)).max(16),
    vocabularyGaps: z.array(z.string().max(120)).max(32),
  }),
  turnLevelSnapshots: z
    .array(
      z.object({
        turnId: z.string(),
        turnIndex: z.number().int().min(0),
        pronunciation: z.number().min(0).max(100).nullable(),
        fluency: z.number().min(0).max(100).nullable(),
        conversation: z.number().min(0).max(100).nullable(),
        grammar: z.number().min(0).max(100).nullable(),
        pacing: z.number().min(0).max(100).nullable(),
        scenarioAlignment: z.number().min(0).max(100).nullable(),
        coachingOneLiner: z.string().max(320).nullable(),
      }),
    )
    .max(64),
  weightsSummary: z.string().max(500),
})

export type MergedSpeakingReportV1 = z.infer<typeof MergedSpeakingReportV1Schema>

export function parseMergedSpeakingReportV1(raw: unknown) {
  return MergedSpeakingReportV1Schema.safeParse(raw)
}
