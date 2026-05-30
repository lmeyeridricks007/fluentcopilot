/**
 * Versioned snapshot of Speak Live / FluentCopilot evaluation signals for adaptive learning.
 * Persisted under {@link SessionLearningInsights.speakingEvaluationArtifactsV1}.
 */
import { z } from 'zod'

export const SpeakLiveSessionScoreSnapshotV1Schema = z.object({
  overallVoiceScore: z.number().min(0).max(100),
  pronunciationScore: z.number().min(0).max(100).nullable(),
  fluencyScore: z.number().min(0).max(100).nullable(),
  pacingScore: z.number().min(0).max(100).nullable(),
  grammarSessionScore: z.number().min(0).max(100).nullable(),
  confidenceEstimate: z.number().min(0).max(100).nullable(),
  scenarioCompletionScore: z.number().min(0).max(100),
})

export const SpeakLiveTranscriptEvalArtifactV1Schema = z.object({
  coachSummarySnippet: z.string().max(600).nullable(),
  whatToTryNext: z.array(z.string().max(400)).max(8),
  strongestAreas: z.array(z.string().max(240)).max(12),
  weakestAreas: z.array(z.string().max(240)).max(12),
})

export const SpeakLivePronunciationEvalArtifactV1Schema = z.object({
  /** Short evidence-backed lines (Azure / turn-level), capped. */
  pronunciationFindingLines: z.array(z.string().max(320)).max(16),
  /** Optional merged FluentCopilot pronunciation dimension when present. */
  mergedPronunciationScore: z.number().min(0).max(100).nullable(),
})

export const SpeakLiveRecurringCorrectionV1Schema = z.object({
  observed: z.string().max(120),
  suggested: z.string().max(200).nullable(),
  classification: z.string().max(80).nullable(),
})

export const SpeakLiveLearningEvaluationArtifactsV1Schema = z.object({
  version: z.literal(1),
  capturedAt: z.string(),
  scenarioId: z.string().max(80).nullable(),
  scenarioSlug: z.string().max(120).nullable(),
  cefr: z.object({
    practicedLevel: z.string().max(16).nullable(),
    observedLevel: z.string().max(16).nullable(),
    targetLevel: z.string().max(16).nullable(),
    learnerLevel: z.string().max(16).nullable(),
  }),
  sessionScoreSnapshot: SpeakLiveSessionScoreSnapshotV1Schema,
  transcriptEval: SpeakLiveTranscriptEvalArtifactV1Schema,
  pronunciationEval: SpeakLivePronunciationEvalArtifactV1Schema,
  weakWords: z.array(z.string().max(120)).max(36),
  hesitationPatterns: z.array(z.string().max(320)).max(16),
  pacingIssues: z.array(z.string().max(320)).max(16),
  grammarPatterns: z.array(z.string().max(280)).max(20),
  recurringCorrections: z.array(SpeakLiveRecurringCorrectionV1Schema).max(24),
})

export type SpeakLiveLearningEvaluationArtifactsV1 = z.infer<typeof SpeakLiveLearningEvaluationArtifactsV1Schema>

export const SpeakLiveSpeakingTrendSignalsV1Schema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  overallVoiceScoreSeries: z.array(z.number().min(0).max(100)).max(24),
  pronunciationScoreSeries: z.array(z.number().min(0).max(100).nullable()).max(24),
  pacingScoreSeries: z.array(z.number().min(0).max(100).nullable()).max(24),
  confidenceEstimateSeries: z.array(z.number().min(0).max(100).nullable()).max(24),
  grammarSessionScoreSeries: z.array(z.number().min(0).max(100).nullable()).max(24),
  pronunciationDeltaLastVsPriorMean: z.number().nullable(),
  pacingDeltaLastVsPriorMean: z.number().nullable(),
  confidenceDeltaLastVsPriorMean: z.number().nullable(),
  grammarDeltaLastVsPriorMean: z.number().nullable(),
  recentWeakWordKeys: z.array(z.string().max(120)).max(36),
})

export type SpeakLiveSpeakingTrendSignalsV1 = z.infer<typeof SpeakLiveSpeakingTrendSignalsV1Schema>

export function parseSpeakLiveLearningEvaluationArtifactsV1(raw: unknown) {
  return SpeakLiveLearningEvaluationArtifactsV1Schema.safeParse(raw)
}
