import type { ConversationMessage } from '../../models/contracts'
import type { ScoredDimension, TranscriptCoaching, TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import { buildSmallTalkRewriteOptions } from './smallTalkSessionEvaluation'

/**
 * Same ranked suggestions as small-talk rewrites, with labels tuned for party/social
 * (reaction → follow-up → natural phrasing).
 */
export function buildPartySocialRewriteOptions(input: {
  improvedVersion?: string | null
  nextStepBeyondLevel?: string | null
  nativePhrase?: string | null
  moreNaturalDutchVersion?: string | null
}): TranscriptCoaching['rewriteOptions'] {
  const base = buildSmallTalkRewriteOptions(input)
  return {
    safeForLevel: base.safeForLevel ? { label: 'Better reaction', text: base.safeForLevel.text } : null,
    moreNatural: base.moreNatural ? { label: 'Better follow-up', text: base.moreNatural.text } : null,
    stretch: base.stretch ? { label: 'More natural phrasing', text: base.stretch.text } : null,
    alternativePhrasing: base.alternativePhrasing
      ? { label: 'Another natural line', text: base.alternativePhrasing.text }
      : null,
  }
}

export const PARTY_SOCIAL_WEIGHT_BY_DIMENSION: Record<string, number> = {
  party_social_continuity: 0.3,
  party_social_question_quality: 0.25,
  party_social_natural_reactions: 0.2,
  party_social_engagement: 0.15,
  party_social_pronunciation: 0.1,
}

export const PARTY_SOCIAL_WEIGHTS_SUMMARY =
  'Conversation continuity 30% · Question quality 25% · Natural reactions 20% · Engagement 15% · Pronunciation 10%'

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
    const w = PARTY_SOCIAL_WEIGHT_BY_DIMENSION[d.id]
    if (w == null || d.score == null) continue
    sum += d.score * w
    weightUsed += w
  }
  if (weightUsed <= 0) return null
  return clamp100(sum / weightUsed)
}

export function buildPartySocialPerformance(input: {
  messages: ConversationMessage[]
  turnEvaluations: TurnEvaluation[]
}): { extraDimensions: ScoredDimension[]; compositePartySocialScore: number | null } {
  const u = input.turnEvaluations.map((t) => t.learnerTranscript.trim()).filter(Boolean)
  const uj = u.join(' ')
  const turnCt = u.length
  const qHits = u.filter((line) => /\?/.test(line)).length
  const reactionHits = u.filter((line) =>
    /\b(leuk|nice|cool|echt|oh|wow|ja|ah|grappig|herken|snap|goed|vet|interessant|oké)\b/i.test(line),
  ).length
  const topicHints = u.filter((line) =>
    /\b(weekend|werk|reis|hobby|feest|host|hier|daar|verder|eigenlijk|straks|net)\b/i.test(line),
  ).length

  const contextualFits = input.turnEvaluations
    .map((t) => t.languageScores.contextualFit)
    .filter((n) => Number.isFinite(n) && n > 0)
  const continuityFromTurns =
    contextualFits.length > 0
      ? clamp100(contextualFits.reduce((a, b) => a + b, 0) / contextualFits.length)
      : null
  const continuityScore =
    continuityFromTurns != null
      ? continuityFromTurns
      : turnCt
        ? clamp100(48 + Math.min(30, turnCt * 3) + (uj.length > 80 ? 12 : uj.length > 40 ? 6 : 0))
        : null

  const questionScore = turnCt
    ? clamp100(44 + qHits * 14 + Math.min(22, turnCt * 2) + (/\b(hoe|wat|waar|ken je|kom je)\b/i.test(uj) ? 8 : 0))
    : null

  const reactionScore = turnCt
    ? clamp100(42 + reactionHits * 12 + Math.min(20, turnCt * 2) + (uj.length > 30 ? 6 : 0))
    : null

  const engagementScore = turnCt
    ? clamp100(46 + topicHints * 10 + Math.min(18, turnCt * 2) + (u.length >= 4 ? 8 : 0))
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
      id: 'party_social_continuity',
      label: 'Conversation continuity · 30%',
      score: continuityScore,
      confidence: turnCt >= 3 ? 'medium' : turnCt ? 'low' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Did short bursts keep moving without dying out? Weight 30%.',
    },
    {
      id: 'party_social_question_quality',
      label: 'Question quality · 25%',
      score: questionScore,
      confidence: qHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Natural party-style questions that open the chat? Weight 25%.',
    },
    {
      id: 'party_social_natural_reactions',
      label: 'Natural reactions · 20%',
      score: reactionScore,
      confidence: reactionHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Short human reactions (“Leuk”, “Oh echt?”) instead of dead ends? Weight 20%.',
    },
    {
      id: 'party_social_engagement',
      label: 'Engagement · 15%',
      score: engagementScore,
      confidence: topicHints ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Light topic movement and social energy across turns? Weight 15%.',
    },
    {
      id: 'party_social_pronunciation',
      label: 'Pronunciation · 10%',
      score: pronunciationScore,
      confidence: pronTurns.length >= Math.ceil(input.turnEvaluations.length / 2) ? 'high' : pronTurns.length ? 'medium' : 'low',
      evidenceType: 'audio',
      verdict: '',
      meaning:
        pronunciationScore != null
          ? 'Clear enough for noisy party-style practice. Weight 10%.'
          : 'No scored audio on this sample — pronunciation omitted until audio is available.',
    },
  ]

  for (const dim of dims) {
    if (dim.score != null && !dim.verdict) dim.verdict = verdictForDisplayScore(dim.score)
  }

  return {
    extraDimensions: dims,
    compositePartySocialScore: compositeFromDimensions(dims),
  }
}

export function buildPartySocialRecommendedDrillActions(): Array<{
  type: 'speak_practice'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
}> {
  return [
    {
      type: 'speak_practice',
      title: 'Burst drill (2–3 turns)',
      reason: 'Practice reaction → mini-question → reaction; use replay + mimic on fillers.',
      priority: 'primary',
    },
    {
      type: 'speak_practice',
      title: 'Party question ladder',
      reason: 'Rotate “Wat doe je hier?”, “Ken je veel mensen hier?”, “Hoe ken je de host?” with natural tone.',
      priority: 'secondary',
    },
  ]
}
