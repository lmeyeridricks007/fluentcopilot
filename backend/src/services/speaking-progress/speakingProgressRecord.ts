export type SpeakingProgressSource = 'pronunciation_assessment' | 'speaking_assessment' | 'speak_live_session'

export type LearnerLevel = 'A1' | 'A2' | 'B1' | 'unknown'

/** One compact row for trending (JSONL). */
export type SpeakingProgressRecordV1 = {
  schemaVersion: 1
  id: string
  userId: string
  createdAtUtc: string
  source: SpeakingProgressSource
  scenarioId: string | null
  scenarioTitle: string | null
  threadId: string | null
  level: LearnerLevel
  rawScores: {
    pronunciation: number
    fluency: number
    completeness: number
    overall: number
    prosody: number | null
    accuracy: number
  }
  derivedScores: {
    rhythm: number | null
    sentenceStress: number | null
    naturalness: number | null
    intonation: number | null
  }
  verdictLabels: {
    topLabel: string | null
    clarityLabel: string | null
    naturalnessLabel: string | null
  }
  /** Coach / heuristic retry focus for this clip. */
  retryTarget: string | null
  /** Normalized weak tokens (max 8). */
  weakWordsTop: string[]
  /** Phrase-level practice hints (target texts, max 5). */
  phraseSnippets: string[]
  /** From full speaking coach when present. */
  dutchSoundingLabel: string | null
}
