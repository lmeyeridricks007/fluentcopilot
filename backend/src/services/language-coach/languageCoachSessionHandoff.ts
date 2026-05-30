import type { LanguageCoachNudgeEvent, LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'
import { topOverusedStems } from './languageCoachSessionMemory'

export type LanguageCoachSessionHandoff = {
  strongestSkillShown: string
  mostRepeatedWeakPattern: string
  bestExampleImprovement: string
  /**
   * Human-readable next-focus copy. May be either session-derived (referencing a real
   * overused word, the session's learning goal, or a concrete weakness pattern) or a generic
   * fallback when no session signal is available. Use `suggestedNextFocusIsSessionDerived`
   * to gate UI surfaces that should only render when there's real signal — e.g. the
   * "More to practice" card that previously dumped generic templates regardless.
   */
  suggestedNextFocus: string
  suggestedNextFocusIsSessionDerived: boolean
  notableNudgeMoments: string[]
}

export function computeLanguageCoachSessionHandoff(input: {
  lc: LanguageCoachPersistedBlob | undefined | null
  userTurnCount: number
  topWeakPatterns: string[]
  /**
   * Positive evidence: number of user turns that actually contained a real follow-up
   * question (`?` plus a Dutch WH-word like wat/hoe/waar/wanneer/wie/waarom/welke).
   * Required so the flattering "follow-up questions felt steady" line is only chosen
   * on real evidence — not just because the `weak_follow_up` heuristic happened to
   * stay silent for a short session.
   *
   * Optional / defaults to 0 for callers that don't compute it (defense in depth: any
   * caller leaving it unset will simply never trigger the optimistic line, which is the
   * safe default).
   */
  userFollowUpQuestionCount?: number
}): LanguageCoachSessionHandoff {
  const lc = input.lc
  const sig = lc?.sessionSignals ?? {}
  const notableNudgeMoments =
    lc?.nudgeEvents?.slice(-8).map((e) => formatNudgeMoment(e)) ?? []

  const fluent = sig.fluent_stretch_turn ?? 0
  const clean = sig.clean_natural_turn ?? 0
  const weakFu = sig.weak_follow_up ?? 0
  const tense = sig.tense_repeat ?? 0
  const grammar = sig.grammar_instability ?? 0
  const followUpQuestionCount = input.userFollowUpQuestionCount ?? 0
  const dominantWeaknessTag = topDominantWeaknessTag(lc?.weaknessHits ?? {})

  let strongestSkillShown = 'You kept speaking actively, which is the foundation.'
  if (input.userTurnCount >= 6) {
    strongestSkillShown = 'You kept the conversation going long enough for real practice.'
  }
  if (fluent >= 2 || clean >= 3) {
    strongestSkillShown = 'You produced several longer, relatively clean sentences, which is good for fluency.'
  }
  /**
   * Tightened: require POSITIVE evidence (>=2 real follow-up questions) before claiming
   * "follow-up questions felt steady". The previous version inferred this from the
   * absence of `weak_follow_up` and `follow_up_gap`, which produced a flattering false
   * positive on short sessions where neither heuristic had enough text to fire (4 short
   * turns with grammar errors looked the same as 4 turns of strong engagement).
   *
   * Also explicitly suppress the optimistic line whenever a real grammar-family
   * weakness (past_tense, word_order, article, question_form, grammar_combo) was the
   * dominant signal — flattering follow-up praise is misleading when the headline
   * growth area is grammar.
   */
  const grammarFamily = new Set(['past_tense', 'word_order', 'article', 'question_form', 'grammar_combo'])
  if (
    followUpQuestionCount >= 2 &&
    input.userTurnCount >= 4 &&
    weakFu === 0 &&
    (lc?.weaknessHits?.follow_up_gap ?? 0) === 0 &&
    !(dominantWeaknessTag && grammarFamily.has(dominantWeaknessTag))
  ) {
    strongestSkillShown = 'Your follow-up questions and engagement felt steady in this stretch.'
  }
  /**
   * If a specific grammar weakness dominated, lead with an honest "what you actually
   * sustained" line instead of the generic "kept speaking actively". The growth-area
   * sentence (rendered by the caller as `coachOneLinerEnglish`) carries the bad-news
   * specificity; this line carries the matching honesty on the strength side.
   */
  if (dominantWeaknessTag && grammarFamily.has(dominantWeaknessTag) && input.userTurnCount >= 3) {
    strongestSkillShown = 'You stayed in Dutch and kept trying real sentences, which is exactly the surface area we need to fix the grammar slips below.'
  }

  const mostRepeatedWeakPattern =
    input.topWeakPatterns[0]?.replace(/\s*\(×\d+\)\s*$/, '') ||
    (tense >= grammar ? 'Past tense / time marking' : grammar > 0 ? 'Grammatical variation' : 'Follow-up / answer length')

  const bestExampleImprovement = pickBestImprovement(lc?.nudgeEvents ?? [])

  const { text: suggestedNextFocus, sessionDerived: suggestedNextFocusIsSessionDerived } =
    pickSuggestedNextFocus(lc, input.topWeakPatterns, tense, grammar, weakFu)

  return {
    strongestSkillShown,
    mostRepeatedWeakPattern,
    bestExampleImprovement,
    suggestedNextFocus,
    suggestedNextFocusIsSessionDerived,
    notableNudgeMoments: notableNudgeMoments.length ? notableNudgeMoments : ['No coach nudges were logged in this session.'],
  }
}

/**
 * Top weakness tag by hit count, ties broken by insertion order (Object.entries preserves it).
 * Used to gate the optimistic "follow-up questions felt steady" line against grammar-dominant
 * sessions where that flattering copy reads as a false positive.
 */
function topDominantWeaknessTag(hits: Record<string, number>): string | null {
  let top: string | null = null
  let topCount = 0
  for (const [tag, count] of Object.entries(hits)) {
    if (!Number.isFinite(count) || count <= 0) continue
    if (count > topCount) {
      top = tag
      topCount = count
    }
  }
  return top
}

function formatNudgeMoment(e: LanguageCoachNudgeEvent): string {
  const rec =
    e.learnerRecoveredLater === true ? ' (recovered later)' : e.learnerRecoveredLater === false ? ' (pattern lingered)' : ''
  const lo = e.learnerOriginal.slice(0, 72) + (e.learnerOriginal.length > 72 ? '…' : '')
  return `${e.nudgeType} [${e.severity}]${rec}: “${lo}”`
}

function pickBestImprovement(events: LanguageCoachNudgeEvent[]): string {
  const recovered = [...events].reverse().find((e) => e.learnerRecoveredLater === true && e.nudgeType === 'RECAST')
  if (recovered) {
    const a = recovered.learnerOriginal.slice(0, 100)
    const b = recovered.coachResponse.slice(0, 120)
    return `Recast moment: from “${a}${recovered.learnerOriginal.length > 100 ? '…' : ''}” to more natural Dutch in the coach line (“${b}${recovered.coachResponse.length > 120 ? '…' : ''}”).`
  }
  const anyRecast = [...events].reverse().find((e) => e.nudgeType === 'RECAST')
  if (anyRecast) {
    return `The coach gave an implicit recast after: “${anyRecast.learnerOriginal.slice(0, 100)}${anyRecast.learnerOriginal.length > 100 ? '…' : ''}”.`
  }
  return 'Keep repeating one fixed sentence out loud each day and mirror the coach line so the form becomes more automatic.'
}

/**
 * Pick a "next focus" line for the report handoff. Returns both the copy and a flag for
 * whether it was derived from real session signal (goal, session-signal weakness, overused
 * vocab stem, or named pattern) vs the generic catch-all fallback. UI surfaces that promise
 * specificity (e.g. "More to practice") should gate on `sessionDerived` so they don't render
 * a generic line that adds no value.
 */
function pickSuggestedNextFocus(
  lc: LanguageCoachPersistedBlob | undefined | null,
  patterns: string[],
  tense: number,
  grammar: number,
  weakFu: number
): { text: string; sessionDerived: boolean } {
  const goal = lc?.conversationGoal ?? 'general'
  const stems = topOverusedStems(lc?.vocabStemHits ?? {}, 4)
  if (goal === 'follow_up_questions' || weakFu >= 2) {
    return {
      text: 'Next session: intentionally ask one follow-up question for every two answers, such as “En jij?” or “Hoe was dat voor jou?”',
      sessionDerived: true,
    }
  }
  if (goal === 'fluency') {
    return {
      text: 'Next session: aim for chunks of 6 to 10 words without pausing, with one idea per sentence.',
      sessionDerived: true,
    }
  }
  if (goal === 'pronunciation') {
    return {
      text: 'Next session: choose 5 key words from the conversation and repeat them slowly three times after the coach.',
      sessionDerived: true,
    }
  }
  if (tense >= grammar && tense >= 2) {
    return {
      text: 'Next session: stay in the past tense only, using topics like the weekend, yesterday, or your last holiday.',
      sessionDerived: true,
    }
  }
  if (grammar >= 2) {
    return {
      text: 'Next session: focus on one grammar point only, either word order or tense, and stay with it for 10 minutes.',
      sessionDerived: true,
    }
  }
  if (stems.length) {
    return {
      text: `Next session: vary your synonyms around “${stems[0]}”. Broader vocabulary also trains grammar indirectly.`,
      sessionDerived: true,
    }
  }
  if (patterns[1]) {
    return {
      text: `Extra attention for: ${patterns[1]!.replace(/\s*\(×\d+\)\s*$/, '')}.`,
      sessionDerived: true,
    }
  }
  return {
    text: 'Next session: repeat this mode with the same learning goal and pay attention to one micro-point each round.',
    sessionDerived: false,
  }
}
