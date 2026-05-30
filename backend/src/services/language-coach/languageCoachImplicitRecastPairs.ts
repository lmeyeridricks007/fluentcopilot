import type { ConversationMessage } from '../../models/contracts'
import { detectLanguageCoachWeaknessSignals } from './languageCoachWeaknessSignals'

/**
 * Extracts learner-slip → coach-recast pairs from a transcript when the coach used an
 * IMPLICIT recast (no quoted span). `pickBetterLineFromCoachReply` already covers the
 * quoted-span case ("Bedoel je: '…'"), but most of the coach's recasts are natural Dutch
 * rephrasings woven into the reply:
 *
 *   learner    : "Gisteren ik gaan naar de winkel."
 *   coach next : "Ah, dus gisteren ben je naar de winkel gegaan? Wat heb je daar gekocht?"
 *
 * The corrected form ("dus gisteren ben je naar de winkel gegaan") is the first clause of
 * the coach reply — a short Dutch declarative that mirrors the learner's idea with fixed
 * grammar. We extract this clause via two safety nets so we don't surface the coach's
 * follow-up question or unrelated validation text:
 *
 *   1. The learner turn must have at least one detectable weakness tag (heuristic miss
 *      → fall back to checking whether the coach reply contains a Dutch perfectum
 *      participle / explicit correction marker; if so, treat it as recast evidence).
 *   2. The coach's first clause must differ materially from the learner's text (≥30% of
 *      tokens changed; pure echo doesn't count as a correction).
 *
 * Returns `null` when no clean pair can be extracted from this user→coach pair so
 * callers can skip cleanly instead of surfacing low-precision evidence.
 */
export function extractImplicitRecastPair(
  learnerText: string,
  coachReply: string,
): { learnerish: string; better: string } | null {
  const learner = learnerText.trim()
  const coach = coachReply.replace(/\s+/g, ' ').trim()
  if (learner.length < 4 || coach.length < 6) return null

  /**
   * Gate: require either a heuristic-detected slip on the learner side OR a strong
   * "this reply contains a correction" signal on the coach side. If neither fires,
   * the coach reply is probably just normal conversational follow-up and pairing
   * would surface noise.
   */
  const { tags } = detectLanguageCoachWeaknessSignals(learner)
  const coachLooksLikeRecast =
    COACH_PERFECTUM_USE_RX.test(coach) ||
    COACH_IMPERFECTUM_USE_RX.test(coach) ||
    COACH_RECAST_MARKER_RX.test(coach)
  if (tags.length === 0 && !coachLooksLikeRecast) return null

  const candidate = extractFirstDutchDeclarativeClause(coach)
  if (!candidate) return null

  /** Strip optional leading interjection / discourse marker so the line stands alone. */
  const better = stripLeadingInterjections(candidate).trim()
  if (better.length < 8 || better.length > 120) return null

  /** Material-change guard: the candidate must not just be a verbatim echo of the learner. */
  if (!isMaterialChange(learner, better)) return null

  /** Tiny final sanity: the recast should be Dutch-shaped (has at least one Dutch function word). */
  if (!HAS_DUTCH_FUNCTION_WORD_RX.test(better)) return null

  /**
   * Topical-continuation guard: when the learner asks a clean question ("Kan ik X leren,
   * alsjeblieft?") the coach typically replies with positive agreement ("Goed, laten we
   * X even pakken") — that is NOT a recast, it's the coach accepting a request. If the
   * clause starts with an acknowledgment AND contains no perfectum / imperfectum / dus-
   * fronting evidence, drop the pair to avoid surfacing it as a "this is what you should
   * have said" example.
   */
  if (looksLikeTopicalAcceptance(better, learner)) return null

  return { learnerish: learner.slice(0, 260), better: better.slice(0, 200) }
}

const POSITIVE_ACK_OPENER_RX =
  /^(?:goed|mooi|prima|leuk|lekker|fijn|geweldig|inderdaad|precies|klopt|natuurlijk|zeker|tuurlijk|oké|ja(?:zeker)?|akkoord|prima dan|helemaal)\b/i

/**
 * "Topical acceptance" = coach agreed with the learner's idea instead of correcting it.
 * Returns true when the clause opens with a positive acknowledgment AND carries no
 * grammar-correction evidence (no perfectum participle, no imperfectum form, no
 * `dus`-fronting that signals a restated declarative). The learner-side `?` check below
 * is a secondary signal: a clean learner question paired with this kind of opener is
 * almost always topical agreement.
 */
function looksLikeTopicalAcceptance(better: string, learner: string): boolean {
  if (!POSITIVE_ACK_OPENER_RX.test(better)) return false
  const hasRecastEvidence =
    COACH_PERFECTUM_USE_RX.test(better) || COACH_IMPERFECTUM_USE_RX.test(better) || /^dus\b/i.test(better)
  if (hasRecastEvidence) return false
  /** Learner ended on `?` → likely a clean request the coach agreed with, not a slip. */
  if (learner.trim().endsWith('?')) return true
  return true
}

/**
 * Walk the message stream pairwise (user → assistant) and extract recast pairs. Returns
 * up to `max` pairs in the order they occurred (most useful for "this is what happened"
 * cards). Skips a user message when no clean pair can be extracted from the next coach
 * reply rather than fabricating something — "no defaults, no fallbacks" contract.
 */
export function extractImplicitRecastPairsFromTranscript(
  messages: ConversationMessage[],
  max = 6,
): Array<{ learnerish: string; better: string }> {
  const out: Array<{ learnerish: string; better: string }> = []
  const seen = new Set<string>()
  for (let i = 0; i < messages.length - 1; i += 1) {
    if (out.length >= max) break
    const cur = messages[i]
    const next = messages[i + 1]
    if (!cur || !next) continue
    if (cur.sender !== 'user' || next.sender !== 'assistant') continue
    const learner = typeof cur.content === 'string' ? cur.content : ''
    const coach = typeof next.content === 'string' ? next.content : ''
    const pair = extractImplicitRecastPair(learner, coach)
    if (!pair) continue
    const key = `${pair.learnerish.toLowerCase()}→${pair.better.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(pair)
  }
  return out
}

const COACH_PERFECTUM_USE_RX =
  /\b(?:gegaan|gekomen|geweest|gebleven|gevallen|gevlogen|opgestaan|aangekomen|vertrokken|verhuisd|gewerkt|gegeten|gedronken|gelezen|gemaakt|gezegd|gezien|gehoord|gewacht|gewoond|gezocht|gekookt|geschreven|gevonden|gespeeld|geprobeerd|geleerd|gestudeerd|gekeken|gevraagd|geantwoord|gehad|gewassen|gedaan|gebruikt|gebracht|gekocht)\b/i
const COACH_IMPERFECTUM_USE_RX =
  /\b(?:was|waren|had|hadden|ging|gingen|kwam|kwamen|zag|zagen|werkte|werkten|kookte|woonde|leerde|maakte|kreeg|reed|liep|hield|zat|stond)\b/i
const COACH_RECAST_MARKER_RX =
  /\b(?:bedoel je|misschien|beter (?:zeg|zou|is)|je kunt (?:ook )?zeggen|probeer (?:eens )?:|nog eens:|herhaal precies:|zeg precies:|of:|of zoals|nederlanders zeggen|dus (?:je|jij|hij|zij|wij|we)\b)/i

/**
 * Loose Dutch declarative-clause extractor: take the text from the start of the reply up
 * to the first sentence terminator (`?`, `!`, `.`) OR the first conjunction that starts
 * a new thought (`Wat`, `En jij`, `Heb je`, `Hoe `, `Wanneer `, `Waarom `). Designed for
 * coach replies that follow a "<recasted declarative>. <follow-up question>" pattern.
 */
function extractFirstDutchDeclarativeClause(coachReply: string): string | null {
  /** Trim leading affirmation markers commonly preceded by punctuation. */
  const compact = coachReply.replace(/\s+/g, ' ').trim()
  if (!compact) return null

  /**
   * Hard sentence boundary: take everything up to the first `?` `!` `.` followed by
   * whitespace or end. Many coach replies end the recasted declarative with `?` (mixing
   * the recast and a follow-up question into a single sentence), so we treat `?` as a
   * terminator even though strictly the declarative span ends at the question word.
   */
  const sentenceEnd = compact.search(/[?!.](?:\s|$)/)
  let head = sentenceEnd > 0 ? compact.slice(0, sentenceEnd) : compact

  /**
   * Soft boundary: when the recast and a follow-up question share a sentence joined by
   * a comma ("Dus je bent naar de markt gegaan, wat hebben jullie gedaan"), cut at that
   * comma. We only match question words at a real clause start (preceded by `, ` or `; `)
   * so we don't accidentally trim mid-clause on common Dutch verbs like "ben je" inside
   * "dus gisteren ben je naar de winkel gegaan".
   */
  const commaQuestion = head.search(
    /[,;]\s+(?:wat|hoe|waar|wanneer|waarom|welke|en jij|heb je|kun je|wil je|zou je)\b/i,
  )
  if (commaQuestion > 8) {
    head = head.slice(0, commaQuestion).trim()
  }

  return head.trim() || null
}

const LEADING_INTERJECTION_RX =
  /^(?:ah|oh|haha|nou|ja(?:zeker)?|oké|okay|prima|leuk|lekker|fijn|mooi|geweldig|inderdaad|precies|klopt|nou ja)[,!.;:\s-]+/i

function stripLeadingInterjections(text: string): string {
  let t = text.trim()
  /** Strip up to two layers so "Ah, oké, dus …" becomes "dus …". */
  for (let i = 0; i < 2; i += 1) {
    const next = t.replace(LEADING_INTERJECTION_RX, '').trim()
    if (next === t) break
    t = next
  }
  return t
}

const HAS_DUTCH_FUNCTION_WORD_RX =
  /\b(?:de|het|een|ik|jij|je|hij|zij|wij|we|ze|jullie|ben|bent|is|zijn|heb|hebt|heeft|hebben|en|of|maar|dat|die|naar|in|op|met|voor|aan|van|bij|over|onder|tegen|zonder|tussen)\b/i

function isMaterialChange(learner: string, better: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
  const lTokens = norm(learner)
  const bTokens = norm(better)
  if (lTokens.length === 0 || bTokens.length === 0) return false
  const lSet = new Set(lTokens)
  let matched = 0
  for (const t of bTokens) {
    if (lSet.has(t)) matched += 1
  }
  /**
   * If ≥80% of the coach clause tokens already appear in the learner text, treat it as a
   * verbatim echo (no correction). 30%+ token change required to count as material.
   */
  const overlap = matched / bTokens.length
  return overlap <= 0.7
}
