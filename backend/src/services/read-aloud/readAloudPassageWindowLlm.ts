import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'
import type { TimedSttWord } from './readAloudOpenAiSttWords'

const PassageWindowSchema = z.object({
  startWordIndex: z.number().int().min(0),
  endWordIndex: z.number().int().min(0),
})

export async function detectPassageWindowWithLlm(input: {
  targetText: string
  words: TimedSttWord[]
}): Promise<{ startWordIndex: number; endWordIndex: number } | null> {
  const { targetText, words } = input
  if (!targetText.trim() || words.length === 0) return null

  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey) return null

  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 45_000,
  })

  const model = getOpenAiEnrichmentModel()
  const maxWords = 1400
  const wSlice = words.length > maxWords ? words.slice(0, maxWords) : words
  const truncated = words.length > maxWords

  const wordTable = wSlice.map((w, i) => ({
    i,
    w: w.word.slice(0, 48),
    s: Math.round(w.startSec * 1000) / 1000,
    e: Math.round(w.endSec * 1000) / 1000,
  }))

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You locate a Dutch read-aloud passage inside a Whisper word-timestamp stream. ' +
            'You receive the full target passage and a table of Whisper words with indices i, text w, start s, end e. ' +
            'Return ONLY JSON: {"startWordIndex":12,"endWordIndex":85}. ' +
            'Choose the SMALLEST contiguous range that most likely contains the learner reading the WHOLE target passage in order. ' +
            'Whisper may miss words, distort pronunciation, or substitute nearby words. Do NOT require exact word matches. ' +
            'Prefer slightly too wide over too narrow, especially at the start of the passage. ' +
            'If the opening word(s) were spoken but mistranscribed, still include the earliest likely passage word region. ' +
            'Indices must refer only to the provided word table and endWordIndex must be >= startWordIndex. ' +
            (truncated
              ? 'NOTE: the word table is truncated; choose only within the visible range 0..' + (wSlice.length - 1) + '.'
              : ''),
        },
        {
          role: 'user',
          content: JSON.stringify({
            targetText: targetText.slice(0, 4000),
            words: wordTable,
            wordCount: words.length,
          }),
        },
      ],
    })
  } catch {
    return null
  }

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) return null

  let parsed: z.infer<typeof PassageWindowSchema>
  try {
    parsed = PassageWindowSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }

  const maxIndex = wSlice.length - 1
  const startWordIndex = Math.max(0, Math.min(maxIndex, parsed.startWordIndex))
  const endWordIndex = Math.max(0, Math.min(maxIndex, parsed.endWordIndex))
  if (endWordIndex < startWordIndex) return null
  return { startWordIndex, endWordIndex }
}
