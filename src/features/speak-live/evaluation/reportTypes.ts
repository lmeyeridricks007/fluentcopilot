/**
 * Frontend types for the redesigned post-session evaluation report.
 *
 * Maps 1:1 to the backend LiveSessionEvaluation shape.
 * Every judgment carries evidence source + confidence level.
 */

export type EvidenceType = 'transcript' | 'audio' | 'scenario' | 'mixed'
export type ConfidenceLevel = 'high' | 'medium' | 'low'
export type WordStatus = 'strong' | 'okay' | 'weak' | 'unclear'

/** Mirrors backend `SpeakLiveCoachingFallbackCode` — shown when sentence coaching did not use the live LLM. */
export type SpeakLiveCoachingFallbackCode =
  | 'no_api_key'
  | 'mock_provider'
  | 'timeout_or_network'
  | 'parse_error'
  | 'validation_error'

export type SpeakLiveCoachingModelMeta =
  | { source: 'llm' }
  | { source: 'deterministic'; fallbackCode: SpeakLiveCoachingFallbackCode; userMessage: string }

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

export type GoalEvidence = {
  goalId: string
  goalLabel: string
  turnId: string | null
  turnIndex: number | null
  evidenceText: string | null
  status: 'completed' | 'missed' | 'partial'
  weight?: number
  tier?: 'core' | 'stretch'
  completionHint?: string
}

export type TaskOutcome = {
  goals: string[]
  completed: string[]
  missed: string[]
  goalEvidence: GoalEvidence[]
  goalChecklistPercent?: number
  weightedCompletion?: number
}

export type FocusArea = {
  label: string
  why: string
  exampleLine: string
  cta: 'practice_now' | 'retry_scenario' | 'save_phrase'
  sourceTurnId?: string
  learnerOriginalLine?: string
}

export type ScoredDimension = {
  id: string
  label: string
  score: number | null
  confidence: ConfidenceLevel
  evidenceType: EvidenceType
  verdict: string
  meaning: string
}

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
    alternativePhrasing?: RewriteOption | null
  }
  patternToReuse: string | null
  explanations: string[]
  evidenceLines: string[]
}

export type WordAssessmentResult = {
  word: string
  status: WordStatus
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

export type NaturalRewrite = {
  original: string
  improved: string
  whyMoreNatural: string
}

export type TurnDrill = {
  type: string
  title: string
  detail: string
  targetText: string | null
}

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
  uncertainHearing?: boolean
}

export type SentenceGroundedReview = {
  mainFix: string
  mainVoiceFix: string
  whatWorked: string[]
  whatToFix: string[]
  nativePhrase: string
  whyBetter: string
  pattern: string | null
}

export type TurnEvaluation = {
  turnId: string
  turnIndex: number
  learnerTranscript: string
  transcriptOriginal?: string
  transcriptNormalized: string
  originalAudioUrl: string | null
  transcriptConfidence: ConfidenceLevel | null
  scenarioGoalTags: string[]
  transcriptCoaching: TranscriptCoaching
  audioCoaching: AudioCoaching | null
  naturalRewrite: NaturalRewrite | null
  savedWordCandidates: string[]
  recommendedDrills: TurnDrill[]
  dimensions: ScoredDimension[]
  signalSources: {
    audioMetrics: string
    languageCoach: string
    scenarioContext: string
  }
  feedbackItems: Array<{
    type: string
    source: string
    evidence: { word?: string; phrase?: string; transcriptSnippet: string }
    issue: string
    fix: string
    explanation: string
  }>
  pronunciationIssues: Array<{
    word: string
    score: number
    issue: string
    fix: string
    referenceAudioUrl: string | null
    startMs?: number | null
    endMs?: number | null
  }>
  fluencyIssues: Array<{
    segment: string
    issue: string
    fix: string
    pauseMs: number | null
    afterWordIndex: number | null
  }>
  referenceSentence: string
  referenceSentenceReason: string
  referenceKind: 'reference_pronunciation' | 'more_natural_dutch'
  referenceAudioUrl: string | null
  learnerAudioUrl: string | null
  quickLabels: { pronunciation: string; rhythm: string; naturalness: string }
  audioFindings: string[]
  keyStrengths: string[]
  keyProblems: string[]
  focusWords: string[]
  dutchLikenessNarrative: string
  chunkingRhythmSuggestion: string
  voiceAnalysisUnavailableMessage: string | null
  improvementActions: Array<{
    type: string
    title: string
    detail: string
    targetPhrase?: string
    targetWord?: string
  }>
  audioScores: { pronunciation: number; fluency: number; rhythm: number; completeness: number; clarity: number }
  languageScores: { naturalness: number; contextualFit: number; registerFit: number; grammaticalStability: number }
  combinedScores: { overallTurnScore: number; clarityScore: number; dutchLikenessScore: number }
  scenarioGoalFit: { summary: string; alignmentScore: number; relevantGoals: string[] }
  languageEvaluation?: Record<string, unknown>
  premiumEvaluation?: Record<string, unknown>

  wrongWordDetections?: WrongWordDetection[]
  mainFixLine?: string
  compareListenFor?: string[]
  voiceDrillInstruction?: string
  sentenceGroundedReview?: SentenceGroundedReview
  /** Azure Speech structured artifact (user audio; transcript as reference). */
  azureSpeechEvaluation?: Record<string, unknown>
  audioDiagnostics?: {
    blobPath: string | null
    downloadOk: boolean
    bufSize: number
    assessmentOk: boolean
    assessmentCaveats: string[]
  }
}

export type RecommendedAction = {
  id: string
  type: string
  title: string
  reason: string
  priority: 'primary' | 'secondary'
  linkedTurnId?: string | null
  linkedPhrase?: string | null
  linkedScenarioId?: string | null
}

export type PhoneCallSentenceMoment = {
  turnIndex: number
  turnId: string
  assistantSaidNl: string
  learnerSaidNl: string
  expectedUnderstandingEn: string
  idealResponseHintNl: string | null
  didYouCatchThis: boolean
  compareNoteEn: string
}

export type PhoneCallPerformance = {
  modelVersion: 1
  weightsSummary: string
  compositePhoneScore: number | null
  sentenceMoments: PhoneCallSentenceMoment[]
}

export type SmallTalkPerformance = {
  modelVersion: 1
  weightsSummary: string
  compositeSmallTalkScore: number | null
}

export type MeetingNewPeoplePerformance = {
  modelVersion: 1
  weightsSummary: string
  compositeMeetingNewPeopleScore: number | null
}

export type PartySocialPerformance = {
  modelVersion: 1
  weightsSummary: string
  compositePartySocialScore: number | null
}

export type ExplainingSomethingPerformance = {
  modelVersion: 1
  weightsSummary: string
  compositeExplainingSomethingScore: number | null
}

export type StorytellingPerformance = {
  modelVersion: 1
  weightsSummary: string
  compositeStorytellingScore: number | null
}

export type OpinionsDiscussionsPerformance = {
  modelVersion: 1
  weightsSummary: string
  compositeOpinionsDiscussionsScore: number | null
}

/** Post-session debrief for `language_coach` (patterns-first). */
export type LanguageCoachDebriefReport = {
  /** Role mode from session start — optional for older evaluations. */
  conversationRole?: 'friend' | 'colleague' | 'dutch_local' | 'date' | 'coach'
  conversationSummary: string
  /** Session framing (English); use with {@link conversationSnapshotDutchLines} for readable layout. */
  conversationSnapshotIntro?: string
  /** Last few learner turns as separate lines (replaces slash-joined transcript in the UI). */
  conversationSnapshotDutchLines?: string[]
  focusAreaLabel: string
  strengths: string[]
  weakPatterns: string[]
  improvedPhrasingExamples: Array<{ learnerish: string; better: string }>
  followUpSuggestions: string[]
  savePracticePrompts: string[]
  /**
   * Each entry corresponds to one logged coach guidance moment. The UI ("How your coach
   * guided you" / `CoachGuidanceEvidence.tsx`) renders just the pedagogy (nudge type,
   * severity, recovery), the learner line, the isolated `coachCorrectionLine` when present,
   * and `humanizedSignals` — it does NOT render `coachResponseSnippet` directly to avoid
   * dumping the multi-sentence coach reply.
   *
   * `coachResponseSnippet`: raw (truncated) coach reply. Kept for backward compatibility
   *   with consumers like the skill-evidence extractor. UI must not render this verbatim.
   * `coachCorrectionLine`: producer-isolated correction (or null when the reply had no
   *   quoted correction span).
   * `humanizedSignals`: learner-facing labels derived from `detectedIssueTypes`. UI should
   *   prefer this over the raw debug taxonomy.
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
     * True when `suggestedNextFocus` was derived from real session signal (goal, weakness,
     * overused word, or named pattern). False when it's the generic "repeat this mode"
     * fallback. Optional for backward compatibility with persisted reports.
     */
    suggestedNextFocusIsSessionDerived?: boolean
    notableNudgeMoments: string[]
  }
  coachOneLiner?: string
  /**
   * Optional transcript-grounded example pair that supports `coachOneLiner`. Rendered as
   * a compact "Your line → Coach's line" card under the headline, never inlined into
   * the H1 prose. Null/absent when no high-confidence pair exists; UI hides the card.
   */
  coachOneLinerExample?: {
    learnerish: string
    better: string
  } | null
  whatImprovedDuringSession?: string
  howCoachGuidedYou?: string[]
  pronunciationFluencyNote?: string
  coachGuideWhileSpeaking?: boolean
  guideModeReflection?: {
    neededMoreSupportWith: string
    strongestRecoveryMoment: string
  }
  guidanceMomentsUseful?: string[]
  roleSessionEmphasis?: string
  coachLearningInsights?: {
    bullets: string[]
    guideActiveSupportNote?: string
  }
  roleSaveablePracticeItems?: Array<{
    id: string
    title: string
    body: string
    tagCategory: string
  }>
  /** Short tips from graded voice clips (e.g. word stress, pauses). */
  voiceImprovementFindings?: string[]
  /** What to try when conversation-from-text scores are softer. */
  conversationScoreHints?: string[]
  /** Mic: weak syllables with suggested Dutch (coach or phrasing match). */
  voiceWordCompareItems?: Array<{
    id: string
    weakWord: string
    yourLine: string
    modelDutch: string
    tip?: string
    /**
     * LLM-inferred intent when the spoken weak word looks like a mistranscription
     * (e.g. "gernen" → "gerend (ran)"). When present, the UI should show this as
     * the focus chip + practice target instead of echoing the misheard token back.
     */
    intent?: {
      dutchWord: string
      englishGloss: string
    }
  }>
  /**
   * "Plan your next session" — produced from THIS session's signals. Omitted when there's
   * no session signal; UI hides the section in that case. Mirrors backend
   * `liveVoiceEvaluationTypes.ts`.
   */
  nextPracticePlan?: {
    headline: string
    coachFocusBrief: {
      /**
       * English instruction forwarded as `lcPinnedFocus` deep-link param; backend seeds it
       * into `learnerPinnedLessonFocusEnglish` so the coach prompt anchors to it.
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
      vocabAnchors: string[]
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

export type SessionEvaluationReport = {
  sessionId: string
  scenarioId: string
  scenarioName: string
  scenarioTitle: string
  /** How sentence-level coaching was produced (live LLM vs built-in template). */
  coachingModel?: SpeakLiveCoachingModelMeta
  mode: string
  practicedLevel?: string
  observedLevel?: string
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
  coachHeadline?: string
  coachSummaryLine?: string
  focusArea?: FocusArea
  taskOutcome: TaskOutcome
  overall: {
    dimensions: ScoredDimension[]
    overallScore: number
    overallConfidence: ConfidenceLevel
  }
  turnEvaluations: TurnEvaluation[]
  recommendedActions: RecommendedAction[]
  sessionAudioMetricsAvailable: boolean
  overallScores: Record<string, unknown>
  overallSummary: Record<string, unknown>
  sessionInsights?: Record<string, unknown>
  scenarioOutcome: Record<string, unknown>
  generationDiagnostics?: {
    startedAt: string
    completedAt: string
    totalMs: number
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
      coachMergeMs: number
      referenceTtsMs: number
      feedbackBuildMs: number
      enrichTurnsMs: number
      premiumScoringMs: number
      sessionAssemblyMs: number
      recommendationVerifyMs?: number
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
      }>
    }
    qa?: {
      totalMs: number
      flaggedIssueCount: number
      unresolvedIssueCount: number
      fixedIssueCount: number
      shouldRerun: boolean
      qaAttemptIndex: number
    }
    /** Parallel lane diagnostics (Speak Live scenario reports when `SPEAK_LIVE_PARALLEL_SCENARIO_REPORT=1`). */
    parallelOrchestrationV1?: Record<string, unknown>
  }
  reportQa?: {
    version: number
    status: 'passed' | 'fixed' | 'failed'
    checkedAt: string
    issues: string[]
    fixesApplied: string[]
    rerunCount: number
  }
  phoneCallPerformance?: PhoneCallPerformance | null
  smallTalkPerformance?: SmallTalkPerformance | null
  meetingNewPeoplePerformance?: MeetingNewPeoplePerformance | null
  partySocialPerformance?: PartySocialPerformance | null
  explainingSomethingPerformance?: ExplainingSomethingPerformance | null
  storytellingPerformance?: StorytellingPerformance | null
  opinionsDiscussionsPerformance?: OpinionsDiscussionsPerformance | null
  /** Present when the session was Language Coach free-form mode. */
  languageCoachDebrief?: LanguageCoachDebriefReport | null
  /** FluentCopilot merged transcript + Azure Speech + scenario report (v1). */
  mergedSpeakingReportV1?: Record<string, unknown>
  generatedAt: string
  status: string
}

/** Parse the raw API evaluation payload into typed report. */
export function parseEvaluationReport(raw: Record<string, unknown>): SessionEvaluationReport {
  const report = raw as unknown as SessionEvaluationReport
  const weightedCompletion = report.taskOutcome?.weightedCompletion
  const goalChecklistPercent = report.taskOutcome?.goalChecklistPercent
  if (report.taskOutcome && (typeof weightedCompletion === 'number' || typeof goalChecklistPercent === 'number')) {
    report.taskOutcome = {
      ...report.taskOutcome,
      ...(typeof weightedCompletion === 'number'
        ? { weightedCompletion: Math.max(0, Math.min(100, Math.round(weightedCompletion))) }
        : {}),
      ...(typeof goalChecklistPercent === 'number'
        ? { goalChecklistPercent: Math.max(0, Math.min(100, Math.round(goalChecklistPercent))) }
        : {}),
    }
  }
  return report
}

/** Evidence status for display */
export type EvidenceStatusRow = {
  label: string
  status: 'available' | 'partial' | 'unavailable'
}

export function buildEvidenceStatusRows(ev: EvidenceSummary): EvidenceStatusRow[] {
  return [
    {
      label: 'What you said (text)',
      status: ev.transcriptAvailable ? 'available' : 'unavailable',
    },
    {
      label: 'How you sounded (voice)',
      status: ev.azurePronunciationTurnCount === ev.totalLearnerTurnCount && ev.azurePronunciationTurnCount > 0
        ? 'available'
        : ev.azurePronunciationTurnCount > 0
          ? 'partial'
          : 'unavailable',
    },
    {
      label: 'More natural Dutch versions',
      status: ev.llmLanguageTurnCount > 0 ? 'available' : 'unavailable',
    },
    {
      label: 'Did you complete the task?',
      status: ev.transcriptAvailable ? 'available' : 'unavailable',
    },
  ]
}
