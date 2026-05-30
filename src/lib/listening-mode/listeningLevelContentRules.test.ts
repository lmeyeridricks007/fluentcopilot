import { describe, expect, it } from 'vitest'
import {
  adaptCoachCopyForLevel,
  impliedContextHintEn,
  levelScenarioSubtitle,
  listeningLevelContentBand,
} from '@/lib/listening-mode/listeningLevelContentRules'

describe('listeningLevelContentRules', () => {
  it('maps A1/A2/B1 to distinct content bands', () => {
    const a1 = listeningLevelContentBand('A1')
    const a2 = listeningLevelContentBand('A2')
    const b1 = listeningLevelContentBand('B1')
    expect(a1.tier).toBe('foundational')
    expect(a1.detailDepth).toBe(1)
    expect(a2.tier).toBe('standard')
    expect(a2.detailDepth).toBe(2)
    expect(b1.tier).toBe('stretch')
    expect(b1.detailDepth).toBe(3)
  })

  it('provides scenario subtitles per level', () => {
    expect(levelScenarioSubtitle('A1')).toMatch(/short/i)
    expect(levelScenarioSubtitle('B1')).toMatch(/context/i)
    expect(levelScenarioSubtitle('A2').length).toBeGreaterThan(8)
  })

  it('adapts coach copy for A1 compact verbosity', () => {
    const long = 'First sentence. Second sentence! Third sentence? '.repeat(20)
    const out = adaptCoachCopyForLevel(long, 'A1', 120)
    expect(out.length).toBeLessThanOrEqual(125)
  })

  it('returns implied-context hints for each band', () => {
    expect(impliedContextHintEn('A1')).toMatch(/direct/i)
    expect(impliedContextHintEn('B1')).toMatch(/compress|who|what/i)
    expect(impliedContextHintEn('A2')).toBeTruthy()
  })
})
