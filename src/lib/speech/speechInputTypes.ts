/**
 * Abstraction for swapping STT engines (browser Web Speech vs server Whisper).
 */
export type VoiceComposerPhase =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'review'
  | 'error'
  /** Reference TTS plays, then we arm MediaRecorder for a chunk-only shadow rep. */
  | 'shadow_listen'

export interface SpeechService {
  /** Browser path: start live recognition. Server path: arm MediaRecorder (call after getUserMedia). */
  startRecording(opts: {
    onInterim: (text: string) => void
    onLevel?: () => void
  }): Promise<void>
  /** Finalize capture and return transcript text (may be empty). */
  stopRecording(): Promise<string>
  /** Discard without producing transcript. */
  cancelRecording(): void
}
