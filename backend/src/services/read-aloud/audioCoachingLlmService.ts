import OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAiDirectConfig, getOpenAiEnrichmentModel } from '../ai/config/aiProviderConfig'

export type AudioCoachingChunkInput = {
  chunkId: string
  startMs: number
  endMs: number
  transcript: string
  pronunciationScore: number | null
  fluencyScore: number | null
  completenessScore: number | null
  prosodyScore: number | null
  confidence: number
}

const AudioCoachingSchema = z.object({
  overallConfidence: z.number().min(0).max(1),
  summary: z.string().min(1).max(900),
  focusArea: z.string().min(1).max(280),
  nextStepDrills: z.array(z.string().min(1).max(240)).min(2).max(5),
  feedbackLines: z.array(z.string().min(1).max(320)).min(2).max(8),
  weakSegments: z.array(
    z.object({
      chunkIds: z.array(z.string().min(1).max(120)).min(1).max(4),
      issue: z.string().min(1).max(180),
      whyItStoodOut: z.string().min(1).max(220).nullable().optional(),
      likelyIntendedPhrase: z.string().min(1).max(220),
      coachingTip: z.string().min(1).max(240),
      pauseGuidance: z.string().min(1).max(220).nullable().optional(),
      naturalnessNote: z.string().min(1).max(220).nullable().optional(),
      referenceAudioText: z.string().min(1).max(220),
      confidence: z.number().min(0).max(1),
      highlightedWords: z.array(z.string().min(1).max(80)).max(6).optional(),
    })
  ).min(1).max(5),
})

export type AudioCoachingLlmOutput = z.infer<typeof AudioCoachingSchema>

export async function interpretAudioChunksWithLlm(input: {
  chunks: AudioCoachingChunkInput[]
  fullTranscript: string
  referenceText?: string | null
}): Promise<AudioCoachingLlmOutput | null> {
  const cfg = getOpenAiDirectConfig()
  if (!cfg.apiKey || !input.chunks.length) return null

  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    maxRetries: 0,
    timeout: 28_000,
  })

  const model = getOpenAiEnrichmentModel()
  const promptPayload = {
    fullTranscript: input.fullTranscript.slice(0, 2_800),
    referenceText: input.referenceText?.slice(0, 2_800) ?? null,
    chunks: input.chunks.slice(0, 24),
  }

  let completion: Awaited<ReturnType<typeof client.chat.completions.create>>
  try {
    completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 1_100,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a Dutch speaking coach.\n' +
            'You are given: (1) a spoken transcript that may contain ASR errors, (2) audio quality scores per chunk, and (3) a reference text that is only context for what the learner likely intended to read.\n' +
            'Your job: identify the weakest spoken sections, infer what the learner likely meant to say, explain what sounded unclear, point out if a pause or smoother connection would help, and suggest how the Dutch should sound more clearly.\n' +
            'Important rules: do not rely on exact transcript matching; assume ASR omissions and spelling mistakes are common; use the reference text only as a guide, not as a strict grading key; focus on clarity, pronunciation, rhythm, and rushed delivery; be supportive but precise.\n' +
            'Return JSON only in this exact shape: {"overallConfidence":0-1,"summary":"...","focusArea":"...","nextStepDrills":["..."],"feedbackLines":["..."],"weakSegments":[{"chunkIds":["chunk-..."],"issue":"...","whyItStoodOut":"...","likelyIntendedPhrase":"...","coachingTip":"...","pauseGuidance":"... or null","naturalnessNote":"... or null","referenceAudioText":"short corrected Dutch phrase for TTS","confidence":0-1,"highlightedWords":["..."]}]}\n' +
            'Choose 3 to 5 weakSegments when possible. chunkIds must come from the provided chunks. referenceAudioText should be short enough to play as a model phrase.\n' +
            'Make issue and whyItStoodOut concrete. If pauseGuidance is useful, say whether they should pause slightly before or after the phrase, or connect it more smoothly. naturalnessNote should describe how Dutch-like or careful the rhythm sounded in plain English.\n' +
            'Write feedback in English. Keep likelyIntendedPhrase and referenceAudioText in Dutch when useful.',
        },
        { role: 'user', content: JSON.stringify(promptPayload) },
      ],
    })
  } catch {
    return null
  }

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) return null
  try {
    return AudioCoachingSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
