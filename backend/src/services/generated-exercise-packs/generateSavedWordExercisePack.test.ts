import { describe, expect, it } from 'vitest'
import { buildFallbackSavedWordPack } from './generateSavedWordExercisePack'

describe('buildFallbackSavedWordPack', () => {
  it('returns 7 blocks for gezellig with nuanced explanation', () => {
    const p = buildFallbackSavedWordPack({
      word: 'gezellig',
      sourceCaptureIds: ['cap-1'],
      level: 'A2',
      enrichedJson: null,
      bodySecondary: 'NS train',
    })
    expect(p.usedLlm).toBe(false)
    expect(p.blocks.length).toBe(7)
    expect(p.blocks[0]?.type).toBe('explanation_card')
    const cfg = p.blocks[0]?.config as { englishMeaning?: string; exampleLines?: { dutch: string }[] }
    expect(cfg.englishMeaning?.toLowerCase()).toContain('warm')
    expect(cfg.exampleLines?.length).toBeGreaterThanOrEqual(3)
    expect(p.blocks[p.blocks.length - 1]?.type).toBe('scenario_jumpoff')
  })

  it('returns 7 blocks for arbitrary lemma', () => {
    const p = buildFallbackSavedWordPack({
      word: '  fiets  ',
      sourceCaptureIds: [],
      level: 'A2',
      enrichedJson: null,
      bodySecondary: null,
    })
    expect(p.blocks.length).toBe(7)
    expect(p.blocks.some((b) => b.type === 'multiple_choice_meaning')).toBe(true)
  })
})
