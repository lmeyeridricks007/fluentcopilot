import OpenAI from 'openai'
import { z } from 'zod'
import { getAiMaxRetries, getAiRequestTimeoutMs, getOpenAiDirectConfig } from '../ai/config/aiProviderConfig'
import { getSpeakingCoachingModel, isSpeakingCoachingDebugEnabled } from './speakingAssessmentConfig'
import { logSpeakingAssessmentStep } from './speakingAssessmentLog'
import type { SpeakingCoachingLlmInput } from './speakingCoachingLlmInput'
import { SPEAKING_COACHING_SYSTEM_PROMPT, SPEAKING_COACHING_USER_INSTRUCTION } from './speakingCoachingPrompt'

/** LLM coaching output — grounded; no new numeric scores invented by the model. */
export const SpeakingAssessmentCoachingLlmSchema = z
  .object({
    shortSummary: z.string().max(1200),
    whatWentWell: z.array(z.string().max(500)).max(12),
    improveNext: z.array(z.string().max(500)).max(12),
    retryTarget: z.string().max(500).nullable().optional(),
    retryWhy: z.string().max(800).nullable().optional(),
    levelAlignedNotes: z.array(z.string().max(500)).max(8),
    dutchSoundingLabel: z.string().min(4).max(280),
    confidenceNarrative: z.string().min(20).max(900),
    wordCoachingNotes: z
      .array(
        z.object({
          text: z.string().max(120),
          coachingNote: z.string().max(400),
        })
      )
      .max(24),
  })
  .strict()

export type SpeakingAssessmentCoachingLlm = z.infer<typeof SpeakingAssessmentCoachingLlmSchema>

export type SpeakingCoachingDebugBundle = {
  llmInput: SpeakingCoachingLlmInput
  attempts: { rawResponse: string; parseOk: boolean; zodError?: string }[]
}

function stripJsonFence(raw: string): string {
  const t = raw.trim()
  if (t.startsWith('```')) {
    return t
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()
  }
  return t
}

function tryParseCoachingJson(raw: string): { ok: true; data: SpeakingAssessmentCoachingLlm } | { ok: false; err: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(stripJsonFence(raw))
  } catch (e) {
    return { ok: false, err: e instanceof Error ? e.message : 'invalid JSON' }
  }
  const r = SpeakingAssessmentCoachingLlmSchema.safeParse(parsed)
  if (!r.success) return { ok: false, err: r.error.message }
  return { ok: true, data: r.data }
}

function deterministicCoaching(input: SpeakingCoachingLlmInput): SpeakingAssessmentCoachingLlm {
  const weak = input.weakWords.slice(0, 4)
  const rushed = input.timingSummary.rushedEnding
  const label = (input.verdicts.naturalnessLabel || input.verdicts.topLabel).slice(0, 200)
  const improve: string[] = []
  if (rushed) improve.push('Soften the ending: give the last phrase similar time to the opening — listeners notice clipped tails.')
  for (const w of weak) {
    improve.push(`Shape the sounds in “${w.text}” slowly, then place it back in the line at steady pace.`)
  }
  if (improve.length === 0) {
    improve.push('Run expectedText in 4–6 word chunks with clear word stress, then merge chunks.')
  }
  return {
    shortSummary: `${input.cefrLevel} focus: ${input.verdicts.topLabel}`.slice(0, 800),
    whatWentWell: [
      weak.length === 0
        ? 'No severe word-level flags in the payload — keep tightening rhythm and endings.'
        : 'You recorded enough audio for word-level hints — use them for short drills.',
    ],
    improveNext: improve.slice(0, 6),
    retryTarget:
      (input.retryTargetCandidates[0] ?? input.expectedText.split(/\s+/).slice(0, 6).join(' ')).trim() || null,
    retryWhy: rushed
      ? 'Timing heuristics flagged a rushed tail — repeating a small final chunk fixes the habit.'
      : 'Short chunk repetition builds habit without overloading working memory.',
    levelAlignedNotes: [`Keep drills aligned with ${input.cefrLevel}: short lines, honest self-check after each rep.`],
    dutchSoundingLabel: label.length >= 4 ? label.slice(0, 280) : 'learner Dutch — keep drilling',
    confidenceNarrative:
      input.azureCaveats.length > 0
        ? `Template coaching from scores and timing only. Provider caveats: ${input.azureCaveats.slice(0, 2).join(' ')}`
        : 'Template coaching — the model was unavailable or returned invalid JSON twice. Trust Azure numbers over this prose where they conflict.',
    wordCoachingNotes: weak.map((w) => ({
      text: w.text.slice(0, 80),
      coachingNote: 'Slow repeat with clear stress, then at a steady learner speaking rate.',
    })),
  }
}

export class SpeakingCoachingFromAssessmentService {
  async generateCoaching(input: {
    assessmentId: string
    coachingInput: SpeakingCoachingLlmInput
  }): Promise<{ coaching: SpeakingAssessmentCoachingLlm; debug?: SpeakingCoachingDebugBundle }> {
    const t0 = Date.now()
    const debugEnabled = isSpeakingCoachingDebugEnabled()
    logSpeakingAssessmentStep({ step: 'llm_coaching_start', assessmentId: input.assessmentId })

    const key = process.env.OPENAI_API_KEY?.trim()
    if (!key) {
      const coaching = deterministicCoaching(input.coachingInput)
      logSpeakingAssessmentStep({ step: 'llm_coaching_end', assessmentId: input.assessmentId, durationMs: Date.now() - t0, extra: { path: 'deterministic_no_key' } })
      return debugEnabled
        ? {
            coaching,
            debug: { llmInput: input.coachingInput, attempts: [{ rawResponse: '', parseOk: false, zodError: 'no OPENAI_API_KEY' }] },
          }
        : { coaching }
    }

    const cfg = getOpenAiDirectConfig()
    const client = new OpenAI({
      apiKey: cfg.apiKey,
      baseURL: cfg.baseURL,
      organization: cfg.organization,
      maxRetries: getAiMaxRetries(),
      timeout: getAiRequestTimeoutMs(),
    })
    const model = getSpeakingCoachingModel()
    const userJson = JSON.stringify(input.coachingInput, null, 0).slice(0, 22_000)

    const baseMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SPEAKING_COACHING_SYSTEM_PROMPT },
      { role: 'user', content: SPEAKING_COACHING_USER_INSTRUCTION },
      { role: 'user', content: userJson },
    ]

    const attempts: SpeakingCoachingDebugBundle['attempts'] = []

    const runOnce = async (messages: OpenAI.Chat.ChatCompletionMessageParam[]) => {
      return client.chat.completions.create({
        model,
        temperature: 0.28,
        max_tokens: 1400,
        response_format: { type: 'json_object' },
        messages,
      })
    }

    try {
      const completion1 = await runOnce(baseMessages)
      const raw1 = completion1.choices[0]?.message?.content ?? ''
      const p1 = tryParseCoachingJson(raw1)
      attempts.push({
        rawResponse: raw1.slice(0, 24_000),
        parseOk: p1.ok,
        ...(!p1.ok ? { zodError: p1.err } : {}),
      })

      if (p1.ok) {
        logSpeakingAssessmentStep({
          step: 'llm_coaching_end',
          assessmentId: input.assessmentId,
          durationMs: Date.now() - t0,
          extra: { validation: 'ok', attempts: attempts.length },
        })
        return debugEnabled ? { coaching: p1.data, debug: { llmInput: input.coachingInput, attempts } } : { coaching: p1.data }
      }

      logSpeakingAssessmentStep({
        step: 'llm_coaching_retry',
        assessmentId: input.assessmentId,
        extra: { reason: p1.err.slice(0, 500) },
      })

      const repairMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        ...baseMessages,
        { role: 'assistant', content: raw1.slice(0, 6000) },
        {
          role: 'user',
          content: `Your previous reply was invalid for our schema.\nError: ${p1.err}\nReturn ONLY one corrected JSON object with exactly these keys: shortSummary, whatWentWell, improveNext, retryTarget, retryWhy, levelAlignedNotes, dutchSoundingLabel, confidenceNarrative, wordCoachingNotes. No markdown.`,
        },
      ]

      const completion2 = await runOnce(repairMessages)
      const raw2 = completion2.choices[0]?.message?.content ?? ''
      const p2 = tryParseCoachingJson(raw2)
      attempts.push({
        rawResponse: raw2.slice(0, 24_000),
        parseOk: p2.ok,
        ...(!p2.ok ? { zodError: p2.err } : {}),
      })

      if (p2.ok) {
        logSpeakingAssessmentStep({
          step: 'llm_coaching_end',
          assessmentId: input.assessmentId,
          durationMs: Date.now() - t0,
          extra: { validation: 'ok_after_retry', attempts: attempts.length },
        })
        return debugEnabled ? { coaching: p2.data, debug: { llmInput: input.coachingInput, attempts } } : { coaching: p2.data }
      }

      const coaching = deterministicCoaching(input.coachingInput)
      logSpeakingAssessmentStep({
        step: 'llm_coaching_end',
        assessmentId: input.assessmentId,
        durationMs: Date.now() - t0,
        extra: { validation: 'fallback_template', attempts: attempts.length },
      })
      return debugEnabled ? { coaching, debug: { llmInput: input.coachingInput, attempts } } : { coaching }
    } catch (e) {
      const coaching = deterministicCoaching(input.coachingInput)
      attempts.push({
        rawResponse: '',
        parseOk: false,
        zodError: e instanceof Error ? e.message : String(e),
      })
      logSpeakingAssessmentStep({
        step: 'llm_coaching_end',
        assessmentId: input.assessmentId,
        durationMs: Date.now() - t0,
        extra: { error: e instanceof Error ? e.message : String(e) },
      })
      return debugEnabled ? { coaching, debug: { llmInput: input.coachingInput, attempts } } : { coaching }
    }
  }
}
