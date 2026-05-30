import { describe, expect, it } from 'vitest'
import type { QuickCaptureRow } from '../../repositories/quickCaptureRepository'
import {
  buildThemeClusters,
  extractFeatures,
  orderedCaptureIdsFromClusters,
  similarityScore,
} from './dailyCaptureBundleClustering'

function row(p: Partial<QuickCaptureRow> & Pick<QuickCaptureRow, 'id' | 'captureType'>): QuickCaptureRow {
  const now = new Date().toISOString()
  return {
    userId: 'u1',
    status: 'ready_for_practice',
    title: null,
    bodyPrimary: 'default body',
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

describe('extractFeatures', () => {
  it('pulls OCR text from enrichedJson into combined tokens (image + OCR path)', () => {
    const r = row({
      id: '1',
      captureType: 'photo_text',
      bodyPrimary: '',
      enrichedJson: JSON.stringify({ ocrText: 'Perron twee naar Utrecht', scenarioSlugGuess: 'train-station' }),
    })
    const f = extractFeatures(r)
    expect(f.combinedLower).toContain('utrecht')
    expect(f.scenarioSlug).toBe('train-station')
  })

  it('uses transcript in combined text (voice path)', () => {
    const r = row({
      id: '2',
      captureType: 'voice_note',
      bodyPrimary: '',
      transcript: 'Ik moet een afspraak maken bij de huisarts',
    })
    const f = extractFeatures(r)
    expect(f.combinedLower).toContain('huisarts')
  })
})

describe('similarityScore + buildThemeClusters', () => {
  it('clusters same-scenario train captures', () => {
    const a = row({
      id: 'a',
      captureType: 'save_phrase',
      bodyPrimary: 'Welk spoor naar Amsterdam?',
      enrichedJson: JSON.stringify({ scenarioSlugGuess: 'train-station' }),
    })
    const b = row({
      id: 'b',
      captureType: 'voice_note',
      transcript: 'De trein naar Utrecht vertrekt van spoor vijf',
      enrichedJson: JSON.stringify({ scenarioSlugGuess: 'train-station' }),
    })
    const fa = extractFeatures(a)
    const fb = extractFeatures(b)
    expect(similarityScore(fa, fb)).toBeGreaterThan(2)
    const clusters = buildThemeClusters([a, b], [])
    expect(clusters.length).toBe(1)
    expect(clusters[0]!.relatedCaptureIds.sort()).toEqual(['a', 'b'].sort())
  })

  it('drops archived from clustering', () => {
    const clusters = buildThemeClusters(
      [
        row({ id: 'x', captureType: 'save_word', bodyPrimary: 'fiets', status: 'archived' }),
        row({ id: 'y', captureType: 'save_word', bodyPrimary: 'bakfiets', status: 'ready_for_practice' }),
      ],
      [],
    )
    expect(clusters.every((c) => !c.relatedCaptureIds.includes('x'))).toBe(true)
  })
})

describe('orderedCaptureIdsFromClusters', () => {
  it('dedups while preserving cluster order', () => {
    const ids = orderedCaptureIdsFromClusters([
      { id: 'c1', title: 'A', summary: 's', scenarioTags: [], relatedCaptureIds: ['1', '2'], priorityScore: 2 },
      { id: 'c2', title: 'B', summary: 's', scenarioTags: [], relatedCaptureIds: ['2', '3'], priorityScore: 1 },
    ])
    expect(ids).toEqual(['1', '2', '3'])
  })
})
