import { describe, expect, it } from 'vitest'
import { buildLanguageCoachNextPracticePlan } from './languageCoachNextPracticePlanner'
import type { LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'

function makeLcBlob(overrides: Partial<LanguageCoachPersistedBlob> = {}): LanguageCoachPersistedBlob {
  return {
    conversationGoal: 'general',
    feedbackStyle: 'subtle_and_end',
    coachStyle: 'balanced',
    personaStyle: 'coach',
    conversationRole: 'coach',
    coachGuideWhileSpeaking: false,
    learnerFactLinesEnglish: [],
    weaknessHits: {},
    coachTurnIndex: 0,
    sessionFocusChip: null,
    learnerPinnedLessonFocusEnglish: null,
    nudgeEvents: [],
    pendingNudgePlan: null,
    lastNudgeCoachTurnIndex: -1,
    activeGuideCorrection: null,
    sessionSignals: {},
    topicsTokensMentioned: [],
    recentCoachLeadIns: [],
    vocabStemHits: {},
    ...overrides,
  }
}

describe('buildLanguageCoachNextPracticePlan', () => {
  it('returns null when there is no usable signal (cold start)', () => {
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob(),
      humanizedPatterns: [],
      voiceWeakWords: [],
      practicedLevel: 'A2',
      conversationRole: 'coach',
    })
    expect(plan).toBeNull()
  })

  it('returns null when only the suggested goal is generic (no anchors, no weakness)', () => {
    /**
     * Without a humanized pattern AND without vocab anchors, the composer can only fall back
     * to a "your … goal" line, but we suppress even that here because no real session signal
     * exists. The UI gates on `nextPracticePlan != null` and the contract is "no defaults,
     * no fallbacks" — so the planner returns `null`.
     */
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({ conversationGoal: 'general' }),
      humanizedPatterns: [],
      voiceWeakWords: [],
      practicedLevel: 'A2',
      conversationRole: 'coach',
    })
    expect(plan).toBeNull()
  })

  it('produces a follow-up-questions plan from a dominant follow_up_gap weakness', () => {
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        weaknessHits: { follow_up_gap: 4, past_tense: 1 },
        conversationGoal: 'general',
        vocabStemHits: { gezellig: 4, leuk: 2 },
      }),
      humanizedPatterns: ['asking follow-up questions', 'Dutch word order'],
      voiceWeakWords: [],
      practicedLevel: 'A2',
      conversationRole: 'coach',
    })
    expect(plan).not.toBeNull()
    expect(plan!.coachFocusBrief.suggestedGoal).toBe('follow_up_questions')
    /** Top-of-list scenario must be the strongest fit for the dominant tag. */
    expect(plan!.scenarioCandidates[0]?.scenarioSlug).toBe('opinions_discussions')
    /** Practiced level is propagated to every candidate. */
    for (const c of plan!.scenarioCandidates) {
      expect(c.level).toBe('A2')
    }
    /** Grammar anchors flow through humanized, not raw tags. */
    expect(plan!.coachFocusBrief.grammarAnchors[0]).toBe('asking follow-up questions')
    /** Vocab anchors include the overused stem. */
    expect(plan!.coachFocusBrief.vocabAnchors).toContain('gezellig')
  })

  it('quotes the top vocab anchor in the pinned focus string with smart quotes', () => {
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        weaknessHits: { wrong_word_choice: 3 },
        vocabStemHits: { gezellig: 5 },
      }),
      humanizedPatterns: ['choosing the right Dutch word'],
      voiceWeakWords: [],
      practicedLevel: 'A2',
      conversationRole: 'coach',
    })
    expect(plan).not.toBeNull()
    expect(plan!.coachFocusBrief.pinnedFocusEnglish).toContain('“gezellig”')
    expect(plan!.coachFocusBrief.pinnedFocusEnglish.length).toBeLessThanOrEqual(220)
  })

  it('keeps the learner-chosen specific goal instead of overriding with weakness-derived goal', () => {
    /**
     * Contract: when the learner has already picked a specific goal (anything other than
     * `general`), do NOT silently flip it via the deep-link. The pinned focus already
     * carries the weakness-derived steer.
     */
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        conversationGoal: 'storytelling',
        weaknessHits: { follow_up_gap: 5 },
      }),
      humanizedPatterns: ['asking follow-up questions'],
      voiceWeakWords: [],
      practicedLevel: 'B1',
      conversationRole: 'coach',
    })
    expect(plan).not.toBeNull()
    expect(plan!.coachFocusBrief.suggestedGoal).toBe('storytelling')
  })

  it('dedupes vocab anchors across voice-weak and overused stems, preserving voice-weak priority', () => {
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        weaknessHits: { hesitation: 2 },
        vocabStemHits: { gezellig: 4, leuk: 4 },
      }),
      humanizedPatterns: ['speaking with a steadier rhythm'],
      voiceWeakWords: ['gezellig', 'restaurant'],
      practicedLevel: 'A2',
      conversationRole: 'coach',
    })
    expect(plan).not.toBeNull()
    /** Voice-weak words come first; duplicates are removed case-insensitively. */
    expect(plan!.coachFocusBrief.vocabAnchors.slice(0, 2)).toEqual(['gezellig', 'restaurant'])
    expect(plan!.coachFocusBrief.vocabAnchors.length).toBeLessThanOrEqual(3)
  })

  it('caps scenario candidates and dedupes by slug across primary + secondary weakness', () => {
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        /** Both tags map `small_talk` into their candidate lists — must appear only once. */
        weaknessHits: { english_fallback: 5, hesitation: 4 },
      }),
      humanizedPatterns: ['staying in Dutch under pressure'],
      voiceWeakWords: [],
      practicedLevel: 'A1',
      conversationRole: 'coach',
    })
    expect(plan).not.toBeNull()
    const slugs = plan!.scenarioCandidates.map((c) => c.scenarioSlug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs.length).toBeLessThanOrEqual(3)
  })

  it('produces an empty scenario list (but a non-null plan) for an unknown weakness tag with anchors present', () => {
    /**
     * Unknown tag → no mapping row → `scenarioCandidates` is empty. The plan itself stays
     * non-null because the pinned-focus / coach CTA path is still actionable.
     */
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        weaknessHits: { totally_unknown_signal: 2 },
        vocabStemHits: { gezellig: 5 },
      }),
      humanizedPatterns: ['varying word choice'],
      voiceWeakWords: [],
      practicedLevel: 'A2',
      conversationRole: 'coach',
    })
    expect(plan).not.toBeNull()
    expect(plan!.scenarioCandidates).toHaveLength(0)
    expect(plan!.coachFocusBrief.pinnedFocusEnglish).toContain('“gezellig”')
  })

  it('forwards conversationRole on the brief (so the entry hint can mirror the previous role)', () => {
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        conversationRole: 'friend',
        weaknessHits: { follow_up_gap: 3 },
      }),
      humanizedPatterns: ['asking follow-up questions'],
      voiceWeakWords: [],
      practicedLevel: 'A2',
      conversationRole: 'friend',
    })
    expect(plan).not.toBeNull()
    expect(plan!.coachFocusBrief.suggestedConversationRole).toBe('friend')
  })

  it('builds a headline that names the actual focus (no generic copy)', () => {
    const plan = buildLanguageCoachNextPracticePlan({
      lc: makeLcBlob({
        weaknessHits: { follow_up_gap: 4 },
        vocabStemHits: { gezellig: 4 },
      }),
      humanizedPatterns: ['asking follow-up questions'],
      voiceWeakWords: [],
      practicedLevel: 'A2',
      conversationRole: 'coach',
    })
    expect(plan).not.toBeNull()
    expect(plan!.headline).toMatch(/Next: /)
    expect(plan!.headline).toContain('asking follow-up questions')
    expect(plan!.headline).toContain('gezellig')
  })
})
