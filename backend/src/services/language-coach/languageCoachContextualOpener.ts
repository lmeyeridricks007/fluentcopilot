import type {
  LanguageCoachConversationGoal,
  LanguageCoachConversationRole,
  LanguageCoachStartPayload,
} from '../../domain/speakLive/languageCoachSessionTypes'

/**
 * Builds a context-aware Dutch opening line for the FIRST coach message of a
 * Language Coach session — the line that `conversationAppService.insertNewThread`
 * persists as the assistant's first message and that the run page TTSes immediately.
 *
 * Why this exists:
 *   The default opener is `persona.introLine` from the database
 *   (`'Hoi! Ik ben je coach vandaag — waar zin je het over te hebben?'`). That static
 *   greeting is shown verbatim even when the learner deep-linked in from a previous
 *   report with a pinned focus, or picked a specific `conversationGoal` ('grammar',
 *   'fluency', …) in the entry screen. The result felt generic ("ask me what you
 *   want help with") regardless of context. The system prompt's `buildOpeningTurnDirective`
 *   can only influence the LLM's *next* reply — it cannot rewrite the static intro line
 *   that is generated before any LLM call.
 *
 * Returns `null` when there is no usable framing signal (cold start, generic goal,
 * no pinned focus). Callers should then fall back to `persona.introLine` so true
 * cold-start UX stays unchanged.
 *
 * Implementation notes:
 *   - Deterministic / template-based — no LLM call, so `/api/conversations/start`
 *     stays fast (currently ~130ms; an LLM call here would add 1–4s before the user
 *     ever sees the coach).
 *   - Output is plain Dutch text only (no markdown / no English), safe to send straight
 *     to the existing Azure TTS pipeline.
 *   - Keeps to 1–3 short sentences (A2–B1 register) to match the persona contract
 *     ("warm, helder, natuurlijk Nederlands; korte zinnen op A1–A2").
 *   - When this returns non-null, callers should bump `coachTurnIndex` to 1 on the
 *     persisted blob so the prompt's `buildOpeningTurnDirective` does not also fire
 *     for the next (LLM-driven) coach reply — avoiding a second "opening" message.
 */
export function buildLanguageCoachContextualOpeningLine(
  payload: LanguageCoachStartPayload,
): string | null {
  const pinned = payload.pinnedFocusEnglish?.trim() ?? ''
  const goal = payload.conversationGoal
  const role = payload.conversationRole
  const hasPinned = pinned.length > 0

  if (hasPinned) {
    return buildWelcomeBackOpener({ pinned, goal, role })
  }
  if (goal !== 'general') {
    return buildGoalAnchoredOpener(goal, role)
  }
  return null
}

/**
 * Per-goal canonical opening options. Mirrors the values used by the system prompt's
 * `GOAL_OPENING_OPTIONS` so the coach's spoken first line and the prompt-side directive
 * point at the same concrete starting beats (no whiplash between intro and turn 1).
 */
const GOAL_OPENING_OPTIONS: Record<Exclude<LanguageCoachConversationGoal, 'general'>, string[]> = {
  fluency: [
    'een korte sketch van je dag',
    'iets vertellen over je weekend',
    'een paar snelle prompts beantwoorden',
  ],
  pronunciation: [
    'een paar woorden met de “ui”-klank',
    'lange Nederlandse woorden uitspreken',
    'zinnen met “ij” en “ei”',
  ],
  grammar: [
    'werkwoordsvolgorde in bijzinnen (omdat / dat / als)',
    'verleden tijd (perfectum en imperfectum)',
    'de/het en bijvoeglijke naamwoorden',
  ],
  confidence: [
    'een paar simpele vragen en antwoorden',
    'een veilig onderwerp dat je goed kent',
    'een mini-rollenspel waar jij begint',
  ],
  storytelling: [
    'iets wat vandaag of gisteren gebeurde',
    'een korte herinnering uit je jeugd',
    'een reisverhaal in drie zinnen',
  ],
  follow_up_questions: [
    'na elk antwoord één korte vraag terug',
    'doorvragen op iets wat ik net zei',
    'een gesprekje waarin we elkaar afwisselen',
  ],
}

const GOAL_DUTCH_LABEL: Record<Exclude<LanguageCoachConversationGoal, 'general'>, string> = {
  fluency: 'vloeiendheid',
  pronunciation: 'uitspraak',
  grammar: 'grammatica',
  confidence: 'zelfvertrouwen',
  storytelling: 'verhalen vertellen',
  follow_up_questions: 'doorvragen',
}

function buildGoalAnchoredOpener(
  goal: Exclude<LanguageCoachConversationGoal, 'general'>,
  role: LanguageCoachConversationRole,
): string {
  const dutchGoal = GOAL_DUTCH_LABEL[goal]
  const opts = GOAL_OPENING_OPTIONS[goal] ?? []
  const optionsClause = formatTwoOrThreeOptions(opts)
  const greeting = greetingForRole(role)
  if (optionsClause) {
    return `${greeting} Wil je beginnen met ${optionsClause}?`.trim()
  }
  return `${greeting} Waar wil je het eerst over hebben binnen ${dutchGoal}?`.trim()
}

/**
 * Welcome-back opener for deep-link sessions (pinned focus from previous report).
 *
 * The `pinnedFocusEnglish` string is internal English steering — we never read it aloud.
 * Instead we try to recognize stable anchors inside the string (e.g. "follow-up questions",
 * the word "<X>") via simple substring checks and surface those as Dutch chips. When no
 * anchor is recognized we fall back to a warm but anchored welcome-back that still avoids
 * the generic "waar zin je in?" question and offers concrete next steps.
 */
function buildWelcomeBackOpener(input: {
  pinned: string
  goal: LanguageCoachConversationGoal
  role: LanguageCoachConversationRole
}): string {
  const greeting = welcomeBackGreetingForRole(input.role)
  const anchors = extractDutchAnchorsFromPinnedFocus(input.pinned, input.goal)
  if (anchors.length === 0) {
    /**
     * No recognizable anchor — still better than the static "waar zin je in?" because it
     * names the continuity ("doorgaan met waar je mee bezig was") and offers a concrete
     * next-step choice instead of an open question.
     */
    return `${greeting} Laten we doorgaan met waar je mee bezig was. Wil je eerst een korte oefening doen, of liever even kort vertellen wat je deze week hebt gedaan in het Nederlands?`
  }
  const optionsClause = formatTwoOrThreeOptions(anchors)
  return `${greeting} Vorige keer wilde je nog wat reps op ${anchors[0]}. Zullen we beginnen met ${optionsClause}?`
}

function greetingForRole(role: LanguageCoachConversationRole): string {
  switch (role) {
    case 'friend':
      return 'Hoi! Leuk dat je er bent.'
    case 'colleague':
      return 'Hoi! Fijn dat je tijd hebt vandaag.'
    case 'dutch_local':
      return 'Hoi! Leuk dat we even Nederlands praten.'
    case 'date':
      return 'Hoi! Leuk dat we even afspreken.'
    case 'coach':
    default:
      return 'Hoi! Leuk dat je er weer bent.'
  }
}

function welcomeBackGreetingForRole(role: LanguageCoachConversationRole): string {
  switch (role) {
    case 'friend':
      return 'Hé, fijn dat je er weer bent!'
    case 'colleague':
      return 'Hoi! Goed je weer te zien.'
    case 'dutch_local':
      return 'Welkom terug! Leuk dat we weer even kletsen.'
    case 'date':
      return 'Hé! Leuk dat we weer afspreken.'
    case 'coach':
    default:
      return 'Welkom terug!'
  }
}

/**
 * Format up to 3 items as a natural Dutch enumeration:
 *   1 item  → "<a>"
 *   2 items → "<a> of <b>"
 *   3 items → "<a>, <b> of <c>"
 * Returns empty string when given an empty list, so callers can branch.
 */
function formatTwoOrThreeOptions(opts: string[]): string {
  const trimmed = opts.map((o) => o.trim()).filter((o) => o.length > 0).slice(0, 3)
  if (trimmed.length === 0) return ''
  if (trimmed.length === 1) return trimmed[0]!
  if (trimmed.length === 2) return `${trimmed[0]} of ${trimmed[1]}`
  return `${trimmed[0]}, ${trimmed[1]} of ${trimmed[2]}`
}

/**
 * Substring-based extraction of Dutch-renderable anchors from the English pinned-focus
 * string composed by `languageCoachNextPracticePlanner.composePinnedFocusEnglish`. That
 * producer emits stable shapes like:
 *
 *   - "practising asking follow-up questions"
 *   - "practising Dutch word order"
 *   - "practising past-tense forms"
 *   - "varying my Dutch around the word "gezellig""
 *
 * We pattern-match on those known phrases to produce safe, learner-facing Dutch chips.
 * Anything we don't recognize we silently skip — we never paste raw English into the
 * spoken Dutch opener.
 */
function extractDutchAnchorsFromPinnedFocus(
  pinned: string,
  goal: LanguageCoachConversationGoal,
): string[] {
  const out: string[] = []
  const lower = pinned.toLowerCase()

  if (lower.includes('follow-up questions') || lower.includes('follow up questions')) {
    out.push('doorvragen na een antwoord')
  }
  if (lower.includes('word order')) {
    out.push('werkwoordsvolgorde in bijzinnen')
  }
  if (lower.includes('past-tense') || lower.includes('past tense')) {
    out.push('zinnen in de verleden tijd')
  }
  if (lower.includes('article') || lower.includes('de/het') || lower.includes('de / het')) {
    out.push('“de” of “het” bij zelfstandige naamwoorden')
  }
  if (lower.includes('question form')) {
    out.push('vragen vormen zoals “hoe …?” en “waar …?”')
  }
  if (lower.includes('wrong word choice') || lower.includes('word choice')) {
    out.push('een natuurlijker Nederlands woord kiezen')
  }
  if (lower.includes('english fallback')) {
    out.push('in het Nederlands blijven, ook bij twijfel')
  }
  if (lower.includes('short fragments') || lower.includes('one-word')) {
    out.push('je antwoord uitbreiden tot een paar zinnen')
  }
  if (lower.includes('low clarity') || lower.includes('clarity')) {
    out.push('je idee in een heldere zin neerzetten')
  }
  if (lower.includes('hesitation')) {
    out.push('zonder lange aarzeling antwoord geven')
  }

  /**
   * Vocab anchor: the producer wraps the target word in straight or curly quotes around
   * the literal phrase `the word`. Match both styles so we don't miss a session.
   */
  const vocabMatch = pinned.match(/the word\s+[“"']([^“"']{1,40})[”"']/i)
  if (vocabMatch && vocabMatch[1]) {
    const word = vocabMatch[1].trim()
    if (word.length > 0) {
      out.push(`een paar zinnen met “${word}”`)
    }
  }

  /**
   * Goal back-fill: if we still have nothing, use a one-item canonical chip derived from
   * the chosen goal so the welcome-back opener still has something concrete to anchor to.
   */
  if (out.length === 0 && goal !== 'general') {
    const dutchGoal = GOAL_DUTCH_LABEL[goal]
    out.push(`je ${dutchGoal}-doel van vorige keer`)
  }

  /**
   * Dedupe preserving order (case-insensitive) and cap at 3 — matches the run-page UX
   * where 2–3 options is the readable upper bound for a single spoken sentence.
   */
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const item of out) {
    const key = item.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
    if (deduped.length >= 3) break
  }
  return deduped
}
