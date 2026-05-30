/**
 * Parallel FAST scenario evaluator: replaces the single-call FAST evaluator with N+1 small
 * parallel sub-calls — 1 for `overall + goals + recommendations` and 1 per user turn.
 *
 * Why this exists
 * ───────────────
 * The single-call FAST path emits ~1600 output tokens for a 7-turn session and is bottlenecked by
 * provider throughput (~30 tok/s on the user's degraded `gpt-4o-mini` deployment → 60–90s wall time).
 * Token output cost grows linearly with turn count, so larger sessions get worse, not better.
 *
 * The parallel approach issues N+1 small calls concurrently:
 *   - 1 "overall" call: ~300–400 output tokens (overall scoreboard + goals + recommendations)
 *   - N "per-turn" calls: ~150–250 output tokens each (one per user turn)
 *
 * Total wall time = `max(sub-call latency)` ≈ 3–8s on a healthy provider, ≤15s even on degraded
 * provider — vs. `sum(everything)` for the monolithic call. Per-call output is also small enough
 * that truncation (`finish_reason: length`) becomes essentially impossible.
 *
 * Diagnostics
 * ───────────
 * Sub-call diagnostics are aggregated into one {@link SpeakLiveOpenAiEvaluationDiagnosticsV1} so
 * existing UI / persistence code paths stay unchanged. `providerNetworkMs` is the **max** of all
 * sub-calls (true wall time); token counts are summed; `subcallCount` and `subcallProviderNetworkMs`
 * provide per-call visibility for ops.
 *
 * Partial-failure tolerance
 * ─────────────────────────
 * - Overall sub-call failure → entire eval fails (deterministic fallback for whole report).
 * - Per-turn sub-call failure → that single turn gets a deterministic neutral stub; the rest of
 *   the report still uses real LLM coaching. The user does NOT see the "LIVE COACHING MODEL
 *   UNAVAILABLE" banner in this case (only `partialTurnFailureCount` is surfaced in diagnostics).
 */
import {
  getReportEvalFastModelDiagnosticsLabel,
  getReportEvalFastSubcallTimeoutMs,
  getReportEvalMaxOutputTokensFastOverall,
  getReportEvalMaxOutputTokensFastPerTurn,
  getReportEvalModelFast,
  speakLiveEvalCredentialsReady,
} from '../ai/config/aiProviderConfig'
import {
  runSpeakLiveEvalChatCompletionRich,
  type RunSpeakLiveEvalChatCompletionResult,
} from '../ai/speakLiveEvalChatCompletion'
import type { LiveEvalLlmTurnInput } from './liveSessionEvaluationLlm'
import { mapScenarioDialogueStructuredToLiveEvalLlmSession } from './speakLiveScenarioDialogueStructuredMapper'
import {
  FastScenarioOverallOnlySchema,
  FastScenarioTurnOnlySchema,
  combineFastEvaluationParts,
  liftFastToDeepScenarioEvaluation,
  type FastScenarioEvaluationOutput,
  type FastScenarioOverallOnlyOutput,
} from './speakLiveScenarioDialogueStructured.schema'
import type { SpeakLiveOpenAiEvaluationDiagnosticsV1 } from './liveVoiceEvaluationTypes'
import {
  estimateApproximateTokensFromChars,
  normalizeScenarioDialogueStructuredJsonRoot,
  type EvaluateScenarioDialogueStructuredResult,
  type ScenarioDialogueStructuredEvalDiagnostics,
  type ScenarioDialogueStructuredEvalInput,
} from './speakLiveScenarioDialogueStructuredEvaluator'

const OVERALL_SYSTEM_PROMPT = `You score a Dutch scenario role-play SESSION (overall + goals + recommendations only). Return ONE JSON object only — no markdown, no code fences, no commentary.

JSON contract:
{
  "overall": {
    "summary": string (≤ 220 chars, ≤ 2 short sentences),
    "scenarioOutcomeScore": int 0-100,
    "taskCompletionScore":  int 0-100,
    "languageScore":        int 0-100,
    "conversationFlowScore":int 0-100,
    "grammarScore":         int 0-100,
    "vocabularyScore":      int 0-100,
    "naturalnessScore":     int 0-100,
    "estimatedLevel":       "A1" | "A2" | "B1" | "B2",
    "confidence":           int 0-100,
    "primaryFocus": { "title": string ≤ 70, "why": string ≤ 140, "pattern": string ≤ 70, "example": string ≤ 140 }
  },
  "goals":   [{ "goalId": string, "title": string ≤ 110, "weight": 0..1, "status": "completed"|"partially_completed"|"missed", "score": int 0-100 }],
  "recommendations": { "nextDrillTitle": string ≤ 100, "nextDrillReason": string ≤ 180, "suggestedPracticeType": "scenario_retry"|"word_drill"|"sentence_drill"|"coach"|"read_aloud"|"listening" }
}

Hard rules:
- Do NOT include any "turns" field — turn evaluations are scored separately.
- goals[*].status MUST be exactly one of "completed"|"partially_completed"|"missed". Never "achieved", "done", "not achieved", "failed", "in progress".
- recommendations.suggestedPracticeType MUST be exactly one keyword from the list. The reason / description goes in nextDrillReason. Never put a sentence in suggestedPracticeType.
- Do NOT inflate scores for broken Dutch. A1/A2 reward clear simple communication but still flag wrong words and broken syntax.
- Concise JSON only. No prose. No markdown.`

const PER_TURN_SYSTEM_PROMPT = `You score ONE Dutch user turn from a scenario role-play. Return ONE JSON object only — no markdown, no code fences, no commentary.

JSON contract:
{
  "turn": {
    "turnId": string (MUST equal the provided focusTurnId, copy character-for-character),
    "languageScores": {
      "grammar":           int 0-100,
      "vocabulary":        int 0-100,
      "sentenceStructure": int 0-100,
      "naturalness":       int 0-100,
      "taskRelevance":     int 0-100
    },
    "mainFix": string ≤ 140 (1 concrete sentence, NOT generic filler),
    "strengths":    string[]  (≤ 2 entries, ≤ 110 chars each),
    "improvements": string[]  (≤ 2 entries, ≤ 110 chars each),
    "correctedLine":        string ≤ 160,
    "strongerNaturalLine":  string ≤ 160
  }
}

Hard rules:
- "turn.turnId" MUST equal the provided focusTurnId character-for-character. Copy the UUID exactly — do not shorten, merge, or reformat.
- Score ONLY the user line (focusUserText). Use scenario context, the previous assistant line, and the next assistant line for context but never score the assistant.
- mainFix must be concrete and turn-specific (e.g. "Use 'mag ik' instead of 'kan ik' for polite requests"). Never output filler like "Cover this scenario goal."
- Wrong Dutch word with inferable meaning: write the intended Dutch in correctedLine and the more natural phrasing in strongerNaturalLine.
- Do NOT inflate scores for broken Dutch. A1/A2 reward clear simple communication but still flag wrong words and broken syntax.
- Concise JSON only. No prose. No markdown.`

const OVERALL_SCHEMA_SIZE_CHARS = 360
const PER_TURN_SCHEMA_SIZE_CHARS = 240

function trunc(s: string, max: number): string {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function stripJsonFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
}

function parseJsonLoose(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(stripJsonFences(raw)) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'json_parse_error' }
  }
}

/**
 * Build the compact "overall" sub-call user payload: scenario context + compressed dialogue +
 * goals (id/title/weight only). NO per-turn scoring expected.
 */
function buildOverallUserPayload(d: ScenarioDialogueStructuredEvalInput): string {
  const body = {
    scenarioName: d.scenarioName,
    scenarioType: d.scenarioType,
    level: d.level,
    goals: d.goals.map((g) => ({ id: g.goalId, title: g.title.slice(0, 140), weight: g.weight })),
    dialogue: d.dialogueTurns.map((t) =>
      t.speaker === 'assistant'
        ? { id: t.turnId, role: 'a', text: trunc(t.text, 200) }
        : { id: t.turnId, role: 'u', text: trunc(t.text, 1200) },
    ),
  }
  return JSON.stringify(body).slice(0, 18_000)
}

/**
 * Build the compact "per-turn" sub-call user payload: scenario context + the focus user turn
 * plus its previous and next assistant lines. Sibling user turns are NOT included (the model
 * scores ONE turn at a time).
 */
function buildPerTurnUserPayload(params: {
  dialogue: ScenarioDialogueStructuredEvalInput
  focusTurnId: string
  focusUserText: string
  previousAssistantText: string | null
  nextAssistantText: string | null
}): string {
  const body = {
    scenarioName: params.dialogue.scenarioName,
    scenarioType: params.dialogue.scenarioType,
    level: params.dialogue.level,
    goals: params.dialogue.goals.map((g) => ({ id: g.goalId, title: g.title.slice(0, 140) })),
    focusTurnId: params.focusTurnId,
    previousAssistant: params.previousAssistantText ? trunc(params.previousAssistantText, 220) : null,
    focusUserText: trunc(params.focusUserText, 1400),
    nextAssistant: params.nextAssistantText ? trunc(params.nextAssistantText, 220) : null,
  }
  return JSON.stringify(body).slice(0, 6_000)
}

/**
 * Find the previous and next assistant lines around `focusTurnId` in the dialogue. Returns null
 * for either when none exists (e.g. focus turn is the very first user line, or the very last).
 */
function findSurroundingAssistantTexts(
  dialogue: ScenarioDialogueStructuredEvalInput,
  focusTurnId: string,
): { previousAssistantText: string | null; nextAssistantText: string | null } {
  const turns = dialogue.dialogueTurns
  const idx = turns.findIndex((t) => t.turnId === focusTurnId && t.speaker === 'user')
  if (idx < 0) return { previousAssistantText: null, nextAssistantText: null }
  let prev: string | null = null
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (turns[i]!.speaker === 'assistant') {
      prev = turns[i]!.text
      break
    }
  }
  let next: string | null = null
  for (let i = idx + 1; i < turns.length; i += 1) {
    if (turns[i]!.speaker === 'assistant') {
      next = turns[i]!.text
      break
    }
  }
  return { previousAssistantText: prev, nextAssistantText: next }
}

export type ParallelEvaluationDiagnostics = {
  /** Total sub-calls issued (1 overall + N per-turn). */
  subcallCount: number
  /** Per-call provider wall time (ms), in [overall, turn0, turn1, ...] order. */
  subcallProviderNetworkMs: number[]
  /** Number of per-turn sub-calls that failed and were stubbed deterministically. */
  partialTurnFailureCount: number
  /** Per-turn failure reasons keyed by user turn index, for ops triage. */
  perTurnFailures: Record<number, string>
}

/** Aggregator over per-call rich results into one openaiDiagnostics envelope. */
function aggregateOpenAiDiagnostics(params: {
  modelName: string
  promptCharCount: number
  approximateInputTokens: number
  responseCharCount: number
  approximateOutputTokens: number
  requestStartedAt: string
  requestBuildMs: number
  perCall: Array<{ result: RunSpeakLiveEvalChatCompletionResult | null; jsonParseMs: number; schemaValidationMs: number }>
}): SpeakLiveOpenAiEvaluationDiagnosticsV1 {
  let providerNetworkMsMax = 0
  let responseReadMsMax = 0
  let actualInputTokens = 0
  let actualOutputTokens = 0
  let totalTokens = 0
  let jsonParseMs = 0
  let schemaValidationMs = 0
  let finishReason: string | undefined
  let requestId: string | undefined
  for (const c of params.perCall) {
    jsonParseMs += c.jsonParseMs
    schemaValidationMs += c.schemaValidationMs
    if (!c.result) continue
    providerNetworkMsMax = Math.max(providerNetworkMsMax, c.result.providerNetworkMs)
    responseReadMsMax = Math.max(responseReadMsMax, c.result.responseReadMs)
    actualInputTokens += c.result.usage?.promptTokens ?? 0
    actualOutputTokens += c.result.usage?.completionTokens ?? 0
    totalTokens += c.result.usage?.totalTokens ?? 0
    if (!finishReason || c.result.finishReason === 'length') finishReason = c.result.finishReason ?? finishReason
    if (!requestId && c.result.requestId) requestId = c.result.requestId
  }
  return {
    schemaName: 'fast',
    schemaSizeChars: OVERALL_SCHEMA_SIZE_CHARS + PER_TURN_SCHEMA_SIZE_CHARS,
    modelName: params.modelName,
    requestStartedAt: params.requestStartedAt,
    requestCompletedAt: new Date().toISOString(),
    requestBuildMs: params.requestBuildMs,
    /** providerNetworkMs is the MAX (true wall time) — sub-calls run concurrently. */
    providerNetworkMs: providerNetworkMsMax,
    responseReadMs: responseReadMsMax,
    jsonParseMs,
    schemaValidationMs,
    repairAttempted: false,
    repairMs: 0,
    retryCount: 0,
    promptCharCount: params.promptCharCount,
    responseCharCount: params.responseCharCount,
    approximateInputTokens: params.approximateInputTokens,
    approximateOutputTokens: params.approximateOutputTokens,
    requestId,
    finishReason,
    actualInputTokens: actualInputTokens > 0 ? actualInputTokens : undefined,
    actualOutputTokens: actualOutputTokens > 0 ? actualOutputTokens : undefined,
    totalTokens: totalTokens > 0 ? totalTokens : undefined,
    lengthSalvageAttempted: false,
    lengthSalvageOk: false,
    /** Aggregate budget reflects the largest single sub-call cap (per-turn cap) — used by
     *  the orchestrator's "did the model bust budget" warning. */
    maxOutputTokensRequested: getReportEvalMaxOutputTokensFastPerTurn(),
    requestTimeoutMs: getReportEvalFastSubcallTimeoutMs(),
    subcallCount: params.perCall.length,
    subcallProviderNetworkMs: params.perCall.map((c) => c.result?.providerNetworkMs ?? 0),
  }
}

function neutralTurnStub(turnId: string): FastScenarioEvaluationOutput['turns'][number] {
  return {
    turnId,
    languageScores: {
      grammar: 60,
      vocabulary: 60,
      sentenceStructure: 60,
      naturalness: 60,
      taskRelevance: 60,
    },
    mainFix: '',
    strengths: [],
    improvements: [],
    correctedLine: '',
    strongerNaturalLine: '',
  }
}

/**
 * Run the parallel FAST evaluation: 1 overall sub-call + N per-turn sub-calls (concurrent).
 *
 * Returns the same {@link EvaluateScenarioDialogueStructuredResult} shape as the legacy single-call
 * evaluator so the orchestrator can swap implementations without touching downstream code.
 */
export async function evaluateScenarioDialogueParallel(params: {
  dialogue: ScenarioDialogueStructuredEvalInput
  userTurnInputs: LiveEvalLlmTurnInput[]
  scenarioTitle: string
  scenarioGoals: string[]
  learnerLevel: string
  onDiagnostics?: (
    d: ScenarioDialogueStructuredEvalDiagnostics & {
      repairAttempted: boolean
      chatMs: number
      repairMs: number
    },
  ) => void
  onOpenAiDiagnostics?: (d: SpeakLiveOpenAiEvaluationDiagnosticsV1) => void
  onParallelDiagnostics?: (d: ParallelEvaluationDiagnostics) => void
}): Promise<EvaluateScenarioDialogueStructuredResult> {
  const buildStartedAt = Date.now()
  const requestStartedAt = new Date().toISOString()
  const modelName = getReportEvalFastModelDiagnosticsLabel()
  const subcallTimeoutMs = getReportEvalFastSubcallTimeoutMs()
  const overallMaxTokens = getReportEvalMaxOutputTokensFastOverall()
  const perTurnMaxTokens = getReportEvalMaxOutputTokensFastPerTurn()

  const cred = speakLiveEvalCredentialsReady()
  if (!cred.ok) {
    const reason =
      cred.reason === 'mock_provider'
        ? 'mock_provider'
        : cred.reason === 'azure_openai_not_configured'
          ? 'azure_openai_not_configured'
          : 'no_api_key'
    const oa = aggregateOpenAiDiagnostics({
      modelName,
      promptCharCount: 0,
      approximateInputTokens: 0,
      responseCharCount: 0,
      approximateOutputTokens: 0,
      requestStartedAt,
      requestBuildMs: Date.now() - buildStartedAt,
      perCall: [],
    })
    const d: ScenarioDialogueStructuredEvalDiagnostics = {
      promptCharCount: 0,
      approximateInputTokens: 0,
      approximateOutputTokens: 0,
      structuredLlmMs: 0,
      modelName,
      validationMs: 0,
      validationErrors: [reason],
    }
    params.onDiagnostics?.({ ...d, repairAttempted: false, chatMs: 0, repairMs: 0 })
    params.onOpenAiDiagnostics?.(oa)
    return {
      ok: false,
      reason,
      diagnostics: d,
      openaiDiagnostics: oa,
      repairAttempted: false,
      chatMs: 0,
      repairMs: 0,
      schemaName: 'fast',
    }
  }

  const overallUserContent = buildOverallUserPayload(params.dialogue)
  const overallPromptChars = OVERALL_SYSTEM_PROMPT.length + overallUserContent.length

  const perTurnPayloads = params.userTurnInputs.map((turn) => {
    const focusUserText = (() => {
      const dialogueTurn = params.dialogue.dialogueTurns.find(
        (t) => t.turnId === turn.turnId && t.speaker === 'user',
      )
      return dialogueTurn?.text ?? turn.learnerTranscriptNormalized ?? turn.learnerTranscript ?? ''
    })()
    const surrounding = findSurroundingAssistantTexts(params.dialogue, turn.turnId)
    return buildPerTurnUserPayload({
      dialogue: params.dialogue,
      focusTurnId: turn.turnId,
      focusUserText,
      previousAssistantText: surrounding.previousAssistantText,
      nextAssistantText: surrounding.nextAssistantText,
    })
  })
  const perTurnPromptCharsTotal = perTurnPayloads.reduce(
    (acc, p) => acc + PER_TURN_SYSTEM_PROMPT.length + p.length,
    0,
  )
  const promptCharCount = overallPromptChars + perTurnPromptCharsTotal
  const approximateInputTokens = estimateApproximateTokensFromChars(promptCharCount)
  const requestBuildMs = Date.now() - buildStartedAt

  const chatStarted = Date.now()
  const overallP = runSpeakLiveEvalChatCompletionRich({
    messages: [
      { role: 'system', content: OVERALL_SYSTEM_PROMPT },
      { role: 'user', content: overallUserContent },
    ],
    maxOutputTokens: overallMaxTokens,
    temperature: 0,
    jsonResponseFormat: true,
    openAiModel: getReportEvalModelFast(),
    requestTimeoutMs: subcallTimeoutMs,
  })

  const perTurnPs = perTurnPayloads.map((payload) =>
    runSpeakLiveEvalChatCompletionRich({
      messages: [
        { role: 'system', content: PER_TURN_SYSTEM_PROMPT },
        { role: 'user', content: payload },
      ],
      maxOutputTokens: perTurnMaxTokens,
      temperature: 0,
      jsonResponseFormat: true,
      openAiModel: getReportEvalModelFast(),
      requestTimeoutMs: subcallTimeoutMs,
    }),
  )

  const settled = await Promise.allSettled([overallP, ...perTurnPs])
  const chatMs = Date.now() - chatStarted

  const overallSettled = settled[0]!
  const turnSettled = settled.slice(1)

  const perCallTracking: Array<{ result: RunSpeakLiveEvalChatCompletionResult | null; jsonParseMs: number; schemaValidationMs: number }> = []
  let totalResponseChars = 0
  const validationErrors: string[] = []

  // ─── Overall sub-call ─────────────────────────────────────────────────
  let overallParsed: FastScenarioOverallOnlyOutput | null = null
  let overallResultRich: RunSpeakLiveEvalChatCompletionResult | null = null
  if (overallSettled.status === 'fulfilled') {
    overallResultRich = overallSettled.value
    totalResponseChars += overallResultRich.content.length
    const parseStarted = Date.now()
    const looseParse = parseJsonLoose(overallResultRich.content)
    const jsonParseMs = Date.now() - parseStarted
    const validationStarted = Date.now()
    let schemaValidationMs = 0
    if (looseParse.ok) {
      const normalized = normalizeScenarioDialogueStructuredJsonRoot(looseParse.value)
      const zr = FastScenarioOverallOnlySchema.safeParse(normalized)
      schemaValidationMs = Date.now() - validationStarted
      if (zr.success) {
        overallParsed = zr.data
      } else {
        for (const i of zr.error.issues.slice(0, 12)) {
          validationErrors.push(`overall.${i.path.join('.')}: ${i.message}`)
        }
      }
    } else {
      schemaValidationMs = Date.now() - validationStarted
      validationErrors.push(`overall.parse: ${looseParse.error}`)
    }
    perCallTracking.push({ result: overallResultRich, jsonParseMs, schemaValidationMs })
  } else {
    const reason = overallSettled.reason instanceof Error ? overallSettled.reason.message : String(overallSettled.reason)
    validationErrors.push(`overall.subcall_failed: ${reason}`)
    perCallTracking.push({ result: null, jsonParseMs: 0, schemaValidationMs: 0 })
  }

  // ─── Per-turn sub-calls ────────────────────────────────────────────────
  const turnRows: FastScenarioEvaluationOutput['turns'] = []
  const perTurnFailures: Record<number, string> = {}
  let partialTurnFailureCount = 0
  for (let i = 0; i < params.userTurnInputs.length; i += 1) {
    const expectedTurnId = params.userTurnInputs[i]!.turnId
    const slot = turnSettled[i]!
    if (slot.status === 'fulfilled') {
      const r = slot.value
      totalResponseChars += r.content.length
      const parseStarted = Date.now()
      const looseParse = parseJsonLoose(r.content)
      const jsonParseMs = Date.now() - parseStarted
      const validationStarted = Date.now()
      let schemaValidationMs = 0
      let row: FastScenarioEvaluationOutput['turns'][number] | null = null
      if (looseParse.ok) {
        const normalized = normalizeScenarioDialogueStructuredJsonRoot(looseParse.value)
        const zr = FastScenarioTurnOnlySchema.safeParse(normalized)
        schemaValidationMs = Date.now() - validationStarted
        if (zr.success) {
          /** Models occasionally garble UUID hyphens; positional order is authoritative. */
          row = { ...zr.data.turn, turnId: expectedTurnId }
        } else {
          for (const issue of zr.error.issues.slice(0, 6)) {
            validationErrors.push(`turn[${i}].${issue.path.join('.')}: ${issue.message}`)
          }
        }
      } else {
        schemaValidationMs = Date.now() - validationStarted
        validationErrors.push(`turn[${i}].parse: ${looseParse.error}`)
      }
      perCallTracking.push({ result: r, jsonParseMs, schemaValidationMs })
      if (row) {
        turnRows.push(row)
      } else {
        partialTurnFailureCount += 1
        perTurnFailures[i] = 'parse_or_schema_failed'
        turnRows.push(neutralTurnStub(expectedTurnId))
      }
    } else {
      const reason = slot.reason instanceof Error ? slot.reason.message : String(slot.reason)
      partialTurnFailureCount += 1
      perTurnFailures[i] = reason
      perCallTracking.push({ result: null, jsonParseMs: 0, schemaValidationMs: 0 })
      turnRows.push(neutralTurnStub(expectedTurnId))
    }
  }

  // ─── Tolerance policy: overall MUST succeed; > 50% turn failures fall back ──
  const totalTurns = params.userTurnInputs.length
  const tooManyTurnFailures = totalTurns > 0 && partialTurnFailureCount * 2 > totalTurns
  const approximateOutputTokens = estimateApproximateTokensFromChars(totalResponseChars)

  const openaiDiagnostics = aggregateOpenAiDiagnostics({
    modelName,
    promptCharCount,
    approximateInputTokens,
    responseCharCount: totalResponseChars,
    approximateOutputTokens,
    requestStartedAt,
    requestBuildMs,
    perCall: perCallTracking,
  })
  const parallelDiagnostics: ParallelEvaluationDiagnostics = {
    subcallCount: perCallTracking.length,
    subcallProviderNetworkMs: perCallTracking.map((c) => c.result?.providerNetworkMs ?? 0),
    partialTurnFailureCount,
    perTurnFailures,
  }
  const diagnostics: ScenarioDialogueStructuredEvalDiagnostics = {
    promptCharCount,
    approximateInputTokens,
    approximateOutputTokens,
    structuredLlmMs: openaiDiagnostics.providerNetworkMs + (openaiDiagnostics.responseReadMs ?? 0),
    modelName,
    validationMs: openaiDiagnostics.schemaValidationMs,
    validationErrors,
  }

  params.onDiagnostics?.({ ...diagnostics, repairAttempted: false, chatMs, repairMs: 0 })
  params.onOpenAiDiagnostics?.(openaiDiagnostics)
  params.onParallelDiagnostics?.(parallelDiagnostics)

  if (!overallParsed || tooManyTurnFailures) {
    return {
      ok: false,
      reason: !overallParsed
        ? `overall_subcall_failed: ${validationErrors[0] ?? 'unknown'}`
        : `too_many_turn_failures: ${partialTurnFailureCount}/${totalTurns} turn sub-calls failed`,
      diagnostics,
      openaiDiagnostics,
      repairAttempted: false,
      chatMs,
      repairMs: 0,
      schemaName: 'fast',
    }
  }

  const fastEvaluation = combineFastEvaluationParts(overallParsed, turnRows)
  const structured = liftFastToDeepScenarioEvaluation(fastEvaluation)

  let mapped
  try {
    mapped = mapScenarioDialogueStructuredToLiveEvalLlmSession({
      structured,
      scenarioTitle: params.scenarioTitle,
      scenarioGoals: params.scenarioGoals,
      learnerLevel: params.learnerLevel,
      userTurnInputs: params.userTurnInputs,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      ok: false,
      reason: `parallel_map_error: ${msg}`,
      diagnostics,
      openaiDiagnostics,
      repairAttempted: false,
      chatMs,
      repairMs: 0,
      schemaName: 'fast',
    }
  }

  return {
    ok: true,
    data: mapped,
    structured,
    raw: JSON.stringify(fastEvaluation),
    diagnostics,
    openaiDiagnostics,
    repairAttempted: false,
    chatMs,
    repairMs: 0,
    schemaName: 'fast',
  }
}
