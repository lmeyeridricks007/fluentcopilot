import { getOpenAiTextToSpeechService } from './openAiTextToSpeechService'
import type { GenerateSpeechResult, TtsPurpose } from './textToSpeechContracts'

/** @deprecated Prefer `getOpenAiTextToSpeechService().generateSpeechAsync` — kept for existing imports. */
export async function generateSpeechFromText(input: {
  text: string
  voice?: string
  language?: string
  speed?: number
  messageId?: string
  threadId?: string
  /** Defaults to `assistant_message`; Speak Live uses `speak_live_assistant` for faster TTS defaults. */
  purpose?: TtsPurpose
}): Promise<GenerateSpeechResult> {
  return getOpenAiTextToSpeechService().generateSpeechAsync({
    text: input.text,
    voice: input.voice,
    language: input.language,
    speed: input.speed,
    purpose: input.purpose ?? 'assistant_message',
    messageId: input.messageId,
    threadId: input.threadId,
  })
}
