import { describe, expect, it } from 'vitest'
import {
  computeFromYourDayHintsFromItems,
  hintsFromQuickCaptureApiSummary,
} from '@/lib/progression/fromYourDaySuggestionHeuristics'
import type { QuickCaptureLikeForHints } from '@/lib/progression/fromYourDaySuggestionHeuristics'

describe('hintsFromQuickCaptureApiSummary', () => {
  it('maps API summary fields for Today suggestions', () => {
    const h = hintsFromQuickCaptureApiSummary({
      practiceReadyCount: 2,
      struggleCaptureCount: 1,
      maxSameTopicRepeats: 2,
      highValueCaptureCount: 3,
      suggestionPriorityScore: 44,
      previewFragments: ['Train', 'Café'],
      primarySnippets: ['Goedemorgen', 'Ticket'],
    })
    expect(h).not.toBeNull()
    expect(h!.practiceReadyCount).toBe(2)
    expect(h!.struggleCaptureCount).toBe(1)
    expect(h!.previewFragments.length).toBeLessThanOrEqual(3)
    expect(h!.primarySnippets.length).toBeLessThanOrEqual(4)
  })

  it('falls back from legacy readyCount', () => {
    const h = hintsFromQuickCaptureApiSummary({ readyCount: 4 })
    expect(h?.practiceReadyCount).toBe(4)
  })
})

describe('computeFromYourDayHintsFromItems', () => {
  const day = '2026-04-22'

  function row(p: Partial<QuickCaptureLikeForHints> & Pick<QuickCaptureLikeForHints, 'captureType' | 'status'>): QuickCaptureLikeForHints {
    return {
      bodyPrimary: 'Hallo',
      bodySecondary: null,
      enrichedJson: null,
      transcript: null,
      placeKind: null,
      localCaptureDate: day,
      ...p,
    }
  }

  it('returns null when no rows for date', () => {
    expect(computeFromYourDayHintsFromItems([row({ captureType: 'save_word', status: 'ready_for_practice' })], '2099-01-01')).toBeNull()
  })

  it('counts practice-ready and struggle captures', () => {
    const items: QuickCaptureLikeForHints[] = [
      row({ captureType: 'save_phrase', status: 'ready_for_practice', bodyPrimary: 'Mag ik …' }),
      row({
        captureType: 'log_struggle',
        status: 'ready_for_practice',
        bodyPrimary: 'Could not follow',
        bodySecondary: 'tags:noise',
      }),
      row({ captureType: 'voice_note', status: 'new', bodyPrimary: 'Note', transcript: null }),
    ]
    const h = computeFromYourDayHintsFromItems(items, day)
    expect(h).not.toBeNull()
    expect(h!.practiceReadyCount).toBeGreaterThanOrEqual(1)
    expect(h!.struggleCaptureCount).toBeGreaterThanOrEqual(1)
    expect(h!.suggestionPriorityScore).toBeGreaterThan(0)
  })
})
