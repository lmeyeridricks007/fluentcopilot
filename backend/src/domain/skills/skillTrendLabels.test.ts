import { describe, expect, it } from 'vitest'
import { trendToUserFacingLabel } from './skillTrendLabels'

describe('skillTrendLabels', () => {
  it('maps unstable to not enough data', () => {
    expect(trendToUserFacingLabel('unstable', 'high')).toBe('not_enough_data')
  })

  it('maps flat + medium confidence to steady', () => {
    expect(trendToUserFacingLabel('flat', 'medium')).toBe('steady')
  })

  it('maps directional trends at medium/high', () => {
    expect(trendToUserFacingLabel('up', 'medium')).toBe('improving')
    expect(trendToUserFacingLabel('down', 'high')).toBe('slipping')
  })

  it('treats low confidence + flat as not enough data', () => {
    expect(trendToUserFacingLabel('flat', 'low')).toBe('not_enough_data')
  })

  it('allows soft directional labels when confidence is low but trend tilts', () => {
    expect(trendToUserFacingLabel('up', 'low')).toBe('improving')
    expect(trendToUserFacingLabel('down', 'low')).toBe('slipping')
  })
})
