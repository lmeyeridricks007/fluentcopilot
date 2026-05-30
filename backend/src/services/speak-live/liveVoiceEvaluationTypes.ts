/**
 * Contracts for Speak Live post-session voice evaluation (API + persisted JSON).
 *
 * Design principles:
 * - Every judgment has an evidence source and confidence level.
 * - Audio-based and transcript-based analysis are structurally separate.
 * - Missing data states are first-class — never fake scores.
 * - The FE report maps 1:1 to these shapes.
 */

import type { UserTurnSpeechAssessmentMetrics, AzureSpeechBatchDiagnostics } from './speakLiveAssessUserTurnsSpeechBatch'

// ─── Core enums ──────────────────────────────────────────────────────────

export type EvaluationStatus = 'pending' | 'running' | 'complete' | 'failed'

/** Why Speak Live coaching JSON used the offline template instead of the live LLM. */
export type SpeakLiveCoachingFallbackCode =
  | 'no_api_key'
  | 'mock_provider'
  | 'timeout_or_network'
  | 'parse_error'
  | 'validation_error'

/** Shown on the report UI when coaching did not run on the LLM path. */
export type SpeakLiveCoachingModelMeta =
  | { source: 'llm' }
  | { source: 'deterministic'; fallbackCode: SpeakLiveCoachingFallbackCode; userMessage: string }

export type SignalSource = 'azure_audio' | 'transcript_language' | 'scenario_context' | 'unavailable'

export type EvidenceType = 'transcript' | 'audio' | 'scenario' | 'mixed'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

/** Why Azure Speech did not produce a scored clip for a learner turn (post-session lane). */
export type AzureSpeechTurnSkippedReason = 'no_audio' | 'audio_load_failed' | 'azure_disabled'

/**
 * Strict-live mode marker for the FluentCopilot scenario report. Azure speech analysis ALWAYS runs
 * live for every turn — caches, mocks, and precomputed results are explicitly forbidden by the
 * FluentCopilot evaluation contract.
 */
export const SPEAK_LIVE_AZURE_REQUIRED_MODE = 'live' as const
export type SpeakLiveAzureMode = typeof SPEAK_LIVE_AZURE_REQUIRED_MODE

/**
 * Detailed timing breakdown for one OpenAI scenario evaluation call. Lets ops separate provider
 * wall time from prompt construction, JSON parsing, schema validation, and JSON repair.
 *
 * IMPORTANT: `structuredLlmMs` reported elsewhere should equal `providerNetworkMs + responseReadMs`
 * — NOT prompt construction, JSON parsing, schema validation, or deterministic post-processing.
 */
export type SpeakLiveOpenAiEvaluationDiagnosticsV1 = {
  schemaName: 'fast' | 'deep'
  schemaSizeChars: number
  modelName: string
  requestStartedAt: string
  requestCompletedAt: string

  /** Wall time spent building the prompt + serializing the user payload (NOT counted in structuredLlmMs). */
  requestBuildMs: number
  /** Wall time of the actual provider call (network + server compute). */
  providerNetworkMs: number
  /** First byte time when the provider streamed; undefined for non-streaming completions. */
  firstByteMs?: number
  /** Wall time reading the response body / parsing the provider envelope. */
  responseReadMs?: number
  /** Wall time JSON-parsing the assistant content. */
  jsonParseMs: number
  /** Wall time running Zod / semantic validation on the parsed object. */
  schemaValidationMs: number

  repairAttempted: boolean
  repairMs: number
  /** Number of additional provider calls beyond the primary (e.g. JSON repair). */
  retryCount: number

  requestId?: string
  finishReason?: string

  actualInputTokens?: number
  actualOutputTokens?: number
  totalTokens?: number

  approximateInputTokens?: number
  approximateOutputTokens?: number

  promptCharCount: number
  responseCharCount: number

  /**
   * Structural JSON salvage was attempted because the primary completion was truncated by the
   * model's `max_output_tokens` cap (`finish_reason: "length"`) or the parse failed in a way that
   * strongly correlated with truncation. Salvage is local-only — no extra LLM call.
   */
  lengthSalvageAttempted?: boolean
  /** Salvage produced JSON that re-parsed AND validated against the schema. */
  lengthSalvageOk?: boolean
  /**
   * The actual `max_output_tokens` ceiling that was sent to the provider for this call. For the
   * FAST path this is the *dynamic* value computed by {@link computeReportEvalMaxOutputTokensFastForTurns}
   * (NOT the static {@link getReportEvalMaxOutputTokensFast} default). Use this — never the static
   * default — when checking whether the actual output exceeded the budget.
   *
   * For the parallel-fan-out FAST path this reflects the per-turn ceiling (the largest single
   * sub-call), not the sum across all sub-calls.
   */
  maxOutputTokensRequested?: number
  /** Per-call request timeout (ms) in effect for THIS call (FAST sync path tightens this). */
  requestTimeoutMs?: number
  /**
   * Number of provider sub-calls used to satisfy this evaluation. `1` for the legacy single-call
   * FAST path; `1 + userTurnCount` for the parallel-fan-out FAST path. Surfaced so ops can tell at
   * a glance which architecture served the report.
   */
  subcallCount?: number
  /**
   * Per-sub-call provider wall time (ms), in `[overall, turn0, turn1, …]` order for the parallel
   * path. Lets ops check the slowest sub-call directly — `providerNetworkMs` is the max of these.
   */
  subcallProviderNetworkMs?: number[]
}

/**
 * Diagnostics specific to the parallel-fan-out FAST evaluation path. Surfaced at the orchestration
 * level so ops can see how many sub-calls ran, whether any per-turn calls failed (and got
 * deterministic stubs), and the slowest sub-call latency.
 */
export type SpeakLiveParallelEvaluationDiagnosticsV1 = {
  /** True when the parallel-fan-out path was used (vs. the legacy single-call FAST path). */
  enabled: boolean
  /** Total provider sub-calls issued (1 overall + N per-turn). */
  subcallCount: number
  /** Number of per-turn sub-calls that failed and were filled with a deterministic stub. */
  partialTurnFailureCount: number
  /** Slowest single sub-call latency (ms). For the parallel path, total wall time ≈ this value. */
  slowestSubcallMs: number
  /** Wall time saved vs. the single-call baseline = sum(sub-calls) − slowestSubcallMs. */
  wallTimeSavedMs: number
}

/** Rich timing + tuning metadata when parallel scenario report is enabled (see `isSpeakLiveParallelScenarioReportOptimizedEnabled`). */
export type SpeakLiveParallelOrchestrationDiagnosticsV1 = {
  pipelineVersion: 1
  orchestrationMode: 'parallel'
  modelName: string
  transcriptTurnCount: number
  userTurnCount: number
  assistantTurnCount: number
  promptCharCount: number
  approximateInputTokens: number
  approximateOutputTokens: number
  structuredLlmMs: number
  /** Extra OpenAI chat calls after the primary structured dialogue evaluation (verify/audit). */
  legacyLlmCallsCount?: number
  expensiveAuditEnabled?: boolean
  recommendationVerifyEnabled?: boolean
  legacyTurnEnrichmentEnabled?: boolean
  /** Azure Speech service + config presence (diagnostics). */
  azureEnabled?: boolean
  azureConfigPresent?: boolean
  /** User turns with a non-empty `learnerAudioBlobPath` in message metadata. */
  userTurnsWithAudio?: number
  userTurnsAssessed?: number
  userTurnsSkipped?: number
  /** Per-turn skip reason for Azure lane (`none` when not skipped). */
  skipReasonsByTurn?: Record<string, AzureSpeechTurnSkippedReason | 'none'>
  llmValidationMs: number
  llmRepairMs: number
  llmRepairAttempted: boolean
  llmValidationErrorsCount: number
  /** Detailed per-call OpenAI evaluation diagnostics (FluentCopilot two-stage report). */
  openaiDiagnostics?: SpeakLiveOpenAiEvaluationDiagnosticsV1
  /** Which schema family ran in the synchronous report path (`fast` is the production default). */
  evaluationSchemaName?: 'fast' | 'deep'
  /** Number of optional deep-enrichment passes scheduled (does NOT block initial report). */
  deepEnrichmentScheduledCount?: number
  /** Parallel-fan-out FAST path diagnostics — present whenever the parallel architecture ran. */
  parallelEvaluation?: SpeakLiveParallelEvaluationDiagnosticsV1
  azureBatchMs: number
  azurePerTurnTimings: Array<{
    turnId: string
    turnIndex: number
    totalMs: number
    blobDownloadMs: number
    audioAssessmentMs: number
    timingAnalysisMs: number
    blobBytes: number
    hadAudio: boolean
    assessmentOk: boolean
    skippedReason?: AzureSpeechTurnSkippedReason
    errorCode?: string
    warning?: string
    /** Strict-live marker — every assessed turn must report `'live'`. */
    assessmentSource?: SpeakLiveAzureMode
    /** Wall time of the Azure Speech provider call for this turn. */
    providerRequestMs?: number
  }>
  /** Present when Azure Speech batch used bounded concurrency (optimized scenario lane). */
  azureSpeechBatch?: AzureSpeechBatchDiagnostics
  /** Per-turn Azure speech metrics (parallel with structured LLM). */
  azurePerTurnSpeechMetrics?: UserTurnSpeechAssessmentMetrics[]
  referenceTtsMs: number
  referenceTtsRequestedCount: number
  referenceTtsCacheHits: number
  referenceTtsCacheMisses: number
  referenceTtsGeneratedCount: number
  reportAssemblyMs?: number
  parallelWaitMs: number
  failedSubtasks: Array<{ task: string; reason: string }>
  fallbackUsed: boolean
  fallbackReason?: string
  warnings: string[]
  /** True when structured LLM ran before Azure summaries were merged (transcript-first coaching). */
  transcriptEvalUsedParallelAudioContext?: boolean
}

export type EvaluationGenerationDiagnostics = {
  startedAt: string
  completedAt: string
  totalMs: number
  /** Strict latency / policy warnings for ops tuning (not shown in learner UI). */
  latencyWarnings?: string[]
  app?: {
    inputLoadMs: number
    reportBuildMs: number
    qaMs: number
    persistMs: number
    totalMs: number
    qaAttemptCount: number
  }
  orchestrator?: {
    totalMs: number
    assessTurnsMs: number
    llmMs: number
    /** Primary structured dialogue eval wall time when parallel lane is on (else mirrors llmMs). */
    structuredLlmMs?: number
    /** Extra OpenAI calls after the primary evaluation (verify + audit); 0 in default production. */
    legacyLlmCallsCount?: number
    expensiveAuditEnabled?: boolean
    recommendationVerifyEnabled?: boolean
    legacyTurnEnrichmentEnabled?: boolean
    coachMergeMs: number
    referenceTtsMs: number
    referenceTtsRequestedCount?: number
    referenceTtsCacheHits?: number
    referenceTtsCacheMisses?: number
    referenceTtsGeneratedCount?: number
    feedbackBuildMs: number
    enrichTurnsMs: number
    premiumScoringMs: number
    sessionAssemblyMs: number
    /** Optional recommendation-verify LLM pass (0 when skipped). */
    recommendationVerifyMs?: number
    /** Optional full-report audit LLM (batched in parallel when many turns). */
    reportAuditMs?: number
    turnCount: number
    turnTimings: Array<{
      turnId: string
      turnIndex: number
      totalMs: number
      blobDownloadMs: number
      audioAssessmentMs: number
      timingAnalysisMs: number
      blobBytes: number
      hadAudio: boolean
      assessmentOk: boolean
      skippedReason?: AzureSpeechTurnSkippedReason
    }>
  }
  /** Present when {@link isSpeakLiveParallelScenarioReportOptimizedEnabled} was on for this run. */
  parallelOrchestrationV1?: SpeakLiveParallelOrchestrationDiagnosticsV1
  qa?: {
    totalMs: number
    flaggedIssueCount: number
    unresolvedIssueCount: number
    fixedIssueCount: number
    shouldRerun: boolean
    qaAttemptIndex: number
    /** Deterministic QA rule ids (issues, repairs, structural checks). */
    qaRulesTriggered?: string[]
  }
}

// ─── Evidence summary (report header) ────────────────────────────────────

export type EvidenceSummary = {
  transcriptAvailable: boolean
  audioTurnCount: number
  transcriptTurnCount: number
  azurePronunciationTurnCount: number
  llmLanguageTurnCount: number
  referenceAudioTurnCount: number
  totalLearnerTurnCount: number
  audioPipelineDiagnostics?: {
    totalTurns: number
    turnsWithBlobPath: number
    turnsDownloadedOk: number
    turnsAssessedOk: number
    turnsAudioBacked: number
    turnsWithScores: number
    issues: string[]
  }
}

// ─── Task / scenario outcome ─────────────────────────────────────────────

export type GoalEvidence = {
  goalId: string
  goalLabel: string
  turnId: string | null
  turnIndex: number | null
  evidenceText: string | null
  status: 'completed' | 'missed' | 'partial'
  /** Fractional weight (0–1) within the scenario. Sum of all goal weights = 1. */
  weight?: number
  /** Whether this goal is required for scenario success or a bonus. */
  tier?: 'core' | 'stretch'
  /** For missed goals: an example Dutch line that would satisfy this goal. */
  completionHint?: string
}

export type TaskOutcome = {
  goals: string[]
  completed: string[]
  missed: string[]
  goalEvidence: GoalEvidence[]
  /**
   * Raw checklist: sum of completed goal weights × 100 (scenario FSM / recap only).
   * Can read 100% while language coaching still has improvements — see `weightedCompletion`.
   */
  goalChecklistPercent?: number
  /**
   * Learner-facing 0–100: blends checklist completion with average scenario fit + naturalness
   * (and a small penalty when word-level flags exist) so the headline is not “perfect” when polish remains.
   */
  weightedCompletion?: number
}

// ─── Scored dimension (used for overall + turn) ──────────────────────────

export type ScoredDimension = {
  id: string
  label: string
  score: number | null
  confidence: ConfidenceLevel
  evidenceType: EvidenceType
  verdict: string
  /** Short learner-facing justification for this score */
  meaning: string
}

// ─── Audio scores (Azure-derived) ────────────────────────────────────────

export type AudioScores = {
  pronunciation: number
  fluency: number
  rhythm: number
  completeness: number
  clarity: number
}

/** Coach / transcript + scenario judgment — from structured LLM output (bounded 0–100). */
export type LanguageScores = {
  naturalness: number
  contextualFit: number
  registerFit: number
  grammaticalStability: number
}

export type CombinedScores = {
  overallTurnScore: number
  clarityScore: number
  dutchLikenessScore: number
}

// ─── Transcript coaching (per-turn) ──────────────────────────────────────

export type RewriteOption = {
  label: string
  text: string
}

export type TranscriptCoaching = {
  meaningClarityScore: number | null
  grammarScore: number | null
  naturalnessScore: number | null
  levelFitScore: number | null
  issues: Array<{ area: string; issue: string; fix: string }>
  strengths: string[]
  rewriteOptions: {
    safeForLevel: RewriteOption | null
    moreNatural: RewriteOption | null
    stretch: RewriteOption | null
    /** Optional fourth line (e.g. small talk: another natural variant). */
    alternativePhrasing?: RewriteOption | null
  }
  patternToReuse: string | null
  explanations: string[]
  evidenceLines: string[]
}

// ─── Audio coaching (per-turn, only when audio exists) ───────────────────

export type WordPronunciationStatus = 'strong' | 'okay' | 'weak' | 'unclear'

export type WordAssessmentResult = {
  word: string
  status: WordPronunciationStatus
  score: number
  issueType: string | null
  instruction: string | null
  startMs: number | null
  endMs: number | null
}

export type AudioCoaching = {
  pronunciationScore: number | null
  rhythmScore: number | null
  fluencyScore: number | null
  pacingScore: number | null
  confidence: ConfidenceLevel
  evidence: {
    strongWords: string[]
    weakWords: string[]
    problematicSegments: string[]
    pauseIssues: string[]
    stressIssues: string[]
    rushedEndings: string[]
  }
  wordAssessments: WordAssessmentResult[]
  referenceAudioUrl: string | null
  learnerAudioUrl: string | null
  comparisonNotes: string[]
  recommendedPronunciationDrills: string[]
}

// ─── Turn evaluation ─────────────────────────────────────────────────────

export type TurnEvaluation = {
  turnId: string
  turnIndex: number
  learnerTranscript: string
  /** @deprecated Use learnerTranscript. Kept for orchestrator compat. */
  transcriptOriginal?: string
  transcriptNormalized: string
  originalAudioUrl: string | null
  transcriptConfidence: ConfidenceLevel | null
  scenarioGoalTags: string[]
  scenarioGoalFit: ScenarioGoalFit
  transcriptCoaching: TranscriptCoaching
  audioCoaching: AudioCoaching | null
  naturalRewrite: {
    original: string
    improved: string
    whyMoreNatural: string
  } | null
  savedWordCandidates: string[]
  recommendedDrills: Array<{
    type: string
    title: string
    detail: string
    targetText: string | null
  }>
  /** Overall turn assessment dimensions */
  dimensions: ScoredDimension[]
  /** Signal sources for this turn */
  signalSources: TurnSignalSources
  /** Structured feedback items with evidence */
  feedbackItems: FeedbackItem[]
  /** Azure pronunciation issues (audio turns only) */
  pronunciationIssues: PronunciationIssue[]
  /** Pause / rush signals from word timestamps (audio turns only) */
  fluencyIssues: FluencyIssue[]
  /** Reference sentence for TTS / comparison */
  referenceSentence: string
  referenceSentenceReason: string
  referenceKind: 'reference_pronunciation' | 'more_natural_dutch'
  referenceAudioUrl: string | null
  learnerAudioUrl: string | null
  /** Short scan labels */
  quickLabels: {
    pronunciation: string
    rhythm: string
    naturalness: string
  }
  /** Audio / timing findings */
  audioFindings: string[]
  /** Key strengths and problems */
  keyStrengths: string[]
  keyProblems: string[]
  /** Focus words from audio analysis */
  focusWords: string[]
  /** Dutch-likeness narrative */
  dutchLikenessNarrative: string
  /** Chunking / rhythm suggestion */
  chunkingRhythmSuggestion: string
  /** Voice analysis unavailable message */
  voiceAnalysisUnavailableMessage: string | null
  /** Save actions */
  improvementActions: ImprovementAction[]
  /** Optional assistant context line */
  assistantContext: string | null
  /** Azure Speech structured evaluation (user audio; transcript as reference). */
  azureSpeechEvaluation?: import('./speakLiveAzureSpeechEvaluationArtifact.schema').SpeakLiveAzureSpeechTurnEvaluationV1
  /** Audio scores (legacy compat) */
  audioScores: AudioScores
  /** Language scores (legacy compat) */
  languageScores: LanguageScores
  /** Combined scores (legacy compat) */
  combinedScores: CombinedScores
  /** Structured grammar / construction / level-fit layer */
  languageEvaluation?: TurnLanguageEvaluation
  /** Deep evaluation for premium card */
  deepEvaluation?: LiveTurnDeepEvaluation
  /** Premium 6-dimension scoring model */
  premiumEvaluation?: import('../../domain/speaking-assessment/speechScoringModel').SpeechTurnEvaluation

  wrongWordDetections?: WrongWordDetection[]

  /** One-line coaching hook under the sentence */
  mainFixLine?: string

  /** Text-only compare coaching — does not affect playback */
  compareListenFor?: string[]

  /** One concrete drill for voice (delivery), separate from chunkingRhythmSuggestion */
  voiceDrillInstruction?: string

  sentenceGroundedReview?: SentenceGroundedReview

  audioDiagnostics?: {
    blobPath: string | null
    downloadOk: boolean
    bufSize: number
    assessmentOk: boolean
    assessmentCaveats: string[]
  }
}

// ─── Recommended action ──────────────────────────────────────────────────

export type RecommendedAction = {
  id: string
  type: 'retry_scenario' | 'pronunciation_drill' | 'rewrite_drill' | 'next_scenario' | 'save_words' | 'read_aloud' | 'speak_practice' | 'grammar_drill' | 'text_mode'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
  linkedTurnId?: string | null
  linkedPhrase?: string | null
  linkedScenarioId?: string | null
}

// ─── Phone-call scenario performance (Speak Live) ─────────────────────────

export type PhoneCallSentenceMoment = {
  turnIndex: number
  turnId: string
  /** Last assistant Dutch line before this learner turn (replay via TTS in the report UI). */
  assistantSaidNl: string
  learnerSaidNl: string
  /** Learner-facing gist of what mattered in what they heard. */
  expectedUnderstandingEn: string
  idealResponseHintNl: string | null
  /** Highlights lines where detail or fit suggests a “did you catch this?” review. */
  didYouCatchThis: boolean
  compareNoteEn: string
}

export type PhoneCallPerformance = {
  modelVersion: 1
  weightsSummary: string
  /** Weighted blend of the five phone dimensions (null only if all scores missing). */
  compositePhoneScore: number | null
  sentenceMoments: PhoneCallSentenceMoment[]
}

export type SmallTalkPerformance = {
  modelVersion: 1
  weightsSummary: string
  /** Weighted blend of the five small-talk dimensions (null only if all scores missing). */
  compositeSmallTalkScore: number | null
}

export type MeetingNewPeoplePerformance = {
  modelVersion: 1
  weightsSummary: string
  /** Weighted blend of the five meeting-new-people dimensions (null only if all scores missing). */
  compositeMeetingNewPeopleScore: number | null
}

export type PartySocialPerformance = {
  modelVersion: 1
  weightsSummary: string
  /** Weighted blend of the five party-social dimensions (null only if all scores missing). */
  compositePartySocialScore: number | null
}

export type ExplainingSomethingPerformance = {
  modelVersion: 1
  weightsSummary: string
  /** Weighted blend of structure / completeness / clarity / connectors / pronunciation. */
  compositeExplainingSomethingScore: number | null
}

export type StorytellingPerformance = {
  modelVersion: 1
  weightsSummary: string
  /** Weighted blend of story structure / sequence / detail / flow / pronunciation. */
  compositeStorytellingScore: number | null
}

export type OpinionsDiscussionsPerformance = {
  modelVersion: 1
  weightsSummary: string
  /** Weighted blend of opinion clarity / reasoning / structure / tone / pronunciation. */
  compositeOpinionsDiscussionsScore: number | null
}

// ─── Deterministic scenario report scoring (parallel structured + Azure lane) ─

/** Version string stored in {@link ScenarioReportScoringDiagnosticsV1.scoreFormulaVersion}. */
export const SCENARIO_REPORT_SCORE_FORMULA_VERSION = 'scenario-report-deterministic-v1' as const

export type ScenarioReportLanguageComponentScoresV1 = {
  grammar: number
  vocabulary: number
  sentenceStructure: number
  naturalness: number
  conversationFlowTaskRelevance: number
}

export type ScenarioReportSpeechComponentScoresV1 = {
  pronunciation: number
  fluency: number
  pacing: number
  prosody: number
  completeness: number
}

export type ScenarioReportComponentScoresV1 = {
  scenarioTask: number
  languageQuality: number
  /** Session-level speech composite; null when no Azure-assessed turns. */
  speechQuality: number | null
  language: ScenarioReportLanguageComponentScoresV1
  speech: ScenarioReportSpeechComponentScoresV1 | null
}

export type ScenarioReportPerTurnMergedScoreV1 = {
  turnId: string
  turnIndex: number
  languageQualityTurn: number
  speechQualityTurn: number | null
  scenarioTaskTurn: number
  turnOverall: number
  mainFix: string
  correctedLine: string
  strongerNaturalLine: string
  weakWords: string[]
  practiceNext: string
}

export type ScenarioReportScoringDiagnosticsV1 = {
  version: 1
  finalOverallScore: number
  scoreFormulaVersion: string
  scenarioWeight: number
  languageWeight: number
  speechWeight: number
  speechQualityStatus: 'available' | 'partial' | 'unavailable'
  componentScores: ScenarioReportComponentScoresV1
  missingComponents: string[]
  fallbackWeightsUsed: boolean
  diagnosticWarnings: string[]
  referenceTts?: { ms: number; cacheHits: number; cacheMisses: number }
  perTurnMergedScores: ScenarioReportPerTurnMergedScoreV1[]
}

// ─── Session-level report ────────────────────────────────────────────────

export type LiveSessionEvaluation = {
  sessionId: string
  scenarioId: string
  scenarioName: string
  scenarioTitle: string
  mode: 'live_voice' | 'chat_voice' | 'speak_reply' | 'read_aloud'
  /** Level the learner selected / practiced at for this session. */
  practicedLevel?: string
  /** Optional observed performance band when the report has enough evidence to call it out separately. */
  observedLevel?: string
  /** Plain-English explanation of any difference between practiced vs observed level. */
  levelObservationNote?: string
  targetLevel: string
  learnerLevel: string
  startedAt: string
  endedAt: string
  sessionDurationSeconds: number
  durationSec: number
  learnerTurnCount: number
  turnsCompleted: number

  evidenceSummary: EvidenceSummary

  keyTakeaway: {
    message: string
    evidenceType: EvidenceType
  }

  /** One premium headline line for the report header (evidence-grounded). */
  coachHeadline?: string

  /** Single coaching sentence combining what worked + what's next (no fluff). */
  coachSummaryLine?: string

  /** The ONE thing to focus on in the next session (anchor of the report). */
  focusArea?: {
    label: string
    why: string
    exampleLine: string
    cta: 'practice_now' | 'retry_scenario' | 'save_phrase'
    /** Turn this focus is grounded in (e.g. first wrong-word detection). */
    sourceTurnId?: string
    /** Verbatim learner utterance for this focus (when known). */
    learnerOriginalLine?: string
  }

  taskOutcome: TaskOutcome

  overall: {
    dimensions: ScoredDimension[]
    overallScore: number
    overallConfidence: ConfidenceLevel
  }

  turnEvaluations: TurnEvaluation[]

  recommendedActions: RecommendedAction[]

  /** Session audio metrics available (legacy compat) */
  sessionAudioMetricsAvailable: boolean

  overallScores: OverallScores
  overallSummary: {
    coachSummary: string
    fluencyRhythmSummary: string
    pronunciationSummary: string
    whatToTryNext: string[]
    grammarConstructionSessionSummary?: string
  }
  sessionInsights?: SessionEvaluationInsights
  scenarioOutcome: ScenarioOutcome
  recommendedFollowUps: RecommendedFollowUp[]
  premiumSessionEvaluation?: import('../../domain/speaking-assessment/speechScoringModel').SpeechSessionEvaluation
  /**
   * FluentCopilot merged speaking report: transcript LLM + Azure Speech + scenario (deduped coaching lists).
   */
  mergedSpeakingReportV1?: import('./speakLiveMergedSpeakingReport.schema').MergedSpeakingReportV1
  /**
   * Deterministic merge of structured dialogue eval + Azure speech + goal weights
   * (parallel optimized scenario lane). Optional on older evaluations.
   */
  scenarioReportScoringDiagnosticsV1?: ScenarioReportScoringDiagnosticsV1
  /** Present on every completed report: LLM vs deterministic coaching path (all scenarios). */
  coachingModel?: SpeakLiveCoachingModelMeta
  generationDiagnostics?: EvaluationGenerationDiagnostics
  reportQa?: {
    version: number
    status: 'passed' | 'fixed' | 'failed'
    checkedAt: string
    issues: string[]
    fixesApplied: string[]
    rerunCount: number
  }

  /** Post-session debrief for `language_coach` free-form mode (patterns-first). */
  languageCoachDebrief?: {
    /** Role mode selected at session start (`friend` … `coach`). */
    conversationRole?: 'friend' | 'colleague' | 'dutch_local' | 'date' | 'coach'
    conversationSummary: string
    /** Session framing (English); pair with {@link conversationSnapshotDutchLines} for structured UI. */
    conversationSnapshotIntro?: string
    /** Last few learner lines, one string per turn (no slash-joined blob). */
    conversationSnapshotDutchLines?: string[]
    focusAreaLabel: string
    strengths: string[]
    weakPatterns: string[]
    improvedPhrasingExamples: Array<{ learnerish: string; better: string }>
    followUpSuggestions: string[]
    savePracticePrompts: string[]
    /**
     * Structured nudge log from persisted Speak Live state (in-conversation guidance).
     *
     * `coachResponseSnippet` is the raw (truncated) coach reply — kept for debugging and
     * forward compatibility, but the slim UI does NOT render it directly to avoid the
     * "AIM FOR THIS DUTCH dumps the whole reply" problem (see `pickBetterLineFromCoachReply`
     * in `languageCoachSessionEvaluation.ts`).
     *
     * `coachCorrectionLine` is the producer-side isolation of just the corrected Dutch line
     * (single source of truth — the UI never re-implements the extraction). May be `null` if
     * the coach reply had no quotable correction.
     *
     * `humanizedSignals` are learner-facing labels derived from `detectedIssueTypes` via
     * `humanizeLanguageCoachWeaknessTag`. Frontends should prefer this over the raw
     * `detectedIssueTypes` array, which is internal taxonomy.
     */
    nudgeSessionLog?: Array<{
      nudgeType: string
      learnerOriginal: string
      coachResponseSnippet: string
      coachCorrectionLine?: string | null
      detectedIssueTypes: string[]
      humanizedSignals?: string[]
      severity: string
      learnerRecoveredLater: boolean | null
    }>
    sessionHandoff?: {
      strongestSkillShown: string
      mostRepeatedWeakPattern: string
      bestExampleImprovement: string
      suggestedNextFocus: string
      /**
       * True when `suggestedNextFocus` was derived from real session signal (learning goal,
       * weakness, overused vocab stem, named pattern). False when it falls back to the
       * generic "repeat this mode" line. UI surfaces that promise specificity should gate
       * on this flag and hide the surface when false.
       */
      suggestedNextFocusIsSessionDerived?: boolean
      notableNudgeMoments: string[]
    }
    /** One-line debrief headline (coach voice). */
    coachOneLiner?: string
    /**
     * Optional transcript-grounded example pair that supports `coachOneLiner`. When present,
     * the UI should render it as a small, separately-styled evidence card BELOW the
     * headline — never inlined into the H1 prose — so the headline stays one-line readable
     * and the example is visually subordinated. Producers emit this only when the pair
     * has high confidence (real recast, not a topical continuation); when null/omitted the
     * UI hides the supporting card.
     */
    coachOneLinerExample?: {
      learnerish: string
      better: string
    } | null
    /** Progress narrative (not task completion). */
    whatImprovedDuringSession?: string
    /** How the coach steered the chat (bullets). */
    howCoachGuidedYou?: string[]
    /** Voice/fluency note when evidence exists; otherwise explains limits. */
    pronunciationFluencyNote?: string
    /** Coach role: whether “Guide me while speaking” was on. */
    coachGuideWhileSpeaking?: boolean
    /** Coach + guide on: short English reflection lines (constructive). */
    guideModeReflection?: {
      neededMoreSupportWith: string
      strongestRecoveryMoment: string
    }
    /** Moments where a nudge correlated with cleaner follow-up (heuristic). */
    guidanceMomentsUseful?: string[]
    /** How to read this session for the selected role (emphasis, not a second report). */
    roleSessionEmphasis?: string
    /** Coach role: recasts, targeted pattern, recovery — plus optional guide-mode note. */
    coachLearningInsights?: {
      bullets: string[]
      guideActiveSupportNote?: string
    }
    /** Extra save targets (weak structure, follow-up, mini-practice, recast line). */
    roleSaveablePracticeItems?: Array<{
      id: string
      title: string
      body: string
      tagCategory: string
    }>
    /** Short tips from graded voice clips (e.g. weak syllables, pauses). */
    voiceImprovementFindings?: string[]
    /** Actionable lines when conversation-from-text scores are softer, plus pattern drills. */
    conversationScoreHints?: string[]
    /** Weak words from scored clips, with model Dutch to aim for (coach / phrasing match). */
    voiceWordCompareItems?: Array<{
      id: string
      weakWord: string
      yourLine: string
      modelDutch: string
      tip?: string
      /**
       * LLM-inferred intent when the spoken weak word is likely a mistranscription. UI uses
       * this to display the corrected word + English gloss as the practice target. Absent
       * when the LLM enricher had no confident suggestion.
       */
      intent?: {
        dutchWord: string
        englishGloss: string
      }
    }>
    /**
     * "Plan your next session" — produced from THIS session's signals (not cross-session
     * profile). Omitted when there is no session-derived signal to anchor the plan; UI hides
     * the entire section in that case (no defaults, no fallbacks). See
     * `languageCoachNextPracticePlanner.ts` for the contract.
     */
    nextPracticePlan?: {
      headline: string
      coachFocusBrief: {
        /**
         * English instruction forwarded as `lcPinnedFocus` deep-link param; backend seeds it
         * into `learnerPinnedLessonFocusEnglish` so the coach prompt builder weaves the
         * focus into every reply.
         */
        pinnedFocusEnglish: string
        suggestedGoal:
          | 'general'
          | 'fluency'
          | 'pronunciation'
          | 'grammar'
          | 'confidence'
          | 'storytelling'
          | 'follow_up_questions'
          | null
        suggestedConversationRole: 'friend' | 'colleague' | 'dutch_local' | 'date' | 'coach' | null
        /** Specific Dutch words from this session worth more reps. */
        vocabAnchors: string[]
        /** Humanized patterns (e.g. "asking follow-up questions"), already learner-facing. */
        grammarAnchors: string[]
      }
      scenarioCandidates: Array<{
        scenarioSlug: string
        scenarioTitle: string
        level: string
        why: string
      }>
    }
  }

  /** Present for `phone_call`: weighted phone dimensions + per-turn “ear check” moments. */
  phoneCallPerformance?: PhoneCallPerformance

  /** Present for `small_talk`: weighted flow-first social dimensions. */
  smallTalkPerformance?: SmallTalkPerformance

  /** Present for `meeting_new_people`: intro / background / follow-up weighted dimensions. */
  meetingNewPeoplePerformance?: MeetingNewPeoplePerformance

  /** Present for `party_social`: continuity / questions / reactions weighted dimensions. */
  partySocialPerformance?: PartySocialPerformance

  /** Present for `explaining_something`: structure-first explanation scoring. */
  explainingSomethingPerformance?: ExplainingSomethingPerformance

  /** Present for `storytelling`: narrative arc scoring. */
  storytellingPerformance?: StorytellingPerformance

  /** Present for `opinions_discussions`: stance + reasoning scoring. */
  opinionsDiscussionsPerformance?: OpinionsDiscussionsPerformance

  generatedAt: string
  status: EvaluationStatus
}

// ─── Legacy / compat types (preserved for orchestrator) ──────────────────

export type OverallScores = {
  overallVoiceScore: number
  pronunciationScore: number | null
  fluencyScore: number | null
  rhythmScore: number | null
  clarityScore: number
  naturalnessScore: number
  scenarioCompletionScore: number
  confidenceEstimate: number
  /** Session-level scores from {@link mergedSpeakingReportV1} composition (optional). */
  conversationScore?: number
  vocabularyScore?: number
  grammarScore?: number
  pacingScore?: number
}

export type ScenarioGoalFit = {
  summary: string
  alignmentScore: number
  relevantGoals: string[]
}

export type ImprovementActionType =
  | 'save_phrase'
  | 'save_improved_version'
  | 'save_pronunciation_word'
  | 'save_rhythm_drill'
  | 'save_natural_phrasing'
  | 'scenario_follow_up'
  | 'sentence_drill'
  | 'review_queue'
  | 'coach_followup'
  | 'speaking_drill'

export type ImprovementAction = {
  type: ImprovementActionType
  title: string
  detail: string
  targetPhrase?: string
  targetWord?: string
}

export type TurnSignalSources = {
  audioMetrics: SignalSource
  languageCoach: SignalSource
  scenarioContext: SignalSource
}

export type TurnLanguageEvaluation = {
  grammarScore: number
  sentenceConstructionScore: number
  naturalnessScore: number
  levelFitScore: number
  whatWorked: string[]
  grammarIssues: string[]
  sentenceStructureIssues: string[]
  wordOrderNotes?: string[]
  questionFormNotes?: string[]
  verbTenseNotes?: string[]
  agreementNotes?: string[]
  improvedVersion: string
  whyItIsBetter: string
  whyThisIsMoreNatural?: string
  nextPatternToPractice?: string
  learnerFacingGrammarLine?: string
  levelBasedComment: string
  nextStepBeyondLevel?: string
}

export type LiveTurnDeepEvaluation = {
  turnId: string
  learnerTranscript: string
  learnerTranscriptNormalized: string
  learnerAudioRef: string | null
  audioScores: AudioScores | null
  languageScores: LanguageScores
  overallTurnScore: number
  whatWorked: string[]
  pronunciationFeedback: string[]
  rhythmFeedback: string[]
  grammarFeedback: string[]
  sentenceConstructionFeedback: string[]
  moreNaturalDutchVersion: string
  whyThisVersionIsBetter: string
  whyThisIsMoreNatural?: string
  levelFitComment: string
  nextStepBeyondLevel?: string
  nextPatternToPractice?: string
  learnerFacingGrammarLine?: string
  referenceAudioUrl: string | null
  actionsToTrainLater: {
    type: string
    title: string
    detail: string
    targetPhrase?: string
    targetWord?: string
  }[]
}

export type SessionEvaluationInsights = {
  overallGrammarSentenceScore: number
  overallNaturalness: number
  strongestAreas: string[]
  weakestAreas: string[]
  mostImportantNextStep: string
  savedTrainingRecommendationsSummary?: string
}

export type ScenarioOutcome = {
  goalsCompleted: string[]
  goalsMissed: string[]
  whatWentWell: string[]
  whatToImproveNext: string[]
}

export type RecommendedFollowUp = {
  type: string
  title: string
  reason: string
  linkedScenarioIdOptional?: string | null
  linkedPhraseOptional?: string | null
  linkedWordOptional?: string | null
}

export type FeedbackItemType = 'pronunciation' | 'grammar' | 'rhythm' | 'naturalness' | 'fluency' | 'pacing' | 'prosody' | 'scenario_fit'

export type FeedbackSource = 'audio' | 'transcript' | 'scenario'

export const AUDIO_ONLY_FEEDBACK_TYPES: ReadonlySet<FeedbackItemType> = new Set([
  'pronunciation', 'fluency', 'rhythm', 'pacing', 'prosody',
])

export type FeedbackEvidence = {
  word?: string
  phrase?: string
  transcriptSnippet: string
  timestampMsStart?: number | null
  timestampMsEnd?: number | null
  confidence?: number | null
}

export type FeedbackItem = {
  type: FeedbackItemType
  source: FeedbackSource
  evidence: FeedbackEvidence
  issue: string
  fix: string
  explanation: string
}

export type PronunciationIssue = {
  word: string
  score: number
  issue: string
  fix: string
  referenceAudioUrl: string | null
  startMs?: number | null
  endMs?: number | null
}

export type FluencyIssue = {
  segment: string
  issue: string
  fix: string
  pauseMs: number | null
  afterWordIndex: number | null
}

/** Sentence-level word-choice / recognition issues (deterministic + optional LLM merge). */
export type WrongWordClassification =
  | 'non_word'
  | 'likely_misrecognition'
  | 'wrong_word_choice'
  | 'misspelling'

export type WrongWordDetection = {
  observedToken: string
  classification: WrongWordClassification
  suggestedCorrection: string
  whyItMatters: string
  severity: 'high' | 'medium' | 'low'
  /** When transcript/ASR confidence is mixed — softer claim to the learner */
  uncertainHearing?: boolean
}

/** Premium sentence card copy derived from evidence (not playback). */
export type SentenceGroundedReview = {
  mainFix: string
  mainVoiceFix: string
  whatWorked: string[]
  whatToFix: string[]
  nativePhrase: string
  whyBetter: string
  pattern: string | null
}
