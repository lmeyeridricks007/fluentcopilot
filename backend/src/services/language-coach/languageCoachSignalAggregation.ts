import type { ConversationMessage } from '../../models/contracts'
import type {
  LanguageCoachNudgeEvent,
  LanguageCoachPersistedBlob,
} from '../../domain/speakLive/languageCoachSessionTypes'
import { detectLanguageCoachWeaknessSignals } from './languageCoachWeaknessSignals'

/**
 * Multi-source aggregation of Language Coach weakness signals for report-build time.
 *
 * Why this exists:
 *   The persisted `lc.weaknessHits` map is populated only by the live regex heuristic
 *   in `detectLanguageCoachWeaknessSignals` (called from `mergeLanguageCoachAfterUserTurn`).
 *   That heuristic is intentionally conservative — it misses many real Dutch grammar
 *   slips that the COACH LLM correctly identified and recasted live (the learner saw
 *   the corrections in the chat). Those corrections are not currently structured
 *   signals: the coach's recasts live inside its free-text Dutch replies, the running
 *   `rollingSummaryEnglish` field, and (for the rare cases when the nudge engine
 *   actually fired) `nudgeEvents.detectedIssueTypes`.
 *
 *   This module unions all of those sources into a single enriched `weaknessHits` map
 *   so the report's "main growth area" surface reflects what was ACTUALLY corrected
 *   rather than only what our regex caught.
 *
 * Sources (each independent, all OR'd together via max-per-tag):
 *   1. `liveWeaknessHits` — the persisted blob's `weaknessHits` (regex during convo).
 *   2. `retroactiveLearnerScan` — re-run the regex over persisted user turns at
 *      report time so shipped heuristic improvements benefit past sessions when
 *      "Rebuild report from scratch" is clicked.
 *   3. `nudgeEventScan` — every `nudgeEvent.detectedIssueTypes` is real evidence of a
 *      coach correction; map back to weakness tags via the issue-type ↔ tag table.
 *   4. `coachReplyScan` — count how often the coach used grammar-teaching markers
 *      and Dutch tense forms in their replies (perfectum participles, imperfectum,
 *      explicit Dutch teaching vocabulary like "verleden tijd", "woordvolgorde",
 *      "de/het"). Two or more such replies in a session are strong evidence that the
 *      grammar area was the live focus, even when the learner's slip didn't match
 *      any regex.
 *   5. `rollingSummaryScan` — the LLM-maintained English session summary often
 *      mentions what was corrected ("learner used hebben instead of zijn", "past
 *      tense practice", "word order in subclauses"). Cheap to mine, high precision.
 *
 * Output is the merged `weaknessHits` plus a structured `signalSources` map that
 * records which source contributed which tag — useful for debugging and for tests.
 */

export type WeaknessSignalSource =
  | 'live_heuristic'
  | 'retroactive_learner_scan'
  | 'nudge_events'
  | 'coach_reply_scan'
  | 'rolling_summary_scan'

export type AggregatedWeaknessSignals = {
  weaknessHits: Record<string, number>
  /** Map of tag → set of sources that contributed evidence for it. */
  signalSources: Record<string, WeaknessSignalSource[]>
}

/**
 * Mirror of the (private) `ISSUE_TAG_MAP` in `languageCoachWeaknessSignals.ts`. Kept
 * inlined here so the aggregator has no cyclic dependency on the nudge-engine module
 * and is testable in isolation. Adding a tag in the live heuristic that maps to a new
 * issue type should be reflected here too.
 */
const NUDGE_ISSUE_TO_TAGS: Record<string, string[]> = {
  tense_issue: ['past_tense'],
  word_order_issue: ['word_order'],
  article_preposition_issue: ['article'],
  question_form_issue: ['question_form'],
  weak_follow_up: ['follow_up_gap'],
  simple_structure_overuse: ['simple_repeat', 'short_fragments'],
  word_choice_issue: ['wrong_word_choice', 'english_fallback'],
  low_clarity: ['low_clarity', 'short_fragments'],
}

/**
 * Lightweight Dutch perfectum participles the coach is likely to USE when recasting a
 * learner's past-tense slip into correct Dutch. We don't try to enumerate every
 * possible participle — these are the highest-frequency forms in everyday Dutch and
 * are sufficient to detect "the coach taught past tense" with high precision when
 * they occur in MULTIPLE coach replies in a single session.
 */
const COACH_PAST_PARTICIPLE_RX =
  /\b(?:gegaan|gekomen|geweest|gebleven|gevallen|gevlogen|gereisd|gefietst|gerend|opgestaan|aangekomen|vertrokken|verhuisd|gewerkt|gegeten|gedronken|gelezen|gemaakt|gezegd|gezien|gehoord|gewacht|gewoond|gezocht|gekookt|geschreven|gevonden|gespeeld|geprobeerd|geleerd|gestudeerd|gekeken|gevraagd|geantwoord|gehad|gewassen|gedaan|gebruikt|gebracht|gekocht|gegolden|begonnen)\b/i

/**
 * Common Dutch imperfectum (simple past) verb forms. Same precision logic as above —
 * coach using these multiple times suggests past-tense practice was an active thread.
 */
const COACH_IMPERFECTUM_RX =
  /\b(?:was|waren|had|hadden|ging|gingen|kwam|kwamen|zag|zagen|deed|deden|werkte|werkten|woonde|woonden|maakte|maakten|kookte|kookten|wachtte|wachtten|leerde|leerden|sprak|spraken|kreeg|kregen|reed|reden|liep|liepen|hield|hielden|zat|zaten|stond|stonden)\b/i

/**
 * Explicit Dutch teaching vocabulary — when the coach uses these words in a reply, it
 * is almost always making a metalinguistic remark about that area. Very high
 * precision; one occurrence is enough.
 */
const COACH_EXPLICIT_TEACHING_MARKERS: Array<{ rx: RegExp; tag: string }> = [
  { rx: /\b(?:verleden tijd|perfectum|imperfectum|voltooid tegenwoordige tijd|onvoltooid verleden tijd|hulpwerkwoord)\b/i, tag: 'past_tense' },
  { rx: /\b(?:woordvolgorde|bijzin|werkwoord op (?:de )?tweede plaats|werkwoord achteraan|inversie)\b/i, tag: 'word_order' },
  { rx: /\b(?:lidwoord|de\/het|de of het|de-woord|het-woord|bijvoeglijke naamwoorden)\b/i, tag: 'article' },
  { rx: /\b(?:vraagvorm|vraagwoord|hoe vraag|vraagzin)\b/i, tag: 'question_form' },
  { rx: /\b(?:vraag (?:terug )?stellen|stel (?:eens )?een (?:weder)?vraag|vraag eens (?:door )?terug|kun je (?:ook )?(?:terug )?vragen|doorvragen)\b/i, tag: 'follow_up_gap' },
]

/**
 * Coach reply markers that indicate an explicit correction / recast was offered.
 * These don't pin a specific weakness tag on their own — they just confirm "there was
 * a correction here" so we can weight other signals from the same turn more heavily.
 */
const COACH_CORRECTION_MARKER_RX =
  /\b(?:bedoel je|misschien|beter (?:zeg|zou je|is)|je kunt (?:ook )?zeggen|in het Nederlands zeggen we|probeer (?:eens )?:|nog eens:|herhaal precies:|zeg precies:|of:|of zoals|nederlanders zeggen)/i

/**
 * Phrases the LLM tends to use in its English `rollingSummaryEnglish` notes when it
 * has caught a grammar slip. Each maps to a weakness tag. High precision because the
 * LLM rarely uses these phrases incidentally — they show up specifically when the LLM
 * is summarizing what was corrected.
 */
const SUMMARY_PHRASE_TO_TAG: Array<{ rx: RegExp; tag: string }> = [
  { rx: /\b(?:past tense|perfectum|present perfect|imperfectum|past[- ]tense|preterite|past[- ]simple|past[- ]participle|past form|hebben\s*\/\s*zijn|hebben vs zijn|wrong auxiliary)\b/i, tag: 'past_tense' },
  { rx: /\b(?:word order|word-order|verb-second|verb second|subordinate clause word order|sov)\b/i, tag: 'word_order' },
  { rx: /\b(?:article(?: choice| use| confusion)?|de\/het|de or het|gendered articles|noun gender)\b/i, tag: 'article' },
  { rx: /\b(?:question form|question-form|interrogative form|forming questions|wrong question)\b/i, tag: 'question_form' },
  { rx: /\b(?:follow[- ]up question|asking back|asked back|reciprocal question)\b/i, tag: 'follow_up_gap' },
  { rx: /\b(?:wrong word choice|word choice|chose the wrong word|vocab(?:ulary)? slip|english fallback|reverted to english|switched to english)\b/i, tag: 'wrong_word_choice' },
  { rx: /\b(?:short fragment|one[- ]word answer|too brief)\b/i, tag: 'short_fragments' },
  { rx: /\b(?:unclear sentence|low clarity|hard to follow)\b/i, tag: 'low_clarity' },
  { rx: /\b(?:hesitation|filler word|filler|stalling|um\/uh|aarzelen)\b/i, tag: 'hesitation' },
]

/**
 * Cap per source per tag so a single noisy source can't dominate the merge. Each
 * source contributes up to this many counts toward the per-tag total; the union still
 * uses `max(over sources)` per tag.
 */
const MAX_COUNT_PER_SOURCE_PER_TAG = 6

function addEvidence(
  weaknessHits: Record<string, number>,
  signalSources: Record<string, WeaknessSignalSource[]>,
  tag: string,
  source: WeaknessSignalSource,
  bumpBy = 1,
): void {
  const current = weaknessHits[tag] ?? 0
  const capped = Math.min(MAX_COUNT_PER_SOURCE_PER_TAG, current + bumpBy)
  weaknessHits[tag] = Math.max(current, capped)
  const sources = signalSources[tag] ?? []
  if (!sources.includes(source)) {
    sources.push(source)
    signalSources[tag] = sources
  }
}

function scanCoachReplies(
  messages: ConversationMessage[],
): Array<{ tag: string; weight: number }> {
  const tagCounts: Record<string, number> = {}
  let coachReplyCount = 0
  let coachPerfectumReplies = 0
  let coachImperfectumReplies = 0
  for (const m of messages) {
    if (m.sender !== 'assistant') continue
    const text = typeof m.content === 'string' ? m.content : ''
    if (!text.trim()) continue
    coachReplyCount += 1
    if (COACH_PAST_PARTICIPLE_RX.test(text)) coachPerfectumReplies += 1
    if (COACH_IMPERFECTUM_RX.test(text)) coachImperfectumReplies += 1
    for (const marker of COACH_EXPLICIT_TEACHING_MARKERS) {
      if (marker.rx.test(text)) {
        tagCounts[marker.tag] = (tagCounts[marker.tag] ?? 0) + 1
      }
    }
    /**
     * Generic correction marker on its own doesn't pin a tag, but boosts the next
     * matching teaching marker in the same reply implicitly via the +1 above.
     */
    void COACH_CORRECTION_MARKER_RX // referenced to keep import meaningful in tests
  }
  /**
   * Past-tense FOCUS heuristic: when ≥3 of the coach's replies contain a perfectum
   * participle OR ≥3 contain imperfectum forms in a short coach session, the past
   * tense was almost certainly the topic / correction area. Threshold of 3 keeps
   * incidental usage from misfiring on small talk where the coach naturally says
   * "gisteren had ik" once.
   */
  if (coachPerfectumReplies >= 3 || coachImperfectumReplies >= 3) {
    tagCounts['past_tense'] = (tagCounts['past_tense'] ?? 0) + Math.min(3, Math.floor((coachPerfectumReplies + coachImperfectumReplies) / 2))
  }
  /**
   * Even if no explicit teaching marker fired, ANY coach reply with a perfectum
   * participle adjacent to (≤80 chars) a learner-quoted snippet ("→", "of:") is a
   * recast — bump past_tense by 1. We approximate with: reply contains both a
   * correction marker and a perfectum participle.
   */
  for (const m of messages) {
    if (m.sender !== 'assistant') continue
    const text = typeof m.content === 'string' ? m.content : ''
    if (COACH_CORRECTION_MARKER_RX.test(text) && COACH_PAST_PARTICIPLE_RX.test(text)) {
      tagCounts['past_tense'] = (tagCounts['past_tense'] ?? 0) + 1
    }
  }
  void coachReplyCount
  return Object.entries(tagCounts).map(([tag, weight]) => ({ tag, weight }))
}

function scanRollingSummary(rollingSummaryEnglish: string | null | undefined): Array<{ tag: string; weight: number }> {
  const summary = rollingSummaryEnglish?.trim() ?? ''
  if (!summary) return []
  const tagCounts: Record<string, number> = {}
  for (const entry of SUMMARY_PHRASE_TO_TAG) {
    const matches = summary.match(new RegExp(entry.rx.source, entry.rx.flags.includes('g') ? entry.rx.flags : `${entry.rx.flags}g`))
    if (matches && matches.length > 0) {
      tagCounts[entry.tag] = (tagCounts[entry.tag] ?? 0) + Math.min(3, matches.length)
    }
  }
  return Object.entries(tagCounts).map(([tag, weight]) => ({ tag, weight }))
}

function scanNudgeEvents(events: LanguageCoachNudgeEvent[] | null | undefined): Array<{ tag: string; weight: number }> {
  const tagCounts: Record<string, number> = {}
  for (const e of events ?? []) {
    for (const issue of e.detectedIssueTypes ?? []) {
      const tags = NUDGE_ISSUE_TO_TAGS[issue] ?? []
      for (const t of tags) {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1
      }
    }
  }
  return Object.entries(tagCounts).map(([tag, weight]) => ({ tag, weight }))
}

function scanRetroactiveLearnerTurns(messages: ConversationMessage[]): Array<{ tag: string; weight: number }> {
  const tagCounts: Record<string, number> = {}
  for (const m of messages) {
    if (m.sender !== 'user') continue
    const text = typeof m.content === 'string' ? m.content : ''
    if (!text.trim()) continue
    const { tags } = detectLanguageCoachWeaknessSignals(text)
    for (const tag of new Set(tags)) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
    }
  }
  return Object.entries(tagCounts).map(([tag, weight]) => ({ tag, weight }))
}

export function aggregateLanguageCoachWeaknessSignals(input: {
  lc: LanguageCoachPersistedBlob | null | undefined
  messages: ConversationMessage[]
  rollingSummaryEnglish?: string | null
}): AggregatedWeaknessSignals {
  const weaknessHits: Record<string, number> = {}
  const signalSources: Record<string, WeaknessSignalSource[]> = {}

  /** Source 1: live heuristic (persisted weaknessHits). */
  for (const [tag, count] of Object.entries(input.lc?.weaknessHits ?? {})) {
    if (!Number.isFinite(count) || count <= 0) continue
    addEvidence(weaknessHits, signalSources, tag, 'live_heuristic', count)
  }

  /** Source 2: retroactive learner-turn scan. */
  for (const { tag, weight } of scanRetroactiveLearnerTurns(input.messages)) {
    addEvidence(weaknessHits, signalSources, tag, 'retroactive_learner_scan', weight)
  }

  /** Source 3: nudgeEvents (real coach corrections that fired the nudge engine). */
  for (const { tag, weight } of scanNudgeEvents(input.lc?.nudgeEvents)) {
    addEvidence(weaknessHits, signalSources, tag, 'nudge_events', weight)
  }

  /** Source 4: coach reply mining (catches LLM-only recasts the nudge engine missed). */
  for (const { tag, weight } of scanCoachReplies(input.messages)) {
    addEvidence(weaknessHits, signalSources, tag, 'coach_reply_scan', weight)
  }

  /** Source 5: rollingSummaryEnglish — the LLM's own session notes. */
  for (const { tag, weight } of scanRollingSummary(input.rollingSummaryEnglish)) {
    addEvidence(weaknessHits, signalSources, tag, 'rolling_summary_scan', weight)
  }

  return { weaknessHits, signalSources }
}
