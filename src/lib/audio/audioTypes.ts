/**
 * Contract for swapping playback engines (browser SpeechSynthesis vs media URL from TTS API).
 * The runtime `chatAudioManager` orchestrates a single active message and delegates playback.
 */
export type ChatAudioUiState = 'idle' | 'loading' | 'playing' | 'paused'

export type AudioPlaybackSource = 'browser' | 'server' | 'inline'

export interface AudioServiceSnapshot {
  source: AudioPlaybackSource | null
  /** True while a play() request is resolving (network or buffer). */
  busy: boolean
}

/** Optional pluggable surface for tests / future engines. */
export interface AudioService {
  play(text: string, opts?: { signal?: AbortSignal }): Promise<void>
  pause(): void
  resume(): void
  stop(): void
  getState(): AudioServiceSnapshot
}
