/**
 * Explicit replay / audio-start budgeting for listening training.
 * @see listeningDifficultyPolicy.maxTotalAudioStarts — cap is per task, set by preset.
 */

export type ListeningReplayState = {
  /** Starts consumed (includes the first play). */
  startsUsed: number
  maxStarts: number
  /** Finished at least one full listen (for UX “you may answer”). */
  hasCompletedListen: boolean
}

export function initialReplayState(maxStarts: number): ListeningReplayState {
  return { startsUsed: 0, maxStarts, hasCompletedListen: false }
}

export function canStartAudio(state: ListeningReplayState): boolean {
  return state.startsUsed < state.maxStarts
}

/** Call when user begins playback from the beginning (Play or Opnieuw). */
export function registerAudioStart(state: ListeningReplayState): ListeningReplayState {
  return {
    ...state,
    startsUsed: Math.min(state.maxStarts, state.startsUsed + 1),
  }
}

export function markListenCompleted(state: ListeningReplayState): ListeningReplayState {
  return { ...state, hasCompletedListen: true }
}

export function replaysUsed(state: ListeningReplayState): number {
  return Math.max(0, state.startsUsed - 1)
}
