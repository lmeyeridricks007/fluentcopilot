/** High-level call UI phases — each maps to distinct visuals. */
export type SpeakLiveCallPhase = 'idle' | 'listening' | 'processing' | 'ai_speaking' | 'paused'

/** Mic interaction model (user-selectable). */
export type SpeakLiveMicMode = 'hold' | 'toggle'

export type SpeakLiveCallError = 'mic_denied' | 'audio_failed'

export type SpeakLiveExchange = {
  id: string
  role: 'user' | 'ai'
  /** Short line for transcript strip */
  text: string
  at: number
}
