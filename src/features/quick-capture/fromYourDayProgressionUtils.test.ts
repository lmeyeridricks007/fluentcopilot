import { describe, expect, it } from 'vitest'
import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import {
  collectStruggleSignalsFromCaptures,
  inferPracticePackModeFromSteps,
} from '@/features/quick-capture/fromYourDayProgressionUtils'

describe('inferPracticePackModeFromSteps', () => {
  it('reads pack_meta mode', () => {
    expect(
      inferPracticePackModeFromSteps([
        { kind: 'pack_meta', mode: 'quick_rep' },
        { kind: 'short_recap' },
      ]),
    ).toBe('quick_rep')
  })

  it('infers deeper_debrief when multiple heavy steps', () => {
    const mode = inferPracticePackModeFromSteps([
      { kind: 'pack_meta' },
      { kind: 'coach_debrief' },
      { kind: 'mini_scenario' },
      { kind: 'word_rep' },
    ])
    expect(mode).toBe('deeper_debrief')
  })
})

describe('collectStruggleSignalsFromCaptures', () => {
  const cap = (enrichedJson: string | null): QuickCaptureItem =>
    ({
      id: '1',
      captureType: 'log_struggle',
      status: 'ready_for_practice',
      title: null,
      bodyPrimary: 'x',
      bodySecondary: null,
      enrichedJson,
      rawJson: null,
      localCaptureDate: '2026-04-22',
      placeKind: null,
      imageMime: null,
      transcript: null,
      dayPackId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }) as QuickCaptureItem

  it('collects struggleSignals from enrichment JSON', () => {
    const json = JSON.stringify({ struggleSignals: ['formality', 'speed'] })
    expect(collectStruggleSignalsFromCaptures([cap(json)], 8)).toEqual(['formality', 'speed'])
  })

  it('returns empty when no signals', () => {
    expect(collectStruggleSignalsFromCaptures([cap(null)], 8)).toEqual([])
  })
})
