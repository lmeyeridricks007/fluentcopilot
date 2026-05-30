import { describe, expect, it } from 'vitest'
import {
  humanizeLanguageCoachWeaknessTag,
  pickBetterLineFromCoachReply,
  topWeakPatterns,
} from './languageCoachSessionEvaluation'
import { buildRoleSaveablePracticeItems } from './languageCoachSessionReportRole'
import type { LanguageCoachSessionHandoff } from './languageCoachSessionHandoff'

const baseHandoff = (
  overrides: Partial<LanguageCoachSessionHandoff> = {},
): LanguageCoachSessionHandoff => ({
  strongestSkillShown: 'You kept the conversation going long enough for real practice.',
  mostRepeatedWeakPattern: 'asking follow-up questions',
  bestExampleImprovement: 'You self-corrected once mid-sentence.',
  suggestedNextFocus: 'Next session: vary your synonyms around “gezellig”. Broader vocabulary also trains grammar indirectly.',
  suggestedNextFocusIsSessionDerived: true,
  notableNudgeMoments: [],
  ...overrides,
})

/**
 * Regression coverage for the 2026-05-16 "report is not giving specific feedback" issue.
 * Prior behavior leaked raw weakness heuristic tags (`follow_up_gap`) and debug counts
 * (`"follow up gap (×3)"`) into:
 *   - the COACH IN ONE LINE headline,
 *   - the `focusAreaLabel` chip,
 *   - the BEYOND THIS SESSION ribbon sessionEcho,
 *   - the TRY NEXT line,
 *   - and `scenarioOutcome.whatToImproveNext`.
 *
 * Humanizing at the producer (`topWeakPatterns`) fixes every downstream surface in one place
 * because the same `patterns` array is fanned out to all of them.
 */
describe('humanizeLanguageCoachWeaknessTag', () => {
  it('maps every shipping heuristic tag to a learner-facing English label', () => {
    /** Every tag from `detectLanguageCoachWeaknessSignals` in `languageCoachWeaknessSignals.ts`. */
    const cases: Array<{ tag: string; expected: string }> = [
      { tag: 'follow_up_gap', expected: 'asking follow-up questions' },
      { tag: 'past_tense', expected: 'past-tense forms' },
      { tag: 'word_order', expected: 'Dutch word order' },
      { tag: 'article', expected: 'de / het articles' },
      { tag: 'question_form', expected: 'Dutch question forms' },
      { tag: 'wrong_word_choice', expected: 'word choice that fits the tone' },
      { tag: 'english_fallback', expected: 'staying in Dutch when stuck' },
      { tag: 'short_fragments', expected: 'building fuller sentences' },
      { tag: 'low_clarity', expected: 'clearer sentence structure' },
      { tag: 'grammar_combo', expected: 'grammar (a few small slips combined)' },
      { tag: 'hesitation', expected: 'smoother delivery (fewer fillers)' },
      { tag: 'simple_repeat', expected: 'varying your sentence patterns' },
    ]
    for (const { tag, expected } of cases) {
      expect(humanizeLanguageCoachWeaknessTag(tag)).toBe(expected)
    }
  })

  it('falls back to a cleaned underscore-free tag for unknown future tags (degrades gracefully)', () => {
    /**
     * If a new tag is added in `languageCoachWeaknessSignals.ts` without a matching entry
     * here, the report should still ship readable copy — just less polished — rather than
     * leaking the raw `snake_case` token.
     */
    expect(humanizeLanguageCoachWeaknessTag('brand_new_signal')).toBe('brand new signal')
  })

  it('normalizes casing and whitespace before lookup', () => {
    expect(humanizeLanguageCoachWeaknessTag('  FOLLOW_UP_GAP  ')).toBe('asking follow-up questions')
  })
})

describe('topWeakPatterns', () => {
  it('returns learner-facing labels sorted by descending hit count', () => {
    const hits = {
      follow_up_gap: 3,
      past_tense: 5,
      word_order: 1,
    }
    expect(topWeakPatterns(hits, 5)).toEqual([
      'past-tense forms',
      'asking follow-up questions',
      'Dutch word order',
    ])
  })

  it('never emits the legacy debug count suffix `(×N)` into UI strings', () => {
    /**
     * This is the regression that turned the BEYOND THIS SESSION ribbon into
     * "You were working through follow up gap." on the screenshot — the debug count and the
     * raw tag both reached the user. The function must never re-introduce either format.
     */
    const hits = { follow_up_gap: 12, past_tense: 7 }
    const result = topWeakPatterns(hits, 5)
    for (const label of result) {
      expect(label).not.toMatch(/×\s*\d+/)
      expect(label).not.toMatch(/\b\w+_\w+\b/)
    }
  })

  it('drops tags with zero or negative hits and caps the output at `max`', () => {
    const hits = {
      past_tense: 4,
      word_order: 0,
      follow_up_gap: 3,
      article: -1,
      question_form: 2,
    }
    expect(topWeakPatterns(hits, 2)).toEqual([
      'past-tense forms',
      'asking follow-up questions',
    ])
  })

  it('returns an empty array when there are no weakness hits (cold-start safe)', () => {
    expect(topWeakPatterns({}, 5)).toEqual([])
  })
})

/**
 * Regression coverage for the 2026-05-16 "AIM FOR THIS DUTCH dumps the whole coach reply"
 * issue. The card pulled the first line of the coach reply, which in conversational coaching
 * was the entire multi-sentence response (validation + correction + follow-up). The extractor
 * must now isolate just the corrected Dutch span and return null for replies with no clean
 * correction so callers can drop the pair rather than render prose.
 */
describe('pickBetterLineFromCoachReply', () => {
  it("extracts the correction span after `Je bedoelt vast: '...'` (the exact pattern from the user's screenshot)", () => {
    const reply =
      "Goed dat je zegt dat het leuk was! Je bedoelt vast: 'Het was inderdaad erg druk.' Wat vonden jullie het leukste moment van het feestje?"
    expect(pickBetterLineFromCoachReply(reply)).toBe('Het was inderdaad erg druk.')
  })

  it('handles smart curly quotes (the shape OpenAI most often emits in Dutch text)', () => {
    const reply =
      'Heel goed dat je dat probeert. Je bedoelt vast: “Ik ben gisteren naar de markt gegaan.” Wat heb je daar gekocht?'
    expect(pickBetterLineFromCoachReply(reply)).toBe('Ik ben gisteren naar de markt gegaan.')
  })

  it('handles Dutch-style guillemets «…» used by the coach-guide system prompt', () => {
    const reply = 'Zeg precies: «Ik wil graag een kopje koffie, alstublieft.» Waarom: dit klinkt natuurlijker.'
    expect(pickBetterLineFromCoachReply(reply)).toBe('Ik wil graag een kopje koffie, alstublieft.')
  })

  it('picks the model line introduced by `Je kunt zeggen:` even after a long validation preamble', () => {
    const reply =
      'Wat leuk om te horen! Ik snap precies wat je bedoelt en je woordkeuze is grotendeels prima. Je kunt zeggen: "Ik vind het heel gezellig hier." Klinkt dat goed voor jou?'
    expect(pickBetterLineFromCoachReply(reply)).toBe('Ik vind het heel gezellig hier.')
  })

  it('falls back to the longest quoted Dutch span when no explicit marker is present', () => {
    const reply = 'Goed bezig! "Ik kom morgen langs." En jij?'
    expect(pickBetterLineFromCoachReply(reply)).toBe('Ik kom morgen langs.')
  })

  it('returns null when the coach reply has no quoted correction (so callers skip the pair)', () => {
    /**
     * This is the critical invariant: without it, conversational-only coach replies would
     * leak their first sentence into the "AIM FOR THIS DUTCH" card, which is exactly the
     * behavior the user reported.
     */
    const reply = 'Wat leuk! Vertel eens, wat was het leukste moment van het feestje voor jou?'
    expect(pickBetterLineFromCoachReply(reply)).toBeNull()
  })

  it('returns null for empty or whitespace-only replies', () => {
    expect(pickBetterLineFromCoachReply('')).toBeNull()
    expect(pickBetterLineFromCoachReply('   \n  \t  ')).toBeNull()
  })

  it('prefers the most specific marker when several would match (Je bedoelt vast beats Je bedoelt)', () => {
    /**
     * `COACH_CORRECTION_INTRO_MARKERS` orders longer markers first so the more specific
     * intro wins; if both "Je bedoelt vast" and the substring "Je bedoelt" could match, the
     * span attached to the more specific one should be returned.
     */
    const reply =
      "Ik denk dat je vooral bedoelt: 'wel iets anders'. Je bedoelt vast: 'Ik ga vanavond uit.' Klopt dat?"
    expect(pickBetterLineFromCoachReply(reply)).toBe('Ik ga vanavond uit.')
  })

  it('caps overly long quoted spans (defensive: model spec violation should not break the card)', () => {
    const longSpan = 'A'.repeat(400)
    const reply = `Probeer: "${longSpan}" oké?`
    /**
     * The regex caps the captured span at COACH_BETTER_LINE_MAX (240) so a runaway quoted
     * paragraph cannot match — extractor returns null and the pair is dropped, rather than
     * shipping a 400-char "better" line into the UI card.
     */
    expect(pickBetterLineFromCoachReply(reply)).toBeNull()
  })
})

/**
 * Regression coverage for the 2026-05-16 "ROLE PRACTICE TO SAVE is not relevant" slim-down.
 * Dropped the WEAK STRUCTURE, COACH FOLLOW UP, and PHRASING UPGRADE card types because they
 * were generic templates or duplicated PHRASES TO REFINE. What remains MUST be session-derived.
 */
describe('buildRoleSaveablePracticeItems', () => {
  it('drops the WEAK STRUCTURE card (was a generic mini-drill template with the weakness label plugged in)', () => {
    const items = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: ['asking follow-up questions', 'Dutch word order'],
      improvedPhrasing: [],
      handoff: baseHandoff(),
    })
    expect(items.find((i) => i.tagCategory === 'weak_structure')).toBeUndefined()
    expect(items.find((i) => i.title?.startsWith('Weak pattern to train'))).toBeUndefined()
  })

  it('drops the COACH FOLLOW UP card (was a fixed per-role Dutch question, not session-derived)', () => {
    const items = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: ['asking follow-up questions'],
      improvedPhrasing: [],
      handoff: baseHandoff(),
    })
    expect(items.find((i) => i.tagCategory === 'coach_follow_up')).toBeUndefined()
  })

  it('drops the PHRASING UPGRADE card (duplicated PHRASES TO REFINE, which has audio + save + tap-a-word)', () => {
    const items = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: [],
      improvedPhrasing: [{ learnerish: 'Als vast dan veel druk', better: 'Het was inderdaad erg druk.' }],
      handoff: baseHandoff(),
    })
    expect(items.find((i) => i.tagCategory === 'phrasing_upgrade')).toBeUndefined()
  })

  it('keeps the MINI PRACTICE card when the suggested focus is session-derived', () => {
    const items = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: ['asking follow-up questions'],
      improvedPhrasing: [],
      handoff: baseHandoff({ suggestedNextFocusIsSessionDerived: true }),
    })
    const mini = items.find((i) => i.tagCategory === 'mini_practice')
    expect(mini).toBeDefined()
    expect(mini?.title).toBe('Next mini-drill')
    expect(mini?.body).toContain('gezellig')
  })

  it('drops the MINI PRACTICE card when the suggested focus is the generic fallback (no signal)', () => {
    /**
     * This is the critical invariant of the slim-down: when there is no real session signal,
     * the section should not emit a generic "repeat this mode" line — the whole section
     * disappears instead. UI gate: `roleSaveablePracticeItems.length > 0`.
     */
    const items = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: [],
      improvedPhrasing: [],
      handoff: baseHandoff({
        suggestedNextFocus: 'Next session: repeat this mode with the same learning goal and pay attention to one micro-point each round.',
        suggestedNextFocusIsSessionDerived: false,
      }),
    })
    expect(items.find((i) => i.tagCategory === 'mini_practice')).toBeUndefined()
  })

  it('emits the pronunciation drill only when the conversation goal was pronunciation', () => {
    const withPronGoal = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: [],
      improvedPhrasing: [],
      handoff: baseHandoff(),
      conversationGoal: 'pronunciation',
    })
    expect(withPronGoal.find((i) => i.tagCategory === 'pronunciation_target')).toBeDefined()

    const withoutPronGoal = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: [],
      improvedPhrasing: [],
      handoff: baseHandoff(),
      conversationGoal: 'fluency',
    })
    expect(withoutPronGoal.find((i) => i.tagCategory === 'pronunciation_target')).toBeUndefined()
  })

  it('returns an empty array when there is no session signal at all (section disappears in UI)', () => {
    const items = buildRoleSaveablePracticeItems({
      role: 'coach',
      patterns: [],
      improvedPhrasing: [],
      handoff: baseHandoff({ suggestedNextFocusIsSessionDerived: false }),
    })
    expect(items).toEqual([])
  })
})
