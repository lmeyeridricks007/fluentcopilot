export type TtsPurpose =
  | 'assistant_message'
  /** Speak Live assistant line — may use a faster default TTS model than generic chat. */
  | 'speak_live_assistant'
  | 'speaking_reference_normal'
  | 'speaking_reference_slow'
  | 'speaking_reference_chunked'
  | string

export type SpeechWordBoundary = {
  text: string
  textOffset: number
  wordLength: number
  audioOffsetMs: number
  durationMs: number
}

export type GenerateSpeechResult = {
  mimeType: string
  audioBase64: string
  /** data: URL for immediate <audio> playback */
  audioUrl: string
  provider: 'openai' | 'azure'
  cached: boolean
  wordBoundaries?: SpeechWordBoundary[]
}

export type GenerateSpeechInput = {
  text: string
  /** BCP-47-ish tag for cache key; OpenAI TTS does not take locale separately. */
  language?: string
  voice?: string
  /** Optional playback speed (OpenAI); omitted for models that reject it. */
  speed?: number
  purpose?: TtsPurpose
  messageId?: string
  threadId?: string
}

/**
 * Server-side text-to-speech. Implementations must keep API keys on the server only.
 */
export interface ITextToSpeechService {
  generateSpeechAsync(input: GenerateSpeechInput): Promise<GenerateSpeechResult>
}
