/**
 * Backend JSON shapes (Azure Functions). Keep UI-facing models in feature types + mappers.
 */

export type ApiConversationMode = 'guided' | 'free'
export type ApiConversationSurface = 'text' | 'speak_live'
export type ApiFeedbackMode = 'turn' | 'end'
export type ApiThreadStatus = 'active' | 'completed' | 'paused'
export type ApiMessageSender = 'user' | 'assistant' | 'system' | 'coach'
export type ApiMessageType = 'text' | 'system_banner'

export type ApiScenarioRuntimeGoal = {
  id: string
  label: string
  weight: number
  required?: boolean
  skill: string
}

export type ApiScenarioRuntimeConfig = {
  id: string
  title: string
  category: string
  level: string
  subType: string
  variation: string
  context: string
  /** Short learner-facing situation; full rubric remains in `context`. */
  learnerSituationSummary?: string
  goals: ApiScenarioRuntimeGoal[]
  weights: Record<string, number>
  assistantBehavior: {
    pace: string
    register: string
    responseStyle: string[]
    frictionStyle: string[]
  }
  difficultyAdjustments: {
    learnerLevel: string
    responsePacing: string
    vocabularyRange: string
    followUpStyle: string
    misunderstandingLevel: string
  }
  hints?: string[]
  persona?: Record<string, string>
  coreSkills?: string[]
  openingLine?: string
}

export interface ApiScenarioConfig {
  id: string
  slug: string
  title: string
  description: string
  userRole: string
  goals: string[]
  starterSuggestions: string[]
  difficultyBand: string
  tags: string[]
  allowedModes: ApiConversationMode[]
  openingMessage: string | null
  runtimeConfig?: ApiScenarioRuntimeConfig | null
}

export interface ApiPersonaConfig {
  id: string
  slug: string
  displayName: string
  role: string
  tone: string
  styleRules: string[]
  avatarKey: string | null
  introLine: string
}

export interface ApiConversationThread {
  id: string
  userId: string
  scenarioId: string
  personaId: string
  mode: ApiConversationMode
  /** Omitted in older API responses — treat as `text`. */
  conversationSurface?: ApiConversationSurface
  feedbackMode: ApiFeedbackMode
  status: ApiThreadStatus
  summaryText: string | null
  currentStage: string | null
  /** Speak Live persisted FSM JSON — present on API thread rows when available. */
  speakLiveStateJson?: string | null
  /** Post-session evaluation lifecycle for Speak Live (null on text threads / legacy rows). */
  speakLivePostSessionPhase?: 'active' | 'ending' | 'evaluating' | 'evaluated' | 'failed' | null
  createdAt: string
  updatedAt: string
  lastUserMessageAt: string | null
}

export interface ApiConversationMessage {
  id: string
  threadId: string
  sender: ApiMessageSender
  messageType: ApiMessageType
  content: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface ApiFeedbackItem {
  id: string
  threadId: string
  linkedMessageId: string
  category: string
  originalText: string
  correctedText: string
  explanation: string
  severity: string
  createdAt: string
}

export interface ApiPronunciationHighlight {
  phrase: string
  tip: string
}

export interface ApiLiveRecapTranscriptEvidence {
  goalId: string
  quote: string
}

export interface ApiConversationSummary {
  threadId: string
  whatWentWell: string[]
  whatToImprove: string[]
  correctedPhrases: { original: string; corrected: string; note: string }[]
  suggestedNextAction: string
  saveWordCandidates: string[]
  /** Voice / Speak Live recaps — optional on older stored summaries */
  pronunciationHighlights?: ApiPronunciationHighlight[]
  goalsCompleted?: string[]
  goalsMissed?: string[]
  languageNotes?: string[]
  transcriptEvidence?: ApiLiveRecapTranscriptEvidence[]
  recommendedNextStep?: string
  dutchUpgrade?: string[]
  /** Alias merged client-side with saveWordCandidates when present */
  savedWordSuggestions?: string[]
}

export interface ApiSavedWordItem {
  id: string
  userId: string
  text: string
  normalizedText: string
  meaning: string | null
  sourceType: string
  sourceThreadId: string | null
  sourceMessageId: string | null
  sourceScenarioId: string | null
  exampleSentence: string | null
  createdAt: string
}

/** Speak Live: assistant portrait + effective TTS (for UI matching voice). */
export interface ApiSpeakLiveSessionMedia {
  assistantPresentation: 'male' | 'female'
  ttsProvider: 'azure' | 'openai'
  ttsVoice: string
}

export interface StartConversationResponse {
  thread: ApiConversationThread
  messages: ApiConversationMessage[]
  scenario: ApiScenarioConfig
  persona: ApiPersonaConfig
  speakLive?: ApiSpeakLiveSessionMedia | null
}

export interface GetConversationResponse {
  thread: ApiConversationThread
  messages: ApiConversationMessage[]
  scenario: ApiScenarioConfig
  persona: ApiPersonaConfig
  feedback: ApiFeedbackItem[]
  speakLive?: ApiSpeakLiveSessionMedia | null
}

/** Server-side Speak Live timings (merged with browser STT/TTS in dev overlay). */
export interface LiveTurnLatencyTraceServer {
  sessionId: string
  turnId: string
  transcriptPartialMs: number | null
  transcriptFinalMs: number | null
  normalizationMs: number
  stateLoadMs: number
  llmMs: number
  assistantTextVisibleMs: number | null
  moderationAssistantMs: number | null
  ttsMs: number | null
  playbackStartMs: number | null
  totalMs: number
  bottleneckStage: string
  fastPath: boolean
  modelUsed?: string
  estimatedInputTokens?: number
  estimatedOutputTokens?: number
  budgetsExceeded?: string[]
}

export interface SendMessageResponse {
  userMessage: ApiConversationMessage
  assistantMessage: ApiConversationMessage
  feedback: ApiFeedbackItem | null
  saveWordCandidates: string[]
  scenarioProgress: { stage: string; notes?: string } | null
  shouldConversationEnd: boolean
  updatedSummary: string
  thread: ApiConversationThread
  /** When true, client should POST `/messages/enrich` for coach feedback + save words + summary refresh. */
  enrichmentPending: boolean
  /** Phase timings from the Azure Functions handler (ms). */
  perf: Record<string, number>
  /** Speak Live NDJSON `done` / bundled turn — structured server latency trace. */
  liveTurnLatencyTrace?: LiveTurnLatencyTraceServer
  /**
   * Speak Live NDJSON `done` only — Stage A model label + prompt size estimate for dev tooling.
   */
  speakLiveStreamMeta?: {
    stageAModelLabel: string
    replyPromptCharsEstimate: number
    estimatedInputTokens?: number
    estimatedOutputTokens?: number
    fastPath?: boolean
  }
  /** Speak Live: confirms fast path only (no deep evaluation on this request). */
  liveTurnDiagnostics?: Record<string, unknown>
  /** Language Coach: per-turn correctness signal for the live UI. */
  liveCoachTurnFeedback?: ApiLiveCoachTurnFeedback
}

export interface ApiLiveCoachTurnFeedback {
  verdict: 'good' | 'needs_work'
  pickedUpByCoach: boolean
  /** True when the assistant line includes the bounded “Zeg precies … + repeat” pattern. */
  explicitCorrectionInReply?: boolean
  guideModeActive: boolean
  correctionLoopActive: boolean
  reasons: string[]
  summary: string
  targetLine?: string | null
  repeatCount?: number | null
}

/** `POST /speak-live/stuck-hints` — Dutch phrase ideas for the learner’s next line. */
export type SpeakLiveStuckHintsResponse = {
  suggestions: string[]
  source: 'llm' | 'fallback'
}

export interface EnrichTurnResponse {
  feedback: ApiFeedbackItem | null
  saveWordCandidates: string[]
  thread: ApiConversationThread
  assistantMessage: ApiConversationMessage
  perf: Record<string, number>
}

export interface EndConversationResponse {
  summary: ApiConversationSummary
  thread: ApiConversationThread
  /** Dev-only — when server debug gate is on (train + speak_live). */
  speakLiveRecapDebug?: Record<string, unknown>
}

/** Cross-session hints on Speak Live and read-aloud reports (mirrors backend `ReportLearningMemoryRibbon`). */
export type ReportMemorySurfaces = {
  sessionEcho: string | null
  currentFocus: string | null
  recurringPattern: string | null
  improving: string | null
}

export type ReportRibbonNextPractice = {
  kind: 'speak_live' | 'read_aloud' | 'talk_hub'
  href: string
  label: string
}

export type ReportLearningMemoryRibbon = {
  lines: string[]
  surfaces?: ReportMemorySurfaces | null
  confidenceNote?: string | null
  coldStart?: boolean
  basedOnRecentSessions?: boolean
  nextStep?: { title: string; subtitle: string; reason: string } | null
  /** Deep link for the primary “Try next” action (Speak Live run, Read aloud entry, or Talk hub). */
  nextPractice?: ReportRibbonNextPractice | null
  /** Cross-session skill insights (max a few); distinct from session surfaces. */
  skillInsights?: string[]
}

/** Lightweight skills preview on Talk continue / landing (mirrors backend). */
export type TalkSkillsPreview = {
  headline: string
  lines: string[]
  overallScore: number | null
  strongestLabel: string | null
  focusLabel: string | null
}

export type ApiSkillGroup = 'speaking' | 'conversation' | 'structure' | 'language' | 'listening' | 'advanced'

export type ApiSkillId =
  | 'pronunciation'
  | 'fluency'
  | 'pacing'
  | 'asking_questions'
  | 'reacting'
  | 'keeping_flow'
  | 'follow_up_questions'
  | 'repair_clarification'
  | 'turn_taking'
  | 'explaining'
  | 'storytelling'
  | 'sequencing'
  | 'step_by_step_speaking'
  | 'response_structure'
  | 'grammar'
  | 'vocabulary'
  | 'sentence_structure'
  | 'word_choice'
  | 'natural_dutch'
  | 'opinions'
  | 'reasoning'
  | 'nuance'
  | 'contrast_comparison'
  | 'softer_disagreement'
  | 'gist_understanding'
  | 'detail_recognition'
  | 'instruction_following'
  | 'response_readiness'
  | 'fast_speech_handling'
  | 'reduced_spoken_dutch'
  | 'filler_tolerance'
  | 'speaker_variation'
  | 'numbers_and_times'
  | 'route_words'
  | 'service_replies'
  | 'quantities_and_items'

export type ApiSkillState = 'needs_work' | 'building' | 'improving' | 'solid' | 'strong'
export type ApiSkillTrend = 'up' | 'flat' | 'down' | 'unstable'
export type ApiSkillConfidence = 'low' | 'medium' | 'high'

export type ApiSkillMetric = {
  skillId: ApiSkillId
  group: ApiSkillGroup
  score: number
  state: ApiSkillState
  trend: ApiSkillTrend
  confidence: ApiSkillConfidence
  evidenceCount: number
  lastUpdatedAt: string
  sourceMix: string[]
  baselineScore?: number
  priorScore?: number
  lastSessionObservedScore?: number
}

export type ApiSkillRecommendation = {
  kind: string
  title: string
  subtitle: string
  reason: string
  targetId: string | null
  relatedSkillIds: ApiSkillId[]
  priorityScore: number
  coachStyleHint?: string
}

export type ApiUserSkillProfile = {
  schemaVersion: number
  userId: string
  overallSkillScore: number | null
  strongestSkills: ApiSkillId[]
  weakestSkills: ApiSkillId[]
  currentFocusSkills: ApiSkillId[]
  metrics: Partial<Record<ApiSkillId, ApiSkillMetric>>
  lastRecomputedAt: string
  displayPreferences?: { showNumericScores: boolean } | null
  recommendations: {
    primary: ApiSkillRecommendation | null
    secondary: ApiSkillRecommendation | null
    encouragement: ApiSkillRecommendation | null
    focusChip?: ApiSkillRecommendation | null
    generatedAt: string
  } | null
}

export type ApiSkillDefinition = {
  id: ApiSkillId
  group: ApiSkillGroup
  label: string
  shortDescription: string
  longDescription: string
  displayOrder: number
  whyItMatters: string
  iconToken: string
  relatedScenarioSlugs: string[]
  relatedReadAloudProfiles: string[]
  relatedCoachGoals: string[]
}

/** Present only on `GET /talk/skills-profile` when dev header + non-production API (see Dev Tools). */
export type SkillSystemDebugApiPayload = Record<string, unknown>

export type ApiTrainingLoopType =
  | 'weak_words'
  | 'retry_sentence'
  | 'mini_scenario'
  | 'read_aloud_fix'
  | 'structure_drill'
  | 'pronunciation_drill'
  | 'question_drill'
  | 'storytelling_drill'
  | 'listening_burst'
  | 'missed_detail_retry'
  | 'fast_speech_burst'
  | 'listen_and_reply'
  | 'route_detail_drill'
  | 'number_time_drill'

export type ApiPersonalizedTrainingLoop = {
  id: string
  userId: string
  sourceSessionId: string
  threadId: string | null
  sourceType: string
  sourceScenarioId: string | null
  loopSlot: number
  loopType: ApiTrainingLoopType
  title: string
  subtitle?: string | null
  reason: string
  targetSkills: string[]
  targetWeaknessKeys: string[]
  estimatedMinutes: number
  difficulty: string
  payload: unknown
  createdAt: string
  updatedAt: string
  expiresAt?: string | null
  status: string
  confidence: string
  priorityScore: number
  dedupeKey?: string | null
}

export type ApiTrainingLoopPracticeNowBundle = {
  primary: ApiPersonalizedTrainingLoop | null
  secondary: ApiPersonalizedTrainingLoop | null
  stretch: ApiPersonalizedTrainingLoop | null
  debug?: Record<string, unknown> | null
}

export type TalkTrainingLoopCard = {
  id: string
  loopType: string
  title: string
  subtitle: string | null
  reason: string
  estimatedMinutes: number
  difficulty: string
  status: string
  targetSkills: string[]
  threadId: string | null
  sourceSessionId: string
  /** Present when API returns extended card (Talk hub / reports). */
  sourceType?: string | null
  loopSlot?: number | null
}

/** Completed / dismissed / stale loops for Activity + dedupe (secondary surface). */
export type TalkTrainingLoopHistoryItem = {
  id: string
  loopType: string
  title: string
  status: 'completed' | 'dismissed' | 'stale'
  updatedAt: string
  loopSlot: number
  completionInsight?: string | null
}

export type TalkSkillProfileResponse = {
  coldStart: boolean
  activeTrainingLoops: TalkTrainingLoopCard[]
  profile: ApiUserSkillProfile | null
  definitions: ApiSkillDefinition[]
  skillSystemDebug?: SkillSystemDebugApiPayload
}

/** Fine-grained FluentCopilot evaluation pipeline (GET evaluation while `status === 'running'`). */
export type SpeakLiveEvaluationPipelinePhase =
  | 'queued'
  | 'evaluating_dialogue'
  | 'evaluating_transcript'
  | 'evaluating_speech'
  | 'composing_report'
  | 'completed'
  | 'failed'

/** `GET|POST` Speak Live post-session voice evaluation pipeline. */
export interface ApiLiveSessionEvaluationResponse {
  status: 'pending' | 'running' | 'complete' | 'failed'
  evaluation: Record<string, unknown> | null
  errorMessage?: string | null
  speakLivePostSessionPhase?: 'active' | 'ending' | 'evaluating' | 'verifying' | 'evaluated' | 'failed' | null
  evaluationPhase?: SpeakLiveEvaluationPipelinePhase | null
  evaluationProgress?: Record<string, unknown> | null
  partialEvaluationInsights?: string[] | null
  qaStatus?: 'pending' | 'running' | 'passed' | 'failed'
  qaSummary?: string | null
  qaIssues?: string[]
  evaluationDiagnostics?: {
    audioScoring: 'pending' | 'running' | 'done'
    languageCoaching: 'pending' | 'running' | 'done'
    finalAssembly: 'pending' | 'running' | 'done'
    qaReview: 'pending' | 'running' | 'done' | 'failed'
    runningForMs?: number
    timings?: {
      totalMs?: number
      inputLoadMs?: number
      reportBuildMs?: number
      qaMs?: number
      persistMs?: number
      orchestratorTotalMs?: number
      assessTurnsMs?: number
      llmMs?: number
      coachMergeMs?: number
      referenceTtsMs?: number
      feedbackBuildMs?: number
      enrichTurnsMs?: number
      premiumScoringMs?: number
      sessionAssemblyMs?: number
      recommendationVerifyMs?: number
      reportAuditMs?: number
      turnCount?: number
      qaAttemptCount?: number
      flaggedIssueCount?: number
      unresolvedIssueCount?: number
      fixedIssueCount?: number
      slowestTurns?: Array<{
        turnIndex: number
        totalMs: number
        blobDownloadMs: number
        audioAssessmentMs: number
        timingAnalysisMs: number
        assessmentOk: boolean
      }>
    }
  }
  learningMemoryRibbon?: ReportLearningMemoryRibbon | null
  practiceNow?: ApiTrainingLoopPracticeNowBundle | null
}

/** `GET /talk/session-history` — completed threads across scenarios (History / Activity). */
export interface TalkSessionHistoryResponse {
  threads: ApiConversationThread[]
}

export interface ContinueConversationResponse {
  activeThread: ApiConversationThread | null
  scenario: ApiScenarioConfig | null
  persona: ApiPersonaConfig | null
  /** Train-station scenario — paused, resumable threads (most recent first). */
  trainPausedThreads: ApiConversationThread[]
  /** Train-station scenario — recently completed threads (most recent first). */
  trainRecentCompleted: ApiConversationThread[]
  learningFocus?: {
    workingOnChip: string | null
    bestNextStep: string | null
    recommendedScenarioSlug: string | null
    recommendedReadAloudProfile: string | null
    recommendedBecause: string | null
    coldStart: boolean
    /** Short adaptive line for the recommended next scenario (optional). */
    scenarioPersonalizationLine?: string | null
    recommendations?: Array<{
      type: string
      targetId: string
      title: string
      subtitle: string
      reason: string
      confidence: number
      priorityScore: number
    }>
    skillsPreview?: TalkSkillsPreview | null
  } | null
  nextTrainingLoop?: TalkTrainingLoopCard | null
  activeTrainingLoops?: TalkTrainingLoopCard[]
  trainingLoopHistory?: TalkTrainingLoopHistoryItem[]
}

export interface PauseResumeConversationResponse {
  thread: ApiConversationThread
}

export interface SaveWordResponse {
  item: ApiSavedWordItem
}

/** `GET/POST /training-items/saved` — FluentCopilot long-term practice queue from Speak Live (and future surfaces). */
export interface ApiSavedTrainingItem {
  id: string
  userId: string
  sourceSessionId: string
  sourceTurnId: string | null
  sourceScenarioId: string | null
  learnerOriginalSentence: string | null
  improvedSentence: string | null
  tagCategory: string | null
  suggestedTrainingMode: string | null
  itemType: string
  title: string
  content: string
  audioReferenceUrl: string | null
  learnerAudioUrl: string | null
  metadataJson: string | null
  createdAt: string
}

export interface ApiListSavedTrainingItemsResponse {
  items: ApiSavedTrainingItem[]
}

/** `POST /speak-live/turn` — STT + conversation reply + TTS in one round trip. */
export interface SpeakLiveTurnResponse {
  transcript: string
  assistantReply: string
  audioUrl: string
  mimeType: string
  userMessageId: string
  assistantMessageId: string
  thread: ApiConversationThread
  enrichmentPending: boolean
  scenarioProgress: { stage: string; notes?: string } | null
  signals: {
    ttsCached: boolean
    /** Server returned before TTS finished — client should call TTS async. */
    ttsDeferred?: boolean
    sttProvider: string
    detectedLanguage?: string
    sttDurationSeconds?: number
    ttsProvider?: string
  }
  perf: Record<string, number>
  liveTurnLatencyTrace?: LiveTurnLatencyTraceServer
  liveTurnDiagnostics?: Record<string, unknown>
  liveCoachTurnFeedback?: ApiLiveCoachTurnFeedback
  /** Backend adds this when `SPEAK_LIVE_DEBUG_TURNS=1` (dev-only). */
  speakLiveDebug?: Record<string, unknown>
}
