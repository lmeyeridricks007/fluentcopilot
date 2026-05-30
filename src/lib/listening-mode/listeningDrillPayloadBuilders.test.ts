import { describe, expect, it } from 'vitest'
import { LISTENING_CLIP_BANK } from '@/lib/listening-mode/catalog'
import {
  buildListeningDrillPayload,
  drillAnswerOptions,
  drillCorrectAnswerId,
  drillPrimaryPrompt,
  listeningMcqOrderSeedFromString,
  mapClipDrillTypeToPayloadKind,
} from '@/lib/listening-mode/listeningDrillPayloadBuilders'
import { resolveListeningMcqFromClip } from '@/lib/listening-mode/listeningMcqByLevel'

describe('listeningDrillPayloadBuilders', () => {
  it('maps schema drill types to product payload kinds', () => {
    expect(mapClipDrillTypeToPayloadKind('detail_catch')).toBe('detail')
    expect(mapClipDrillTypeToPayloadKind('order_instruction')).toBe('instruction')
    expect(mapClipDrillTypeToPayloadKind('fast_dutch')).toBe('fast_speech')
    expect(mapClipDrillTypeToPayloadKind('replay_reveal')).toBe('gist')
    expect(mapClipDrillTypeToPayloadKind('weak_area')).toBe('personalized_focus')
  })

  it('builds level-shaped gist and fast_speech payloads', () => {
    const gist = buildListeningDrillPayload(LISTENING_CLIP_BANK['cafe-gist-1'], 'A1')
    expect(gist.kind).toBe('gist')
    expect(gist.audio.rate).toBeLessThanOrEqual(0.86)
    expect(drillAnswerOptions(gist)).toHaveLength(4)
    expect(drillPrimaryPrompt(gist).length).toBeGreaterThan(3)

    const fast = buildListeningDrillPayload(LISTENING_CLIP_BANK['super-fast-1'], 'B1')
    expect(fast.kind).toBe('fast_speech')
    if (fast.kind === 'fast_speech') {
      expect(fast.slowerAudio.rate).toBeLessThan(fast.audio.rate)
      expect(fast.reducedNaturalSpeechExplanationEn).toBeTruthy()
    }
  })

  it('marks the resolved correct label with correctAnswerId after shuffle', () => {
    const clip = LISTENING_CLIP_BANK['cafe-detail-1']
    const resolved = resolveListeningMcqFromClip(clip, 'A2')
    const correctLabel = resolved.optionLabels[resolved.correctIndex]
    const p = buildListeningDrillPayload(clip, 'A2')
    const opts = drillAnswerOptions(p)
    const marked = opts.find((o) => o.id === drillCorrectAnswerId(p))
    expect(marked?.label).toBe(correctLabel)
  })

  it('can place the correct answer away from the first slot for some seeds', () => {
    const clip = LISTENING_CLIP_BANK['cafe-gist-1']
    const resolved = resolveListeningMcqFromClip(clip, 'A2')
    const correctLabel = resolved.optionLabels[resolved.correctIndex]
    let sawNonFirst = false
    for (let s = 1; s < 400; s++) {
      const p = buildListeningDrillPayload(clip, 'A2', { mcqOrderSeed: s })
      const opts = drillAnswerOptions(p)
      const ix = opts.findIndex((o) => o.label === correctLabel)
      if (ix > 0) {
        sawNonFirst = true
        break
      }
    }
    expect(sawNonFirst).toBe(true)
  })

  it('uses session+clip seed string helper for stable order', () => {
    const clip = LISTENING_CLIP_BANK['cafe-detail-1']
    const seed = listeningMcqOrderSeedFromString('ls_demo:cafe-detail-1')
    const a = buildListeningDrillPayload(clip, 'A2', { mcqOrderSeed: seed })
    const b = buildListeningDrillPayload(clip, 'A2', { mcqOrderSeed: seed })
    expect(drillAnswerOptions(a).map((o) => o.label)).toEqual(drillAnswerOptions(b).map((o) => o.label))
    expect(drillCorrectAnswerId(a)).toBe(drillCorrectAnswerId(b))
  })

  it('builds listen_respond and order_instruction payloads', () => {
    const respond = buildListeningDrillPayload(LISTENING_CLIP_BANK['cafe-respond-1'], 'A2')
    expect(respond.kind).toBe('listen_respond')
    if (respond.kind === 'listen_respond') {
      expect(respond.whatYouShouldSayNextEn?.length).toBeGreaterThan(5)
    }
    const order = buildListeningDrillPayload(LISTENING_CLIP_BANK['train-order-1'], 'A2')
    expect(order.kind).toBe('instruction')
  })

  it('maps replay_reveal clip to gist-shaped payload', () => {
    const clip = LISTENING_CLIP_BANK['booking-replay-1']
    const p = buildListeningDrillPayload(clip, 'A2')
    expect(p.kind).toBe('gist')
  })
})
