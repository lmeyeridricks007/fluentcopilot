/** Response from `POST /api/speech/pronunciation-assessment` (Azure or off). */

import type { PhraseTarget } from '@/lib/speaking/speakingAssessmentTypes'

export type PronunciationAssessmentMode = 'reference' | 'open_response'

export type ReferenceAlignment = 'target_phrase' | 'spoken_text_proxy'

export type NormalizedWordAssessment = {
  word: string
  accuracyScore: number
  errorType?: string
  startMs?: number
  endMs?: number
}

export type NormalizedAudioPronunciationAssessment = {
  pronunciationScore: number
  accuracyScore: number
  fluencyScore: number
  completenessScore: number
  prosodyScore: number | null
  overallScore: number
  recognizedText: string
  referenceTextUsed: string
  assessmentMode: PronunciationAssessmentMode
  referenceAlignment: ReferenceAlignment
  words: NormalizedWordAssessment[]
  actionNotes: string[]
  caveatNotes: string[]
}

/** Mirrors backend `PronunciationRetryHints` — phrase/word targets + coaching retry line. */
export type PronunciationRetryHints = {
  phraseTargets: PhraseTarget[]
  coaching: {
    retryTarget: string | null
    retryWhy: string | null
  }
}

export type PronunciationAssessmentApiResponse = {
  assessment: NormalizedAudioPronunciationAssessment | null
  provider: {
    id: 'azure' | 'off'
    mode: string
    locale?: string
  }
  summaryFeedback: string | null
  recommendedNextStep: string | null
  caveats: string[]
  /** Subset / library / primary-retry UX (server-derived from word scores). */
  retryHints?: PronunciationRetryHints | null
  /** Optional Azure Speech JSON (new assessments stack). */
  providerRawResult?: unknown
}
