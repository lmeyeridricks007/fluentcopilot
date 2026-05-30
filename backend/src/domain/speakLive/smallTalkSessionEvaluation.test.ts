import { describe, expect, it } from 'vitest'
import { buildSmallTalkRewriteOptions } from './smallTalkSessionEvaluation'

describe('buildSmallTalkRewriteOptions', () => {
  it('dedupes and orders better → more natural → alternative', () => {
    const ro = buildSmallTalkRewriteOptions({
      improvedVersion: 'Ik ga wandelen.',
      nativePhrase: 'Ik ben gaan wandelen.',
      moreNaturalDutchVersion: 'Ik ben gaan wandelen.',
      nextStepBeyondLevel: 'Ik heb gewandeld.',
    })
    expect(ro.safeForLevel?.text).toBe('Ik ga wandelen.')
    expect(ro.moreNatural?.text).toBe('Ik ben gaan wandelen.')
    expect(ro.stretch?.text).toBe('Ik heb gewandeld.')
    expect(ro.alternativePhrasing).toBeNull()
  })
})
