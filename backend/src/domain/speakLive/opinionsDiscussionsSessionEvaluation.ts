import type { ConversationMessage } from '../../models/contracts'
import type { ScoredDimension, TranscriptCoaching, TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import { buildSmallTalkRewriteOptions } from './smallTalkSessionEvaluation'

export function buildOpinionsDiscussionsRewriteOptions(input: {
  improvedVersion?: string | null
  nextStepBeyondLevel?: string | null
  nativePhrase?: string | null
  moreNaturalDutchVersion?: string | null
}): TranscriptCoaching['rewriteOptions'] {
  const base = buildSmallTalkRewriteOptions(input)
  return {
    safeForLevel: base.safeForLevel ? { label: 'Stronger opinion phrasing', text: base.safeForLevel.text } : null,
    moreNatural: base.moreNatural ? { label: 'Better reasoning / connectors', text: base.moreNatural.text } : null,
    stretch: base.stretch ? { label: 'Richer argument (2 reasons)', text: base.stretch.text } : null,
    alternativePhrasing: base.alternativePhrasing
      ? { label: 'Softer disagreement', text: base.alternativePhrasing.text }
      : null,
  }
}

export const OPINIONS_DISCUSSIONS_WEIGHT_BY_DIMENSION: Record<string, number> = {
  opinions_clarity: 0.3,
  opinions_reasoning_dim: 0.25,
  opinions_response_structure: 0.2,
  opinions_natural_tone: 0.15,
  opinions_pronunciation: 0.1,
}

export const OPINIONS_DISCUSSIONS_WEIGHTS_SUMMARY =
  'Opinion clarity 30% · Reasoning 25% · Response structure 20% · Natural tone 15% · Pronunciation 10%'

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
    const w = OPINIONS_DISCUSSIONS_WEIGHT_BY_DIMENSION[d.id]
    if (w == null || d.score == null) continue
    sum += d.score * w
    weightUsed += w
  }
  if (weightUsed <= 0) return null
  return clamp100(sum / weightUsed)
}

export function buildOpinionsDiscussionsPerformance(input: {
  messages: ConversationMessage[]
  turnEvaluations: TurnEvaluation[]
}): { extraDimensions: ScoredDimension[]; compositeOpinionsDiscussionsScore: number | null } {
  const u = input.turnEvaluations.map((t) => t.learnerTranscript.trim()).filter(Boolean)
  const uj = u.join(' ').toLowerCase()
  const turnCt = u.length

  const stanceHits = /\b(eens|oneens|niet eens|mee eens|daar ben ik|klopt|denk ik niet|vind ik|vindt)\b/i.test(uj)
    ? 1
    : 0
  const reasonHits = /\b(omdat|want|daarom|daardoor|reden|bovendien|daarom denk)\b/i.test(uj) ? 1 : 0
  const connectorHits = (uj.match(/\b(maar|dus|eigenlijk|enerzijds|anderzijds|bovendien)\b/gi) ?? []).length

  const contextualFits = input.turnEvaluations
    .map((t) => t.languageScores.contextualFit)
    .filter((n) => Number.isFinite(n) && n > 0)
  const clarityFromTurns =
    contextualFits.length > 0
      ? clamp100(contextualFits.reduce((a, b) => a + b, 0) / contextualFits.length)
      : null

  const clarityScore =
    clarityFromTurns != null
      ? clarityFromTurns
      : turnCt
        ? clamp100(38 + stanceHits * 22 + Math.min(28, turnCt * 5) + (uj.length > 80 ? 12 : uj.length > 40 ? 6 : 0))
        : null

  const reasoningScore = turnCt
    ? clamp100(36 + reasonHits * 28 + stanceHits * 8 + Math.min(22, connectorHits * 5) + Math.min(18, turnCt * 3))
    : null

  const clarityScores = input.turnEvaluations.map((t) => t.combinedScores.clarityScore).filter((n) => Number.isFinite(n))
  const structureScore =
    clarityScores.length > 0
      ? clamp100(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length)
      : turnCt
        ? clamp100(40 + (u.length >= 2 ? 14 : 0) + Math.min(24, uj.split(/[.!?]+/).filter(Boolean).length * 6))
        : null

  const naturalnessScores = input.turnEvaluations
    .map((t) => t.languageScores.naturalness)
    .filter((n) => Number.isFinite(n) && n > 0)
  const toneScore =
    naturalnessScores.length > 0
      ? clamp100(naturalnessScores.reduce((a, b) => a + b, 0) / naturalnessScores.length)
      : turnCt
        ? clamp100(44 + connectorHits * 6 + (uj.length > 60 ? 10 : 0) + Math.min(20, turnCt * 3))
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
      id: 'opinions_clarity',
      label: 'Opinion clarity · 30%',
      score: clarityScore,
      confidence: stanceHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Clear agree/disagree or stance. Weight 30%.',
    },
    {
      id: 'opinions_reasoning_dim',
      label: 'Reasoning · 25%',
      score: reasoningScore,
      confidence: reasonHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Because/want and simple argument. Weight 25%.',
    },
    {
      id: 'opinions_response_structure',
      label: 'Response structure · 20%',
      score: structureScore,
      confidence: turnCt >= 2 ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Claim then support; one focus per turn. Weight 20%.',
    },
    {
      id: 'opinions_natural_tone',
      label: 'Natural tone · 15%',
      score: toneScore,
      confidence: connectorHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Sounds like discussion, not a lecture. Weight 15%.',
    },
    {
      id: 'opinions_pronunciation',
      label: 'Pronunciation · 10%',
      score: pronunciationScore,
      confidence: pronTurns.length >= Math.ceil(input.turnEvaluations.length / 2) ? 'high' : pronTurns.length ? 'medium' : 'low',
      evidenceType: 'audio',
      verdict: '',
      meaning:
        pronunciationScore != null
          ? 'Clear delivery in discussion turns. Weight 10%.'
          : 'No scored audio on this sample — pronunciation omitted until audio is available.',
    },
  ]

  for (const dim of dims) {
    if (dim.score != null && !dim.verdict) dim.verdict = verdictForDisplayScore(dim.score)
  }

  return {
    extraDimensions: dims,
    compositeOpinionsDiscussionsScore: compositeFromDimensions(dims),
  }
}

export function buildOpinionsDiscussionsRecommendedDrillActions(): Array<{
  type: 'speak_practice'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
}> {
  return [
    {
      type: 'speak_practice',
      title: 'Stance + one reason',
      reason: 'Say: “Ik ben het (niet) eens, want …” aloud in two variants.',
      priority: 'primary',
    },
    {
      type: 'speak_practice',
      title: 'Softer disagreement',
      reason: 'Practice “Ik snap je punt, maar …” and “Ik ben het niet helemaal eens omdat …”.',
      priority: 'secondary',
    },
  ]
}
