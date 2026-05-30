import type { LanguageCoachNudgeEvent, LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'
import type { LanguageCoachPendingNudgePlan } from '../../domain/speakLive/languageCoachSessionTypes'
import {
  buildGuideRepeatPromptDirective,
  decideLanguageCoachNudge,
  issueTypesFromTags,
} from './languageCoachNudgeEngine'
import {
  bumpSessionSignals,
  mergeTopicsTokensMentioned,
  mergeVocabStemHits,
} from './languageCoachSessionMemory'
import { updateLearnerPinnedLessonFocus } from './languageCoachLessonPin'

const MAX_FACTS = 12
const MAX_NUDGE_EVENTS = 48
const MAX_LEAD_INS = 6
const MAX_GUIDE_REPEAT_ATTEMPTS = 3

function bump(hits: Record<string, number>, key: string, n = 1) {
  hits[key] = (hits[key] ?? 0) + n
}

function updateRecoveryOnLatestOpenNudge(
  events: LanguageCoachNudgeEvent[],
  currentIssueKinds: string[]
): LanguageCoachNudgeEvent[] {
  let lastOpen = -1
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]!.learnerRecoveredLater === null) {
      lastOpen = i
      break
    }
  }
  if (lastOpen < 0) return events
  const target = events[lastOpen]!
  const overlap = target.detectedIssueTypes.some((t) => currentIssueKinds.includes(t))
  const updated = { ...target, learnerRecoveredLater: !overlap }
  return events.map((e, i) => (i === lastOpen ? updated : e))
}

const ISSUE_TAG_MAP: Record<string, string[]> = {
  tense_issue: ['past_tense'],
  word_order_issue: ['word_order'],
  article_preposition_issue: ['article'],
  question_form_issue: ['question_form'],
  weak_follow_up: ['follow_up_gap'],
  simple_structure_overuse: ['simple_repeat', 'short_fragments'],
  word_choice_issue: ['wrong_word_choice', 'english_fallback'],
  low_clarity: ['low_clarity', 'short_fragments'],
}

function asksToContinue(userText: string): boolean {
  const t = userText.trim().toLowerCase()
  if (!t) return false
  return /^(ok|okay|prima|goed|top)[,.!\s]*(ga door|ga verder|verder|doorgaan|verder gaan)$/.test(t) ||
    /\b(ga door|ga verder|kunnen we verder|laten we verder gaan|doorgaan|continue|please continue|let's continue)\b/.test(t)
}

function normalizeForCompare(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function orderedTokenCoverage(targetLine: string, userText: string): number {
  const target = normalizeForCompare(targetLine)
  const user = normalizeForCompare(userText)
  if (!target.length || !user.length) return 0
  let matched = 0
  let userIdx = 0
  for (const tok of target) {
    while (userIdx < user.length && user[userIdx] !== tok) userIdx += 1
    if (userIdx < user.length) {
      matched += 1
      userIdx += 1
    }
  }
  return matched / target.length
}

function issuesStillPresent(issueTypes: string[], tagsThisTurn: string[]): boolean {
  return issueTypes.some((issue) => (ISSUE_TAG_MAP[issue] ?? []).some((tag) => tagsThisTurn.includes(tag)))
}

function isMostlyCorrectRepeat(params: {
  targetLine: string
  userText: string
  issueTypes: string[]
  tagsThisTurn: string[]
  learnerCefr?: string | null
}): boolean {
  const coverage = orderedTokenCoverage(params.targetLine, params.userText)
  const stillPresent = issuesStillPresent(params.issueTypes, params.tagsThisTurn)
  const cefr = (params.learnerCefr ?? '').toUpperCase()
  const threshold = cefr === 'B1' || cefr === 'B2' ? 0.8 : cefr === 'A2' ? 0.66 : 0.6
  if (coverage >= 0.92) return true
  if (coverage >= threshold && !stillPresent) return true
  return false
}

function extractGuideRepeatTargetLine(assistantText: string): string | null {
  const compact = assistantText.replace(/\s+/g, ' ').trim()
  const patterns = [
    /Zeg precies:\s*"([^"]+)"/i,
    /Zeg precies:\s*“([^”]+)”/i,
    /Nog eens:\s*"([^"]+)"/i,
    /Nog eens:\s*“([^”]+)”/i,
    /Herhaal(?:\s+precies)?:\s*"([^"]+)"/i,
    /Herhaal(?:\s+precies)?:\s*“([^”]+)”/i,
  ]
  for (const pattern of patterns) {
    const match = compact.match(pattern)
    const target = match?.[1]?.replace(/\s+/g, ' ').trim()
    if (target) return target.slice(0, 240)
  }
  return null
}

/**
 * Past participles of motion / state-change verbs that REQUIRE `zijn` as the auxiliary.
 * Learners commonly default to `hebben` (English-style), producing slips like
 * "ik heb gegaan" / "ik heb geweest" — high-precision perfectum error signal.
 *
 * Sourced from the standard A2 / B1 "zijn-verbs" inventory most teaching materials list.
 */
const ZIJN_PARTICIPLES = [
  'gegaan', 'gekomen', 'geweest', 'gebleven', 'gevallen', 'gevlogen',
  'gereisd', 'gevaren', 'gestapt', 'gestorven', 'geworden',
  'opgestaan', 'aangekomen', 'vertrokken', 'verhuisd', 'gegroeid',
  'gestart', 'begonnen', 'gerend', 'gefietst',
]

/**
 * Past participles of common transitive / action verbs that REQUIRE `hebben`. Learners
 * sometimes over-generalize `zijn` from the motion-verbs list, producing slips like
 * "ik ben gewerkt" / "ik ben gegeten".
 */
const HEBBEN_PARTICIPLES = [
  'gewerkt', 'gegeten', 'gedronken', 'gelezen', 'gemaakt', 'gezegd',
  'gezien', 'gehoord', 'gewacht', 'gewoond', 'gezocht', 'gekookt',
  'geschreven', 'gevonden', 'gespeeld', 'geprobeerd', 'geleerd',
  'gestudeerd', 'gekeken', 'gevraagd', 'geantwoord', 'gemerkt',
  'gehouden', 'gepraat', 'gegeven', 'gehad', 'gewassen', 'gedaan',
  'gebruikt', 'gebracht', 'gekocht',
]

const SUBJECT_PRONOUNS_RX = '(?:ik|jij|je|u|hij|zij|ze|wij|we|jullie)'
const HEBBEN_FORMS_RX = '(?:heb|hebt|heeft|hebben)'
const ZIJN_FORMS_RX = '(?:ben|bent|is|zijn|was|waren)'
const ZIJN_PARTICIPLES_RX = ZIJN_PARTICIPLES.join('|')
const HEBBEN_PARTICIPLES_RX = HEBBEN_PARTICIPLES.join('|')

/**
 * Wrong auxiliary: `hebben` used with a participle that needs `zijn`.
 *   "ik heb gegaan naar de winkel"  →  should be "ik ben gegaan …"
 *   "we hebben geweest in Parijs"   →  should be "we zijn geweest …"
 * Up to ~80 non-sentence-terminator chars between subject and participle so the rule
 * still fires on natural sentences with adverbs / objects in between.
 */
const WRONG_HEBBEN_WITH_MOTION_RX = new RegExp(
  `\\b${SUBJECT_PRONOUNS_RX}\\s+${HEBBEN_FORMS_RX}\\b[^.!?]{0,80}\\b(?:${ZIJN_PARTICIPLES_RX})\\b`,
  'i',
)

/**
 * Wrong auxiliary: `zijn` used with a participle that needs `hebben`.
 *   "ik ben gewerkt vandaag"  →  should be "ik heb gewerkt vandaag"
 */
const WRONG_ZIJN_WITH_TRANSITIVE_RX = new RegExp(
  `\\b${SUBJECT_PRONOUNS_RX}\\s+${ZIJN_FORMS_RX}\\b[^.!?]{0,80}\\b(?:${HEBBEN_PARTICIPLES_RX})\\b`,
  'i',
)

/**
 * Bare infinitive in a perfectum slot:
 *   "ik heb werken"  →  should be "ik heb gewerkt"
 *   "we zijn maken"  →  should be "we hebben gemaakt"
 * Strict: requires the auxiliary directly followed (within 3 intervening tokens) by a
 * known infinitive in the place a participle belongs. Keeps false positives down on
 * legitimate present-tense / modal constructions.
 */
const INFINITIVE_IN_PERFECTUM_SLOT_RX =
  /\b(?:heb|hebt|heeft|hebben|ben|bent|is|zijn)\s+(?:\w+\s+){0,3}(?:werken|eten|drinken|maken|zien|horen|kopen|geven|spreken|leren|studeren|spelen|wonen|wachten|koken|denken|lezen|schrijven|vinden|doen|gaan|komen)\b/i

/**
 * Present-tense verb paired with an unambiguous past time marker:
 *   "gisteren ik werk"  /  "ik ga vorige week naar Amsterdam"
 * High-signal imperfectum/perfectum slip. We check both orderings.
 */
/**
 * Note on auxiliary exclusion: `ben/bent/is/zijn` are intentionally NOT in this list even
 * though they are present-tense forms — they double as perfectum auxiliaries ("gisteren
 * **ben** ik gegaan"), so listing them would false-positive on correct perfectum sentences.
 * The wrong-auxiliary cases involving these forms are already covered by
 * `WRONG_ZIJN_WITH_TRANSITIVE_RX`.
 */
const PRESENT_VERB_WITH_PAST_MARKER_RX =
  /\b(?:gisteren|vorige week|vorig jaar|vorig weekend|toen|laatst|vroeger|verleden week|verleden jaar|eergisteren)\b[^.!?]{0,40}\b(?:ga|gaat|gaan|werk|werkt|werken|eet|eten|drink|drinkt|drinken|maak|maakt|maken|zie|ziet|zien|hoor|hoort|horen|koop|koopt|kopen|woon|woont|wonen|wacht|wachten|kom|komt|komen)\b/i
const PRESENT_VERB_BEFORE_PAST_MARKER_RX =
  /\b(?:ga|gaat|gaan|werk|werkt|werken|eet|eten|drink|drinkt|drinken|maak|maakt|maken|zie|ziet|zien|hoor|hoort|horen|koop|koopt|kopen|woon|woont|wonen|wacht|wachten|kom|komt|komen)\b[^.!?]{0,40}\b(?:gisteren|vorige week|vorig jaar|vorig weekend|toen|laatst|vroeger|verleden week|verleden jaar|eergisteren)\b/i

/**
 * English past-tense phrases the learner reached for instead of Dutch — counts as both
 * `english_fallback` (handled separately below) and a `past_tense` signal because the
 * intended utterance was about the past.
 */
const ENGLISH_PAST_TENSE_REACH_RX =
  /\b(i went|i saw|i did|i ate|i drank|i made|i wrote|i bought|i have been|i had been|have you been|did you go)\b/i

/** Lightweight Dutch/learner-line heuristics — no LLM on hot path. */
export function detectLanguageCoachWeaknessSignals(userText: string): {
  tags: string[]
  newFactLinesEnglish: string[]
  focusChip: string | null
} {
  const t = userText.trim()
  const lower = t.toLowerCase()
  const tags: string[] = []
  if (!t) return { tags: [], newFactLinesEnglish: [], focusChip: null }

  /**
   * Past-tense detection — three layers, in increasing specificity:
   *   1. English time-marker reach (legacy rule; learner reverted to English vocab).
   *   2. Direct English past-tense phrases ("i went", "i saw" …).
   *   3. Real Dutch perfectum/imperfectum slips: wrong auxiliary (hebben↔zijn), bare
   *      infinitive in a perfectum slot, present-tense verb with a past time marker.
   * Each layer is independent (any one tag is enough). The original "English time-marker
   * reach" rule is kept verbatim so we don't regress on existing test fixtures.
   */
  if (/\b(i go|yesterday|tomorrow|last week|next week)\b/i.test(t) && !/\b(gisteren|morgen|vorige week|volgende week|ben geweest|ging|gaan)\b/i.test(t)) {
    tags.push('past_tense')
  }
  if (ENGLISH_PAST_TENSE_REACH_RX.test(lower)) {
    tags.push('past_tense')
    tags.push('english_fallback')
  }
  if (WRONG_HEBBEN_WITH_MOTION_RX.test(lower)) {
    tags.push('past_tense')
  }
  if (WRONG_ZIJN_WITH_TRANSITIVE_RX.test(lower)) {
    tags.push('past_tense')
  }
  if (INFINITIVE_IN_PERFECTUM_SLOT_RX.test(lower)) {
    tags.push('past_tense')
  }
  if (PRESENT_VERB_WITH_PAST_MARKER_RX.test(lower) || PRESENT_VERB_BEFORE_PAST_MARKER_RX.test(lower)) {
    tags.push('past_tense')
  }
  if (/\b(i no |i not |i don't|can't|won't)\b/i.test(t)) {
    tags.push('english_fallback')
  }
  if (/\b(ik ben gaan|ik heb gaan|ik wil gaan naar ben)\b/i.test(lower)) {
    tags.push('word_order')
  }
  if (/\b(de het)\b/i.test(lower) && /het huis|de huis/i.test(t)) {
    tags.push('article')
  }
  if (t.length < 18 && !/[.!?]/.test(t) && lower.split(/\s+/).length < 5) {
    tags.push('short_fragments')
  }
  if (lower.split(/\s+/).length <= 3 && t.length < 36) {
    tags.push('low_clarity')
  }
  if (/\b(how much is|what time is|where is you|who is you)\b/i.test(t)) {
    tags.push('question_form')
  }
  if (/\b(wat je|hoe je)\s+(ga|wil|kan|moet)\b/i.test(lower) && /\?/.test(t)) {
    tags.push('question_form')
  }
  if (/\b(ik ben)\s+(hier|daar)\s+(gisteren|morgen)\b/i.test(lower)) {
    tags.push('word_order')
  }
  if (/\b(little bit|maybe i|i think so)\b/i.test(lower) && !/\b(beetje|misschien|ik denk)\b/i.test(lower)) {
    tags.push('wrong_word_choice')
  }
  /** Anglicisms / English verbs dressed as Dutch — common “wrong on purpose” practice lines. */
  if (
    /\b(learnen|understanden|speaken|practisen|studieren)\b/i.test(lower) &&
    /\b(ik|jij|je|wij|we|mijn|de|het|een|niet|met|voor)\b/i.test(lower)
  ) {
    tags.push('wrong_word_choice')
  }
  if (/\b(ik go\b|ik come\b|ik make\b|ik have\b|ik want\b|i want to|i need to|i like to|i am going)\b/i.test(lower)) {
    tags.push('wrong_word_choice')
    tags.push('english_fallback')
  }
  /** Classic article / agreement slips. */
  if (/\bde huis\b/i.test(lower) || /\bde boek\b/i.test(lower) || /\bhet auto\b/i.test(lower)) {
    tags.push('article')
  }
  /** Word-order slip: adjective before object (“ik vind leuk voetbal”). */
  if (/\bik vind leuk\b/i.test(lower)) {
    tags.push('word_order')
  }
  if (/\b(um|uh|eh|euh|nou ja|zeg maar)\b/i.test(lower)) {
    tags.push('hesitation')
  }

  const grammarOrChoiceTags = new Set([
    'past_tense',
    'word_order',
    'article',
    'question_form',
    'wrong_word_choice',
    'english_fallback',
    'grammar_combo',
    'short_fragments',
    'low_clarity',
  ])

  /**
   * Apply last: long declarative answers without WH-words are often fine Dutch — keep threshold high.
   * Grammar / word-choice tags above take priority (strip follow-up when correction signals exist).
   */
  if (!/\?/.test(t) && lower.split(/\s+/).length > 10 && !/\b(wat|hoe|waar|wanneer|wie|waarom|welke)\b/i.test(lower)) {
    tags.push('follow_up_gap')
  }
  if (tags.some((t) => grammarOrChoiceTags.has(t))) {
    const idx = tags.indexOf('follow_up_gap')
    if (idx >= 0) tags.splice(idx, 1)
  }

  const grammarish = ['past_tense', 'word_order', 'article', 'question_form'] as const
  if (grammarish.filter((k) => tags.includes(k)).length >= 2) {
    tags.push('grammar_combo')
  }

  const newFactLinesEnglish: string[] = []
  const mName = lower.match(/\b(ik ben|mijn naam is|ik heet)\s+([a-zà-ÿ][a-zà-ÿ\-]{1,40})\b/i)
  if (mName?.[2]) newFactLinesEnglish.push(`Learner name hint: ${mName[2].trim()}.`)
  const mWork = lower.match(/\b(ik werk|i work|ik studeer)\b[^.!?]{0,120}/i)
  if (mWork) newFactLinesEnglish.push(`Learner work/study hint: ${mWork[0].trim().slice(0, 160)}.`)
  const mHobby = lower.match(/\b(ik hou van|ik vind leuk|hobby|wandelen|fietsen|koken|muziek)\b[^.!?]{0,120}/i)
  if (mHobby) newFactLinesEnglish.push(`Learner interest hint: ${mHobby[0].trim().slice(0, 160)}.`)

  const topTag = tags[0] ?? null
  const focusChip =
    topTag === 'past_tense'
      ? 'verleden tijd'
      : topTag === 'word_order'
        ? 'woordvolgorde'
        : topTag === 'english_fallback' || topTag === 'wrong_word_choice'
          ? 'Nederlands blijven'
          : topTag === 'follow_up_gap'
            ? 'doorvragen'
            : topTag === 'short_fragments' || topTag === 'low_clarity'
              ? 'iets uitgebreider antwoorden'
              : topTag === 'question_form'
                ? 'vraagvorm'
                : null

  return { tags: [...new Set(tags)], newFactLinesEnglish: newFactLinesEnglish.slice(0, 3), focusChip }
}

export function mergeLanguageCoachAfterUserTurn(
  prev: LanguageCoachPersistedBlob,
  userText: string,
  opts?: { learnerCefr?: string | null; inputMode?: 'text' | 'speech' }
): LanguageCoachPersistedBlob {
  const { tags, newFactLinesEnglish, focusChip } = detectLanguageCoachWeaknessSignals(userText)
  const weaknessHits = { ...prev.weaknessHits }
  for (const tag of tags) bump(weaknessHits, tag, 1)

  const factSet = new Set(prev.learnerFactLinesEnglish)
  for (const f of newFactLinesEnglish) factSet.add(f)
  const learnerFactLinesEnglish = [...factSet].slice(-MAX_FACTS)

  const learnerPinnedLessonFocusEnglish = updateLearnerPinnedLessonFocus(
    prev.learnerPinnedLessonFocusEnglish ?? null,
    userText,
  )

  const sessionFocusChip = focusChip ?? prev.sessionFocusChip

  const trimmed = userText.trim()
  const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
  const sessionSignals = bumpSessionSignals(prev.sessionSignals ?? {}, tags, {
    wordCount,
    charCount: trimmed.length,
    isSpeechInput: opts?.inputMode === 'speech',
  })
  const topicsTokensMentioned = mergeTopicsTokensMentioned(prev.topicsTokensMentioned ?? [], userText)
  const vocabStemHits = mergeVocabStemHits(prev.vocabStemHits ?? {}, userText)

  const issueKinds = issueTypesFromTags(tags)
  let nudgeEvents = updateRecoveryOnLatestOpenNudge(prev.nudgeEvents ?? [], issueKinds)

  const mergedBase: LanguageCoachPersistedBlob = {
    ...prev,
    weaknessHits,
    learnerFactLinesEnglish,
    sessionFocusChip,
    learnerPinnedLessonFocusEnglish,
    nudgeEvents,
    sessionSignals,
    topicsTokensMentioned,
    recentCoachLeadIns: prev.recentCoachLeadIns ?? [],
    vocabStemHits,
    activeGuideCorrection: prev.activeGuideCorrection ?? null,
  }
  let activeGuideCorrection = mergedBase.activeGuideCorrection ?? null
  let pendingNudgePlan: LanguageCoachPendingNudgePlan | null = null
  let skipFreshNudge = false

  if (prev.coachGuideWhileSpeaking && prev.conversationRole === 'coach' && activeGuideCorrection?.targetLine) {
    const continueRequested = asksToContinue(userText)
    const mostlyCorrect = isMostlyCorrectRepeat({
      targetLine: activeGuideCorrection.targetLine,
      userText,
      issueTypes: activeGuideCorrection.issueTypes,
      tagsThisTurn: tags,
      learnerCefr: opts?.learnerCefr ?? null,
    })
    if (continueRequested || mostlyCorrect || activeGuideCorrection.repeatCount >= MAX_GUIDE_REPEAT_ATTEMPTS) {
      activeGuideCorrection = null
      skipFreshNudge = true
    } else {
      const nextRepeatCount = Math.min(MAX_GUIDE_REPEAT_ATTEMPTS, activeGuideCorrection.repeatCount + 1)
      pendingNudgePlan = {
        nudgeType: 'MODEL' as const,
        learnerOriginal: userText.trim().slice(0, 2000),
        detectedIssueTypes: activeGuideCorrection.issueTypes,
        severity: activeGuideCorrection.severity,
        coachTurnIndexBeforeReply: mergedBase.coachTurnIndex,
        promptDirective: buildGuideRepeatPromptDirective({
          severity: activeGuideCorrection.severity,
          issueKinds: activeGuideCorrection.issueTypes,
          coachStyle: mergedBase.coachStyle,
          learnerCefr: opts?.learnerCefr ?? null,
          repeatMode: 'retry',
          repeatCount: nextRepeatCount,
        }),
        guideRepeatMode: 'retry' as const,
        guideRepeatCount: nextRepeatCount,
      }
      skipFreshNudge = true
    }
  }

  if (!pendingNudgePlan && !skipFreshNudge) {
    pendingNudgePlan = decideLanguageCoachNudge({
      blob: { ...mergedBase, activeGuideCorrection },
      userText,
      tagsThisTurn: tags,
      learnerCefr: opts?.learnerCefr ?? null,
    })
  }

  return {
    ...mergedBase,
    activeGuideCorrection,
    pendingNudgePlan,
    nudgeEvents,
  }
}

export function mergeLanguageCoachAfterAssistantTurn(
  prev: LanguageCoachPersistedBlob,
  assistantText: string
): LanguageCoachPersistedBlob {
  const now = new Date().toISOString()
  const trimmedReply = assistantText.trim().slice(0, 4000)
  let nudgeEvents = [...(prev.nudgeEvents ?? [])]
  let lastNudgeCoachTurnIndex = prev.lastNudgeCoachTurnIndex
  let activeGuideCorrection = prev.activeGuideCorrection ?? null

  if (prev.pendingNudgePlan) {
    const p = prev.pendingNudgePlan
    nudgeEvents.push({
      nudgeType: p.nudgeType,
      learnerOriginal: p.learnerOriginal,
      coachResponse: trimmedReply,
      detectedIssueTypes: p.detectedIssueTypes,
      severity: p.severity,
      learnerRecoveredLater: null,
      coachTurnIndex: p.coachTurnIndexBeforeReply,
      createdAt: now,
    })
    lastNudgeCoachTurnIndex = p.coachTurnIndexBeforeReply
    nudgeEvents = nudgeEvents.slice(-MAX_NUDGE_EVENTS)
    if (p.guideRepeatMode) {
      const targetLine = extractGuideRepeatTargetLine(trimmedReply) ?? activeGuideCorrection?.targetLine ?? ''
      if (targetLine) {
        activeGuideCorrection = {
          targetLine,
          issueTypes: p.detectedIssueTypes,
          severity: p.severity,
          repeatCount: p.guideRepeatCount ?? activeGuideCorrection?.repeatCount ?? 1,
          sourceLearnerOriginal: p.learnerOriginal,
          coachTurnIndexStarted: p.coachTurnIndexBeforeReply,
        }
      }
    }
  } else if (prev.coachGuideWhileSpeaking && prev.conversationRole === 'coach') {
    const targetLine = extractGuideRepeatTargetLine(trimmedReply)
    if (targetLine) {
      activeGuideCorrection = {
        targetLine,
        issueTypes: activeGuideCorrection?.issueTypes ?? ['low_clarity'],
        severity: activeGuideCorrection?.severity ?? 'medium',
        repeatCount: activeGuideCorrection?.repeatCount ?? 1,
        sourceLearnerOriginal: activeGuideCorrection?.sourceLearnerOriginal ?? '',
        coachTurnIndexStarted: prev.coachTurnIndex,
      }
    }
  }

  const lead = trimmedReply.replace(/\s+/g, ' ').trim().slice(0, 56)
  const recentCoachLeadIns = lead
    ? [...(prev.recentCoachLeadIns ?? []), lead].slice(-MAX_LEAD_INS)
    : prev.recentCoachLeadIns ?? []

  return {
    ...prev,
    coachTurnIndex: prev.coachTurnIndex + 1,
    pendingNudgePlan: null,
    nudgeEvents,
    lastNudgeCoachTurnIndex,
    activeGuideCorrection,
    recentCoachLeadIns,
  }
}
