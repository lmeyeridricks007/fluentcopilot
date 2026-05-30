import type { SpeakLivePhase } from './speakLiveFsm'
import type { SpeakLiveSignals } from './speakLiveFsm'
import { detectTrainStationSlots, scenarioGoalIndexesFromTrainHits } from './trainStationSlotState'
import { normalizeTrainStationUtterance } from './trainStationTranscriptNormalize'

/** Normalized text for cheap pattern checks (Dutch learner lines). */
export function normalizeLearnerUtterance(raw: string): string {
  return normalizeTrainStationUtterance(raw)
}

export type GroundedSpeakLivePatch = {
  /** 0-based scenario goal indices matched from the learner line. */
  goalIndexesCompleted: number[]
  /** Short English labels for logging / prompts. */
  intentLabels: string[]
  /** English clauses the orchestrator treats as verified facts. */
  englishFactLines: string[]
  /**
   * Low-confidence pattern hints (`possible` tier only). Never drives goal completion
   * or `suggestExecution`; surfaced for prompts / rolling summary context.
   */
  softIntentHints: string[]
  /** When true, prefer moving into execution once the FSM allows it. */
  suggestExecution: boolean
}

export function emptyGroundingPatch(): GroundedSpeakLivePatch {
  return { goalIndexesCompleted: [], intentLabels: [], englishFactLines: [], softIntentHints: [], suggestExecution: false }
}

/**
 * Deterministic grounding for `train-station`: delegates to slot detector, maps to scenario goal indices.
 */
/** Heuristic: learner is directing a question at the assistant (reciprocity — answer before new interview questions). */
function meetingNewPeopleLearnerAskedYouSomething(normalized: string, rawTrimmed: string): boolean {
  if (/\?\s*$/.test(rawTrimmed)) return true
  if (
    /\b(ben je|ben jij|heb je|had je|doe je|werk je|werk jij|woon je|woon jij|kom je|ga je|wil je|wil jij|kun je|kan je|mag ik|hoe heet je|hoe lang|wat doe je|wat doe jij|waar werk je|waar werk jij|waar woon je|waar woon jij|wie ben je|ken je|ken jij|wist je|weet je)\b/i.test(
      normalized,
    )
  ) {
    return true
  }
  // "Vind je … leuk?" / "vind je het hier fijn" — but not statements like "ik vind je aardig".
  if (/\bik\s+vind\s+je\b/i.test(normalized)) return false
  return /\bvind (je|jij)\b/i.test(normalized) && /\b(leuk|mooi|fijn|goed|het|dit|dat)\b/i.test(normalized)
}

/** Dutch / mixed learner lines: origin (no re-ask) + questions to you (answer first). */
function groundMeetingNewPeopleTurn(userText: string): GroundedSpeakLivePatch {
  const t = normalizeLearnerUtterance(userText)
  const rawTrimmed = userText.trim()
  if (!t || t.length < 2) return emptyGroundingPatch()

  const uitStop = new Set([
    'de',
    'het',
    'een',
    'dit',
    'die',
    'dat',
    'mijn',
    'jouw',
    'zijn',
    'haar',
    'ons',
    'hun',
    'welke',
    'deze',
    'elke',
    'alle',
    'zo',
    'ervoor',
    'hier',
    'daar',
    'gisteren',
    'morgen',
    'vandaag',
  ])
  const uitPlace = t.match(/\buit\s+([a-z0-9]{2,40})\b/)
  const uitLooksLikePlace = Boolean(uitPlace && !uitStop.has(uitPlace[1]))

  const benVanOrigin =
    /\bben\s+van\s+(plan|mening|tweede|hier|daar|gisteren|morgen)\b/.test(t) === false &&
    /\bben\s+van\s+[a-z]{3,}\b/.test(t)

  const statedOrigin =
    /\b(ik\s*)?kom\s+uit\b/.test(t) ||
    /\b(ik\s*)?kom\s+van\b/.test(t) ||
    /\b(ik\s*)?ben\s+uit\b/.test(t) ||
    benVanOrigin ||
    /\b(ik\s*)?woon\s+in\b/.test(t) ||
    /\bzuid\s*afrika\b/.test(t) ||
    /\bsouth\s+africa\b/.test(t) ||
    uitLooksLikePlace

  const askedYou = meetingNewPeopleLearnerAskedYouSomething(t, rawTrimmed)

  if (!statedOrigin && !askedYou) return emptyGroundingPatch()

  const intentLabels: string[] = []
  const englishFactLines: string[] = []
  const excerpt = rawTrimmed.replace(/\s+/g, ' ').slice(0, statedOrigin && askedYou ? 80 : 110)

  if (statedOrigin) {
    intentLabels.push('learner_stated_origin_or_home')
    englishFactLines.push(
      `Learner stated origin/home ("${excerpt}"). Do not re-ask where they are from; acknowledge briefly in Dutch, then a different follow-up—not another place question.`,
    )
  }
  if (askedYou) {
    intentLabels.push('learner_asked_assistant_question')
    englishFactLines.push(
      `Learner asked you ("${excerpt}"). Answer in Dutch in-role first; do not skip to question-only reply; then ≤1 optional follow-up or reaction-only.`,
    )
  }

  return {
    goalIndexesCompleted: [],
    intentLabels,
    englishFactLines,
    softIntentHints: [],
    suggestExecution: false,
  }
}

export function groundTrainStationTurn(userText: string, transcriptTurnId: string): GroundedSpeakLivePatch {
  const t = normalizeLearnerUtterance(userText)
  if (!t) return emptyGroundingPatch()

  const { hits, possibleHits } = detectTrainStationSlots(userText, transcriptTurnId)
  const goalIndexesCompleted = scenarioGoalIndexesFromTrainHits(hits)
  const intentLabels = hits.map((h) => h.goalId)
  const englishFactLines = hits.map((h) => {
    const label = h.goalId.replace(/_/g, ' ').toLowerCase()
    return `The learner ${label} (evidence: "${h.matchedText.slice(0, 120)}").`
  })
  const softIntentHints = possibleHits.map(
    (h) => `Possible ${h.goalId} (${h.matchTier ?? 'possible'}): "${h.matchedText.slice(0, 80)}"`
  )

  return {
    goalIndexesCompleted,
    intentLabels,
    englishFactLines,
    softIntentHints,
    suggestExecution: goalIndexesCompleted.length > 0,
  }
}

export function groundSpeakLiveUserTurn(
  scenarioSlug: string,
  userText: string,
  transcriptTurnId: string = 'pending'
): GroundedSpeakLivePatch {
  const slugNorm = scenarioSlug.trim().toLowerCase().replace(/-/g, '_')
  if (slugNorm === 'train_station') return groundTrainStationTurn(userText, transcriptTurnId)
  if (slugNorm === 'meeting_new_people') return groundMeetingNewPeopleTurn(userText)
  return emptyGroundingPatch()
}

export function formatGroundingForPrompt(patch: GroundedSpeakLivePatch): string | null {
  const hasVerified = patch.englishFactLines.length > 0 || patch.intentLabels.length > 0
  const hasSoft = (patch.softIntentHints?.length ?? 0) > 0
  if (!hasVerified && !hasSoft) return null
  const lines: string[] = hasVerified
    ? ['Orchestrator-verified from the latest learner Dutch line (must not contradict):']
    : ['Orchestrator could not confirm intents from the latest learner Dutch line; treat as unverified pattern hints only:']
  if (patch.intentLabels.length) {
    lines.push(`- Intents: ${patch.intentLabels.join(', ')}`)
  }
  for (const f of patch.englishFactLines) {
    lines.push(`- ${f}`)
  }
  if (hasSoft) {
    lines.push(`- Soft (unverified) hints: ${(patch.softIntentHints ?? []).join(' | ')}`)
  }
  lines.push('Answer the learner directly in Dutch; reflect these facts in speakLiveSignals.rollingSummaryEnglish.')
  return lines.join('\n')
}

/**
 * Merges deterministic grounding with model `speakLiveSignals` before FSM update.
 * Model fields are kept unless grounding overrides ambiguity (e.g. needsClarification).
 */
export function mergeSpeakLiveSignalsWithGrounding(params: {
  model: SpeakLiveSignals | null | undefined
  patch: GroundedSpeakLivePatch
  scenarioGoalCount: number
  phase: SpeakLivePhase
}): SpeakLiveSignals | null {
  const { model, patch, scenarioGoalCount, phase } = params
  const goalCount = Math.max(0, scenarioGoalCount)
  const out: SpeakLiveSignals = { ...(model ?? {}) }

  const safeIdx = patch.goalIndexesCompleted.filter((i) => typeof i === 'number' && i >= 0 && i < goalCount)
  const mergedGoals = new Set<number>([...(out.goalIndexesCompleted ?? []), ...safeIdx])
  out.goalIndexesCompleted = [...mergedGoals].sort((a, b) => a - b)

  if (patch.intentLabels.length) {
    const prev = out.intentLabel?.trim()
    const next = [prev, ...patch.intentLabels].filter(Boolean).join('; ')
    out.intentLabel = next.slice(0, 200)
  }

  if (patch.goalIndexesCompleted.length > 0) {
    out.needsClarification = false
    if (phase === 'intent_detection' || phase === 'clarification') {
      out.nextPhase = 'execution'
    }
  }

  const rollParts: string[] = []
  if (patch.englishFactLines.length) {
    rollParts.push(`Verified learner facts: ${patch.englishFactLines.join(' ')}`)
  }
  const soft = patch.softIntentHints ?? []
  if (soft.length > 0) {
    rollParts.push(`Possible (do not treat as confirmed): ${soft.join(' | ')}`)
  }
  if (rollParts.length) {
    const prefix = `${rollParts.join(' ')} `
    const roll = out.rollingSummaryEnglish?.trim() ?? ''
    out.rollingSummaryEnglish = (prefix + roll).slice(0, 4000)
  }

  const hasAny =
    (out.goalIndexesCompleted?.length ?? 0) > 0 ||
    out.nextPhase != null ||
    out.rollingSummaryEnglish != null ||
    out.intentLabel != null ||
    out.needsClarification != null ||
    out.advancePrimaryGoal != null ||
    out.readyForClosing != null

  return hasAny ? out : null
}
