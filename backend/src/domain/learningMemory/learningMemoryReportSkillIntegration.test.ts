import { describe, expect, it } from 'vitest'
import type { LiveSessionEvaluation } from '../../services/speak-live/liveVoiceEvaluationTypes'
import { extractSessionWeakHintsForRibbon } from './learningMemoryRecommendationService'
import { buildSkillReportInsightLines } from '../skills/skillReportSurfaces'
import type { UserSkillProfile } from '../skills/skillTypes'

describe('report integration — session hints + skill insight lines', () => {
  it('extractSessionWeakHintsForRibbon dedupes and caps hints', () => {
    const evaluation = {
      focusArea: { label: '  linking words  ' },
      turnEvaluations: [
        {
          transcriptCoaching: {
            issues: [{ area: 'grammar', issue: 'word order in subclause' }],
          },
        },
        {
          transcriptCoaching: {
            issues: [{ area: 'grammar', issue: 'word order in subclause' }],
          },
        },
      ],
    } as unknown as LiveSessionEvaluation
    const hints = extractSessionWeakHintsForRibbon(evaluation)
    expect(hints.length).toBeLessThanOrEqual(4)
    expect(hints.some((h) => /linking/i.test(h))).toBe(true)
  })

  it('merges ribbon hints with skill lines without repeating blocked stems', () => {
    const profile: UserSkillProfile = {
      schemaVersion: 1,
      userId: 'u1',
      overallSkillScore: 50,
      strongestSkills: [],
      weakestSkills: ['vocabulary'],
      currentFocusSkills: ['vocabulary'],
      metrics: {
        vocabulary: {
          skillId: 'vocabulary',
          group: 'language',
          score: 42,
          state: 'building',
          trend: 'flat',
          confidence: 'medium',
          evidenceCount: 5,
          lastUpdatedAt: '2026-04-01T12:00:00.000Z',
          sourceMix: ['read_aloud'],
        },
      },
      lastRecomputedAt: '2026-04-01T12:00:00.000Z',
      recentEvidence: [],
      snapshots: [],
      recommendations: null,
      displayPreferences: null,
    }
    const sessionHints = ['vocabulary: sticky lemmas']
    const lines = buildSkillReportInsightLines({
      userSkillProfile: profile,
      sessionWeakHints: sessionHints,
      coldStart: false,
    })
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.some((l) => l.includes('sticky lemmas'))).toBe(false)
  })
})
