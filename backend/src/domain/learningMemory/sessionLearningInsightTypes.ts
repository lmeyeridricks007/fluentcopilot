import type { HesitationPatternSummary, ScenarioPerformanceSummary, Score01 } from './userLearningProfileDocument'

export const SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION = 2 as const

/** Common provenance + scoring on extracted session signals (maps into profile on merge). */
export type SessionInsightEvidence = {
  source: string
  /** Normalized concern level 1–3 (mirrors `severityScore` for merge). */
  severity: number
  severityScore: number
  confidence: Score01
  evidenceRefs: string[]
  supportingText?: string | null
}

export type SessionInsightWeakWord = SessionInsightEvidence & {
  normalizedKey: string
  displayText: string
  category: string
}

export type SessionInsightWeakPattern = SessionInsightEvidence & {
  patternId: string
  label: string
  explanation: string | null
}

export type SessionInsightPronunciation = SessionInsightEvidence & {
  targetKey: string
  issueType: string
}

export type SessionInsightHesitation = HesitationPatternSummary & {
  source: string
  supportingText?: string | null
}

export type SessionInsightStrength = {
  label: string
  source: string
  severity: number
  severityScore: number
  confidence: Score01
  evidenceRefs: string[]
  supportingText?: string | null
}

export type HesitationDelta = {
  longPauses?: number
  restarts?: number
  fillerTendency?: number
  beforeKeyWords?: number
  beforeVerbs?: number
  beforePrepositions?: number
  beforeQuestionOpeners?: number
}

import type { SpeakLiveLearningEvaluationArtifactsV1 } from './speakLiveLearningEvaluationArtifacts.schema'

export type SessionLearningInsights = {
  schemaVersion: typeof SESSION_LEARNING_INSIGHTS_SCHEMA_VERSION
  sessionId: string
  userId: string
  sessionType: 'speak_live' | 'text_conversation' | 'read_aloud' | 'listening' | 'quick_capture'
  scenarioId: string | null
  extractedAt: string
  weakWords: SessionInsightWeakWord[]
  weakPatterns: SessionInsightWeakPattern[]
  pronunciationIssues: SessionInsightPronunciation[]
  /** Profile merge consumes {@link HesitationPatternSummary} fields; `source` / `supportingText` are extra session metadata. */
  hesitationIssues: SessionInsightHesitation[]
  scenarioPerformance: ScenarioPerformanceSummary | null
  strengths: SessionInsightStrength[]
  confidenceSummary: string
  /**
   * Bounded Speak Live report snapshot for long-term adaptive learning + trend replay.
   * Optional for older rows / non-speak sessions.
   */
  speakingEvaluationArtifactsV1?: SpeakLiveLearningEvaluationArtifactsV1 | null
}
