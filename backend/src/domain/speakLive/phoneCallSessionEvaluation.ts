import type { ConversationMessage } from '../../models/contracts'
import type {
  PhoneCallPerformance,
  PhoneCallSentenceMoment,
  ScoredDimension,
  TurnEvaluation,
} from '../../services/speak-live/liveVoiceEvaluationTypes'

const REPAIR_RE =
  /\b(herhalen|herhaal|nog\s*een\s*keer|langzamer|begrijp\s+het\s+niet|begrijp\s+u\s+mij|sorry|pardon|bedoelt\s+u|even\s+checken|klopt\s+het|is\s+het\s+goed\s+zo|wat\s+zegt\s+u|langzaam\s+alstublieft)\b/i

const CONFIRM_RE =
  /\b(klopt(\s+dat|\s+het)?|dat\s+klopt|begrepen|begrijp\s+ik\s+het\s+goed|dus\s+ik|even\s+controleren|ter\s+bevestiging|is\s+het\s+goed\s+zo|goed\s+zo|als\s+ik\s+het\s+goed|snap\s+ik|correct|juist|oke\b|oké)\b/i

const DETAIL_HINT_RE =
  /\d|\beuro\b|\u20ac|\buur\b|\btijd\b|\bpostcode\b|\bstraat\b|\bhuisnummer\b|\bafspraak\b|\bmorgen\b|\bvandaag\b|\btelefoon\b|\bnummer\b/i

/** Canonical weights for session-level phone dimensions (sums to 1). */
export const PHONE_CALL_WEIGHT_BY_DIMENSION: Record<string, number> = {
  phone_listening_comprehension: 0.3,
  phone_repair_skill: 0.25,
  phone_response_clarity: 0.2,
  phone_confirmation_skill: 0.15,
  phone_pronunciation: 0.1,
}

export const PHONE_CALL_WEIGHTS_SUMMARY =
  'Listening 30% · Repair 25% · Clarity 20% · Confirmation 15% · Pronunciation 10%'

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

export function findPrecedingAssistantLine(messages: ConversationMessage[], userMessageId: string): string {
  const idx = messages.findIndex((m) => m.id === userMessageId && m.sender === 'user')
  if (idx <= 0) return ''
  for (let j = idx - 1; j >= 0; j--) {
    if (messages[j].sender === 'assistant') return messages[j].content.trim()
  }
  return ''
}

function gistEnglishFromAssistantDutch(nl: string): string {
  const t = nl.trim()
  if (!t) return 'Listen for who is speaking, what they want, and any concrete detail you must answer.'
  if (/\?/.test(t)) return 'They asked a direct question — register the topic, then answer that point in one short line.'
  if (/\d{1,2}[.:]\d{2}/.test(t) || /\buur\b/i.test(t)) return 'Time was mentioned or implied — confirm or repeat the slot clearly.'
  if (/\beuro\b|\u20ac/i.test(t)) return 'Money or price appeared — catch the amount or ask for a slower repeat.'
  if (/\b(adres|postcode|straat|huisnummer|plaats)\b/i.test(t)) return 'Address or place details — hold the street, postcode, or city fragment they gave.'
  if (/\b(morgen|vandaag|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|afspraak)\b/i.test(t)) {
    return 'Scheduling language — note the day or appointment fragment before you answer.'
  }
  return 'They advanced the call (reason, slot, or policy). Answer the thread briefly, or ask for repetition if needed.'
}

function expectedUnderstandingForTurn(turn: TurnEvaluation, assistantNl: string): string {
  const hints = (turn.compareListenFor ?? []).map((s) => s.trim()).filter(Boolean)
  if (hints.length) return hints.join(' ')
  return gistEnglishFromAssistantDutch(assistantNl)
}

function idealHintNl(turn: TurnEvaluation): string | null {
  const nw = turn.naturalRewrite?.improved?.trim()
  if (nw) return nw
  const native = turn.sentenceGroundedReview?.nativePhrase?.trim()
  if (native) return native
  return null
}

function shouldFlagCatchMoment(assistantNl: string, learnerNl: string, contextualFit: number): boolean {
  const learner = learnerNl.trim()
  const asst = assistantNl.trim()
  if (!asst || !learner) return false
  const userWords = learner.split(/\s+/).filter(Boolean).length
  if (CONFIRM_RE.test(learner) && contextualFit >= 65) return false
  if (contextualFit > 0 && contextualFit < 68) return true
  if (DETAIL_HINT_RE.test(asst) && userWords < 4 && !REPAIR_RE.test(learner) && !CONFIRM_RE.test(learner)) return true
  if (/\?/.test(asst) && userWords < 3 && !REPAIR_RE.test(learner)) return true
  return false
}

function compareNoteEnglish(params: {
  assistantNl: string
  learnerNl: string
  didYouCatchThis: boolean
}): string {
  const { assistantNl, learnerNl, didYouCatchThis } = params
  if (!assistantNl.trim()) {
    return 'Open with a clear Dutch greeting and purpose, then listen for the agent’s first move.'
  }
  if (!didYouCatchThis) {
    return 'Your reply matches the weight of what they said; tighten wording only if anything still felt fuzzy.'
  }
  if (REPAIR_RE.test(learnerNl)) {
    return 'You signalled confusion — good phone habit. Next time add what you missed (time, name, amount, or date).'
  }
  return 'Compared with their line, your answer looks thin on the detail they gave — replay once, then echo the key fact or ask for repetition.'
}

export function buildPhoneCallSentenceMoments(
  messages: ConversationMessage[],
  turnEvaluations: TurnEvaluation[],
): PhoneCallSentenceMoment[] {
  const ordered = turnEvaluations.slice().sort((a, b) => a.turnIndex - b.turnIndex)
  const out: PhoneCallSentenceMoment[] = []
  for (const turn of ordered) {
    const assistantSaidNl = findPrecedingAssistantLine(messages, turn.turnId)
    const learnerSaidNl = turn.learnerTranscript.trim()
    const expectedUnderstandingEn = expectedUnderstandingForTurn(turn, assistantSaidNl)
    const idealResponseHintNl = idealHintNl(turn)
    const didYouCatchThis = shouldFlagCatchMoment(
      assistantSaidNl,
      learnerSaidNl,
      turn.languageScores.contextualFit,
    )
    out.push({
      turnIndex: turn.turnIndex,
      turnId: turn.turnId,
      assistantSaidNl,
      learnerSaidNl,
      expectedUnderstandingEn,
      idealResponseHintNl,
      didYouCatchThis,
      compareNoteEn: compareNoteEnglish({
        assistantNl: assistantSaidNl,
        learnerNl: learnerSaidNl,
        didYouCatchThis,
      }),
    })
  }
  return out
}

function compositePhoneScoreFromDimensions(dims: ScoredDimension[]): number | null {
  let sum = 0
  let weightUsed = 0
  for (const d of dims) {
    const w = PHONE_CALL_WEIGHT_BY_DIMENSION[d.id]
    if (w == null || d.score == null) continue
    sum += d.score * w
    weightUsed += w
  }
  if (weightUsed <= 0) return null
  return clamp100(sum / weightUsed)
}

/**
 * Session-level dimensions + per-line “ear check” moments for `phone_call`.
 * Evidence is transcript + turn scores (no extra LLM).
 */
export function buildPhoneCallPerformance(input: {
  messages: ConversationMessage[]
  turnEvaluations: TurnEvaluation[]
}): Pick<PhoneCallPerformance, 'compositePhoneScore' | 'sentenceMoments'> & { extraDimensions: ScoredDimension[] } {
  const u = input.turnEvaluations.map((t) => t.learnerTranscript.trim()).filter(Boolean)
  const uj = u.join(' ')
  const repairHits = u.filter((line) => REPAIR_RE.test(line)).length
  const confirmHits = u.filter((line) => CONFIRM_RE.test(line)).length

  const contextualFits = input.turnEvaluations
    .map((t) => t.languageScores.contextualFit)
    .filter((n) => Number.isFinite(n) && n > 0)
  const listeningFromTurns =
    contextualFits.length > 0
      ? clamp100(contextualFits.reduce((a, b) => a + b, 0) / contextualFits.length)
      : null
  const listeningScore =
    listeningFromTurns != null
      ? listeningFromTurns
      : u.length
        ? clamp100(58 + Math.min(28, u.length * 4) + (uj.length > 120 ? 10 : uj.length > 40 ? 5 : 0))
        : null

  const repairScore = u.length ? clamp100(52 + repairHits * 18 + (REPAIR_RE.test(uj) ? 12 : 0)) : null

  const clarityScores = input.turnEvaluations.map((t) => t.combinedScores.clarityScore).filter((n) => Number.isFinite(n))
  const clarityScore =
    clarityScores.length > 0 ? clamp100(clarityScores.reduce((a, b) => a + b, 0) / clarityScores.length) : null

  const confirmationScore = u.length
    ? clamp100(48 + confirmHits * 20 + (CONFIRM_RE.test(uj) ? 18 : 0) + (uj.length > 30 ? 6 : 0))
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
      id: 'phone_listening_comprehension',
      label: 'Listening comprehension · 30%',
      score: listeningScore,
      confidence: u.length >= 2 ? 'medium' : u.length ? 'low' : 'low',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        (listeningFromTurns != null
          ? 'Averaged how well each reply fit what the agent asked — proxy for “did you hear the point?”. '
          : 'Short sample: scores lean on participation; add more turns for a steadier listen score. ') +
        'Weight 30% in the phone performance blend.',
    },
    {
      id: 'phone_repair_skill',
      label: 'Repair skill · 25%',
      score: repairScore,
      confidence: repairHits ? 'high' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        repairHits > 0
          ? 'You asked for repetition or signalled trouble — essential on real Dutch phone lines. Weight 25%.'
          : 'Practice one reliable repair line (“Sorry, kunt u dat herhalen?”) so confusion never stalls the call. Weight 25%.',
    },
    {
      id: 'phone_response_clarity',
      label: 'Response clarity · 20%',
      score: clarityScore,
      confidence: 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        'How crisp and information-dense your answers were across turns (clarity score blend). Weight 20%.',
    },
    {
      id: 'phone_confirmation_skill',
      label: 'Confirmation skill · 15%',
      score: confirmationScore,
      confidence: confirmHits ? 'high' : 'medium',
      evidenceType: 'transcript',
      verdict: '',
      meaning:
        confirmHits > 0
          ? 'You echoed or checked understanding — good habit before hanging up or agreeing to a slot. Weight 15%.'
          : 'Add brief check-backs (“Dus morgen om tien uur, klopt dat?”) when numbers or times appear. Weight 15%.',
    },
    {
      id: 'phone_pronunciation',
      label: 'Pronunciation · 10%',
      score: pronunciationScore,
      confidence: pronTurns.length >= Math.ceil(input.turnEvaluations.length / 2) ? 'high' : pronTurns.length ? 'medium' : 'low',
      evidenceType: 'audio',
      verdict: '',
      meaning:
        pronunciationScore != null
          ? 'Session average of scored lines — delivery still matters when the agent cannot see you. Weight 10%.'
          : 'No scored audio clips on this sample — pronunciation is omitted from the weighted blend until audio is available.',
    },
  ]

  for (const dim of dims) {
    if (dim.score != null && !dim.verdict) dim.verdict = verdictForDisplayScore(dim.score)
  }

  return {
    extraDimensions: dims,
    compositePhoneScore: compositePhoneScoreFromDimensions(dims),
    sentenceMoments: buildPhoneCallSentenceMoments(input.messages, input.turnEvaluations),
  }
}

export function buildPhoneCallRecommendedDrillActions(): Array<{
  type: 'speak_practice'
  title: string
  reason: string
  priority: 'primary' | 'secondary'
}> {
  return [
    {
      type: 'speak_practice',
      title: 'Repair phrases — speak aloud',
      reason: 'Drill 4 Dutch phone repair lines until they feel automatic under pressure.',
      priority: 'primary',
    },
    {
      type: 'speak_practice',
      title: 'Listen–replay–mimic',
      reason: 'Replay the last assistant audio once, then say the same sentence in your own words.',
      priority: 'secondary',
    },
  ]
}
