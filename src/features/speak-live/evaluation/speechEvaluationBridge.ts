/**
 * Bridge between backend speech evaluation data and frontend UI components.
 *
 * Rules:
 * - Word chips ONLY from real Azure pronunciationIssues (never fabricated)
 * - Phrase groups ONLY from real fluencyIssues or backend-provided phrase boundaries
 * - Transcript-based coaching (wording, grammar) shown separately — never as pronunciation UI
 * - Reference audio URL wired from turn-level referenceAudioUrl (never null-coerced)
 * - No fake fallback data — if evidence is missing, the section is hidden
 */

import type { WordAssessment, PhraseGroup } from './WordByWordBreakdown'

// ─── Backend shape mirrors (API JSON → frontend) ────────────────────────

export type BackendPronunciationIssue = {
  word: string
  score: number
  issue: string
  fix: string
  referenceAudioUrl: string | null
  startMs?: number | null
  endMs?: number | null
}

export type BackendFluencyIssue = {
  segment: string
  issue: string
  fix: string
  pauseMs: number | null
  afterWordIndex: number | null
}

export type BackendDimensionFeedback = {
  issue: string
  fix: string
  whyItMatters: string
  word?: string
  phrase?: string
  transcriptSnippet?: string
  timestampMs?: number | null
}

export type BackendScoreDimension = {
  id: string
  score: number | null
  band: { id: string; label: string; shortLabel: string } | null
  reliability: { level: string; reason: string }
  source: string
  evidenceSummary: string
  feedbackItems: BackendDimensionFeedback[]
}

export type BackendPremiumTurnEvaluation = {
  turnId: string
  transcript: string
  audioUrl: string | null
  dimensions: BackendScoreDimension[]
  composite: { overall: number; band: { label: string } }
  reliability: { level: string; reason: string }
  headlineSummary: string
  evidenceItems: BackendDimensionFeedback[]
  recommendedDrills: Array<{
    dimension: string
    type: string
    title: string
    detail: string
    targetText?: string
    referenceAudioUrl?: string | null
    priority: string
  }>
}

// ─── Signal presence detection ──────────────────────────────────────────

export type TurnSignalProfile = {
  hasAudio: boolean
  hasAzureWordScores: boolean
  hasFluencyTimingData: boolean
  hasTranscriptCoaching: boolean
  hasScenarioFit: boolean
  alignmentQuality: 'full' | 'partial' | 'none'
}

export function detectTurnSignals(input: {
  audioMetricsSource: string
  pronunciationIssues: BackendPronunciationIssue[]
  fluencyIssues: BackendFluencyIssue[]
  premiumEvaluation: BackendPremiumTurnEvaluation | null
}): TurnSignalProfile {
  const hasAudio = input.audioMetricsSource === 'azure_audio'
  const hasAzureWordScores = hasAudio && input.pronunciationIssues.length > 0
  const hasFluencyTimingData = hasAudio && input.fluencyIssues.length > 0

  const dims = input.premiumEvaluation?.dimensions ?? []
  const wordingDim = dims.find((d) => d.id === 'wording')
  const grammarDim = dims.find((d) => d.id === 'grammar')
  const scenarioDim = dims.find((d) => d.id === 'scenarioFit')

  const hasTranscriptCoaching =
    (wordingDim != null && wordingDim.score != null) ||
    (grammarDim != null && grammarDim.score != null)
  const hasScenarioFit = scenarioDim != null && scenarioDim.score != null

  let alignmentQuality: 'full' | 'partial' | 'none' = 'none'
  if (hasAzureWordScores) {
    alignmentQuality = 'full'
  } else if (hasAudio) {
    alignmentQuality = 'partial'
  }

  return {
    hasAudio,
    hasAzureWordScores,
    hasFluencyTimingData,
    hasTranscriptCoaching,
    hasScenarioFit,
    alignmentQuality,
  }
}

// ─── Word assessment mapping (Azure-backed only) ────────────────────────

export function mapWordAssessments(
  pronunciationIssues: BackendPronunciationIssue[],
  signals: TurnSignalProfile,
): WordAssessment[] {
  if (!signals.hasAudio || !signals.hasAzureWordScores) return []

  return pronunciationIssues.map((pi) => ({
    word: pi.word,
    score: pi.score,
    issue: pi.issue || undefined,
    fix: pi.fix || undefined,
    startMs: pi.startMs ?? null,
    endMs: pi.endMs ?? null,
  }))
}

// ─── Phrase group mapping (fluency-backed only) ─────────────────────────

export function mapPhraseGroups(
  fluencyIssues: BackendFluencyIssue[],
  wordAssessments: WordAssessment[],
  signals: TurnSignalProfile,
): PhraseGroup[] {
  if (!signals.hasAudio) return []
  if (wordAssessments.length === 0) return []

  if (fluencyIssues.length === 0) {
    return [{
      words: wordAssessments.map((w) => w.word),
      startIndex: 0,
      endIndex: wordAssessments.length - 1,
    }]
  }

  const groups: PhraseGroup[] = []
  let start = 0

  for (let i = 0; i < wordAssessments.length; i++) {
    const fi = fluencyIssues.find((f) => f.afterWordIndex === i)
    if (fi || i === wordAssessments.length - 1) {
      const end = i
      groups.push({
        words: wordAssessments.slice(start, end + 1).map((w) => w.word),
        startIndex: start,
        endIndex: end,
        issue: fi?.issue,
        fix: fi?.fix,
        pauseMs: fi?.pauseMs,
      })
      start = end + 1
    }
  }

  if (groups.length === 0 && wordAssessments.length > 0) {
    groups.push({
      words: wordAssessments.map((w) => w.word),
      startIndex: 0,
      endIndex: wordAssessments.length - 1,
    })
  }

  return groups
}

// ─── Transcript coaching extraction ─────────────────────────────────────

export type TranscriptCoachingSection = {
  wording: {
    score: number | null
    bandLabel: string | null
    evidenceSummary: string
    feedbackItems: Array<{ issue: string; fix: string; whyItMatters: string }>
  } | null
  grammar: {
    score: number | null
    bandLabel: string | null
    evidenceSummary: string
    feedbackItems: Array<{ issue: string; fix: string; whyItMatters: string }>
  } | null
  scenarioFit: {
    score: number | null
    bandLabel: string | null
    evidenceSummary: string
    feedbackItems: Array<{ issue: string; fix: string; whyItMatters: string }>
  } | null
}

export function extractTranscriptCoaching(
  premiumEvaluation: BackendPremiumTurnEvaluation | null,
): TranscriptCoachingSection {
  if (!premiumEvaluation) return { wording: null, grammar: null, scenarioFit: null }

  const dims = premiumEvaluation.dimensions

  function extractDim(id: string) {
    const dim = dims.find((d) => d.id === id)
    if (!dim || dim.score == null) return null
    return {
      score: dim.score,
      bandLabel: dim.band?.shortLabel ?? dim.band?.label ?? null,
      evidenceSummary: dim.evidenceSummary,
      feedbackItems: dim.feedbackItems.map((fb) => ({
        issue: fb.issue,
        fix: fb.fix,
        whyItMatters: fb.whyItMatters,
      })),
    }
  }

  return {
    wording: extractDim('wording'),
    grammar: extractDim('grammar'),
    scenarioFit: extractDim('scenarioFit'),
  }
}

// ─── Audio dimension extraction (for score strip) ───────────────────────

export type AudioDimensionSummary = {
  pronunciation: { score: number; bandLabel: string } | null
  fluency: { score: number; bandLabel: string } | null
  rhythm: { score: number; bandLabel: string } | null
}

export function extractAudioDimensions(
  premiumEvaluation: BackendPremiumTurnEvaluation | null,
  signals: TurnSignalProfile,
): AudioDimensionSummary {
  if (!signals.hasAudio || !premiumEvaluation) {
    return { pronunciation: null, fluency: null, rhythm: null }
  }

  const dims = premiumEvaluation.dimensions

  function extractAudioDim(id: string) {
    const dim = dims.find((d) => d.id === id)
    if (!dim || dim.score == null || dim.source === 'unavailable') return null
    return {
      score: dim.score,
      bandLabel: dim.band?.shortLabel ?? dim.band?.label ?? '',
    }
  }

  return {
    pronunciation: extractAudioDim('pronunciation'),
    fluency: extractAudioDim('fluency'),
    rhythm: extractAudioDim('rhythm'),
  }
}

// ─── Reference audio URL resolution ─────────────────────────────────────

export function resolveReferenceAudioForDrill(
  premiumEvaluation: BackendPremiumTurnEvaluation | null,
  turnReferenceAudioUrl: string | null,
  dimension: 'pronunciation' | 'fluency' | 'rhythm',
): string | null {
  if (!premiumEvaluation) return turnReferenceAudioUrl

  const drill = premiumEvaluation.recommendedDrills.find(
    (d) => d.dimension === dimension && d.referenceAudioUrl
  )
  return drill?.referenceAudioUrl ?? turnReferenceAudioUrl
}
