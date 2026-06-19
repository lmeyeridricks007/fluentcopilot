import type { LiveSessionStatus } from './liveSpeakTypes'

export type MicCaptureGateInput = {
  status: LiveSessionStatus
  listenArmed: boolean
  commitInFlight: boolean
  micBooting: boolean
}

/** True when `beginListening` may open a new recorder session. */
export function canStartMicCapture(input: MicCaptureGateInput): boolean {
  if (input.commitInFlight || input.micBooting) return false
  if (input.status === 'paused' || input.status === 'thinking' || input.status === 'transcribing' || input.status === 'got_it') {
    return false
  }
  if (input.status === 'listening' && input.listenArmed) return false
  return true
}

export type ToggleMicClickInput = MicCaptureGateInput

/**
 * Toggle mode uses click only (not pointerdown). First tap starts, second tap commits.
 * Matches the pre-regression flow that worked on mobile Safari.
 */
export function resolveToggleMicClick(input: ToggleMicClickInput): 'ignore' | 'start' | 'commit' | 'interrupt_and_start' {
  if (input.commitInFlight || input.micBooting) return 'ignore'
  if (input.status === 'paused' || input.status === 'thinking' || input.status === 'transcribing' || input.status === 'got_it') {
    return 'ignore'
  }
  if (input.status === 'replying' || input.status === 'speaking') return 'interrupt_and_start'
  if (input.status === 'listening') return input.listenArmed ? 'commit' : 'start'
  if (input.status === 'idle' || input.status === 'error') return 'start'
  return 'ignore'
}
