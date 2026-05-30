import type { ConversationMessage } from '../../models/contracts'
import type { ScoredDimension, TranscriptCoaching, TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'

/** Canonical weights for session-level small-talk dimensions (sums to 1). */
export const SMALL_TALK_WEIGHT_BY_DIMENSION: Record<string, number> = {
  small_talk_flow: 0.3,
  small_talk_naturalness: 0.25,
  small_talk_engagement: 0.2,
  small_talk_clarity: 0.15,
  small_talk_pronunciation: 0.1,
}

export const SMALL_TALK_WEIGHTS_SUMMARY =
  'Flow 30% · Naturalness 25% · Engagement 20% · Clarity 15% · Pronunciation 10%'

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

function normSmallTalkPhrase(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Distinct Dutch phrasing lines for small-talk sentence cards (better → more natural → alternatives).
 */
export function buildSmallTalkRewriteOptions(input: {
  improvedVersion?: string | null
  nextStepBeyondLevel?: string | null
  nativePhrase?: string | null
  moreNaturalDutchVersion?: string | null
}): TranscriptCoaching['rewriteOptions'] {
  const orderedSources = [
    input.improvedVersion,
    input.nativePhrase,
    input.moreNaturalDutchVersion,
    input.nextStepBeyondLevel,
  ]
  const seq: string[] = []
  for (const raw of orderedSources) {
    const t = (raw ?? '').trim()
    if (!t) continue
    if (seq.some((s) => normSmallTalkPhrase(s) === normSmallTalkPhrase(t))) continue
    seq.push(t)
  }
  if (!seq.length) {
    return { safeForLevel: null, moreNatural: null, stretch: null, alternativePhrasing: null }
  }
  return {
    safeForLevel: seq[0] ? { label: 'Better version', text: seq[0]! } : null,
    moreNatural: seq[1] ? { label: 'More natural Dutch', text: seq[1]! } : null,
    stretch: seq[2] ? { label: 'Alternative phrasing', text: seq[2]! } : null,
    alternativePhrasing: seq[3] ? { label: 'Another natural option', text: seq[3]! } : null,
  }
}

function compositeSmallTalkScoreFromDimensions(dims: ScoredDimension[]): number | null {
  let sum = 0
  let weightUsed = 0
  for (const d of dims) {
    const w = SMALL_TALK_WEIGHT_BY_DIMENSION[d.id]
    if (w == null || d.score == null) continue
    sum += d.score * w
    weightUsed += w
  }
  if (weightUsed <= 0) return null
  return clamp100(sum / weightUsed)
}

/**
 * Session-level dimensions for `small_talk` — flow-first scoring (no transactional checklist).
 */
export function buildSmallTalkPerformance(input: {
  messages: ConversationMessage[]
  turnEvaluations: TurnEvaluation[]
}): { extraDimensions: ScoredDimension[]; compositeSmallTalkScore: number | null } {
  const u = input.turnEvaluations.map((t) => t.learnerTranscript.trim()).filter(Boolean)
  const uj = u.join(' ')
  const turnCt = u.length
  const qHits = u.filter((line) => /\?/.test(line)).length
  const reactionHits = u.filter((line) =>
    /\b(oh|ah|nice|leuk|echt|interessant|grappig|jammer|fijn|prima|cool|wow)\b/i.test(line),
  ).length

  const contextualFits = input.turnEvaluations
    .map((t) => t.languageScores.contextualFit)
    .filter((n) => Number.isFinite(n) && n > 0)
  const flowFromTurns =
    contextualFits.length > 0
      ? clamp100(contextualFits.reduce((a, b) => a + b, 0) / contextualFits.length)
      : null
  const flowScore =
    flowFromTurns != null
      ? flowFromTurns
      : turnCt
        ? clamp100(52 + Math.min(30, turnCt * 5) + (uj.length > 80 ? 10 : uj.length > 35 ? 5 : 0))
        : null

  const naturalnessScores = input.turnEvaluations.map((t) => t.languageScores.naturalness).filter((n) => Number.isFinite(n))
  const naturalScore =
    naturalnessScores.length > 0
      ? clamp100(naturalnessScores.reduce((a, b) => a + b, 0) / naturalnessScores.length)
      : turnCt
        ? clamp100(50 + reactionHits * 12 + (/\b(en|maar|dus|want)\b/i.test(uj) ? 8 : 0))
        : null

  const engagementScore = turnCt
    ? clamp100(48 + qHits * 14 + Math.min(22, turnCt * 3) + (uj.length > 50 ? 8 : 0))
    : null

  const clarityScores = input.turnEvaluations.map((t) => t.combinedScores.clarityScore).filter((n) => Number.isFinite(n))
  const clarityScore =
    clarityScores.length > 0 ? clamp100(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length) : null

  const pronTurns = input.turnEvaluations.filter(
    (t) => t.signalSources.audioMetrics === 'azure_audio' && t.audioScores.pronunciation > 0,
  )
  const pronunciationScore =
    pronTurns.length > 0
      ? clamp100(pronTurns.reduce((s, t) => s + t.audioScores.pronunciation, 0) / pronTurns.length)
      : null

  const dims: ScoredDimension[] = [
    {
      id: 'small_talk_flow',
      label: 'Flow · 30%',
      score: flowScore,
      confidence: turnCt >= 3 ? 'medium' : turnCt ? 'low' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        (flowFromTurns != null
          ? 'Did you keep the conversation going — answering and moving the chat forward without stalling? '
          : 'Short sample: score leans on participation; more turns give a steadier flow read. ') +
        'Weight 30%.',
    },
    {
      id: 'small_talk_naturalness',
      label: 'Naturalness · 25%',
      score: naturalScore,
      confidence: reactionHits ? 'high' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        reactionHits > 0
          ? 'You sounded human — fillers, reactions, and social rhythm like real Dutch small talk. Weight 25%.'
          : 'Aim for small social signals (“oh leuk”, “nice”, “echt?”) so it feels conversational, not like an exam. Weight 25%.',
    },
    {
      id: 'small_talk_engagement',
      label: 'Engagement · 20%',
      score: engagementScore,
      confidence: qHits ? 'high' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        qHits > 0
          ? 'You asked follow-ups or nudged curiosity — great for natural small talk. Weight 20%.'
          : 'Try a short follow-up (“En jij?” / “Wat ga jij doen?”) so the other person can talk too. Weight 20%.',
    },
    {
      id: 'small_talk_clarity',
      label: 'Clarity · 15%',
      score: clarityScore,
      confidence: 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Was what you said easy to understand — clear wording and intent? Weight 15%.',
    },
    {
      id: 'small_talk_pronunciation',
      label: 'Pronunciation · 10%',
      score: pronunciationScore,
      confidence: pronTurns.length >= Math.ceil(input.turnEvaluations.length / 2) ? 'high' : pronTurns.length ? 'medium' : 'low',
      evidenceType: 'audio',
      verdict: '',
      meaning:
        pronunciationScore != null
          ? 'Session average on scored lines — delivery still shapes first impressions. Weight 10%.'
          : 'No scored audio on this sample — pronunciation is omitted from the blend until audio is available.',
    },
  ]

  for (const dim of dims) {
    if (dim.score != null && !dim.verdict) dim.verdict = verdictForDisplayScore(dim.score)
  }

  return {
    extraDimensions: dims,
    compositeSmallTalkScore: compositeSmallTalkScoreFromDimensions(dims),
  }
}

export function buildSmallTalkRecommendedDrillActions(): Array<{
  type: 'speak_practice'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
}> {
  return [
    {
      type: 'speak_practice',
      title: 'Follow-up micro-drills',
      reason: 'Practice 3 short Dutch follow-ups (“En hoe was het bij jou?”) until they feel automatic.',
      priority: 'primary',
    },
    {
      type: 'speak_practice',
      title: 'Replay + say it more naturally',
      reason: 'Replay the last assistant line, then answer in your own words with one reaction word.',
      priority: 'secondary',
    },
  ]
}
