import { getOpenAiSpeechToTextService } from './openAiSpeechToTextService'

/** @deprecated Prefer `getOpenAiSpeechToTextService().transcribeAsync` — kept for imports. */
export async function transcribeWithWhisper(input: {
  buffer: Buffer
  mimeType: string
  language?: string
}): Promise<{ text: string }> {
  const r = await getOpenAiSpeechToTextService().transcribeAsync(input.buffer, input.mimeType, {
    language: input.language,
  })
  return { text: r.text }
}
