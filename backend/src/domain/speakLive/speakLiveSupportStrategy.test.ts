import { describe, expect, it } from 'vitest'
import {
  legacyConversationModeFromSupportStrategy,
  normalizeSpeakLiveCefrLevel,
  resolveSpeakLiveSupportStrategy,
} from './speakLiveSupportStrategy'

describe('resolveSpeakLiveSupportStrategy', () => {
  it('gives stronger scaffolding for A2 + train station', () => {
    const s = resolveSpeakLiveSupportStrategy({
      cefrLevel: 'A2',
      scenarioSlug: 'train-station',
      scenarioGoalCount: 4,
    })
    expect(s.assistanceLevel).toBe('high')
    expect(s.coachingTightness).toBe('tight')
    expect(legacyConversationModeFromSupportStrategy(s)).toBe('guided')
  })

  it('relaxes for advanced learners', () => {
    const s = resolveSpeakLiveSupportStrategy({
      cefrLevel: 'C1',
      scenarioSlug: 'train-station',
      scenarioGoalCount: 4,
    })
    expect(s.assistanceLevel).toBe('light')
    expect(legacyConversationModeFromSupportStrategy(s)).toBe('free')
  })

  it('nudges hint density when several weak skills align with the scenario tag set (B1, simple scene)', () => {
    const baseline = resolveSpeakLiveSupportStrategy({
      cefrLevel: 'B1',
      scenarioSlug: 'small_talk',
      scenarioGoalCount: 2,
      weakSkillScenarioOverlapHits: 0,
    })
    const boosted = resolveSpeakLiveSupportStrategy({
      cefrLevel: 'B1',
      scenarioSlug: 'small_talk',
      scenarioGoalCount: 2,
      weakSkillScenarioOverlapHits: 2,
    })
    expect(baseline.hintFrequency).toBe('minimal')
    expect(boosted.hintFrequency).toBe('normal')
  })
})

describe('normalizeSpeakLiveCefrLevel', () => {
  it('defaults invalid input to A2', () => {
    expect(normalizeSpeakLiveCefrLevel('')).toBe('A2')
    expect(normalizeSpeakLiveCefrLevel('xx')).toBe('A2')
  })

  it('accepts common casing', () => {
    expect(normalizeSpeakLiveCefrLevel('b1')).toBe('B1')
  })
})
