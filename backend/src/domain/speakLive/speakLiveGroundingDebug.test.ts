import { describe, expect, it, vi, afterEach } from 'vitest'
import { speakLiveGroundingDebugEnabled } from './speakLiveGroundingDebug'

describe('speakLiveGroundingDebugEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is false when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SPEAK_LIVE_DEBUG_PANEL', '1')
    expect(speakLiveGroundingDebugEnabled()).toBe(false)
  })

  it('is true in development regardless of flags', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('SPEAK_LIVE_DEBUG_PANEL', '')
    expect(speakLiveGroundingDebugEnabled()).toBe(true)
  })

  it('is true when SPEAK_LIVE_DEBUG_PANEL is set in non-production', () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('SPEAK_LIVE_DEBUG_PANEL', '1')
    expect(speakLiveGroundingDebugEnabled()).toBe(true)
  })
})
