import { describe, expect, it } from 'vitest'
import { getListeningPack } from '@/lib/listening-mode/catalog'
import {
  humanizeListeningProfileDimension,
  pickWeakestDimension,
  resolveListeningSessionClips,
} from '@/lib/listening-mode/listeningSessionResolve'

describe('track retrieval (catalog → session clips)', () => {
  it('getListeningPack resolves known pack ids used by FluentCopilot', () => {
    expect(getListeningPack('pack-cafe-burst')?.clipIds.length).toBeGreaterThan(0)
    expect(getListeningPack('unknown-pack')).toBeUndefined()
  })
})

describe('resolveListeningSessionClips', () => {
  it('returns base clips plus weak-area tail', () => {
    const clips = resolveListeningSessionClips('pack-cafe-burst', {})
    expect(clips.length).toBeGreaterThanOrEqual(4)
    expect(clips[clips.length - 1].drillType).toBe('weak_area')
  })

  it('prefers numbers weak clip when numbers_times stress is high', () => {
    const clips = resolveListeningSessionClips('pack-cafe-burst', { numbers_times: 0.9 })
    const last = clips[clips.length - 1]
    expect(last.id.startsWith('weak-numbers-1')).toBe(true)
  })
})

describe('pickWeakestDimension', () => {
  it('returns null when nothing stands out', () => {
    expect(pickWeakestDimension({ gist: 0.1 })).toBeNull()
  })

  it('returns dimension above threshold', () => {
    expect(pickWeakestDimension({ fast_speech: 0.72 })).toBe('fast_speech')
  })
})

describe('humanizeListeningProfileDimension', () => {
  it('returns readable labels for profile dimensions', () => {
    expect(humanizeListeningProfileDimension('numbers_times')).toMatch(/times|number/i)
    expect(humanizeListeningProfileDimension('route_place')).toMatch(/route|place/i)
  })
})

describe('resolveListeningSessionClips edge cases', () => {
  it('returns empty array for unknown pack id', () => {
    expect(resolveListeningSessionClips('not-a-real-pack', {})).toEqual([])
  })
})
