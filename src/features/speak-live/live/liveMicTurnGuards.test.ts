import { describe, expect, it } from 'vitest'
import { canStartMicCapture, resolveToggleMicClick } from './liveMicTurnGuards'

describe('canStartMicCapture', () => {
  it('blocks while commit or mic boot is in flight', () => {
    expect(
      canStartMicCapture({ status: 'idle', listenArmed: false, commitInFlight: true, micBooting: false }),
    ).toBe(false)
    expect(
      canStartMicCapture({ status: 'idle', listenArmed: false, commitInFlight: false, micBooting: true }),
    ).toBe(false)
  })

  it('allows second turn when listening UI is stale but recorder is not armed', () => {
    expect(
      canStartMicCapture({ status: 'listening', listenArmed: false, commitInFlight: false, micBooting: false }),
    ).toBe(true)
  })
})

describe('resolveToggleMicClick', () => {
  it('starts from idle and commits when armed', () => {
    expect(
      resolveToggleMicClick({ status: 'idle', listenArmed: false, commitInFlight: false, micBooting: false }),
    ).toBe('start')
    expect(
      resolveToggleMicClick({ status: 'listening', listenArmed: true, commitInFlight: false, micBooting: false }),
    ).toBe('commit')
  })

  it('starts a fresh capture when listening UI is stale after prior commit', () => {
    expect(
      resolveToggleMicClick({ status: 'listening', listenArmed: false, commitInFlight: false, micBooting: false }),
    ).toBe('start')
  })

  it('starts after coach reply from idle', () => {
    expect(
      resolveToggleMicClick({ status: 'idle', listenArmed: false, commitInFlight: false, micBooting: false }),
    ).toBe('start')
  })

  it('interrupts assistant playback to jump in', () => {
    expect(
      resolveToggleMicClick({ status: 'speaking', listenArmed: false, commitInFlight: false, micBooting: false }),
    ).toBe('interrupt_and_start')
  })

  it('ignores taps while processing or commit is in flight', () => {
    expect(
      resolveToggleMicClick({ status: 'thinking', listenArmed: false, commitInFlight: false, micBooting: false }),
    ).toBe('ignore')
    expect(
      resolveToggleMicClick({ status: 'idle', listenArmed: false, commitInFlight: true, micBooting: false }),
    ).toBe('ignore')
  })
})
