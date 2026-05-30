/**
 * Structured JSON transcript evaluation (user Dutch lines only).
 * Produces a compact schema, then maps into {@link LiveEvalLlmSession} for downstream merge.
 */
import {
  getSpeakLiveStructuredTranscriptEvalMaxOutputTokens,
  getSpeakLiveStructuredTranscriptEvalModel,
  getSpeakLiveStructuredTranscriptEvalTemperature,
  getSpeakLiveStructuredEvalModelDiagnosticsLabel,
  speakLiveEvalCredentialsReady,
} from '../ai/config/aiProviderConfig'
import { runSpeakLiveEvalChatCompletion } from '../ai/speakLiveEvalChatCompletion'
import type { LiveEvalLlmSession, LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import { LiveEvalLlmSessionSchema } from './liveSessionEvaluationLlm'
import { mapStructuredTranscriptEvalToLiveEvalLlmSession } from './speakLiveStructuredTranscriptEvalMapper'
import {
  buildStructuredTranscriptEvalSystemPrompt,
  buildStructuredTranscriptEvalUserPayload,
} from './speakLiveStructuredTranscriptEvalPrompts'
import { parseStructuredTranscriptEvalRootJson } from './speakLiveStructuredTranscriptEvalSchema'
import { repairStructuredTranscriptEvalJson } from './speakLiveStructuredTranscriptEvalRepair'

export type SpeakLiveStructuredTranscriptEvalResult =
  | { source: 'llm'; data: LiveEvalLlmSession }
  | { source: 'failed'; reason: string; code: 'parse' | 'validation' | 'request' }

export type SpeakLiveStructuredTranscriptEvalOptions = {
  /** LLM + Azure ran in parallel — Azure text summaries are absent; stay transcript-grounded. */
  parallelWithoutAzureSummaries?: boolean
  /** One repair completion after root / mapper / envelope validation failure. */
  attemptJsonRepair?: boolean
  /** Optional timing hook for parallel orchestration diagnostics. */
  onStructuredEvalTiming?: (t: {
    chatMs: number
    repairMs: number
    repairAttempted: boolean
    validationErrorsCount: number
  }) => void
}

function parseStructuredTranscriptEvalFromRawString(params: {
  raw: string
  input: {
    scenarioTitle: string
    scenarioGoals: string[]
    learnerLevel: string
    turns: LiveEvalLlmTurnInput[]
  }
}): SpeakLiveStructuredTranscriptEvalResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(params.raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, ''))
  } catch {
    return { source: 'failed', reason: 'parse_error', code: 'parse' }
  }

  const sr = parseStructuredTranscriptEvalRootJson(parsed)
  if (!sr.success) {
    const issues = sr.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { source: 'failed', reason: issues, code: 'validation' }
  }

  let mapped: LiveEvalLlmSession
  try {
    mapped = mapStructuredTranscriptEvalToLiveEvalLlmSession({
      structured: sr.data,
      scenarioTitle: params.input.scenarioTitle,
      scenarioGoals: params.input.scenarioGoals,
      learnerLevel: params.input.learnerLevel,
      turns: params.input.turns,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { source: 'failed', reason: msg, code: 'validation' }
  }

  const envelope = LiveEvalLlmSessionSchema.safeParse(mapped)
  if (!envelope.success) {
    const issues = envelope.error.issues.slice(0, 10).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { source: 'failed', reason: issues, code: 'validation' }
  }

  return { source: 'llm', data: envelope.data }
}

export async function runSpeakLiveStructuredTranscriptEvaluation(
  input: {
    scenarioTitle: string
    scenarioSlug?: string | null
    scenarioGoals: string[]
    learnerLevel: string
    recapGoalsCompleted: string[]
    recapGoalsMissed: string[]
    recapWhatWentWell: string[]
    recapWhatToImprove: string[]
    turns: LiveEvalLlmTurnInput[]
  },
  opts?: SpeakLiveStructuredTranscriptEvalOptions,
): Promise<SpeakLiveStructuredTranscriptEvalResult> {
  const cred = speakLiveEvalCredentialsReady()
  if (!cred.ok) {
    const reason =
      cred.reason === 'mock_provider'
        ? 'mock_provider'
        : cred.reason === 'azure_openai_not_configured'
          ? 'azure_openai_not_configured'
          : 'no_api_key'
    return { source: 'failed', reason, code: 'request' }
  }

  const diagnosticLabel = getSpeakLiveStructuredEvalModelDiagnosticsLabel()
  const temperature = getSpeakLiveStructuredTranscriptEvalTemperature()
  const maxTokens = getSpeakLiveStructuredTranscriptEvalMaxOutputTokens()
  const slugNorm = (input.scenarioSlug ?? '').trim().toLowerCase().replace(/-/g, '_') || 'speak_live_voice'

  const userContent = buildStructuredTranscriptEvalUserPayload({
    scenarioTitle: input.scenarioTitle,
    scenarioSlug: slugNorm,
    scenarioGoals: input.scenarioGoals,
    learnerLevel: input.learnerLevel,
    conversationType: 'speak_live_voice',
    recapGoalsCompleted: input.recapGoalsCompleted,
    recapGoalsMissed: input.recapGoalsMissed,
    recapWhatWentWell: input.recapWhatWentWell,
    recapWhatToImprove: input.recapWhatToImprove,
    turns: input.turns.map((t) => ({
      turnId: t.turnId,
      turnIndex: t.turnIndex,
      learnerTranscript: t.learnerTranscript,
      learnerTranscriptNormalized: t.learnerTranscriptNormalized,
      assistantReply: t.assistantReply,
      hasLearnerAudio: t.hasLearnerAudio,
      azureSummary: t.azureSummary,
    })),
  }).slice(0, 48_000)

  const chatStartedAt = Date.now()
  let raw: string
  try {
    raw = await runSpeakLiveEvalChatCompletion({
      messages: [
        {
          role: 'system',
          content: buildStructuredTranscriptEvalSystemPrompt({
            parallelWithoutAzureSummaries: opts?.parallelWithoutAzureSummaries,
          }),
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
      maxOutputTokens: maxTokens,
      temperature,
      jsonResponseFormat: true,
      openAiModel: getSpeakLiveStructuredTranscriptEvalModel(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[StructuredTranscriptEval] eval request failed', { model: diagnosticLabel, error: msg })
    const chatMs = Date.now() - chatStartedAt
    opts?.onStructuredEvalTiming?.({
      chatMs,
      repairMs: 0,
      repairAttempted: false,
      validationErrorsCount: 0,
    })
    return { source: 'failed', reason: msg, code: 'request' }
  }

  const chatMs = Date.now() - chatStartedAt

  const first = parseStructuredTranscriptEvalFromRawString({
    raw,
    input: {
      scenarioTitle: input.scenarioTitle,
      scenarioGoals: input.scenarioGoals,
      learnerLevel: input.learnerLevel,
      turns: input.turns,
    },
  })
  if (first.source === 'llm') {
    console.log('[StructuredTranscriptEval] Completed', { model: diagnosticLabel, turns: first.data.turns.length })
    opts?.onStructuredEvalTiming?.({
      chatMs,
      repairMs: 0,
      repairAttempted: false,
      validationErrorsCount: 0,
    })
    return first
  }

  let repairMs = 0
  let repairAttempted = false
  const validationErrorsCount =
    first.source === 'failed' ? Math.min(24, first.reason.split(';').filter((s) => s.trim()).length || 1) : 0

  if (opts?.attemptJsonRepair && first.code !== 'request') {
    repairAttempted = true
    const repairStarted = Date.now()
    const repaired = await repairStructuredTranscriptEvalJson({
      failedJsonSnippet: raw,
      validationIssues: first.reason,
    })
    repairMs = Date.now() - repairStarted
    if (repaired) {
      const second = parseStructuredTranscriptEvalFromRawString({
        raw: repaired,
        input: {
          scenarioTitle: input.scenarioTitle,
          scenarioGoals: input.scenarioGoals,
          learnerLevel: input.learnerLevel,
          turns: input.turns,
        },
      })
      if (second.source === 'llm') {
        console.log('[StructuredTranscriptEval] Completed after JSON repair', {
          model: diagnosticLabel,
          turns: second.data.turns.length,
        })
        opts?.onStructuredEvalTiming?.({
          chatMs,
          repairMs,
          repairAttempted,
          validationErrorsCount,
        })
        return second
      }
    }
  }

  if (first.source === 'failed') {
    console.warn('[StructuredTranscriptEval] Failed', { code: first.code, reason: first.reason.slice(0, 200) })
  }
  opts?.onStructuredEvalTiming?.({
    chatMs,
    repairMs,
    repairAttempted,
    validationErrorsCount,
  })
  return first
}
