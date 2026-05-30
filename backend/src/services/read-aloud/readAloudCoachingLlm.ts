import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'

const CoachingSchema = z.object({
  summary: z.string().min(1).max(900),
  focusArea: z.string().min(1).max(280),
  nextStepDrills: z.array(z.string().min(1).max(400)).min(1).max(6),
  feedbackLines: z.array(z.string().min(1).max(420)).min(2).max(10),
})

export type ReadAloudCoachingPack = z.infer<typeof CoachingSchema>

export async function generateReadAloudCoaching(input: {
  targetText: string
  recognizedText: string
  level: string
  dimensions: Record<string, number>
  weakWords: string[]
}): Promise<ReadAloudCoachingPack | null> {
  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey) return null

  const model = getOpenAiEnrichmentModel()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 22_000,
  })

  const prompt = {
    level: input.level,
    scores01: input.dimensions,
    weakWords: input.weakWords.slice(0, 12),
    targetExcerpt: input.targetText.slice(0, 2_400),
    recognizedExcerpt: input.recognizedText.slice(0, 2_400),
  }

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.25,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You coach Dutch learners after a read-aloud task. Be specific, motivating, and evidence-based. ' +
            'Return JSON only matching: {"summary","focusArea","nextStepDrills","feedbackLines"}. ' +
            'Scores 0–1 mean higher is better — describe them in everyday language (e.g. percentages, "strong", "room to grow"). ' +
            'Do not say internal signals, algorithms, transcript fidelity, prosody, providers, engines, or name cloud vendors. ' +
            'Mention how close their reading was to the printed text where relevant. ' +
            'nextStepDrills: short actionable drills. feedbackLines: concrete observations (pace, clarity, missed words). ' +
            'Write feedback in English.',
        },
        { role: 'user', content: JSON.stringify(prompt) },
      ],
    })
  } catch {
    return null
  }

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) return null
  try {
    return CoachingSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
