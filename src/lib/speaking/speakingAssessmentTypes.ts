/** Mirrors backend `SpeakingAssessmentViewModel` (FE-safe subset). */

export type SpeakingAssessmentProviderId = 'azure_speech' | 'off' | 'mock_orchestration'

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
  intonationGuidance: DerivedSignal | null
  naturalness: DerivedSignal
}

export type VerdictLabels = {
  topLabel: string
  clarityLabel: string
  naturalnessLabel: string
}

export type HesitationMoment = { afterWordIndex: number; pauseMs: number }

export type PhraseBoundaryCandidate = {
  afterWordIndex: number
  pauseMs: number
}

export type PaceProfile = 'tooSlow' | 'steady' | 'rushed' | 'uneven'

export type TimingAnalysis = {
  totalDurationMs: number
  speakingDurationMs: number
  silenceDurationMs: number | null
  pauseCount: number
  avgPauseMs: number
  longestPauseMs: number
  wordsSpokenCount: number
  estimatedWpm: number
  phraseBoundaryCandidates: PhraseBoundaryCandidate[]
  rushedEnding: boolean
  trailingCompression: boolean
  hesitationMoments: HesitationMoment[]
  paceProfile: PaceProfile
  paceNotes: string[]
  sentenceLevelNotes: string[]
}

export type WordAssessment = {
  text: string
  normalizedText: string
  accuracyScore: number
  errorType: string
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
  dutchSoundingLabel: string
  confidenceNarrative: string
}

export type ReferenceAudioBlock = {
  normalUrl: string | null
  slowUrl: string | null
  chunkedUrl: string | null
}

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

export type SpeakingAssessResponse = {
  assessmentId: string
  assessment: SpeakingAssessmentViewModel
}
