import { describe, expect, it } from 'vitest'
import { buildLanguageCoachSpeakLivePromptBlock } from './languageCoachSpeakLivePrompt'
import { defaultSpeakLiveState, type SpeakLivePersistedState } from '../../domain/speakLive/speakLiveFsm'
import type { LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'

function makeLc(overrides: Partial<LanguageCoachPersistedBlob> = {}): LanguageCoachPersistedBlob {
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

function makeState(lc: LanguageCoachPersistedBlob): SpeakLivePersistedState {
  return { ...defaultSpeakLiveState(), languageCoach: lc }
}

describe('buildLanguageCoachSpeakLivePromptBlock — opening turn directive', () => {
  it('does NOT emit the directive (and keeps legacy opener hint) for cold-start general goal', () => {
    /**
     * No framing to lean on: no pinned focus, goal=general. The legacy "ask a light opener
     * if needed" hint should stay so we don't regress the true cold-start UX.
     */
    const out = buildLanguageCoachSpeakLivePromptBlock({
      state: makeState(makeLc()),
      scenarioTitle: 'Jouw taalcoach',
      learnerLevelCefr: 'A2',
    })
    expect(out).not.toContain('Opening turn directive')
    expect(out).toContain('(none yet — ask a light opener if needed.)')
  })

  it('emits the directive AND suppresses the generic opener hint when a pinned focus is seeded (cold start, general goal)', () => {
    /**
     * Deep-link from the previous session's "Plan your next session" CTA: pinned focus is
     * populated even though goal remains general. The directive must fire, must surface the
     * pinned focus verbatim for the model, and must NOT leave the legacy "ask a light
     * opener" hint visible (otherwise the two would contradict).
     */
    const out = buildLanguageCoachSpeakLivePromptBlock({
      state: makeState(
        makeLc({
          learnerPinnedLessonFocusEnglish:
            'Keep this session oriented around practising asking follow-up questions and varying my Dutch around the word “vast”.',
        }),
      ),
      scenarioTitle: 'Jouw taalcoach',
      learnerLevelCefr: 'A2',
    })
    expect(out).toContain('--- Opening turn directive (FIRST coach reply only')
    expect(out).toContain('A focus has been pinned for this session')
    expect(out).toContain('practising asking follow-up questions')
    expect(out).not.toContain('(none yet — ask a light opener if needed.)')
    expect(out).toContain('see the “Opening turn directive” block below')
  })

  it('emits a goal-anchored directive with concrete starting options when goal=grammar (no pinned focus)', () => {
    const out = buildLanguageCoachSpeakLivePromptBlock({
      state: makeState(makeLc({ conversationGoal: 'grammar' })),
      scenarioTitle: 'Jouw taalcoach',
      learnerLevelCefr: 'A2',
    })
    expect(out).toContain('--- Opening turn directive (FIRST coach reply only')
    expect(out).toContain('goal = grammar (grammatica)')
    /** Grammar menu items from `GOAL_OPENING_OPTIONS.grammar` must appear verbatim. */
    expect(out).toContain('werkwoordsvolgorde in bijzinnen')
    expect(out).toContain('verleden tijd (perfectum en imperfectum)')
    expect(out).toContain('Wil je beginnen met (a) …, (b) … of (c) …?')
  })

  it('combines pinned focus + specific goal when both are set', () => {
    const out = buildLanguageCoachSpeakLivePromptBlock({
      state: makeState(
        makeLc({
          conversationGoal: 'follow_up_questions',
          learnerPinnedLessonFocusEnglish:
            'Keep practising asking follow-up questions and varying Dutch around “vast”.',
        }),
      ),
      scenarioTitle: 'Jouw taalcoach',
      learnerLevelCefr: 'A2',
    })
    expect(out).toContain('A focus has been pinned for this session')
    expect(out).toContain("learner's chosen goal is follow_up_questions (doorvragen)")
    /** Doorvragen menu items must surface so the coach has concrete starting beats. */
    expect(out).toContain('doorvragen op iets wat ik net zei')
  })

  it('does NOT emit the directive after the coach has already replied at least once', () => {
    /**
     * Defensive: even with a pinned focus + specific goal, the directive must only fire on
     * the very first turn so we don't keep re-acknowledging the focus mid-conversation.
     */
    const out = buildLanguageCoachSpeakLivePromptBlock({
      state: makeState(
        makeLc({
          conversationGoal: 'grammar',
          learnerPinnedLessonFocusEnglish: 'Keep working on Dutch word order in subclauses.',
          coachTurnIndex: 3,
        }),
      ),
      scenarioTitle: 'Jouw taalcoach',
      learnerLevelCefr: 'A2',
    })
    expect(out).not.toContain('--- Opening turn directive (FIRST coach reply only')
    /** The pinned-lesson spine (which runs every turn) is still present — that's correct. */
    expect(out).toContain('Learner-pinned lesson spine')
  })
})
