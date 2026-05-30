import type { ConversationMessage } from '../../models/contracts'
import type { ScoredDimension, TranscriptCoaching, TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import { buildSmallTalkRewriteOptions } from './smallTalkSessionEvaluation'

export function buildStorytellingRewriteOptions(input: {
  improvedVersion?: string | null
  nextStepBeyondLevel?: string | null
  nativePhrase?: string | null
  moreNaturalDutchVersion?: string | null
}): TranscriptCoaching['rewriteOptions'] {
  const base = buildSmallTalkRewriteOptions(input)
  return {
    safeForLevel: base.safeForLevel ? { label: 'Clearer story arc', text: base.safeForLevel.text } : null,
    moreNatural: base.moreNatural ? { label: 'Richer past tense / detail', text: base.moreNatural.text } : null,
    stretch: base.stretch ? { label: 'Stronger ending / feeling', text: base.stretch.text } : null,
    alternativePhrasing: base.alternativePhrasing
      ? { label: 'Alternative phrasing', text: base.alternativePhrasing.text }
      : null,
  }
}

export const STORYTELLING_WEIGHT_BY_DIMENSION: Record<string, number> = {
  storytelling_structure: 0.3,
  storytelling_sequence: 0.25,
  storytelling_detail: 0.2,
  storytelling_flow: 0.15,
  storytelling_pronunciation: 0.1,
}

export const STORYTELLING_WEIGHTS_SUMMARY =
  'Story structure 30% · Sequence 25% · Detail 20% · Natural flow 15% · Pronunciation 10%'

function clamp100(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function verdictForDisplayScore(score: number): string {
  if (score >= 80) return 'Strong for this sample'
  if (score >= 65) return 'Solid'
  if (score >= 50) return 'Building'
  return 'Needs practice'
}

function compositeFromDimensions(dims: ScoredDimension[]): number | null {
  let sum = 0
  let weightUsed = 0
  for (const d of dims) {
    const w = STORYTELLING_WEIGHT_BY_DIMENSION[d.id]
    if (w == null || d.score == null) continue
    sum += d.score * w
    weightUsed += w
  }
  if (weightUsed <= 0) return null
  return clamp100(sum / weightUsed)
}

export function buildStorytellingPerformance(input: {
  messages: ConversationMessage[]
  turnEvaluations: TurnEvaluation[]
}): { extraDimensions: ScoredDimension[]; compositeStorytellingScore: number | null } {
  const u = input.turnEvaluations.map((t) => t.learnerTranscript.trim()).filter(Boolean)
  const uj = u.join(' ')
  const turnCt = u.length
  const pastHits = u.filter((l) =>
    /\b(heb|ben|was|waren|ging|gingen|had|hadden|vertelde|gebeurde|vond|vonden|at|aten|bezocht|bezochten)\b/i.test(
      l,
    ),
  ).length
  const seqHits = u.filter((l) =>
    /\b(gisteren|toen|daarna|vervolgens|eerst|eindelijk|uiteindelijk|op het eind|s ochtends|s avonds)\b/i.test(l),
  ).length
  const emotionHits = /\b(mooi|leuk|fijn|jammer|spannend|moe|blij|teleurgesteld|geweldig|gezellig|saai)\b/i.test(uj)
    ? 1
    : 0
  const longish = u.filter((l) => l.trim().split(/\s+/).filter(Boolean).length >= 14).length

  const contextualFits = input.turnEvaluations
    .map((t) => t.languageScores.contextualFit)
    .filter((n) => Number.isFinite(n) && n > 0)
  const structureFromTurns =
    contextualFits.length > 0
      ? clamp100(contextualFits.reduce((a, b) => a + b, 0) / contextualFits.length)
      : null
  const openingCue = /\b(gisteren|vorige|weekend|toen ik|eerst|in de|bij de|we gingen|ik was)\b/i.test(uj)
  const structureScore =
    structureFromTurns != null
      ? structureFromTurns
      : turnCt
        ? clamp100(
            40 +
              (openingCue ? 18 : 0) +
              seqHits * 8 +
              Math.min(22, turnCt * 4) +
              (uj.length > 140 ? 10 : uj.length > 70 ? 5 : 0),
          )
        : null

  const sequenceScore = turnCt
    ? clamp100(42 + seqHits * 12 + pastHits * 5 + Math.min(24, turnCt * 3))
    : null

  const clarityScores = input.turnEvaluations.map((t) => t.combinedScores.clarityScore).filter((n) => Number.isFinite(n))
  const detailScore =
    clarityScores.length > 0
      ? clamp100(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length)
      : turnCt
        ? clamp100(44 + longish * 12 + emotionHits * 10 + Math.min(20, turnCt * 2))
        : null

  const naturalnessScores = input.turnEvaluations
    .map((t) => t.languageScores.naturalness)
    .filter((n) => Number.isFinite(n) && n > 0)
  const flowScore =
    naturalnessScores.length > 0
      ? clamp100(naturalnessScores.reduce((a, b) => a + b, 0) / naturalnessScores.length)
      : turnCt
        ? clamp100(46 + emotionHits * 12 + (uj.length > 100 ? 10 : 0) + Math.min(18, turnCt * 2))
        : null

  const pronTurns = input.turnEvaluations.filter(
    (t) => t.signalSources.audioMetrics === 'azure_audio' && t.audioScores.pronunciation > 0,
  )
  const pronunciationScore =
    pronTurns.length > 0
      ? clamp100(pronTurns.reduce((s, t) => s + t.audioScores.pronunciation, 0) / pronTurns.length)
      : null

  const dims: ScoredDimension[] = [
    {
      id: 'storytelling_structure',
      label: 'Story structure · 30%',
      score: structureScore,
      confidence: openingCue && seqHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Beginning, middle, and ending cues. Weight 30%.',
    },
    {
      id: 'storytelling_sequence',
      label: 'Sequence · 25%',
      score: sequenceScore,
      confidence: seqHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Logical order and time markers. Weight 25%.',
    },
    {
      id: 'storytelling_detail',
      label: 'Detail · 20%',
      score: detailScore,
      confidence: longish ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Enough concrete information and past tense. Weight 20%.',
    },
    {
      id: 'storytelling_flow',
      label: 'Natural flow · 15%',
      score: flowScore,
      confidence: emotionHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Sounds like storytelling, not a list. Weight 15%.',
    },
    {
      id: 'storytelling_pronunciation',
      label: 'Pronunciation · 10%',
      score: pronunciationScore,
      confidence: pronTurns.length >= Math.ceil(input.turnEvaluations.length / 2) ? 'high' : pronTurns.length ? 'medium' : 'low',
      evidenceType: 'audio',
      verdict: '',
      meaning:
        pronunciationScore != null
          ? 'Clear delivery on longer turns. Weight 10%.'
          : 'No scored audio on this sample — pronunciation omitted until audio is available.',
    },
  ]

  for (const dim of dims) {
    if (dim.score != null && !dim.verdict) dim.verdict = verdictForDisplayScore(dim.score)
  }

  return {
    extraDimensions: dims,
    compositeStorytellingScore: compositeFromDimensions(dims),
  }
}

export function buildStorytellingRecommendedDrillActions(): Array<{
  type: 'speak_practice'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
}> {
  return [
    {
      type: 'speak_practice',
      title: '90-second story arc',
      reason: 'Say aloud: setting → two events → ending feeling, all in Dutch past tense.',
      priority: 'primary',
    },
    {
      type: 'speak_practice',
      title: 'Emotion + detail',
      reason: 'Add one sensory detail and one feeling word to your last story — replay + mimic.',
      priority: 'secondary',
    },
  ]
}
