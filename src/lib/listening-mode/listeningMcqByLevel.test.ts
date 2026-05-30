import { describe, expect, it } from 'vitest'
import { LISTENING_CLIP_BANK } from '@/lib/listening-mode/catalog'
import { resolveListeningMcqFromClip } from '@/lib/listening-mode/listeningMcqByLevel'
import { buildListeningDrillPayload, drillCorrectAnswerId, drillAnswerOptions } from '@/lib/listening-mode/listeningDrillPayloadBuilders'

describe('resolveListeningMcqFromClip', () => {
  it('uses catalog MCQ for clips without level variants', () => {
    const clip = LISTENING_CLIP_BANK['cafe-detail-1']
    const r = resolveListeningMcqFromClip(clip, 'B1')
    expect(r.optionLabels).toEqual(clip.optionLabels)
    expect(r.correctIndex).toBe(clip.correctIndex)
  })

  it('serves level-specific train gist options that stay on travel context', () => {
    const clip = LISTENING_CLIP_BANK['train-gist-1']
    const a2 = resolveListeningMcqFromClip(clip, 'A2')
    expect(a2.optionLabels.join(' ').toLowerCase()).not.toMatch(/café|doctor|package|menu|appointment/)
    expect(a2.optionLabels.every((l) => /train|platform|delay|departure|track|utrecht|cancellation|city/i.test(l))).toBe(true)

    const b1 = resolveListeningMcqFromClip(clip, 'B1')
    expect(b1.optionLabels[0]).toContain('delay')
    expect(b1.optionLabels[0]).toMatch(/platform|track|seven/i)
  })

  it('aligns payload correctAnswerId with resolved correct label for train clips (after shuffle)', () => {
    const clip = LISTENING_CLIP_BANK['train-order-1']
    const p = buildListeningDrillPayload(clip, 'B1')
    const resolved = resolveListeningMcqFromClip(clip, 'B1')
    const correctLabel = resolved.optionLabels[resolved.correctIndex]
    const opts = drillAnswerOptions(p)
    expect(opts.find((o) => o.id === drillCorrectAnswerId(p))?.label).toBe(correctLabel)
  })
})
