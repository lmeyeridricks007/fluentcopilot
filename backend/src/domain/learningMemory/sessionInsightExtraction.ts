/**
 * Session Learning Insight extraction — structured layer on top of existing reports.
 * Does not modify upstream scoring or report JSON; only reads and normalizes into {@link SessionLearningInsights}.
 */
import type { ConversationSummary, FeedbackItem } from '../../models/contracts'
import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import type { ReadAloudEvaluateResult } from '../../services/read-aloud/readAloudEvaluateTypes'
import { extractChatSessionInsightChunk } from './extractors/chatSessionInsights'
import {
  extractLiveSpeakingSessionInsightChunk,
  finalizeLiveHesitationIssues,
} from './extractors/liveSpeakingSessionInsights'
import { buildSpeakLiveLearningEvaluationArtifactsV1 } from './extractors/speakLiveLearningEvaluationArtifactsExtractor'
import { extractReadAloudSessionInsightChunk } from './extractors/readAloudSessionInsights'
import {
  SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
  type SessionLearningInsights,
} from './sessionLearningInsightTypes'
export {
  dedupeEvidenceItems,
  mapIssueConfidence,
  mapIssueSeverity,
  mapPronunciationIssueFamily,
  normalizePatternId,
  normalizePronunciationTarget,
  normalizeWordKey,
} from './learningInsightNormalization'

export type {
  HesitationDelta,
  SessionInsightHesitation,
  SessionInsightPronunciation,
  SessionInsightStrength,
  SessionInsightWeakPattern,
  SessionInsightWeakWord,
  SessionLearningInsights,
} from './sessionLearningInsightTypes'

export { SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION } from './sessionLearningInsightTypes'

export function extractSessionInsightsFromLiveEvaluation(params: {
  sessionId: string
  userId: string
  scenarioId: string | null
  evaluation: LiveSessionEvaluation
  scenarioSlug: string | null
}): SessionLearningInsights {
  const chunk = extractLiveSpeakingSessionInsightChunk({
    scenarioId: params.scenarioId,
    scenarioSlug: params.scenarioSlug,
    evaluation: params.evaluation,
    sessionId: params.sessionId,
  })
  const hesitationIssues = finalizeLiveHesitationIssues(chunk.hesitationDeltas, params.scenarioId, params.sessionId)
  const confidenceSummary = [...chunk.confidenceParts, `strengths=${chunk.strengths.length}`].join('|')
  const speakingEvaluationArtifactsV1 = buildSpeakLiveLearningEvaluationArtifactsV1(params.evaluation, {
    scenarioSlug: params.scenarioSlug,
  })
  return {
    schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
    sessionId: params.sessionId,
    userId: params.userId,
    sessionType: 'speak_live',
    scenarioId: params.scenarioId,
    extractedAt: new Date().toISOString(),
    weakWords: chunk.weakWords,
    weakPatterns: chunk.weakPatterns,
    pronunciationIssues: chunk.pronunciationIssues,
    hesitationIssues,
    scenarioPerformance: chunk.scenarioPerformance,
    strengths: chunk.strengths,
    confidenceSummary,
    speakingEvaluationArtifactsV1,
  }
}

export function extractSessionInsightsFromTextConversation(params: {
  sessionId: string
  userId: string
  summary: ConversationSummary
  feedback: FeedbackItem[]
  scenarioId: string
  scenarioSlug: string | null
}): SessionLearningInsights {
  const chunk = extractChatSessionInsightChunk({
    sessionId: params.sessionId,
    summary: params.summary,
    feedback: params.feedback,
    scenarioId: params.scenarioId,
    scenarioSlug: params.scenarioSlug,
  })
  const confidenceSummary = chunk.confidenceParts.join('|')
  return {
    schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
    sessionId: params.sessionId,
    userId: params.userId,
    sessionType: 'text_conversation',
    scenarioId: params.scenarioId,
    extractedAt: new Date().toISOString(),
    weakWords: chunk.weakWords,
    weakPatterns: chunk.weakPatterns,
    pronunciationIssues: [],
    hesitationIssues: [],
    scenarioPerformance: chunk.scenarioPerformance,
    strengths: chunk.strengths,
    confidenceSummary,
  }
}

export function extractSessionInsightsFromReadAloud(params: {
  sessionId: string
  userId: string
  result: ReadAloudEvaluateResult
}): SessionLearningInsights {
  const chunk = extractReadAloudSessionInsightChunk({
    sessionId: params.sessionId,
    result: params.result,
  })
  const confidenceSummary = [...chunk.confidenceParts, `strengths=${chunk.strengths.length}`].join('|')
  return {
    schemaVersion: SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION,
    sessionId: params.sessionId,
    userId: params.userId,
    sessionType: 'read_aloud',
    scenarioId: null,
    extractedAt: new Date().toISOString(),
    weakWords: chunk.weakWords,
    weakPatterns: chunk.weakPatterns,
    pronunciationIssues: chunk.pronunciationIssues,
    hesitationIssues: chunk.hesitationIssues,
    scenarioPerformance: null,
    strengths: chunk.strengths,
    confidenceSummary,
  }
}
