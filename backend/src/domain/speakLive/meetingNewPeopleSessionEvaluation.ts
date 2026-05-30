import type { ConversationMessage } from '../../models/contracts'
import type { ScoredDimension, TurnEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import { buildSmallTalkRewriteOptions } from './smallTalkSessionEvaluation'

/** Reuse rewrite slot layout (better / more natural / alternatives) — labels fit intro & background coaching. */
export const buildMeetingNewPeopleRewriteOptions = buildSmallTalkRewriteOptions

export const MEETING_NEW_PEOPLE_WEIGHT_BY_DIMENSION: Record<string, number> = {
  meeting_new_people_intro_clarity: 0.25,
  meeting_new_people_background: 0.25,
  meeting_new_people_follow_up: 0.25,
  meeting_new_people_flow: 0.15,
  meeting_new_people_pronunciation: 0.1,
}

export const MEETING_NEW_PEOPLE_WEIGHTS_SUMMARY =
  'Introduction clarity 25% · Background expression 25% · Follow-up engagement 25% · Natural flow 15% · Pronunciation 10%'

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
    const w = MEETING_NEW_PEOPLE_WEIGHT_BY_DIMENSION[d.id]
    if (w == null || d.score == null) continue
    sum += d.score * w
    weightUsed += w
  }
  if (weightUsed <= 0) return null
  return clamp100(sum / weightUsed)
}

export function buildMeetingNewPeoplePerformance(input: {
  messages: ConversationMessage[]
  turnEvaluations: TurnEvaluation[]
}): { extraDimensions: ScoredDimension[]; compositeMeetingNewPeopleScore: number | null } {
  const u = input.turnEvaluations.map((t) => t.learnerTranscript.trim()).filter(Boolean)
  const uj = u.join(' ')
  const turnCt = u.length
  const qHits = u.filter((line) => /\?/.test(line)).length
  const introHits = u.filter((line) =>
    /\b(ik ben|mijn naam|hoi|hallo|dag|heet je|kennis|leuk je|stel me)\b/i.test(line),
  ).length
  const bgHits = u.filter((line) =>
    /\b(woon|werk|kom uit|verhuis|studie|it|kantoor|amsterdam|rotterdam|hier|uit)\b/i.test(line),
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
        ? clamp100(50 + Math.min(28, turnCt * 4) + (uj.length > 90 ? 10 : uj.length > 40 ? 5 : 0))
        : null

  const introScore = turnCt
    ? clamp100(45 + introHits * 18 + Math.min(20, turnCt * 3) + (uj.length > 25 ? 8 : 0))
    : null

  const backgroundScore = turnCt
    ? clamp100(42 + bgHits * 16 + Math.min(18, turnCt * 2) + (/\b(ik|mijn|woon|werk)\b/i.test(uj) ? 10 : 0))
    : null

  const followUpScore = turnCt
    ? clamp100(46 + qHits * 15 + Math.min(22, turnCt * 3))
    : null

  const clarityScores = input.turnEvaluations.map((t) => t.combinedScores.clarityScore).filter((n) => Number.isFinite(n))
  const clarityBlend =
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
      id: 'meeting_new_people_intro_clarity',
      label: 'Introduction clarity · 25%',
      score: introScore != null && clarityBlend != null ? clamp100((introScore + clarityBlend) / 2) : introScore ?? clarityBlend,
      confidence: introHits ? 'high' : turnCt ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        'Could a new person understand who you are and that you are engaging? Weight 25%.',
    },
    {
      id: 'meeting_new_people_background',
      label: 'Background expression · 25%',
      score: backgroundScore,
      confidence: bgHits ? 'high' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Did you share simple personal context (place, work, situation) clearly? Weight 25%.',
    },
    {
      id: 'meeting_new_people_follow_up',
      label: 'Follow-up engagement · 25%',
      score: followUpScore,
      confidence: qHits ? 'high' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        qHits > 0
          ? 'You asked follow-ups or showed curiosity — great for first meetings. Weight 25%.'
          : 'Try one targeted follow-up on what they just said. Weight 25%.',
    },
    {
      id: 'meeting_new_people_flow',
      label: 'Natural flow · 15%',
      score: flowScore,
      confidence: turnCt >= 3 ? 'medium' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning: 'Did the chat feel like a real meet-and-greet — not an exam? Weight 15%.',
    },
    {
      id: 'meeting_new_people_pronunciation',
      label: 'Pronunciation · 10%',
      score: pronunciationScore,
      confidence: pronTurns.length >= Math.ceil(input.turnEvaluations.length / 2) ? 'high' : pronTurns.length ? 'medium' : 'low',
      evidenceType: 'audio',
      verdict: '',
      meaning:
        pronunciationScore != null
          ? 'First impressions also come from how clearly you speak. Weight 10%.'
          : 'No scored audio on this sample — pronunciation omitted until audio is available.',
    },
  ]

  for (const dim of dims) {
    if (dim.score != null && !dim.verdict) dim.verdict = verdictForDisplayScore(dim.score)
  }

  return {
    extraDimensions: dims,
    compositeMeetingNewPeopleScore: compositeFromDimensions(dims),
  }
}

export function buildMeetingNewPeopleRecommendedDrillActions(): Array<{
  type: 'speak_practice'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
}> {
  return [
    {
      type: 'speak_practice',
      title: 'Follow-up question ladder',
      reason: 'Practice three natural Dutch follow-ups (“Hoe lang woon je hier al?”, “Wat doe je precies?”, “Hoe bevalt het?”) with replay + mimic.',
      priority: 'primary',
    },
    {
      type: 'speak_practice',
      title: 'Two-sentence intro + replay',
      reason: 'Say name + one fact, replay the reference clip, then mimic the rhythm.',
      priority: 'secondary',
    },
  ]
}
