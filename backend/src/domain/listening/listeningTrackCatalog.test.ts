import { describe, expect, it } from 'vitest'
import {
  getCatalogClipByKey,
  getListeningClipsForTrack,
  getListeningTrackById,
  getListeningTracks,
} from './listeningTrackCatalog'

describe('listeningTrackCatalog', () => {
  it('getListeningTrackById retrieves known pack ids', () => {
    const t = getListeningTrackById('pack-cafe-burst')
    expect(t?.id).toBe('pack-cafe-burst')
    expect(t?.clipIds.length).toBeGreaterThan(0)
    expect(getListeningTrackById('missing-pack')).toBeNull()
  })

  it('getListeningTracks returns a stable non-empty catalog', () => {
    const all = getListeningTracks()
    expect(all.length).toBeGreaterThanOrEqual(2)
    expect(all.some((x) => x.scenarioId === 'cafe')).toBe(true)
  })

  it('getCatalogClipByKey resolves clip payloads', () => {
    const c = getCatalogClipByKey('cafe-gist-1')
    expect(c?.drillType).toBe('gist')
    const labels = c?.metadata && Array.isArray((c.metadata as { optionLabels?: unknown }).optionLabels)
      ? (c.metadata as { optionLabels: string[] }).optionLabels
      : []
    expect(labels.length).toBeGreaterThanOrEqual(2)
    expect(getCatalogClipByKey('nope')).toBeNull()
  })

  describe('getListeningClipsForTrack level filtering', () => {
    it('returns all catalog clips for track when level omitted', () => {
      const clips = getListeningClipsForTrack({ trackId: 'pack-cafe-burst' })
      expect(clips.length).toBeGreaterThanOrEqual(2)
    })

    it('filters by declared clip level when level is set', () => {
      const clips = getListeningClipsForTrack({ trackId: 'pack-cafe-burst', level: 'B1' })
      expect(clips.every((c) => c.level === 'B1' || c.drillType === 'personalized_focus')).toBe(true)
    })

    it('filters by scenarioKey when provided', () => {
      const clips = getListeningClipsForTrack({ trackId: 'pack-cafe-burst', scenarioKey: 'cafe' })
      expect(clips.every((c) => c.scenarioId === 'cafe')).toBe(true)
    })
  })
})
