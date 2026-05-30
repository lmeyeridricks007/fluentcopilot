import type { ConversationMessage } from '../../models/contracts'
import type { ScoredDimension, TranscriptCoaching, TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import { buildSmallTalkRewriteOptions } from './smallTalkSessionEvaluation'

export function buildExplainingSomethingRewriteOptions(input: {
  improvedVersion?: string | null
  nextStepBeyondLevel?: string | null
  nativePhrase?: string | null
  moreNaturalDutchVersion?: string | null
}): TranscriptCoaching['rewriteOptions'] {
  const base = buildSmallTalkRewriteOptions(input)
  return {
    safeForLevel: base.safeForLevel ? { label: 'Clearer step order', text: base.safeForLevel.text } : null,
    moreNatural: base.moreNatural ? { label: 'Stronger connectors', text: base.moreNatural.text } : null,
    stretch: base.stretch ? { label: 'Add missing step', text: base.stretch.text } : null,
    alternativePhrasing: base.alternativePhrasing
      ? { label: 'Alternative phrasing', text: base.alternativePhrasing.text }
      : null,
  }
}

export const EXPLAINING_SOMETHING_WEIGHT_BY_DIMENSION: Record<string, number> = {
  explaining_something_structure: 0.3,
  explaining_something_completeness: 0.25,
  explaining_something_clarity: 0.2,
  explaining_something_connectors: 0.15,
  explaining_something_pronunciation: 0.1,
}

export const EXPLAINING_SOMETHING_WEIGHTS_SUMMARY =
  'Structure 30% · Completeness 25% · Clarity 20% · Connectors 15% · Pronunciation 10%'

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
    const w = EXPLAINING_SOMETHING_WEIGHT_BY_DIMENSION[d.id]
    if (w == null || d.score == null) continue
    sum += d.score * w
    weightUsed += w
  }
  if (weightUsed <= 0) return null
  return clamp100(sum / weightUsed)
}

export function buildExplainingSomethingPerformance(input: {
  messages: ConversationMessage[]
  turnEvaluations: TurnEvaluation[]
}): { extraDimensions: ScoredDimension[]; compositeExplainingSomethingScore: number | null } {
  const u = input.turnEvaluations.map((t) => t.learnerTranscript.trim()).filter(Boolean)
  const uj = u.join(' ')
  const turnCt = u.length
  const connectorHits = u.filter((l) =>
    /\b(eerst|daarna|dan|vervolgens|tot slot|tenslotte|hierna|als laatste|stap|stappen)\b/i.test(l),
  ).length
  const stepLike = u.filter((l) => /\b(stap|klik|zet|open|sluit|wacht|controleer|ga naar)\b/i.test(l)).length
  const longish = u.filter((l) => l.trim().split(/\s+/).filter(Boolean).length >= 12).length

  const contextualFits = input.turnEvaluations
    .map((t) => t.languageScores.contextualFit)
    .filter((n) => Number.isFinite(n) && n > 0)
  const structureFromTurns =
    contextualFits.length > 0
      ? clamp100(contextualFits.reduce((a, b) => a + b, 0) / contextualFits.length)
      : null
  const structureScore =
    structureFromTurns != null
      ? structureFromTurns
      : turnCt
        ? clamp100(46 + connectorHits * 10 + Math.min(24, turnCt * 4) + (uj.length > 120 ? 10 : uj.length > 60 ? 5 : 0))
        : null

  const completenessScore = turnCt
    ? clamp100(44 + longish * 14 + stepLike * 6 + Math.min(22, turnCt * 3))
    : null

  const clarityScores = input.turnEvaluations.map((t) => t.combinedScores.clarityScore).filter((n) => Number.isFinite(n))
  const clarityScore =
    clarityScores.length > 0
      ? clamp100(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length)
      : turnCt
        ? clamp100(48 + (uj.length > 100 ? 12 : uj.length > 50 ? 6 : 0) + Math.min(18, turnCt * 2))
        : null

  const connectorScore = turnCt
    ? clamp100(42 + connectorHits * 14 + Math.min(24, turnCt * 3) + (/\b(omdat|daardoor|daarna|vervolgens)\b/i.test(uj) ? 8 : 0))
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
      id: 'explaining_something_structure',
      label: 'Structure · 30%',
      score: structureScore,
      confidence: connectorHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Clear order of steps and progression. Weight 30%.',
    },
    {
      id: 'explaining_something_completeness',
      label: 'Completeness · 25%',
      score: completenessScore,
      confidence: longish ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Enough steps for the prompt at this level. Weight 25%.',
    },
    {
      id: 'explaining_something_clarity',
      label: 'Clarity · 20%',
      score: clarityScore,
      confidence: turnCt >= 2 ? 'medium' : turnCt ? 'low' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Understandable explanation without overload. Weight 20%.',
    },
    {
      id: 'explaining_something_connectors',
      label: 'Connectors · 15%',
      score: connectorScore,
      confidence: connectorHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Sequencing words (eerst, dan, daarna, …). Weight 15%.',
    },
    {
      id: 'explaining_something_pronunciation',
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
    compositeExplainingSomethingScore: compositeFromDimensions(dims),
  }
}

export function buildExplainingSomethingRecommendedDrillActions(): Array<{
  type: 'speak_practice'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
}> {
  return [
    {
      type: 'speak_practice',
      title: '4-step ladder (hardop)',
      reason: 'Say “Eerst … Daarna … Dan … Tot slot …” with one concrete household task.',
      priority: 'primary',
    },
    {
      type: 'speak_practice',
      title: 'Missing-step repair',
      reason: 'Record one explanation, then add the step a listener would ask for — replay + mimic.',
      priority: 'secondary',
    },
  ]
}
