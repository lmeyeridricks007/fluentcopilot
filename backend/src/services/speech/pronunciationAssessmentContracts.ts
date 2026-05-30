import { z } from 'zod'

/** Server-side: how raw audio is compared for Azure pronunciation assessment. */
export type PronunciationAssessmentMode = 'reference' | 'open_response'

/** `off` | `azure` from `PRONUNCIATION_MODE` (`mock` is rejected — treated as off). */
export type PronunciationRuntimeMode = 'off' | 'azure'

/** Optional client metadata for speaking progression (JSONL history). */
export const PronunciationProgressMetaSchema = z
  .object({
    scenarioId: z.string().max(200).nullable().optional(),
    scenarioTitle: z.string().max(400).nullable().optional(),
    threadId: z.string().max(120).nullable().optional(),
    level: z.enum(['A1', 'A2', 'B1']).nullable().optional(),
  })
  .strict()

export type PronunciationProgressMeta = z.infer<typeof PronunciationProgressMetaSchema>

export const PronunciationAssessmentHttpBodySchema = z
  .object({
    audioBase64: z.string().min(1).max(6_000_000),
    mimeType: z.string().min(6).max(120),
    transcript: z.string().max(16_000).optional().nullable(),
    expectedText: z.string().max(16_000).optional().nullable(),
    locale: z.string().max(32).optional(),
    scenarioHint: z.string().max(500).optional().nullable(),
    assessmentMode: z.enum(['reference', 'open_response']),
    progressMeta: PronunciationProgressMetaSchema.optional().nullable(),
  })
  .strict()

export type PronunciationAssessmentHttpBody = z.infer<typeof PronunciationAssessmentHttpBodySchema>

export type NormalizedWordAssessment = {
  word: string
  /** Provider scale 0–100 */
  accuracyScore: number
  errorType?: string
  /** Word start in audio (ms), when Azure detailed JSON exposes offsets. */
  startMs?: number
  /** Word end in audio (ms). */
  endMs?: number
}

/**
 * App-normalized pronunciation result (Azure hundred-mark style scores).
 * UI maps to friendly bands; do not treat `open_response` + `spoken_text_proxy` like authoritative “target phrase” scoring.
 */
export type NormalizedPronunciationAssessment = {
  pronunciationScore: number
  accuracyScore: number
  fluencyScore: number
  completenessScore: number
  /** null when provider did not return prosody */
  prosodyScore: number | null
  overallScore: number
  recognizedText: string
  referenceTextUsed: string
  assessmentMode: PronunciationAssessmentMode
  referenceAlignment: 'target_phrase' | 'spoken_text_proxy'
  words: NormalizedWordAssessment[]
  actionNotes: string[]
  caveatNotes: string[]
}

export type PronunciationRetryPhraseTarget = {
  text: string
  reason: string
  priority: 'low' | 'medium' | 'high'
}

export type PronunciationRetryHints = {
  phraseTargets: PronunciationRetryPhraseTarget[]
  coaching: {
    retryTarget: string | null
    retryWhy: string | null
  }
}

export type PronunciationAssessmentApiResponse = {
  assessment: NormalizedPronunciationAssessment | null
  provider: {
    id: 'azure' | 'off'
    mode: PronunciationRuntimeMode
    locale?: string
  }
  summaryFeedback: string | null
  recommendedNextStep: string | null
  caveats: string[]
  /** Deterministic targets derived from word scores (subset / library UX). */
  retryHints?: PronunciationRetryHints | null
  /** Full Azure Speech JSON result when available (for speaking-assessment orchestration / debug). */
  providerRawResult?: unknown
}

export interface PronunciationAssessmentAssessInput {
  audio: Buffer
  mimeType: string
  transcript?: string | null
  expectedText?: string | null
  locale: string
  scenarioHint?: string | null
  assessmentMode: PronunciationAssessmentMode
}

export interface IPronunciationAssessmentService {
  /**
   * Evaluate learner audio. Implementations must not throw for “soft off” — caller may use gateway.
   * @param audio Raw encoded bytes (e.g. WebM), not PCM16 unless mime indicates wav.
   */
  assessAsync(input: PronunciationAssessmentAssessInput): Promise<PronunciationAssessmentApiResponse>
}
