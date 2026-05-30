import { describe, expect, it } from 'vitest'
import { buildSkillReportInsightLines } from './skillReportSurfaces'
import type { UserSkillProfile } from './skillTypes'

function minimalProfile(overrides: Partial<UserSkillProfile> = {}): UserSkillProfile {
  const t = '2026-04-01T12:00:00.000Z'
  return {
    schemaVersion: 1,
    userId: 'u1',
    overallSkillScore: 55,
    strongestSkills: ['reacting'],
    weakestSkills: ['follow_up_questions'],
    currentFocusSkills: ['follow_up_questions'],
    metrics: {
      follow_up_questions: {
        skillId: 'follow_up_questions',
        group: 'conversation',
        score: 44,
        state: 'needs_work',
        trend: 'flat',
        confidence: 'medium',
        evidenceCount: 5,
        lastUpdatedAt: t,
        sourceMix: ['speak_live'],
      },
      reacting: {
        skillId: 'reacting',
        group: 'conversation',
        score: 78,
        state: 'solid',
        trend: 'up',
        confidence: 'high',
        evidenceCount: 8,
        lastUpdatedAt: t,
        sourceMix: ['speak_live'],
      },
    },
    lastRecomputedAt: t,
    recentEvidence: [],
    snapshots: [],
    recommendations: {
      primary: {
        kind: 'scenario',
        title: 'Best next: small talk',
        subtitle: 'Light reps for follow-up questions.',
        reason: 'x',
        targetId: 'small_talk',
        relatedSkillIds: ['follow_up_questions'],
        priorityScore: 80,
      },
      secondary: null,
      encouragement: null,
      generatedAt: t,
    },
    displayPreferences: { showNumericScores: true },
    ...overrides,
  }
}

describe('buildSkillReportInsightLines', () => {
  it('returns empty lines on cold start or missing profile', () => {
    expect(buildSkillReportInsightLines({ userSkillProfile: null, sessionWeakHints: ['a'], coldStart: true })).toEqual([])
    expect(
      buildSkillReportInsightLines({ userSkillProfile: minimalProfile(), sessionWeakHints: [], coldStart: true }),
    ).toEqual([])
  })

  it('includes focus and avoids duplicating session echo hints', () => {
    const lines = buildSkillReportInsightLines({
      userSkillProfile: minimalProfile(),
      sessionWeakHints: ['subclause agreement in past tense'],
      coldStart: false,
      max: 4,
    })
    expect(lines.some((l) => /across sessions.*focus/i.test(l))).toBe(true)
    expect(lines.some((l) => l.toLowerCase().includes('subclause'))).toBe(false)
  })

  it('surfaces strength line when score is high enough', () => {
    const lines = buildSkillReportInsightLines({
      userSkillProfile: minimalProfile(),
      sessionWeakHints: [],
      coldStart: false,
    })
    expect(lines.some((l) => /reacting.*improving|strong in reacting/i.test(l))).toBe(true)
  })

  it('includes primary recommendation when slots remain', () => {
    const lines = buildSkillReportInsightLines({
      userSkillProfile: minimalProfile(),
      sessionWeakHints: [],
      coldStart: false,
      max: 5,
    })
    expect(lines.some((l) => /small talk/i.test(l))).toBe(true)
  })

  it('emits weakness reinforcement when trend is down with enough evidence', () => {
    const profile = minimalProfile({
      weakestSkills: ['grammar', 'follow_up_questions'],
      metrics: {
        ...minimalProfile().metrics,
        grammar: {
          skillId: 'grammar',
          group: 'language',
          score: 40,
          state: 'needs_work',
          trend: 'down',
          confidence: 'high',
          evidenceCount: 6,
          lastUpdatedAt: '2026-04-01T12:00:00.000Z',
          sourceMix: ['speak_live'],
        },
      },
    })
    const lines = buildSkillReportInsightLines({
      userSkillProfile: profile,
      sessionWeakHints: [],
      coldStart: false,
    })
    expect(lines.some((l) => /grammar.*reps/i.test(l))).toBe(true)
  })
})
