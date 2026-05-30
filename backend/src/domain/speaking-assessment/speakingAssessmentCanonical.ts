/** Canonical speaking assessment — all layers converge here (persist / API / future UI). */

export type SpeakingAssessmentProviderId = 'azure_speech' | 'off' | 'mock_orchestration'

export type WordErrorType = 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | string

export type RawScores = {
  pronunciation: number
  fluency: number
  completeness: number
  overall: number
  prosody: number | null
  accuracy: number
}

/**
 * Bounded numeric hint + honest label. Scores are heuristics, not scientific measures.
 * `score` may be null when timing is too sparse to support a numeric claim.
 */
export type DerivedSignal = {
  score: number | null
  label: string
  explanation?: string
}

export type DerivedScores = {
  rhythm: DerivedSignal
  sentenceStress: DerivedSignal
  /** Null object when intonation cannot be grounded (no prosody + weak timing). */
  intonationGuidance: DerivedSignal | null
  naturalness: DerivedSignal
}

export type VerdictLabels = {
  topLabel: string
  clarityLabel: string
  naturalnessLabel: string
}

export type HesitationMoment = {
  afterWordIndex: number
  pauseMs: number
}

export type PhraseBoundaryCandidate = {
  afterWordIndex: number
  pauseMs: number
}

export type PaceProfile = 'tooSlow' | 'steady' | 'rushed' | 'uneven'

export type TimingAnalysis = {
  totalDurationMs: number
  speakingDurationMs: number
  /** Clip minus active speech when clip duration known; else null. */
  silenceDurationMs: number | null
  pauseCount: number
  avgPauseMs: number
  longestPauseMs: number
  wordsSpokenCount: number
  estimatedWpm: number
  phraseBoundaryCandidates: PhraseBoundaryCandidate[]
  rushedEnding: boolean
  /** Last words unusually compressed vs median word duration. */
  trailingCompression: boolean
  hesitationMoments: HesitationMoment[]
  paceProfile: PaceProfile
  /** Short deterministic UX strings (legacy aggregate). */
  paceNotes: string[]
  /** Human-readable timing observations (non-judgmental where possible). */
  sentenceLevelNotes: string[]
}

export type WordAssessment = {
  text: string
  normalizedText: string
  accuracyScore: number
  errorType: WordErrorType
  startMs: number | null
  endMs: number | null
  isStrong: boolean
  isWeak: boolean
  coachingNote: string
}

export type PhraseTarget = {
  text: string
  reason: string
  priority: 'low' | 'medium' | 'high'
}

export type CoachingBlock = {
  shortSummary: string
  whatWentWell: string[]
  improveNext: string[]
  retryTarget: string | null
  retryWhy: string | null
  levelAlignedNotes: string[]
  /** Honest learner-Dutch label — never native-like. */
  dutchSoundingLabel: string
  /** How much to trust this coaching vs raw scores (limits, caveats, data sparsity). */
  confidenceNarrative: string
}

export type ReferenceAudioBlock = {
  normalUrl: string | null
  slowUrl: string | null
  chunkedUrl: string | null
}

export type SpeakingAssessmentResult = {
  assessmentId: string
  provider: SpeakingAssessmentProviderId
  locale: string
  scenarioId: string
  promptId: string
  expectedText: string
  transcript: string
  transcriptNormalized: string
  audioBlobUrl: string | null
  userClipDurationMs: number | null
  summary: string
  rawScores: RawScores
  derivedScores: DerivedScores
  verdicts: VerdictLabels
  timingAnalysis: TimingAnalysis
  wordAssessments: WordAssessment[]
  phraseTargets: PhraseTarget[]
  coaching: CoachingBlock
  referenceAudio: ReferenceAudioBlock
  rawProviderPayload: unknown
  generatedCoachingPayload: unknown
  createdAtUtc: string
}

/** FE-safe DTO (no raw blobs / truncated lists). */
export type SpeakingAssessmentViewModel = {
  assessmentId: string
  provider: SpeakingAssessmentProviderId
  locale: string
  scenarioId: string
  promptId: string
  expectedText: string
  transcript: string
  transcriptNormalized: string
  audioBlobUrl: string | null
  userClipDurationMs: number | null
  summary: string
  rawScores: RawScores
  derivedScores: DerivedScores
  verdicts: VerdictLabels
  timingAnalysis: TimingAnalysis
  wordAssessments: WordAssessment[]
  phraseTargets: PhraseTarget[]
  coaching: CoachingBlock
  referenceAudio: ReferenceAudioBlock
  caveats: string[]
  createdAtUtc: string
}
