import { getSpeechToTextService } from '../speech/speechToTextGateway'

/** Live conversation: recognition-only — no pronunciation assessment on this path. */
export const LIVE_SPEECH_RECOGNITION_PURPOSE = 'speak_live_turn' as const

export async function transcribeForLiveConversation(params: {
  audio: Buffer
  mimeType: string
  language: string
  threadId?: string
  scenarioId?: string
}): Promise<{ text: string; provider: string; detectedLanguage?: string; durationSeconds?: number }> {
  const stt = getSpeechToTextService()
  return stt.transcribeAsync(params.audio, params.mimeType, {
    language: params.language,
    purpose: LIVE_SPEECH_RECOGNITION_PURPOSE,
    threadId: params.threadId,
    scenarioId: params.scenarioId,
  })
}
