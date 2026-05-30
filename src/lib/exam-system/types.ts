/** FluentCopilot Exam System — shared domain types (profile-driven, level-aware). */

export type ExamLevel = 'A1' | 'A2' | 'B1'

export type ExamModalityKey = 'speaking' | 'listening' | 'reading' | 'writing' | 'knm'

/** High-level exam modes surfaced in product IA. */
export type ExamRunMode = 'simulation' | 'training'

/** How much scaffolding is allowed in training (simulation ignores this). */
export type ExamTrainingSupport = 'full_guidance' | 'light_guidance' | 'almost_exam'

/** How the training session task list was composed at setup. */
export type ExamTrainingEntryMode = 'adaptive' | 'by_task_type' | 'by_weakness' | 'section' | 'full_mix'

export type ExamScope = 'full' | 'section'

export type ReadinessBand = 'ready' | 'borderline' | 'not_ready'

export type ReadinessConfidence = 'high' | 'medium' | 'limited'

/** Aggregated readiness view derived from recent sessions (hub + post-simulation persist). */
export type ReadinessSnapshot = {
  band: ReadinessBand
  confidence: ReadinessConfidence
  score01: number
  blockers: string[]
  strongest: string | null
  /** Plain-language trace of how the score was built (no black box). */
  rationale?: string[]
  /** Dimensions repeatedly weak across recent evidence. */
  persistentWeaknesses?: string[]
  simulationEvidenceCount?: number
  trainingEvidenceCount?: number
}

/** Canonical task taxonomy — profiles pick subsets and counts. */
export type ExamTaskType =
  | 'practical_request'
  | 'short_response'
  | 'roleplay'
  | 'describe_situation'
  | 'explain_process'
  | 'give_opinion'
  | 'justify_reason'
  | 'follow_up_response'
  | 'compare_options'
  | 'storytelling'
  | 'sequencing'
  | 'read_aloud_exam'
  | 'listening_response_exam'
  /** Listen to a dialogue (audio), then pick the best answer — A2 speaking Part 2 style. */
  | 'listening_mcq_exam'
  | 'writing_task_exam'
  /** KNM-style multiple choice (single or multi correct; optional images). */
  | 'knowledge_mcq'

export type ExamScoringDimension =
  | 'task_completion'
  | 'understandability'
  | 'grammar_control'
  | 'natural_wording'
  | 'pronunciation_delivery'
  | 'structure'
  /** Task overlays (subset used per task type). */
  | 'directness'
  | 'politeness'
  | 'completion'
  | 'stance'
  | 'reason'
  | 'responsiveness'
  | 'continuation'
  | 'relevance'
  | 'sequence'
  | 'clarity'
  | 'tense_flow'
  | 'completeness'
  | 'listening_accuracy'

export type ExamTimerKind = 'prep' | 'answer' | 'section' | 'total_estimate'

export type ExamTimerRule = {
  kind: ExamTimerKind
  /** Seconds; 0 means disabled for that mode if `optionalInTraining` is true. */
  seconds: number
  /** When true, training may omit this timer unless "timed training" is selected. */
  optionalInTraining?: boolean
  /** Auto-advance when timer elapses (simulation default true for answer). */
  autoAdvance?: boolean
}

/** Prompt difficulty band — drives template choice and rubric expectations. */
export type ExamPromptComplexity = 'low' | 'medium' | 'high'

/** Rules consumed by task / prompt generators (deterministic or LLM-backed). */
export type ExamTaskGenerationRules = {
  minWordsHint?: number
  maxWordsHint?: number
  templateFamily?: string
  /** Follow-up turns expected in examiner behavior. */
  followUpDepth?: 0 | 1 | 2
  /** How much situational context is left implicit. */
  impliedContext?: 'low' | 'medium' | 'high'
}

export type ExamTaskBlueprint = {
  taskType: ExamTaskType
  count: number
  prepSeconds: number
  answerSeconds: number
  /** 1 = profile baseline; >1 stricter in simulation scoring curves. */
  difficultyWeight: number
  scoringDimensions: ExamScoringDimension[]
  /** NL prompt template keys — resolved in {@link generateExamTasks}. */
  promptKey: string
  /** Relative weight in aggregate scoring / reporting. */
  taskWeighting?: number
  promptComplexity?: ExamPromptComplexity
  generationRules?: ExamTaskGenerationRules
  training: {
    hintsAllowed: boolean
    examplesAllowed: boolean
    patternGuidance: boolean
    postAnswerCoaching: boolean
    maxRetriesPerTask: number
    /** Train pillar: allow looping similar prompts. */
    repeatedPracticeAllowed?: boolean
    /** Train pillar: allow engine to bias weak task types. */
    adaptiveWeaknessTargeting?: boolean
  }
  simulation: {
    hintsAllowed: boolean
    coachingDuringAnswer: boolean
    maxRetriesPerTask: number
  }
}

export type ExamSectionBlueprint = {
  id: string
  title: string
  description?: string
  tasks: ExamTaskBlueprint[]
  /** Optional cap on wall-clock for the whole section (soft in training). */
  sectionSeconds?: number
}

export type ExamScoringBlueprint = {
  /** Shared weights — normalized during scoring. */
  coreWeights: Partial<Record<ExamScoringDimension, number>>
  /** Multipliers applied in simulation (strict) vs training (formative). */
  strictnessSimulation: number
  leniencyTraining: number
  /** Per-task-type overlays (merged with core for that task). */
  overlaysByTask: Partial<
    Record<
      ExamTaskType,
      {
        weights: Partial<Record<ExamScoringDimension, number>>
      }
    >
  >
}

export type ExamReadinessThresholds = {
  /** Normalized 0–1 readiness score above = ready. */
  readyAbove: number
  borderlineAbove: number
}

export type ExamReportConfig = {
  simulation: {
    showReadinessEstimate: boolean
    showDimensionBreakdown: boolean
    showTaskTypeSummary: boolean
    showNextTraining: boolean
  }
  training: {
    showImprovements: boolean
    showBlockers: boolean
    showRetrySuggestions: boolean
    showReadinessDelta: boolean
  }
}

/** Catalog section metadata (stable ids for routing + UI). */
export type ExamSupportedSection = {
  id: string
  title: string
  description?: string
}

/** Timed, strict blueprint — no hints by default on tasks. */
export type ExamSimulationBlueprint = {
  schemaVersion: number
  sections: ExamSectionBlueprint[]
  totalEstimateSeconds?: number
}

/** Guided blueprint — hints, retries, coaching, adaptive targeting allowed by policy. */
export type ExamTrainingBlueprint = {
  schemaVersion: number
  sections: ExamSectionBlueprint[]
  defaultSupportMode?: ExamTrainingSupport
  repeatedPracticeAllowed?: boolean
  adaptiveWeaknessTargetingAllowed?: boolean
}

export type ExamProfile = {
  /** Stable id for sessions (e.g. `inburgering_speaking_A2`). */
  examId: string
  /** Product family key (e.g. `inburgering_speaking`). */
  examCode: string
  /** Level this profile row is authored for (A1 / A2 / B1). */
  level: ExamLevel
  version: number
  title: string
  description: string
  /** Default level for catalog display; usually matches `level`. */
  defaultLevel: ExamLevel
  supportedLevels: ExamLevel[]
  supportedModalities: ExamModalityKey[]
  /** Human-facing tags (e.g. inburgering, staatsexamen). */
  tags: string[]
  /** Section index for navigation and filters — must match section ids inside blueprints. */
  supportedSections: ExamSupportedSection[]
  /** Microcopy keys for UI (hero, CTAs, timer labels). */
  uiTextLabels: Record<string, string>
  /** Strict exam-style task graph. */
  simulationBlueprint: ExamSimulationBlueprint
  /** Guided / formative task graph (may differ in counts or support). */
  trainingBlueprint: ExamTrainingBlueprint
  /**
   * @deprecated Prefer {@link ExamProfile.simulationBlueprint}.sections — kept for older callers.
   * When set, should mirror simulation sections until all code paths use blueprints.
   */
  sections?: ExamSectionBlueprint[]
  scoring: ExamScoringBlueprint
  timers: {
    simulation: ExamTimerRule[]
    trainingDefaults: ExamTimerRule[]
  }
  ui: {
    /** Minimum answered tasks before XP may count as meaningful. */
    minTasksForMeaningfulXp: { simulation: { full: number; section: number }; training: number }
    passReadiness: ExamReadinessThresholds
  }
  report: ExamReportConfig
}

/** Runtime instance shown to the learner. */
export type ExamTaskInstance = {
  id: string
  taskType: ExamTaskType
  sectionId: string
  level: ExamLevel
  promptNl: string
  promptEn: string
  /** English gloss of the quoted source text (A2 reading MCQ). */
  readingPassageEn?: string
  prepSeconds: number
  answerSeconds: number
  trainingHintsNl?: string[]
  trainingExampleNl?: string
  scoringDimensions: ExamScoringDimension[]
  /** Spoken passage for {@link listening_response_exam} (TTS). Falls back to `promptNl` if omitted. */
  listeningScriptNl?: string
  /** When set, tasks with the same id share one audio clip (official A2 listening-style blocks). */
  listeningScenarioId?: string
  listeningScenarioTitleNl?: string
  /** Position within the exam’s scenario list (1-based). */
  listeningScenarioIndex1Based?: number
  listeningScenarioCount?: number
  /** Position within this clip’s questions (1-based). */
  listeningScenarioQuestionIndex?: number
  listeningScenarioQuestionCount?: number
  /**
   * When `taskType` is `listening_mcq_exam`, seed used for A/B → name personalization (stable across UI re-renders).
   * Older sessions omit this; the client falls back to `sessionId:taskId:script:prompt`.
   */
  listeningSpeakerNameSeed?: string
  /** A2 Schrijven formulier: invulvelden als bullets + optioneel kader in het antwoordtekstvak. */
  writingFillInBulletsNl?: string[]
  writingAnswerSkeletonNl?: string
  /** A2 Schrijven bank stratum — drives rubric (e.g. formulier vs mail). */
  writingExamStratum?: 'form_fill' | 'formal_email' | 'informal_social' | 'short_note'
  /** Present when `taskType` is `knowledge_mcq`. */
  mcq?: {
    /** Animated KNM situational illustration id (see `knmIllustrationRegistry`). */
    illustrationId?: string
    /** Optional illustration for the stem (URL). */
    questionImageUrl?: string
    options: { id: string; label: string; imageUrl?: string }[]
    /** One id = single choice; several = multi-select (submission must match this set exactly). */
    correctOptionIds: string[]
  }
}

/** Azure (or future) audio metrics attached to a spoken exam attempt — A2 speaking blends these into scores. */
export type ExamVoiceAssessmentSnapshot = {
  pronunciation01: number
  fluency01: number
  accuracy01: number
  completeness01: number
  prosody01: number | null
  overall01: number
  /** Combined clarity / intelligibility proxy from pronunciation + fluency + accuracy. */
  clarity01: number
  provider: 'azure' | 'off'
}

export type ExamTaskAttempt = {
  taskId: string
  taskType: ExamTaskType
  sectionId: string
  answerText: string
  submittedAt: string
  prepUsedSeconds?: number
  answerUsedSeconds?: number
  retriesUsed: number
  scores: Partial<Record<ExamScoringDimension, number>>
  /** 0–1 aggregate for this task. */
  composite: number
  mode: ExamRunMode
  /** Present when server received pronunciation assessment with the same clip (A2 speaking). */
  voice?: ExamVoiceAssessmentSnapshot
}

export type ExamSessionStatus = 'draft' | 'in_progress' | 'completed' | 'abandoned'

export type ExamXpMeta = {
  scope: ExamScope
  runMode: ExamRunMode
  trainingSupport?: ExamTrainingSupport
  /** Timed training / almost-exam flags influence XP band. */
  timedTraining?: boolean
  weaknessRepair?: boolean
  readinessLift?: boolean
  /** Training-only: how tasks were ordered/filtered at start. */
  trainingEntryMode?: ExamTrainingEntryMode
  /** When entry mode is `by_task_type`. */
  focusTaskType?: ExamTaskType
}

export type ExamSectionScore = {
  sectionId: string
  title?: string
  /** Mean composite of attempts in this section (0–1). */
  score01: number
  taskCount: number
}

/** Whether the submission substantively addresses what the exam item asked (LLM or heuristic). */
export type ExamLlmAnswerFit = 'yes' | 'mostly' | 'partial' | 'no'

/** Per-task “was the question answered?” evaluation (English learner copy). */
export type ExamLlmAnswerEvaluation = {
  taskId: string
  taskType: ExamTaskType
  fit: ExamLlmAnswerFit
  /** Model certainty in the fit judgment (0–1). */
  confidence01: number
  /** 1–2 sentences — what matched or missed the prompt. */
  feedbackEn: string
  /** Short bullets: missing pieces, if any. */
  gapsEn?: string[]
  evaluatedAt: string
  source: 'openai' | 'deterministic'
}

/** One token gloss stored on the session after report generation (LLM). */
export type ExamSampleAnswerWordGloss = {
  glossEn: string
  glossNl: string
}

/** One scored task in simulation order — score, prompt snippet, and concrete next steps. */
export type SimulationQuestionBreakdown = {
  index1Based: number
  taskId: string
  sectionId: string
  sectionTitle?: string
  taskType: ExamTaskType
  /** Truncated Dutch prompt for context. */
  promptSummaryNl: string
  /** 0–1 composite for this question (same as per-attempt composite). */
  score01: number
  /** Learner submission (writing/speaking text, or MCQ selection string). */
  userAnswerText: string
  /** Sample or ideal answer when available (Dutch for writing; may be a scaffold, see `modelAnswerIsScaffold`). */
  modelAnswerNl?: string
  /** True when `modelAnswerNl` is a generic template, not a curated bank example. */
  modelAnswerIsScaffold?: boolean
  /** True when `modelAnswerNl` was adapted from the learner’s submission (form-fill writing). */
  modelAnswerPersonalized?: boolean
  /** Rubric dimension scores for this attempt only (subset of task dimensions). */
  dimensionScores?: Partial<Record<ExamScoringDimension, number>>
  /** Lowest-scoring rubric dimensions on this task (for tips). */
  weakDimensions: ExamScoringDimension[]
  /** Short actionable lines (English; matches dimension labels in UI). */
  improvementTips: string[]
  /** Optional: LLM/heuristic check that the learner addressed the question (filled client-side or from session). */
  llmAnswerEvaluation?: ExamLlmAnswerEvaluation
}

export type SimulationExamReport = {
  kind: 'simulation'
  profileId: string
  level: ExamLevel
  scope: ExamScope
  readinessBand: ReadinessBand
  readinessConfidence: ReadinessConfidence
  /**
   * Exam-equivalent mean composite: sum of task composites divided by `totalTaskCount`
   * (unanswered tasks count as 0). This is the headline "what would I get on the real exam"
   * number — same basis as `readinessScore01` and `readinessBand`.
   * Legacy stored reports (built before exam-equivalent scoring) hold the answered-tasks
   * average here; the report UI reconstructs the exam-equivalent value on the fly when
   * `attemptedCount` is missing.
   */
  overallScore01: number
  readinessScore01: number
  /** Mean composite over tasks the learner actually answered (legacy meaning of overallScore01). */
  answeredScore01?: number
  /** Number of tasks the learner submitted an answer for. */
  attemptedCount?: number
  /** Total tasks in the simulation (denominator of `overallScore01`). */
  totalTaskCount?: number
  strongestDimension: ExamScoringDimension | null
  mainBlocker: ExamScoringDimension | null
  dimensionAverages: Partial<Record<ExamScoringDimension, number>>
  taskTypeAverages: Partial<Record<ExamTaskType, number>>
  sectionScores: ExamSectionScore[]
  /** Per-task scores and improvement hints (exam task order). Omitted in older stored reports. */
  questionBreakdown?: SimulationQuestionBreakdown[]
  /** Why readiness confidence is high / medium / limited. */
  readinessConfidenceNotes: string[]
  nextTrainingRecommendation: string
  generatedAt: string
}

export type TrainingExamReport = {
  kind: 'training'
  profileId: string
  level: ExamLevel
  trainingSupport: ExamTrainingSupport
  trainingEntryMode?: ExamTrainingEntryMode
  /** Formative quality (trend-aware mean, 0–1). */
  qualityScore01: number
  improvedDimensions: ExamScoringDimension[]
  blockingDimensions: ExamScoringDimension[]
  /** Structured “why marks were blocked” lines (not vague). */
  blockedMarksExplainers: string[]
  strongestDimension: ExamScoringDimension | null
  correctedExampleNl?: string
  retrySuggestions: string[]
  bestNextDrill: string
  /** Same as bestNextDrill for product copy — explicit “next action” field. */
  nextBestTrainingAction: string
  /** 0–1 heuristic: how much retries lifted scores; null if no retries. */
  retryLift01: number | null
  /** Evidence confidence for this training session’s scores. */
  sessionEvidenceConfidence: ReadinessConfidence
  sessionEvidenceNotes: string[]
  /** Human-readable readiness / practice volume guidance (not a stored delta). */
  readinessMovementLabel?: string
  readinessDelta01?: number
  generatedAt: string
}

export type ExamSessionRecord = {
  id: string
  userId: string
  profileId: string
  level: ExamLevel
  mode: ExamRunMode
  scope: ExamScope
  sectionId?: string
  trainingSupport?: ExamTrainingSupport
  status: ExamSessionStatus
  tasks: ExamTaskInstance[]
  attempts: ExamTaskAttempt[]
  /**
   * Per-task “was the question answered?” (LLM when `OPENAI_API_KEY` is set, else heuristic).
   * Cleared when the session is reprocessed so checks stay aligned with stored answers.
   */
  llmAnswerEvaluations?: Record<string, ExamLlmAnswerEvaluation>
  /**
   * LLM-generated Dutch + English glosses for sample-answer phrases, keyed by
   * `buildWordGlossCacheKey(token, phrase)` — populated when the simulation report is built.
   */
  sampleAnswerWordGlosses?: Record<string, ExamSampleAnswerWordGloss>
  report?: SimulationExamReport | TrainingExamReport
  /** Present after completing a simulation — hub readiness API can prefer this row. */
  readinessSnapshot?: ReadinessSnapshot
  xpMeta?: ExamXpMeta
  /** Persisted when progression awards XP on session complete (for history cards). */
  progressionXpAwarded?: number
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
}
