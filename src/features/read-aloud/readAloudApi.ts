'use client'

import { getApiBaseUrl } from '@/lib/api/apiConfig'
import type { ReportLearningMemoryRibbon } from '@/lib/api/apiTypes'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from '@/lib/api/apiErrors'
import { getApiUserId } from '@/lib/api/apiUser'

function buildUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/api${p}`
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to use Read Aloud.')
  }
  const res = await fetch(buildUrl(path), {
    method: 'POST',
    signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-user-id': getApiUserId(),
    },
    body: JSON.stringify(body),
  })
  const rawText = await res.text()
  let json: unknown = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    throw parseApiErrorBody(res.status, json, rawText, { correlationId: correlationIdFromResponse(res) })
  }
  return json as T
}

/** User-facing copy when `/read-aloud/evaluate` fails (see backend `readAloudEvaluationService`). */
export function readAloudEvaluateErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    if (err.code === 'DEPENDENCY_UNAVAILABLE') {
      return (
        'Read-aloud scoring is not available right now because speech services are not fully set up on the server ' +
        '(OpenAI for timed transcription plus Azure Speech pronunciation, with PRONUNCIATION_MODE=azure). ' +
        'If you run the backend yourself, check OPENAI_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION, and PRONUNCIATION_MODE in your environment; otherwise try again later.'
      )
    }
    if (err.code === 'EVALUATION_UNAVAILABLE') {
      return (
        'We could not score this recording with the current pipeline. Try a quieter room, hold the mic a little closer, ' +
        'and record again. If you still have this report open with saved audio, use Re-run scoring on this recording on the report screen.'
      )
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Could not score your read-aloud.'
}

export type ReadAloudGenre =
  | 'everyday_conversation'
  | 'story'
  | 'news_style'
  | 'travel'
  | 'work'
  | 'practical_instructions'
  | 'social_chat'
  | 'description'
  | 'opinion'
  | 'custom_topic'

/** Aligned with backend `ReadAloudPersonalizationProfileSchema`. */
export const READ_ALOUD_PERSONALIZATION_PROFILE_IDS = [
  'pronunciation_focus',
  'weak_sounds_focus',
  'weak_vocabulary_focus',
  'grammar_focus',
  'fluency_focus',
  'mixed_review',
  'everyday_dutch',
  'scenario_linked',
  'storytelling_focus',
  'confidence_build',
] as const

export type ReadAloudPassagePersonalizationProfileId = (typeof READ_ALOUD_PERSONALIZATION_PROFILE_IDS)[number]

export function isReadAloudPersonalizationProfileId(id: string): id is ReadAloudPassagePersonalizationProfileId {
  return (READ_ALOUD_PERSONALIZATION_PROFILE_IDS as readonly string[]).includes(id)
}

export async function readAloudGeneratePassage(input: {
  level: 'A1' | 'A2' | 'B1' | 'B2'
  genre: ReadAloudGenre
  topic?: string | null
  length: 'short' | 'medium' | 'long'
  /** When set, forces this generation profile (otherwise server infers from profile). */
  personalizationProfile?: ReadAloudPassagePersonalizationProfileId | null
  /** Default true — sends profile hints when the user is signed in and history exists. */
  usePersonalization?: boolean
}): Promise<{
  title: string
  passage: string
  personalization?: { appliedProfile: string; chips: string[] } | null
}> {
  return postJson('/read-aloud/generate-passage', input)
}

export type ReadAloudOcrResponse = {
  text: string
  /** Mean word confidence from Azure when available, 0–1. */
  confidence: number | null
  partial: boolean
  detail: string | null
  warnings: string[]
}

export async function readAloudOcr(input: {
  imageBase64: string
  mimeType: string
}): Promise<ReadAloudOcrResponse> {
  return postJson('/read-aloud/ocr', input)
}

/** Mirrors backend `ReadAloudEvaluateResult` (subset typed for UI). */
export type ReadAloudEvaluateResponse = {
  reportKind: 'read_aloud'
  targetText: string
  recognizedText: string
  pronunciationAssessment: {
    pronunciationScore: number
    fluencyScore: number
    completenessScore: number
    prosodyScore: number | null
    overallScore: number
    words: Array<{ word: string; accuracyScore: number; errorType?: string }>
  } | null
  pronunciationApi: {
    summaryFeedback: string | null
    recommendedNextStep: string | null
    caveats: string[]
  }
  dimensions: Record<
    string,
    {
      supported: boolean
      score: number | null
      score01: number | null
      label: string
      detail: string | null
      evidence: string
    }
  >
  sentences: Array<{
    index: number
    targetText: string
    spokenText: string
    alignmentConfidence?: number
    alignmentStatus?: 'aligned' | 'approximate' | 'uncertain' | 'missing'
    alignmentNotes?: string[]
    paceNote: string | null
    mismatches: Array<{ kind: 'skip' | 'substitute' | 'extra' | 'repeat'; target?: string; spoken?: string }>
    mainFix: string | null
    matchedWell: string[]
    pronunciationNotes: string[]
    wordEvidence: Array<{ word: string; accuracyScore: number; errorType?: string }>
    /** Server marks weak transcript-to-line alignment — prefer pronunciation + recording compare. */
    alignmentUncertain?: boolean
    /** Approximate start/end in the learner audio for this sentence (pronunciation word timings). */
    clipStartSec?: number
    clipEndSec?: number
  }>
  weakSegments?: Array<{
    id: string
    chunkIds: string[]
    startSec: number
    endSec: number
    transcript: string
    issue: string
    whyItStoodOut?: string | null
    likelyIntendedPhrase: string
    suggestion: string
    pauseGuidance?: string | null
    naturalnessNote?: string | null
    referenceAudioText: string
    confidence: number
    wordHints: string[]
    pronunciationTargets?: Array<{
      word: string
      accuracyScore: number
      tip: string
      referenceAudioText?: string
      clipStartSec?: number | null
      clipEndSec?: number | null
    }>
  }>
  weakWords: string[]
  coaching: {
    summary: string
    focusArea: string
    nextStepDrills: string[]
    feedbackLines: string[]
  }
  nextActions: Array<{
    id: string
    label: string
    sentenceIndex?: number
  }>
  /** Parts of the recording not cleanly assigned to a printed sentence. */
  deadZones?: Array<{
    startSec: number
    endSec: number
    kind: 'edge_silence' | 'transition_pause' | 'long_unmatched'
    impactWeight: number
    label: string
  }>
  audioCoverage?: {
    totalSec: number
    alignedSec: number
    deadSec: number
    deadImpactSec: number
    pauseLikeSec: number
    longUnmatchedSec: number
  }
  evaluationMode?: 'legacy_full_clip' | 'segmented_timed_llm' | 'audio_first_chunks'
  fullAudioTranscript?: string
  audioChunks?: Array<{
    chunkId: string
    startSec: number
    endSec: number
    durationSec: number
    transcript: string
    pronunciationScore: number | null
    fluencyScore: number | null
    completenessScore: number | null
    prosodyScore: number | null
    confidence: number
  }>
  audioChunkDebug?: {
    chunkCount: number
    scoreableChunkCount: number
    weakChunkCount: number
    llmUsed: boolean
    llmConfidence01: number
    topFailureReason: string | null
  }
  passageWindow?: {
    startSec: number
    endSec: number
    durationSec: number
    startWordIndex: number
    endWordIndex: number
    source: 'llm_full_passage' | 'full_passage_match' | 'prefix_fallback' | 'main_span_llm' | 'main_span_heuristic'
  }
  timedWordCount?: number
  sentenceAlignments?: Array<{
    sentenceIndex: number
    targetText: string
    startWordIndex: number | null
    endWordIndex: number | null
    spokenWordsText: string
    clipStartSec: number | null
    clipEndSec: number | null
    alignmentConfidence: number
    alignmentStatus: 'aligned' | 'approximate' | 'uncertain' | 'missing'
    notes?: string[]
    matchSource: 'llm' | 'heuristic' | 'llm_repaired'
  }>
  alignmentSummary?: {
    alignedSentenceCount: number
    approximateSentenceCount: number
    uncertainSentenceCount: number
    missingSentenceCount: number
    usableSentenceCount: number
    totalSentenceCount: number
    coverage01: number
    overallConfidence01: number
    weakOverall: boolean
    reasons: string[]
    matchedTranscriptText: string
    usedLlm: boolean
    usedHeuristicFallback: boolean
    llmStructuredOutput: boolean
    interpolatedSentenceCount: number
    sourceCounts: {
      llm: number
      heuristic: number
      llmRepaired: number
    }
  }
  alignmentDebug?: {
    mainSpan: {
      status: 'strong' | 'approximate' | 'weak' | 'missing'
      confidence: number
      source: 'llm' | 'heuristic'
      startSec: number | null
      endSec: number | null
      notes: string[]
      candidateCount: number
      topCandidates: Array<{
        startSec: number
        endSec: number
        confidence: number
        notes: string[]
      }>
      llmStructuredOutput: boolean
    }
    alignment: {
      overallConfidence01: number
      strongCount: number
      approximateCount: number
      uncertainCount: number
      missingCount: number
      usedLlm: boolean
      llmStructuredOutput: boolean
      usedHeuristicFallback: boolean
      interpolatedSentenceCount: number
      sourceCounts: {
        llm: number
        heuristic: number
        llmRepaired: number
      }
      topReason: string | null
    }
    fallback: {
      mainSpanHeuristicUsed: boolean
      sentenceHeuristicUsed: boolean
      sentenceInterpolationUsed: boolean
    }
    azureEvidence: {
      scoredSentenceCount: number
      scoreableSentenceCount: number
      sentenceEvidenceCount: number
      totalSentenceCount: number
    }
  }
  fairness?: {
    mode: 'strong' | 'limited' | 'failure'
    canScoreFairly: boolean
    message: string | null
    reasons: string[]
  }
  learningMemoryRibbon?: ReportLearningMemoryRibbon | null
}

export async function readAloudEvaluate(input: {
  targetText: string
  audioBase64: string
  mimeType: string
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
  /** Passed through for smart next-step actions on the report. */
  genre?: string | null
}): Promise<ReadAloudEvaluateResponse> {
  return postJson('/read-aloud/evaluate', input)
}

