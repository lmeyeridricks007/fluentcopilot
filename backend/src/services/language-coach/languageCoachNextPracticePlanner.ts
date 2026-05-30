import type {
  LanguageCoachConversationGoal,
  LanguageCoachConversationRole,
  LanguageCoachPersistedBlob,
} from '../../domain/speakLive/languageCoachSessionTypes'
import { topOverusedStems } from './languageCoachSessionMemory'

/**
 * Per-session "Plan your next session" output for the Language Coach report.
 *
 * Composed from THIS-session signals (weaknessHits, vocab stems, transcript-derived patterns)
 * rather than cross-session profile data, so the surfaces it powers are session-specific:
 *
 *   - `coachFocusBrief.pinnedFocusEnglish` is forwarded as the `lcPinnedFocus` URL param to
 *     the Language Coach entry page. The run page then sends it on `LanguageCoachStartBody`,
 *     and `buildLanguageCoachSpeakLiveInit` seeds it into `learnerPinnedLessonFocusEnglish`.
 *     The coach prompt builder (`languageCoachSpeakLivePrompt.ts`) already injects a
 *     "Learner-pinned lesson spine" block from that field — so the focus weaves through every
 *     coach reply from turn 1, without any new LLM-prompt plumbing.
 *
 *   - `scenarioCandidates` are mapped from the dominant weakness signals to relevant Speak
 *     Live scenarios. The UI renders one-tap launch links via `speakLiveRunHref`.
 *
 *   - `vocabAnchors` and `grammarAnchors` are surfaced as visible chips so the learner can
 *     confirm what the coach will focus on before launching.
 *
 * The planner returns `null` when there is no session signal at all (cold start, very short
 * sessions). UI gates on `nextPracticePlan != null` and hides the section entirely — no
 * generic fallback copy.
 */
export type LanguageCoachNextPracticePlan = {
  /** One-liner summary the UI uses as the section subtitle. */
  headline: string
  coachFocusBrief: {
    /**
     * English instruction the coach prompt will be oriented around (warm, not nagging — see
     * the pinned-lesson block in `languageCoachSpeakLivePrompt.ts`). `null` only when the
     * session has no usable signal; in that case `nextPracticePlan` itself should be `null`.
     */
    pinnedFocusEnglish: string
    suggestedGoal: LanguageCoachConversationGoal | null
    suggestedConversationRole: LanguageCoachConversationRole | null
    /** Specific Dutch words from this session worth more reps. */
    vocabAnchors: string[]
    /** Humanized patterns (e.g. "asking follow-up questions"), already learner-facing. */
    grammarAnchors: string[]
  }
  scenarioCandidates: Array<{
    scenarioSlug: string
    scenarioTitle: string
    level: string
    why: string
  }>
}

/**
 * Map dominant weakness tag → relevant Speak Live scenarios. Slugs must match the IDs in
 * `src/features/speak-live/speakLiveScenarios.ts` (the run-href builder validates against
 * the same set). Order within a row matters — first slug is the strongest fit.
 */
const WEAKNESS_TO_SCENARIO_CANDIDATES: Record<
  string,
  Array<{ slug: string; title: string; why: string }>
> = {
  follow_up_gap: [
    {
      slug: 'opinions_discussions',
      title: 'Opinions & discussion',
      why: 'Opinions naturally prompt follow-up questions, so this is a fitting scene to practice asking them.',
    },
    {
      slug: 'meeting_new_people',
      title: 'Meeting new people',
      why: 'Introductions are full of short follow-ups like “En jij?” and “Hoe lang al?”.',
    },
    {
      slug: 'small_talk',
      title: 'Small talk',
      why: 'Low-pressure back-and-forth where one extra follow-up changes the whole exchange.',
    },
  ],
  past_tense: [
    {
      slug: 'storytelling',
      title: 'Storytelling',
      why: 'Built around telling what happened — ideal repetition for past-tense forms.',
    },
    {
      slug: 'small_talk',
      title: 'Small talk',
      why: '“Wat heb je dit weekend gedaan?” is a classic past-tense prompt in everyday Dutch.',
    },
  ],
  word_order: [
    {
      slug: 'explaining_something',
      title: 'Explaining something',
      why: 'Longer connected sentences put gentle pressure on Dutch word order in subclauses.',
    },
    {
      slug: 'storytelling',
      title: 'Storytelling',
      why: 'Sequencing words like “toen” and “omdat” surface word-order patterns naturally.',
    },
  ],
  article: [
    {
      slug: 'supermarket_shop',
      title: 'At the counter',
      why: 'Concrete objects (de/het kassa, het brood, de melk) make article practice immediate.',
    },
    {
      slug: 'ordering_food',
      title: 'Ordering food',
      why: 'Menu items keep de/het and adjective-noun agreement front-of-mind.',
    },
  ],
  question_form: [
    {
      slug: 'directions_getting_somewhere',
      title: 'Directions',
      why: 'Asking the way is a question-shaped scene — “Hoe kom ik bij …?”, “Waar is …?”.',
    },
    {
      slug: 'phone_call',
      title: 'Phone-style Dutch',
      why: 'Tight question-and-answer loops, no visual cues — sharpens question forms.',
    },
  ],
  wrong_word_choice: [
    {
      slug: 'small_talk',
      title: 'Small talk',
      why: 'Light-pressure conversation that rewards finding the right Dutch word over fluency speed.',
    },
    {
      slug: 'party_social',
      title: 'At a party',
      why: 'Casual exchanges where tone and natural word choice matter more than grammar precision.',
    },
  ],
  english_fallback: [
    {
      slug: 'small_talk',
      title: 'Small talk',
      why: 'Short turns lower the pressure that triggers English fallback.',
    },
    {
      slug: 'meeting_new_people',
      title: 'Meeting new people',
      why: 'Predictable beats give you a safe scaffold to stay in Dutch.',
    },
  ],
  short_fragments: [
    {
      slug: 'storytelling',
      title: 'Storytelling',
      why: 'Storytelling naturally invites longer answers — the cure for one-word replies.',
    },
    {
      slug: 'explaining_something',
      title: 'Explaining something',
      why: 'Stretches one idea into a few connected sentences in a low-stakes setting.',
    },
  ],
  low_clarity: [
    {
      slug: 'explaining_something',
      title: 'Explaining something',
      why: 'Forces clear structure: topic → detail → check-back.',
    },
    {
      slug: 'storytelling',
      title: 'Storytelling',
      why: 'Time markers and sequencing words give your sentences a clearer shape.',
    },
  ],
  grammar_combo: [
    {
      slug: 'small_talk',
      title: 'Small talk',
      why: 'Short, repeated turns let you fix one grammar slip per beat instead of all at once.',
    },
    {
      slug: 'explaining_something',
      title: 'Explaining something',
      why: 'A single topic gives you a steady frame to drill multiple grammar threads side by side.',
    },
  ],
  hesitation: [
    {
      slug: 'small_talk',
      title: 'Small talk',
      why: 'Low-stakes pacing — short turns reduce filler pressure.',
    },
  ],
}

/**
 * Map dominant weakness → suggested coach `conversationGoal`. Returns `null` when no specific
 * goal beats the learner's current goal; callers should fall back to the current goal in that
 * case so the deep-link doesn't silently change settings the learner just picked.
 */
function suggestGoalFromWeakness(topTag: string | null): LanguageCoachConversationGoal | null {
  if (!topTag) return null
  switch (topTag) {
    case 'follow_up_gap':
      return 'follow_up_questions'
    case 'past_tense':
    case 'word_order':
    case 'article':
    case 'question_form':
    case 'grammar_combo':
      return 'grammar'
    case 'hesitation':
    case 'low_clarity':
      return 'fluency'
    case 'wrong_word_choice':
    case 'english_fallback':
      return 'confidence'
    case 'short_fragments':
      return 'storytelling'
    default:
      return null
  }
}

function topWeaknessTag(weaknessHits: Record<string, number>): string | null {
  let top: string | null = null
  let topCount = 0
  for (const [tag, count] of Object.entries(weaknessHits)) {
    if (!Number.isFinite(count) || count <= 0) continue
    if (count > topCount) {
      top = tag
      topCount = count
    }
  }
  return top
}

/**
 * Compose the English pinned-focus instruction. The shape matches what
 * `languageCoachSpeakLivePrompt.ts` expects (treated as a "main practice thread" the coach
 * weaves back into the conversation). We intentionally keep it ≤220 chars so the prompt
 * builder's `.slice(0, 220)` never truncates mid-sentence.
 */
function composePinnedFocusEnglish(input: {
  grammarAnchors: string[]
  vocabAnchors: string[]
  suggestedGoalLabel: string | null
}): string {
  const grammar = input.grammarAnchors[0]
  const vocab = input.vocabAnchors[0]
  const goal = input.suggestedGoalLabel
  const parts: string[] = []
  if (grammar) parts.push(`practising ${grammar}`)
  if (vocab) parts.push(`varying my Dutch around the word “${vocab}”`)
  if (!parts.length && goal) parts.push(`my ${goal.toLowerCase()} goal`)
  if (!parts.length) return ''
  const focusBody = parts.length === 1 ? parts[0]! : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  return `Keep this session oriented around ${focusBody}. Bring it back into the chat with brief callbacks and one tight mini-drill when natural.`.slice(
    0,
    220,
  )
}

function goalDisplayLabel(goal: LanguageCoachConversationGoal | null): string | null {
  if (!goal) return null
  switch (goal) {
    case 'fluency':
      return 'fluency'
    case 'pronunciation':
      return 'pronunciation'
    case 'grammar':
      return 'grammar control'
    case 'confidence':
      return 'confidence'
    case 'storytelling':
      return 'storytelling'
    case 'follow_up_questions':
      return 'follow-up questions'
    case 'general':
      return 'everyday conversation'
    default:
      return null
  }
}

function dedupePreserveOrder(list: string[], max: number): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of list) {
    const v = raw.trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
    if (out.length >= max) break
  }
  return out
}

export function buildLanguageCoachNextPracticePlan(input: {
  lc: LanguageCoachPersistedBlob | undefined | null
  humanizedPatterns: string[]
  voiceWeakWords: string[]
  practicedLevel: string
  conversationRole: LanguageCoachConversationRole
}): LanguageCoachNextPracticePlan | null {
  const lc = input.lc
  const weaknessHits = lc?.weaknessHits ?? {}
  const currentGoal = lc?.conversationGoal ?? null

  const overusedStems = topOverusedStems(lc?.vocabStemHits ?? {}, 4)
  const vocabAnchors = dedupePreserveOrder([...input.voiceWeakWords, ...overusedStems], 3)
  const grammarAnchors = dedupePreserveOrder(input.humanizedPatterns, 3)

  const topTag = topWeaknessTag(weaknessHits)
  const suggestedGoalFromWeak = suggestGoalFromWeakness(topTag)
  /**
   * Prefer the learner's current goal when it's already specific (anything other than
   * `general`); only override with the weakness-derived goal when the current goal is
   * generic. This avoids the deep-link silently flipping settings the learner deliberately
   * chose earlier this session.
   */
  const suggestedGoal: LanguageCoachConversationGoal | null =
    currentGoal && currentGoal !== 'general' ? currentGoal : suggestedGoalFromWeak

  const suggestedGoalLabel = goalDisplayLabel(suggestedGoal)
  const pinnedFocusEnglish = composePinnedFocusEnglish({
    grammarAnchors,
    vocabAnchors,
    suggestedGoalLabel,
  })

  /**
   * Without a pinned-focus string we have no actionable plan — the section is hidden in the
   * UI, which is the "no defaults, no fallbacks" contract.
   */
  if (!pinnedFocusEnglish) return null

  /**
   * Scenario candidates: take from the top weakness's mapping, then from the next weakness
   * if there's room. Dedupe by slug. If no weakness mapping hits (e.g. unknown tag), fall
   * back to a single recommendation to repeat the Language Coach with the suggested focus
   * pre-loaded — still session-derived via the pinned focus, just no new scenario.
   */
  const candidates: LanguageCoachNextPracticePlan['scenarioCandidates'] = []
  const seenSlugs = new Set<string>()
  const pushFromTag = (tag: string | null, max: number) => {
    if (!tag) return
    const row = WEAKNESS_TO_SCENARIO_CANDIDATES[tag] ?? []
    for (const cand of row) {
      if (seenSlugs.has(cand.slug)) continue
      if (candidates.length >= max) return
      seenSlugs.add(cand.slug)
      candidates.push({
        scenarioSlug: cand.slug,
        scenarioTitle: cand.title,
        level: input.practicedLevel,
        why: cand.why,
      })
    }
  }
  pushFromTag(topTag, 2)
  /** Second-strongest weakness, if distinct, gets one more slot. */
  const secondTag = Object.entries(weaknessHits)
    .filter(([t, c]) => t !== topTag && Number.isFinite(c) && (c as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([t]) => t)[0]
  pushFromTag(secondTag ?? null, 3)

  /**
   * Build a compact headline that names the actual focus (no generic copy). Examples:
   *   "Next: asking follow-up questions, with reps around 'gezellig'."
   *   "Next: Dutch word order in a short storytelling round."
   *   "Next: keep building confidence in everyday Dutch."
   */
  const headlineParts: string[] = []
  if (grammarAnchors[0]) headlineParts.push(grammarAnchors[0])
  if (vocabAnchors[0]) headlineParts.push(`reps around “${vocabAnchors[0]}”`)
  const headlineBody = headlineParts.length
    ? headlineParts.join(' · ')
    : suggestedGoalLabel ?? 'a focused coach session'
  const headline = `Next: ${headlineBody}.`.slice(0, 200)

  return {
    headline,
    coachFocusBrief: {
      pinnedFocusEnglish,
      suggestedGoal,
      suggestedConversationRole: input.conversationRole,
      vocabAnchors,
      grammarAnchors,
    },
    scenarioCandidates: candidates,
  }
}
