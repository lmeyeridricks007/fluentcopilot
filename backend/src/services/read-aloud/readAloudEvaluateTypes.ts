import type { ReportLearningMemoryRibbon } from '../../domain/learningMemory/learningMemoryRecommendationService'
import type { NormalizedPronunciationAssessment } from '../speech/pronunciationAssessmentContracts'
import type { ReadAloudDimensionsMap } from './readAloudDimensions'
import type { ReadAloudDeadZone } from './readAloudDeadZones'
import type {
  ReadAloudSentenceAlignment,
  ReadAloudSentenceAlignmentStatus,
  ReadAloudSentenceAlignmentSummary,
} from './readAloudSentenceAlignmentService'
import type { ReadAloudNextAction, ReadAloudSentenceReviewV2 } from './readAloudSentenceReport'

export type ReadAloudSentenceAlignmentRow = {
  sentenceIndex: number
  targetText: string
  /** Inclusive indices into the ordered ASR `words` list (0-based global indices). */
  startWordIndex: number | null
  endWordIndex: number | null
  /** Approximate spoken text aligned to that sentence. */
  spokenWordsText: string
  clipStartSec: number | null
  clipEndSec: number | null
  alignmentConfidence: number
  alignmentStatus: ReadAloudSentenceAlignmentStatus
  notes?: string[]
  matchSource: ReadAloudSentenceAlignment['source']
}

export type ReadAloudEvaluateResult = {
  reportKind: 'read_aloud'
  targetText: string
  recognizedText: string
  pronunciationAssessment: NormalizedPronunciationAssessment | null
  pronunciationApi: {
    summaryFeedback: string | null
    recommendedNextStep: string | null
    caveats: string[]
  }
  dimensions: ReadAloudDimensionsMap
  sentences: ReadAloudSentenceReviewV2[]
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
  nextActions: ReadAloudNextAction[]
  deadZones?: ReadAloudDeadZone[]
  audioCoverage?: {
    totalSec: number
    alignedSec: number
    deadSec: number
    deadImpactSec: number
    pauseLikeSec: number
    longUnmatchedSec: number
  }
  evaluationMode?: 'legacy_full_clip' | 'segmented_timed_llm' | 'audio_first_chunks'
  /** Raw full-clip text from the initial OpenAI Whisper pass, before sentence-alignment trimming. */
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
  /** How each printed sentence was tied to the timed ASR words (for transparency / debugging). */
  sentenceAlignments?: ReadAloudSentenceAlignmentRow[]
  alignmentSummary?: ReadAloudSentenceAlignmentSummary
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
  /** Cross-session continuity — same shape as Speak Live evaluation payload. */
  learningMemoryRibbon?: ReportLearningMemoryRibbon | null
}
