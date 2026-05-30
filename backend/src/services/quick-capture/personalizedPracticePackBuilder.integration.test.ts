import { describe, expect, it } from 'vitest'
import type { QuickCaptureRow } from '../../repositories/quickCaptureRepository'
import type { DailyCaptureCluster } from '../../domain/quickCapture/captureDomainTypes'
import { buildPersonalizedDayPracticePack, orderCapturesForPack } from './personalizedPracticePackBuilder'

function row(p: Partial<QuickCaptureRow> & Pick<QuickCaptureRow, 'id' | 'captureType'>): QuickCaptureRow {
  const now = new Date().toISOString()
  return {
    userId: 'u1',
    status: 'ready_for_practice',
    title: null,
    bodyPrimary: 'placeholder',
    bodySecondary: null,
    enrichedJson: null,
    rawJson: null,
    localCaptureDate: '2026-04-22',
    placeKind: null,
    imageMime: null,
    transcript: null,
    dayPackId: null,
    createdAt: now,
    updatedAt: now,
    ...p,
  }
}

describe('orderCapturesForPack', () => {
  it('orders by bundle ids then remainder', () => {
    const a = row({ id: 'a', captureType: 'save_word', bodyPrimary: 'a' })
    const b = row({ id: 'b', captureType: 'save_word', bodyPrimary: 'b' })
    const c = row({ id: 'c', captureType: 'save_word', bodyPrimary: 'c' })
    const ordered = orderCapturesForPack([a, b, c], ['c', 'a'])
    expect(ordered.map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })
})

describe('buildPersonalizedDayPracticePack — capture types & reps', () => {
  const localDate = '2026-04-22'

  it('builds steps for save_word', () => {
    const content = buildPersonalizedDayPracticePack({
      localDate,
      captures: [row({ id: 'w', captureType: 'save_word', bodyPrimary: 'fiets' })],
      themeClusters: [],
      mode: 'standard',
    })
    expect(content.captureIds).toContain('w')
    expect(content.steps.some((s) => s.kind === 'word_rep')).toBe(true)
  })

  it('builds steps for photo_text (anchor phrase + read_aloud from on-device / OCR text)', () => {
    const content = buildPersonalizedDayPracticePack({
      localDate,
      captures: [row({ id: 'p', captureType: 'photo_text', bodyPrimary: 'Verboden te roken' })],
      themeClusters: [],
      mode: 'standard',
    })
    expect(content.steps.some((s) => s.kind === 'phrase_rep')).toBe(true)
    expect(content.steps.some((s) => s.kind === 'read_aloud')).toBe(true)
  })

  it('builds steps for voice_note (transcription as primary)', () => {
    const content = buildPersonalizedDayPracticePack({
      localDate,
      captures: [
        row({
          id: 'v',
          captureType: 'voice_note',
          bodyPrimary: null,
          transcript: 'Even kort: ik wil graag een afspraak morgenochtend.',
        }),
      ],
      themeClusters: [],
      mode: 'standard',
    })
    expect(content.steps.some((s) => s.kind === 'phrase_rep')).toBe(true)
    expect(content.steps.some((s) => s.kind === 'read_aloud')).toBe(true)
    expect(content.steps.some((s) => s.kind === 'listening_burst')).toBe(true)
  })

  it('uses theme clusters when provided (bundling)', () => {
    const w = row({ id: 'w1', captureType: 'save_word', bodyPrimary: 'kaartje' })
    const clusters: DailyCaptureCluster[] = [
      {
        id: 'cl-1',
        title: 'Travel',
        summary: '2 captures',
        scenarioTags: ['train-station'],
        relatedCaptureIds: [w.id],
        priorityScore: 9,
      },
    ]
    const content = buildPersonalizedDayPracticePack({
      localDate,
      captures: [w],
      themeClusters: clusters,
      mode: 'standard',
    })
    expect(content.steps.some((s) => s.kind === 'theme_anchor')).toBe(true)
  })

  it('includes strongest_next for personalized completion flow', () => {
    const content = buildPersonalizedDayPracticePack({
      localDate,
      captures: [
        row({ id: 'a', captureType: 'save_phrase', bodyPrimary: 'Mag ik het bonnetje?' }),
        row({ id: 'b', captureType: 'save_word', bodyPrimary: 'bon' }),
      ],
      themeClusters: [],
      mode: 'standard',
    })
    expect(content.steps.some((s) => s.kind === 'strongest_next')).toBe(true)
  })
})
