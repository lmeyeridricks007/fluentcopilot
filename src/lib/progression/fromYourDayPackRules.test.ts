import { describe, expect, it } from 'vitest'
import {
  fromYourDayPackCompletionQualifies,
  fromYourDayPackProgressCountsQualify,
} from '@/lib/progression/fromYourDayPackRules'

describe('fromYourDayPackProgressCountsQualify', () => {
  it('requires non-zero total', () => {
    expect(fromYourDayPackProgressCountsQualify({ stepsTotal: 0, stepsCompleted: 0 })).toBe(false)
  })

  it('requires at least min(3, total) completed steps', () => {
    expect(fromYourDayPackProgressCountsQualify({ stepsTotal: 5, stepsCompleted: 2 })).toBe(false)
    expect(fromYourDayPackProgressCountsQualify({ stepsTotal: 5, stepsCompleted: 3 })).toBe(true)
    expect(fromYourDayPackProgressCountsQualify({ stepsTotal: 2, stepsCompleted: 2 })).toBe(true)
  })

  it('requires ≥55% completion ratio', () => {
    expect(fromYourDayPackProgressCountsQualify({ stepsTotal: 10, stepsCompleted: 5 })).toBe(false)
    expect(fromYourDayPackProgressCountsQualify({ stepsTotal: 10, stepsCompleted: 6 })).toBe(true)
  })
})

describe('fromYourDayPackCompletionQualifies', () => {
  it('requires marked complete', () => {
    expect(
      fromYourDayPackCompletionQualifies({
        stepsTotal: 5,
        stepsCompleted: 5,
        markedComplete: false,
      }),
    ).toBe(false)
  })

  it('matches progress helper when marked complete', () => {
    const total = 6
    const done = 4
    expect(
      fromYourDayPackCompletionQualifies({ stepsTotal: total, stepsCompleted: done, markedComplete: true }),
    ).toBe(fromYourDayPackProgressCountsQualify({ stepsTotal: total, stepsCompleted: done }))
  })
})
