/**
 * Scoring engine — converts raw Azure + LLM + timing signals into the six-dimension
 * premium scoring model. Level-aware, evidence-sourced, reliability-tagged.
 */

import type { NormalizedWordAssessment } from '../speech/pronunciationAssessmentContracts'
import type { RawScores, DerivedScores, TimingAnalysis } from '../../domain/speaking-assessment/speakingAssessmentCanonical'
import type { SpeakLiveCefrLevel } from '../../domain/speakLive/speakLiveSupportStrategy'
import {
  type ScoringDimensionId,
  type ScoreDimension,
  type ScoringMode,
  type ScoringPolicy,
  type DimensionFeedbackItem,
  type SpeechTurnEvaluation,
  type SpeechSessionEvaluation,
  type RecommendedDrill,
  SCORING_POLICY_BY_LEVEL,
  AUDIO_REQUIRED_DIMENSIONS,
  bandForScore,
  computeReliability,
  computeSessionReliability,
  computeWeightedComposite,
  applyLevelAdjustment,
  selectPriorityDimensions,
  buildHeadlineSummary,
} from '../../domain/speaking-assessment/speechScoringModel'
import { mapDrillsForDimension } from './speechFeedbackMapper'

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

// ─── Raw input shape ────────────────────────────────────────────────────

export type TurnScoringInput = {
  turnId: string
  turnIndex: number
  transcript: string
  transcriptNormalized: string
  audioUrl: string | null
  hasAudio: boolean
  level: SpeakLiveCefrLevel
  mode: ScoringMode
  rawScores: RawScores | null
  derivedScores: DerivedScores | null
  timing: TimingAnalysis | null
  words: NormalizedWordAssessment[]
  clipDurationMs: number | null
  /** LLM-provided language scores (0–100). */
  languageScores: {
    naturalness: number
    contextualFit: number
    registerFit: number
    grammaticalStability: number
  } | null
  /** LLM grammar feedback. */
  grammarIssues: string[]
  sentenceStructureIssues: string[]
  /** LLM improved version. */
  improvedVersion: string | null
  /** Scenario goal alignment from LLM or recap (0–100). */
  scenarioAlignmentScore: number | null
  scenarioGoalSummary: string
  /** Reference audio URL for drills. */
  referenceAudioUrl: string | null
}

// ─── Dimension scorers ──────────────────────────────────────────────────

function scorePronunciation(input: TurnScoringInput, policy: ScoringPolicy): ScoreDimension {
  if (!input.hasAudio || !input.rawScores) {
    return nullDimension('pronunciation', 'No audio captured — pronunciation cannot be assessed.')
  }
  const raw = input.rawScores
  const base = clamp100((raw.pronunciation * 0.5 + raw.accuracy * 0.35 + raw.completeness * 0.15))
  const adjusted = applyLevelAdjustment('pronunciation', base, policy)

  const weakWords = input.words.filter((w) => w.accuracyScore < 72 && w.word.trim().length > 0)
  const feedback: DimensionFeedbackItem[] = weakWords.slice(0, 6).map((w) => ({
    issue: w.errorType
      ? `"${w.word.trim()}" flagged as ${w.errorType.toLowerCase()} (score ${Math.round(w.accuracyScore)})`
      : `"${w.word.trim()}" scored ${Math.round(w.accuracyScore)} — vowel or consonant placement off`,
    fix: `Isolate "${w.word.trim()}", listen to the reference, say it slowly 3 times.`,
    whyItMatters: 'Clear word-level pronunciation helps Dutch listeners follow you without extra effort.',
    word: w.word.trim(),
    transcriptSnippet: input.transcript.slice(0, 200),
    timestampMs: w.startMs ?? null,
  }))

  return {
    id: 'pronunciation',
    score: adjusted,
    band: bandForScore(adjusted),
    reliability: computeReliability({
      hasAudio: true,
      wordCount: input.words.length,
      clipDurationMs: input.clipDurationMs,
    }),
    source: 'azure_audio',
    evidenceSummary: `Azure word-level: ${weakWords.length} weak word(s) of ${input.words.length} assessed.`,
    feedbackItems: feedback,
  }
}

function scoreFluency(input: TurnScoringInput, policy: ScoringPolicy): ScoreDimension {
  if (!input.hasAudio || !input.rawScores) {
    return nullDimension('fluency', 'No audio captured — fluency cannot be assessed.')
  }

  const raw = input.rawScores
  const timing = input.timing
  let base = clamp100(raw.fluency)

  if (timing) {
    if (timing.hesitationMoments.length >= 3) base = clamp100(base - 6)
    else if (timing.hesitationMoments.length >= 1) base = clamp100(base - 3)
    if (timing.paceProfile === 'rushed') base = clamp100(base - 4)
  }

  const adjusted = applyLevelAdjustment('fluency', base, policy)

  const feedback: DimensionFeedbackItem[] = []
  if (timing && timing.hesitationMoments.length > 0) {
    const h = timing.hesitationMoments[0]
    const wordA = input.words[h.afterWordIndex]
    const wordB = input.words[h.afterWordIndex + 1]
    if (wordA && wordB) {
      feedback.push({
        issue: `Long pause (${Math.round(h.pauseMs)} ms) between "${wordA.word.trim()}" and "${wordB.word.trim()}"`,
        fix: 'Practice this phrase as one chunk without stopping in the middle.',
        whyItMatters: 'Smooth delivery helps listeners stay with you — pauses mid-phrase can sound hesitant.',
        phrase: `${wordA.word.trim()} ${wordB.word.trim()}`,
        transcriptSnippet: input.transcript.slice(0, 200),
      })
    }
  }
  if (timing?.rushedEnding) {
    feedback.push({
      issue: 'Ending sounds compressed compared to earlier words.',
      fix: 'Give the last phrase the same pace as the opening — slow slightly before the final word.',
      whyItMatters: 'Rushing endings is a common tell that marks speech as non-native.',
      transcriptSnippet: input.transcript.slice(0, 200),
    })
  }

  return {
    id: 'fluency',
    score: adjusted,
    band: bandForScore(adjusted),
    reliability: computeReliability({
      hasAudio: true,
      wordCount: input.words.length,
      clipDurationMs: input.clipDurationMs,
    }),
    source: 'azure_audio',
    evidenceSummary: timing
      ? `${timing.hesitationMoments.length} hesitation(s), pace: ${timing.paceProfile}, ${Math.round(timing.estimatedWpm)} WPM.`
      : `Azure fluency: ${raw.fluency}.`,
    feedbackItems: feedback,
  }
}

function scoreRhythm(input: TurnScoringInput, policy: ScoringPolicy): ScoreDimension {
  if (!input.hasAudio || !input.derivedScores) {
    return nullDimension('rhythm', 'No audio captured — rhythm cannot be assessed.')
  }

  const rhythmSignal = input.derivedScores.rhythm
  const base = rhythmSignal.score != null ? clamp100(rhythmSignal.score) : clamp100(input.rawScores?.fluency ?? 0)
  const adjusted = applyLevelAdjustment('rhythm', base, policy)

  const feedback: DimensionFeedbackItem[] = []
  if (input.timing && input.timing.paceProfile === 'uneven') {
    feedback.push({
      issue: 'Uneven pacing — some parts fast, others slow, creating a choppy feel.',
      fix: 'Pick one phrase, say it at an even pace, then connect the next phrase at the same speed.',
      whyItMatters: 'Steady rhythm makes Dutch sound natural even with imperfect pronunciation.',
      transcriptSnippet: input.transcript.slice(0, 200),
    })
  }
  if (input.timing && input.timing.phraseBoundaryCandidates.length >= 3 && input.words.length <= 6) {
    feedback.push({
      issue: 'Too many pauses for a short sentence — sounds word-by-word instead of grouped.',
      fix: 'Group 2–3 words into a single breath group, then pause only between groups.',
      whyItMatters: 'Phrase grouping is what makes speech flow — even slow speech sounds good when chunked.',
      transcriptSnippet: input.transcript.slice(0, 200),
    })
  }

  return {
    id: 'rhythm',
    score: adjusted,
    band: bandForScore(adjusted),
    reliability: computeReliability({
      hasAudio: true,
      wordCount: input.words.length,
      clipDurationMs: input.clipDurationMs,
    }),
    source: 'timing_analysis',
    evidenceSummary: rhythmSignal.label,
    feedbackItems: feedback,
  }
}

function scoreWording(input: TurnScoringInput, policy: ScoringPolicy): ScoreDimension {
  const lang = input.languageScores
  if (!lang) return nullDimension('wording', 'Language evaluation not available.')

  const base = clamp100((lang.naturalness * 0.5 + lang.contextualFit * 0.3 + lang.registerFit * 0.2))
  const strictnessAdj = Math.round(base * (1 - policy.wordingStrictness * 0.22))
  const adjusted = clamp100(strictnessAdj)

  const feedback: DimensionFeedbackItem[] = []
  if (input.improvedVersion && input.improvedVersion.trim() !== input.transcript.trim()) {
    feedback.push({
      issue: 'Phrasing sounds more textbook than how a Dutch speaker would say it here.',
      fix: `A more natural version: "${input.improvedVersion.trim()}"`,
      whyItMatters: 'Native-like phrasing makes you sound confident in real Dutch situations.',
      transcriptSnippet: input.transcript.slice(0, 200),
    })
  }

  return {
    id: 'wording',
    score: adjusted,
    band: bandForScore(adjusted),
    reliability: { level: lang ? 'medium' : 'low', reason: 'LLM-judged from transcript.' },
    source: 'llm_transcript',
    evidenceSummary: `Naturalness ${lang.naturalness}, context fit ${lang.contextualFit}, register ${lang.registerFit}.`,
    feedbackItems: feedback,
  }
}

function scoreGrammar(input: TurnScoringInput, policy: ScoringPolicy): ScoreDimension {
  const lang = input.languageScores
  if (!lang) return nullDimension('grammar', 'Language evaluation not available.')

  const base = clamp100(lang.grammaticalStability)
  const strictnessAdj = Math.round(base * (1 - policy.grammarStrictness * 0.16))
  const adjusted = clamp100(strictnessAdj)

  const feedback: DimensionFeedbackItem[] = input.grammarIssues.slice(0, 4).map((g) => ({
    issue: g,
    fix: 'See the improved version for corrected structure.',
    whyItMatters: 'Clean grammar helps listeners parse your meaning without second-guessing.',
    transcriptSnippet: input.transcript.slice(0, 200),
  }))

  for (const s of input.sentenceStructureIssues.slice(0, 3)) {
    feedback.push({
      issue: s,
      fix: 'Practice the corrected word order with the reference line.',
      whyItMatters: 'Dutch word order differs from English — getting it right makes you sound fluent.',
      transcriptSnippet: input.transcript.slice(0, 200),
    })
  }

  return {
    id: 'grammar',
    score: adjusted,
    band: bandForScore(adjusted),
    reliability: { level: 'medium', reason: 'LLM-judged from transcript and level expectations.' },
    source: 'llm_transcript',
    evidenceSummary: `${input.grammarIssues.length} grammar + ${input.sentenceStructureIssues.length} structure issue(s).`,
    feedbackItems: feedback,
  }
}

function scoreScenarioFit(input: TurnScoringInput, _policy: ScoringPolicy): ScoreDimension {
  const alignment = input.scenarioAlignmentScore
  if (alignment == null) return nullDimension('scenarioFit', 'Scenario evaluation not available.')

  const adjusted = clamp100(alignment)

  const feedback: DimensionFeedbackItem[] = []
  if (adjusted < 60) {
    feedback.push({
      issue: input.scenarioGoalSummary || 'Turn didn\'t fully address the scenario task.',
      fix: 'Re-read the scenario goal and try a line that directly completes the task.',
      whyItMatters: 'Scenario fit means your Dutch works in the situation — not just grammatically correct but functionally useful.',
      transcriptSnippet: input.transcript.slice(0, 200),
    })
  }

  return {
    id: 'scenarioFit',
    score: adjusted,
    band: bandForScore(adjusted),
    reliability: { level: 'medium', reason: 'LLM + recap goal matching.' },
    source: 'scenario_matcher',
    evidenceSummary: input.scenarioGoalSummary || `Alignment: ${adjusted}.`,
    feedbackItems: feedback,
  }
}

function nullDimension(id: ScoringDimensionId, reason: string): ScoreDimension {
  return {
    id,
    score: null,
    band: null,
    reliability: { level: 'low', reason },
    source: 'unavailable',
    evidenceSummary: reason,
    feedbackItems: [],
  }
}

// ─── Turn evaluation builder ────────────────────────────────────────────

export function evaluateTurn(input: TurnScoringInput): SpeechTurnEvaluation {
  const policy = SCORING_POLICY_BY_LEVEL[input.level]

  const dimensions: ScoreDimension[] = [
    scorePronunciation(input, policy),
    scoreFluency(input, policy),
    scoreRhythm(input, policy),
    scoreWording(input, policy),
    scoreGrammar(input, policy),
    scoreScenarioFit(input, policy),
  ]

  const dimMap = new Map<ScoringDimensionId, number | null>()
  for (const d of dimensions) dimMap.set(d.id, d.score)

  const composite = computeWeightedComposite(dimMap, input.mode, policy)
  const reliability = computeReliability({
    hasAudio: input.hasAudio,
    wordCount: input.words.length,
    clipDurationMs: input.clipDurationMs,
  })
  const priorityDimensions = selectPriorityDimensions(dimensions)
  const headline = buildHeadlineSummary(composite, input.level, input.hasAudio)

  const allFeedback: DimensionFeedbackItem[] = []
  for (const d of dimensions) allFeedback.push(...d.feedbackItems)

  const drills: RecommendedDrill[] = []
  for (const d of dimensions) {
    if (d.score != null && d.score < 75) {
      drills.push(...mapDrillsForDimension(d, input))
    }
  }

  return {
    turnId: input.turnId,
    turnIndex: input.turnIndex,
    transcript: input.transcript,
    transcriptNormalized: input.transcriptNormalized,
    audioUrl: input.audioUrl,
    level: input.level,
    mode: input.mode,
    dimensions,
    composite,
    reliability,
    priorityDimensions,
    headlineSummary: headline,
    evidenceItems: allFeedback,
    recommendedDrills: drills.slice(0, 8),
  }
}

// ─── Session evaluation builder ─────────────────────────────────────────

export function evaluateSession(input: {
  sessionId: string
  scenarioId: string
  scenarioTitle: string
  level: SpeakLiveCefrLevel
  mode: ScoringMode
  sessionDurationSeconds: number
  turns: SpeechTurnEvaluation[]
}): SpeechSessionEvaluation {
  const { turns, level, mode } = input
  const policy = SCORING_POLICY_BY_LEVEL[level]

  const audioTurns = turns.filter((t) => t.audioUrl != null)
  const avgWordCount = turns.length
    ? Math.round(turns.reduce((s, t) => s + t.transcript.split(/\s+/).length, 0) / turns.length)
    : 0

  const sessionReliability = computeSessionReliability({
    turnCount: turns.length,
    audioTurnCount: audioTurns.length,
    avgWordCount,
  })

  const dimAverages = new Map<ScoringDimensionId, number | null>()
  const dimAggregated: ScoreDimension[] = []

  for (const dimId of ['pronunciation', 'fluency', 'rhythm', 'wording', 'grammar', 'scenarioFit'] as ScoringDimensionId[]) {
    const isAudioDim = AUDIO_REQUIRED_DIMENSIONS.has(dimId)
    const relevantTurns = isAudioDim ? audioTurns : turns
    const scores = relevantTurns
      .map((t) => t.dimensions.find((d) => d.id === dimId)?.score)
      .filter((s): s is number => s != null)

    if (scores.length === 0) {
      dimAverages.set(dimId, null)
      dimAggregated.push(nullDimension(dimId, isAudioDim
        ? 'No audio turns — cannot assess.'
        : 'No turn data available.'))
      continue
    }

    const avg = clamp100(scores.reduce((a, b) => a + b, 0) / scores.length)
    dimAverages.set(dimId, avg)

    const allFeedback: DimensionFeedbackItem[] = []
    for (const t of relevantTurns) {
      const td = t.dimensions.find((d) => d.id === dimId)
      if (td) allFeedback.push(...td.feedbackItems)
    }

    dimAggregated.push({
      id: dimId,
      score: avg,
      band: bandForScore(avg),
      reliability: sessionReliability,
      source: relevantTurns[0]?.dimensions.find((d) => d.id === dimId)?.source ?? 'unavailable',
      evidenceSummary: `Average across ${scores.length} turn(s).`,
      feedbackItems: allFeedback.slice(0, 6),
    })
  }

  const composite = computeWeightedComposite(dimAverages, mode, policy)

  const scored = dimAggregated.filter((d) => d.score != null)
  const strongest = scored.length ? scored.reduce((a, b) => ((a.score ?? 0) >= (b.score ?? 0) ? a : b)) : null
  const weakest = scored.length ? scored.reduce((a, b) => ((a.score ?? 100) <= (b.score ?? 100) ? a : b)) : null

  const priorityImprovement = weakest
    ? `Focus on ${weakest.id}: ${weakest.band?.label ?? 'needs attention'} (${weakest.score}).`
    : 'Complete more turns for pattern detection.'

  const patternNotes: string[] = []
  if (turns.length === 1) {
    patternNotes.push('You completed 1 turn. We can give more precise feedback once you complete more turns.')
  } else if (turns.length >= 3) {
    const pronScores = turns
      .map((t) => t.dimensions.find((d) => d.id === 'pronunciation')?.score)
      .filter((s): s is number => s != null)
    if (pronScores.length >= 2) {
      const improving = pronScores[pronScores.length - 1] > pronScores[0] + 5
      if (improving) patternNotes.push('Pronunciation improved across the session — you warmed up well.')
    }
  }

  const sessionDrills: RecommendedDrill[] = []
  for (const t of turns) sessionDrills.push(...t.recommendedDrills)
  const uniqueDrills = sessionDrills.filter((d, i) =>
    sessionDrills.findIndex((o) => o.dimension === d.dimension && o.type === d.type) === i
  )

  return {
    sessionId: input.sessionId,
    scenarioId: input.scenarioId,
    scenarioTitle: input.scenarioTitle,
    level,
    mode,
    turnsCompleted: turns.length,
    sessionDurationSeconds: input.sessionDurationSeconds,
    dimensions: dimAggregated,
    composite,
    reliability: sessionReliability,
    strongestDimension: strongest,
    weakestDimension: weakest,
    priorityImprovement,
    patternNotes,
    recommendedDrills: uniqueDrills.slice(0, 10),
    turnEvaluations: turns,
  }
}
