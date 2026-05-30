import OpenAI from 'openai'
import { z } from 'zod'
import { ApiError } from '../../shared/errors'
import {
  getAiMaxRetries,
  getAiRequestTimeoutMs,
  getOpenAiDirectConfig,
  getOpenAiEnrichmentModel,
} from '../ai/config/aiProviderConfig'
import type {
  ISpeakingCoachingService,
  SpeakingCoachingEvaluateRequest,
  SpeakingCoachingEvaluateResponse,
} from './speakingCoachingContracts'
import { SpeakingCoachingEvaluateResponseSchema } from './speakingCoachingContracts'

const COACHING_SYSTEM = `You are a supportive Dutch speaking coach for FluentCopilot. You ONLY see the learner's transcript (ASR text), optional thread summary, and the last assistant line — NOT raw audio.

Rules:
- Tone: warm, precise, concise. No harsh grading. No heavy grammar jargon; explain in simple words the learner would understand at their CEFR level.
- Match feedback complexity to learnerLevelCefr (A1 simplest; A2 short; B1 a bit more nuance).
- Judge: scenario intent, natural Dutch phrasing, clarity, and whether the reply fits the learner's level.
- Do NOT claim to score pronunciation, accent, or prosody — those come from a separate audio-based step.
- If the learner's Dutch is acceptable for their level, say so. Avoid over-correcting small imperfections.
- Suggest a correctedAlternative only when it clearly helps; otherwise use null or empty string for optional fields.
- Keep shortVerdict, coachNote, and encouragement brief (one or two short sentences each).
- coachingSignals: machine-friendly snake_case tags for analytics (e.g. unnatural_question_form, polite_phrase_used, over_literal_english_transfer). Max 24 items.

Return ONLY valid JSON with exactly these camelCase keys:
shortVerdict, naturalnessSuggestion, correctedAlternative, whyItMatters, cefrLevelAppropriateness, coachNote, encouragement, intentMatch, naturalness, clarity, levelFit, savePhraseCandidates, coachingSignals, scenarioIntentMet

Where intentMatch, naturalness, clarity, levelFit are each one of: "strong", "ok", "needs_work".
cefrLevelAppropriateness is one of: "below_level", "on_level", "above_level".
savePhraseCandidates is an array of { "phrase": string, "contextNote"?: string } (0–6 items).`

function buildUserPrompt(req: SpeakingCoachingEvaluateRequest): string {
  const goals =
    req.scenarioGoals && req.scenarioGoals.length > 0
      ? `\nScenario goals:\n${req.scenarioGoals.map((g, i) => `${i + 1}. ${g}`).join('\n')}`
      : ''
  const last = req.lastAssistantTurn?.trim()
    ? `\nLast assistant turn (Dutch):\n"""${req.lastAssistantTurn.trim()}"""`
    : ''
  const summary = req.threadSummary?.trim()
    ? `\nThread summary (may be partial):\n"""${req.threadSummary.trim()}"""`
    : ''
  const intent = req.expectedIntent?.trim()
    ? `\nOptional expected learner intent hint: ${req.expectedIntent.trim()}`
    : ''

  return `Learner CEFR: ${req.learnerLevelCefr}
Feedback surfacing mode: ${req.feedbackMode} (after_each = show soon after turn; at_end = stored for recap)
User turn index (1-based count of learner replies in this thread): ${req.conversationTurnIndex + 1}
Scenario id: ${req.scenarioId}
Scenario title: ${req.scenarioTitle}
Description: ${(req.scenarioDescription ?? '').trim()}${goals}${last}${summary}${intent}

Learner transcript (Dutch, what they said or typed as final message):
"""
${req.transcript.trim()}
"""

Respond with JSON only. Omit correctedAlternative or use empty string if their version is already good enough. naturalnessSuggestion should be one short tip in English unless you give a Dutch micro-model in correctedAlternative. whyItMatters in plain English, one short sentence.`
}

function fallbackResponse(req: SpeakingCoachingEvaluateRequest): SpeakingCoachingEvaluateResponse {
  const t = req.transcript.trim()
  return {
    shortVerdict: 'Nice effort — your message came through clearly.',
    naturalnessSuggestion: null,
    correctedAlternative: null,
    whyItMatters: null,
    cefrLevelAppropriateness: 'on_level',
    coachNote: 'Keep practicing short replies in this scenario; small steps add up.',
    encouragement:
      req.learnerLevelCefr === 'A1' || req.learnerLevelCefr === 'A2'
        ? 'You are building real speaking habits — keep going.'
        : 'Solid Dutch practice — stay curious about small natural tweaks.',
    intentMatch: 'ok',
    naturalness: 'ok',
    clarity: 'ok',
    levelFit: 'ok',
    savePhraseCandidates: t ? [{ phrase: t.slice(0, 120) }] : [],
    coachingSignals: ['coaching_fallback_used'],
    scenarioIntentMet: true,
    evaluationScope: 'transcript_only',
  }
}

function normalizeResponse(parsed: z.infer<typeof SpeakingCoachingEvaluateResponseSchema>): SpeakingCoachingEvaluateResponse {
  const emptyToNull = (s: string | null | undefined) => {
    const v = typeof s === 'string' ? s.trim() : ''
    return v.length ? v : null
  }
  return {
    ...parsed,
    naturalnessSuggestion: emptyToNull(parsed.naturalnessSuggestion),
    correctedAlternative: emptyToNull(parsed.correctedAlternative),
    whyItMatters: emptyToNull(parsed.whyItMatters),
    evaluationScope: 'transcript_only',
  }
}

export class OpenAiSpeakingCoachingService implements ISpeakingCoachingService {
  async evaluateTranscriptAsync(request: SpeakingCoachingEvaluateRequest): Promise<SpeakingCoachingEvaluateResponse> {
    const key = process.env.OPENAI_API_KEY?.trim()
    if (!key) {
      throw new ApiError(503, 'COACHING_UNAVAILABLE', 'OpenAI API key is not configured for speaking coaching.')
    }

    const t = request.transcript.trim()
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
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: COACHING_SYSTEM },
        { role: 'user', content: buildUserPrompt(request) },
      ],
    })

    const raw = completion.choices[0]?.message?.content?.trim()
    if (!raw) {
      return fallbackResponse(request)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return fallbackResponse(request)
    }

    const r = SpeakingCoachingEvaluateResponseSchema.safeParse(parsed)
    if (!r.success) {
      return fallbackResponse(request)
    }
    return normalizeResponse(r.data)
  }
}

let instance: OpenAiSpeakingCoachingService | null = null

export function getOpenAiSpeakingCoachingService(): ISpeakingCoachingService {
  instance ??= new OpenAiSpeakingCoachingService()
  return instance
}
