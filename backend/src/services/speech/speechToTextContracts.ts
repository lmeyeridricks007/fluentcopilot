export type TranscribeSpeechOptions = {
  language?: string
  /** Optional Whisper / transcribe model prompt (same language as audio). */
  transcriptionPrompt?: string
  /** Hint for logging / analytics only. */
  purpose?: string
  threadId?: string
  scenarioId?: string
}

export type TranscribeSpeechResult = {
  text: string
  provider: 'openai' | 'azure'
  /** Seconds, when API returns verbose timing. */
  durationSeconds?: number
  /** BCP-ish tag when known. */
  detectedLanguage?: string
}

/**
 * Server-side speech-to-text. Implementations must use server-held API keys only.
 */
export interface ISpeechToTextService {
  transcribeAsync(
    audio: Buffer,
    mimeType: string,
    options?: TranscribeSpeechOptions
  ): Promise<TranscribeSpeechResult>
}
