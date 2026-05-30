import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'
import type { TimedSttWord } from './readAloudOpenAiSttWords'

const AlignSchema = z.object({
  alignments: z.array(
    z.object({
      sentenceIndex: z.number().int().min(0),
      startWordIndex: z.number().int().min(0),
      endWordIndex: z.number().int().min(0),
    })
  ),
})

export type SentenceWordSpan = { startIdx: number; endIdx: number }

/**
 * LLM maps each target sentence to inclusive word indices in the timed Whisper stream.
 */
export async function alignSentencesToTimedWordsWithLlm(input: {
  sentences: string[]
  words: TimedSttWord[]
}): Promise<SentenceWordSpan[] | null> {
  const { sentences, words } = input
  if (sentences.length === 0 || words.length === 0) return null
  if (sentences.length === 1) {
    return [{ startIdx: 0, endIdx: words.length - 1 }]
  }

  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey) return null

  const model = getOpenAiEnrichmentModel()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 45_000,
  })

  const maxWords = 900
  const wSlice = words.length > maxWords ? words.slice(0, maxWords) : words
  const truncated = words.length > maxWords

  const wordTable = wSlice.map((w, i) => ({
    i,
    w: w.word.slice(0, 48),
    s: Math.round(w.startSec * 1000) / 1000,
    e: Math.round(w.endSec * 1000) / 1000,
  }))

  const numberedSents = sentences.map((s, i) => ({ sentenceIndex: i, text: s.slice(0, 420) }))

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.05,
      max_tokens: 1_800,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You align a Dutch read-aloud. You receive NUMBERED target sentences (exact passage order) and a table of Whisper words with global indices i, text w, start s, end e (seconds). ' +
            'Return JSON: {"alignments":[{"sentenceIndex":0,"startWordIndex":12,"endWordIndex":21}, ...]}. ' +
            `There must be exactly ${sentences.length} objects, one per sentenceIndex 0..${sentences.length - 1}, each exactly once. ` +
            'For each sentence, choose the smallest contiguous index range [startWordIndex,endWordIndex] (inclusive) whose words are what the learner most likely said for THAT printed sentence. ' +
            'Whisper may drop, distort, or substitute words when pronunciation is imperfect, so use timing and passage order, not exact lexical matches only. ' +
            'If a sentence begins with words Whisper missed, still anchor that sentence to the earliest nearby words that belong to its time region. Prefer slightly too much context over skipping the opening words. ' +
            'Ranges should follow speech order: sentence N+1 should not start before sentence N ends (you may leave a small gap). ' +
            'The provided word table is already a likely passage window, so sentence 0 usually starts near index 0 and the final sentence usually ends near the last index. ' +
            'Indices refer ONLY to the provided word table (i column). If the table is truncated, still use indices within it. ' +
            (truncated
              ? 'NOTE: the word table is truncated — align only within 0..' + (wSlice.length - 1) + '; later audio exists but is omitted here.'
              : ''),
        },
        {
          role: 'user',
          content: JSON.stringify({
            sentences: numberedSents,
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
  let parsed: z.infer<typeof AlignSchema>
  try {
    parsed = AlignSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }

  const n = words.length
  const nTable = wSlice.length
  const bySi = new Map<number, { startWordIndex: number; endWordIndex: number }>()
  for (const a of parsed.alignments) {
    bySi.set(a.sentenceIndex, {
      startWordIndex: Math.max(0, Math.min(nTable - 1, a.startWordIndex)),
      endWordIndex: Math.max(0, Math.min(nTable - 1, a.endWordIndex)),
    })
  }

  const spans: SentenceWordSpan[] = []
  for (let si = 0; si < sentences.length; si++) {
    const row = bySi.get(si)
    if (!row) return null
    let { startWordIndex, endWordIndex } = row
    if (endWordIndex < startWordIndex) [startWordIndex, endWordIndex] = [endWordIndex, startWordIndex]
    spans.push({ startIdx: startWordIndex, endIdx: endWordIndex })
  }

  /** Monotonic repair: later sentences cannot start before previous ends. */
  let lastEnd = -1
  for (let i = 0; i < spans.length; i++) {
    const sp = spans[i]!
    if (sp.startIdx <= lastEnd) sp.startIdx = Math.min(n - 1, lastEnd + 1)
    if (sp.endIdx < sp.startIdx) sp.endIdx = sp.startIdx
    if (sp.endIdx >= n) sp.endIdx = n - 1
    lastEnd = Math.max(lastEnd, sp.endIdx)
  }

  return spans
}
