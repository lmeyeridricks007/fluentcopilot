import { describe, expect, it } from 'vitest'
import { initialInsertStatusForQuickCapture } from './quickCaptureAppService'

describe('initialInsertStatusForQuickCapture', () => {
  it('marks save_word with primary as ready_for_practice', () => {
    expect(initialInsertStatusForQuickCapture('save_word', 'gezellig', null)).toBe('ready_for_practice')
  })

  it('keeps image-only photo_text as new until enrichment', () => {
    expect(initialInsertStatusForQuickCapture('photo_text', null, null)).toBe('new')
  })

  it('marks typed photo_text caption as ready_for_practice', () => {
    expect(initialInsertStatusForQuickCapture('photo_text', 'Verboden te roken', null)).toBe('ready_for_practice')
  })
})
