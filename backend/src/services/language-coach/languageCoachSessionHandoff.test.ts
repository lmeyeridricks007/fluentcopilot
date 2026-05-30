import { describe, expect, it } from 'vitest'
import { computeLanguageCoachSessionHandoff } from './languageCoachSessionHandoff'
import type { LanguageCoachPersistedBlob } from '../../domain/speakLive/languageCoachSessionTypes'

function blob(overrides: Partial<LanguageCoachPersistedBlob> = {}): LanguageCoachPersistedBlob {
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
    sessionSignals: {},
    topicsTokensMentioned: [],
    recentCoachLeadIns: [],
    vocabStemHits: {},
    ...overrides,
  }
}

describe('computeLanguageCoachSessionHandoff — strongestSkillShown tightening', () => {
  it('does NOT default to "follow-up questions felt steady" without positive question evidence', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({ weaknessHits: {} }),
      userTurnCount: 4,
      topWeakPatterns: [],
    })
    expect(out.strongestSkillShown).not.toMatch(/follow-up questions and engagement felt steady/i)
  })

  it('keeps the cold-start "you kept speaking actively" line when nothing positive can be claimed', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({ weaknessHits: {} }),
      userTurnCount: 3,
      topWeakPatterns: [],
    })
    expect(out.strongestSkillShown).toMatch(/kept speaking actively/i)
  })

  it('fires "follow-up questions felt steady" only when userFollowUpQuestionCount >= 2', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({ weaknessHits: {} }),
      userTurnCount: 5,
      topWeakPatterns: [],
      userFollowUpQuestionCount: 2,
    })
    expect(out.strongestSkillShown).toMatch(/follow-up questions and engagement felt steady/i)
  })

  it('does NOT fire the optimistic follow-up line when grammar weakness dominates', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({ weaknessHits: { past_tense: 3 } }),
      userTurnCount: 5,
      topWeakPatterns: ['past-tense forms'],
      userFollowUpQuestionCount: 3,
    })
    expect(out.strongestSkillShown).not.toMatch(/follow-up questions and engagement felt steady/i)
  })

  it('switches strongestSkillShown to grammar-honest copy when past_tense dominates', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({ weaknessHits: { past_tense: 4 } }),
      userTurnCount: 4,
      topWeakPatterns: ['past-tense forms'],
    })
    expect(out.strongestSkillShown).toMatch(/stayed in Dutch and kept trying real sentences/i)
  })

  it('switches strongestSkillShown to grammar-honest copy when word_order dominates', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({ weaknessHits: { word_order: 3, article: 1 } }),
      userTurnCount: 4,
      topWeakPatterns: ['Dutch word order'],
    })
    expect(out.strongestSkillShown).toMatch(/stayed in Dutch and kept trying real sentences/i)
  })

  it('keeps the fluent-stretches line when sessionSignals say clean+fluent dominate', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({
        weaknessHits: {},
        sessionSignals: { fluent_stretch_turn: 3, clean_natural_turn: 4 },
      }),
      userTurnCount: 6,
      topWeakPatterns: [],
    })
    expect(out.strongestSkillShown).toMatch(/longer, relatively clean sentences/i)
  })

  it('does NOT fire follow-up line when userFollowUpQuestionCount is unset (defaults to 0)', () => {
    const out = computeLanguageCoachSessionHandoff({
      lc: blob({ weaknessHits: {} }),
      userTurnCount: 5,
      topWeakPatterns: [],
    })
    expect(out.strongestSkillShown).not.toMatch(/follow-up questions and engagement felt steady/i)
  })
})
