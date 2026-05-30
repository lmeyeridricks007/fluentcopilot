import { describe, expect, it } from 'vitest'
import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import {
  itemMatchesBucket,
  itemMatchesContextFilter,
  itemMatchesDate,
  itemMatchesType,
  statusesForBucket,
  type CaptureBucketId,
} from '@/features/library/capture/captureLibraryBuckets'

function item(p: Partial<QuickCaptureItem> & Pick<QuickCaptureItem, 'id' | 'captureType' | 'status'>): QuickCaptureItem {
  const now = new Date().toISOString()
  return {
    title: null,
    bodyPrimary: 'sample text',
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

describe('statusesForBucket', () => {
  it('maps inbox to new + enriched', () => {
    expect(statusesForBucket('inbox')).toEqual(['new', 'enriched'])
  })

  it('returns null for all', () => {
    expect(statusesForBucket('all')).toBeNull()
  })
})

describe('itemMatchesBucket', () => {
  const ready = item({ id: '1', captureType: 'save_word', status: 'ready_for_practice' })
  const newCap = item({ id: '2', captureType: 'save_word', status: 'new' })

  it.each<[CaptureBucketId, QuickCaptureItem, boolean]>([
    ['all', ready, true],
    ['inbox', newCap, true],
    ['inbox', ready, false],
    ['ready', ready, true],
    ['ready', newCap, false],
    ['archived', item({ id: '3', captureType: 'save_word', status: 'archived' }), true],
  ])('bucket %s for %s → %s', (bucket, row, expected) => {
    expect(itemMatchesBucket(row, bucket)).toBe(expected)
  })
})

describe('itemMatchesType', () => {
  it('filters by capture type', () => {
    const w = item({ id: '1', captureType: 'save_word', status: 'new' })
    expect(itemMatchesType(w, 'all')).toBe(true)
    expect(itemMatchesType(w, 'save_word')).toBe(true)
    expect(itemMatchesType(w, 'voice_note')).toBe(false)
  })
})

describe('itemMatchesDate', () => {
  it('filters by local capture date', () => {
    const d = item({ id: '1', captureType: 'save_word', status: 'new', localCaptureDate: '2026-04-20' })
    expect(itemMatchesDate(d, 'all')).toBe(true)
    expect(itemMatchesDate(d, '2026-04-20')).toBe(true)
    expect(itemMatchesDate(d, '2026-04-21')).toBe(false)
  })
})

describe('itemMatchesContextFilter', () => {
  it('matches placeKind substring', () => {
    const r = item({
      id: '1',
      captureType: 'add_place',
      status: 'ready_for_practice',
      placeKind: 'train_station',
    })
    expect(itemMatchesContextFilter(r, 'train')).toBe(true)
    expect(itemMatchesContextFilter(r, 'shop')).toBe(false)
  })

  it('matches enrichment scenario slug', () => {
    const r = item({
      id: '2',
      captureType: 'save_phrase',
      status: 'ready_for_practice',
      enrichedJson: JSON.stringify({ scenarioSlugGuess: 'train-station', tags: [] }),
    })
    expect(itemMatchesContextFilter(r, 'train')).toBe(true)
  })
})
