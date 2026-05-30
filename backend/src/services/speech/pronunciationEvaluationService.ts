import OpenAI from 'openai'
import { z } from 'zod'
import { ApiError } from '../../shared/errors'
import {
  getAiMaxRetries,
  getAiRequestTimeoutMs,
  getOpenAiDirectConfig,
  getOpenAiEnrichmentModel,
} from '../ai/config/aiProviderConfig'

export const PronunciationFeedbackSchema = z.object({
  pronunciationScore: z.number().int().min(1).max(5),
  fluencyScore: z.number().int().min(1).max(5),
  clarityScore: z.number().int().min(1).max(5),
  overallTone: z.enum(['sounds_good', 'improve']),
  shortSummary: z.string().max(600),
  keyIssues: z.array(z.string().max(280)).max(4),
  suggestedCorrection: z.string().max(900),
  exampleBetterSentence: z.string().max(900),
  highlightWords: z.array(z.string().max(80)).max(12),
  encouragement: z.string().max(500),
})

export type PronunciationFeedback = z.infer<typeof PronunciationFeedbackSchema>

const EVAL_SYSTEM = `You are a supportive Dutch language coach evaluating a learner's SPOKEN Dutch, but you only receive the Whisper transcript (not the raw audio). Infer likely issues from wording, grammar, unnatural collocations, and missing function words. Be gentle and constructive.

Tone rules:
- Never harsh or discouraging.
- A2: very simple English in keyIssues (short phrases), maximum encouragement, fewer jargon terms.
- B1: slightly more specific coaching; still warm and concise.

Delivery hints (transcript-only inference):
- When it helps the learner, add a short keyIssue about likely word stress or sentence intonation (e.g. which word carries emphasis, or rising tone for questions). You cannot hear them; phrase as friendly tips ("Often … is stressed …"), not as facts about their recording.

Scoring (1–5, integers):
- pronunciationScore: how standard/clear the Dutch likely sounds from the written form (spellings, word choices typical of L2).
- fluencyScore: flow and naturalness of the phrase.
- clarityScore: how easy the message is to follow.

overallTone:
- "sounds_good" if the learner is broadly successful for their level (scores mostly ≥4).
- "improve" if there is a clear, kind teaching opportunity.

Return ONLY valid JSON matching the schema keys (no markdown).`

function buildUserPrompt(input: {
  transcript: string
  cefrLevel: 'A2' | 'B1'
  scenarioHint?: string
}): string {
  const hint = input.scenarioHint?.trim()
    ? `\nOptional scenario / intent context for the coach: ${input.scenarioHint.trim()}`
    : ''
  return `Learner CEFR level: ${input.cefrLevel}
Transcript (Dutch, as heard by ASR):
"""
${input.transcript.trim()}
"""${hint}

Respond with JSON only:
{
  "pronunciationScore": <1-5 int>,
  "fluencyScore": <1-5 int>,
  "clarityScore": <1-5 int>,
  "overallTone": "sounds_good" | "improve",
  "shortSummary": "<one friendly line in English>",
  "keyIssues": ["<max 4 short bullets in English>"],
  "suggestedCorrection": "<natural Dutch rewrite of what they meant; empty string if none needed>",
  "exampleBetterSentence": "<one natural Dutch example sentence on-topic; can match suggestedCorrection>",
  "highlightWords": ["<0-12 tokens from the transcript to visually emphasize; use exact substrings from transcript when possible>"],
  "encouragement": "<one warm closing line suited to ${input.cefrLevel}, English>"
}`
}

function fallbackFeedback(transcript: string, cefrLevel: 'A2' | 'B1'): PronunciationFeedback {
  return {
    pronunciationScore: 4,
    fluencyScore: 4,
    clarityScore: 4,
    overallTone: 'sounds_good',
    shortSummary: 'Nice effort — keep practicing out loud.',
    keyIssues: [],
    suggestedCorrection: '',
    exampleBetterSentence: transcript.slice(0, 200),
    highlightWords: [],
    encouragement:
      cefrLevel === 'A2'
        ? 'You are doing well — every sentence you say builds confidence.'
        : 'Solid practice — small tweaks will make your Dutch sound even more natural.',
  }
}

export async function evaluatePronunciationFromTranscript(input: {
  transcript: string
  cefrLevel: 'A2' | 'B1'
  scenarioHint?: string
}): Promise<PronunciationFeedback> {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) {
    throw new ApiError(503, 'EVALUATION_UNAVAILABLE', 'OpenAI API key is not configured for pronunciation evaluation.')
  }

  const t = input.transcript.trim()
  if (!t) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Transcript is empty', { transcript: 'Required' })
  }

  const cfg = getOpenAiDirectConfig()
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    organization: cfg.organization,
    project: cfg.project,
    timeout: getAiRequestTimeoutMs(),
    maxRetries: getAiMaxRetries(),
  })

  const model = getOpenAiEnrichmentModel()

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.35,
    max_tokens: 700,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: EVAL_SYSTEM },
      { role: 'user', content: buildUserPrompt(input) },
    ],
  })

  const raw = completion.choices[0]?.message?.content?.trim()
  if (!raw) {
    return fallbackFeedback(t, input.cefrLevel)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch {
    return fallbackFeedback(t, input.cefrLevel)
  }

  const r = PronunciationFeedbackSchema.safeParse(parsed)
  if (!r.success) {
    return fallbackFeedback(t, input.cefrLevel)
  }
  return r.data
}
