import { describe, expect, it } from 'vitest'
import { resolveLanguageCoachSupportStrategy } from './languageCoachSupportStrategy'

describe('resolveLanguageCoachSupportStrategy', () => {
  it('lifts hint cadence for supportive + weak follow-up questions skill', () => {
    const base = resolveLanguageCoachSupportStrategy('supportive')
    expect(base.hintFrequency).toBe('minimal')
    const tuned = resolveLanguageCoachSupportStrategy('supportive', ['follow_up_questions'])
    expect(tuned.hintFrequency).toBe('normal')
  })

  it('tightens coaching for balanced + nuance family weakness', () => {
    const tuned = resolveLanguageCoachSupportStrategy('balanced', ['nuance'])
    expect(tuned.coachingTightness).toBe('tight')
  })
})
