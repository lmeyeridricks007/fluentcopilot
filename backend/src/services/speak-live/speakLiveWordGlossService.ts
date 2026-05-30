import OpenAI from 'openai'
import { z } from 'zod'
import { ApiError } from '../../shared/errors'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'

const GlossResponseSchema = z.object({
  glossEn: z.string().min(1).max(520),
  glossNl: z.string().min(1).max(520),
})

/**
 * Short Dutch + English explanations for a Dutch token in optional sentence context.
 * Used by Speak Live and exam report UIs when local gloss data is missing.
 */
export async function generateDutchWordGlossEnglish(input: {
  word: string
  phraseContext?: string
}): Promise<{ gloss: string; glossEn: string; glossNl: string }> {
  const word = input.word.replace(/\s+/g, ' ').trim().slice(0, 80)
  if (!word) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'word is required', { word: 'Required' })
  }

  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'OpenAI is not configured for word gloss.', {
      word: 'Service unavailable',
    })
  }

  const model = getOpenAiEnrichmentModel()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 18_000,
  })

  const sentence = (input.phraseContext ?? '').trim().slice(0, 420)

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.12,
      max_tokens: 220,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You help Dutch learners. Return JSON only: {"glossEn":"...","glossNl":"..."}. ' +
            'glossEn: plain English — what the Dutch token means in this sentence (1–3 short sentences). ' +
            'glossNl: simple Dutch explanation for the same token in this context (1–2 short sentences, A2-friendly). ' +
            'If it is a proper noun (city, station, brand, person), say that clearly in both languages. ' +
            'Do not repeat the whole Dutch sentence unless needed for clarity. No markdown.',
        },
        {
          role: 'user',
          content: JSON.stringify({ token: word, sentence: sentence || null }),
        },
      ],
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new ApiError(502, 'LLM_ERROR', `Word gloss request failed: ${msg}`)
  }

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) {
    throw new ApiError(502, 'LLM_ERROR', 'Word gloss returned empty content.')
  }

  let parsed: z.infer<typeof GlossResponseSchema>
  try {
    parsed = GlossResponseSchema.parse(JSON.parse(raw))
  } catch {
    throw new ApiError(502, 'LLM_ERROR', 'Word gloss response was not valid JSON.')
  }

  const glossEn = parsed.glossEn.trim()
  const glossNl = parsed.glossNl.trim()
  return { gloss: glossEn, glossEn, glossNl }
}
