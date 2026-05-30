/**
 * Structured server-side timings for Speak Live turns (merged on the client with STT/TTS/playback).
 * @see docs/live-speech-fast-path.md
 */
import type { ConversationPerf } from '../conversation/conversationPerf'
import {
  LIVE_TURN_WARN_TOTAL_MS,
  checkBudgetsAgainstServerTrace,
  getLiveSpeechPerformanceBudgets,
} from '../../config/liveSpeechPerformanceBudgets'

export type LiveTurnLatencyTraceServer = {
  sessionId: string
  turnId: string
  /** Browser-only in full trace; null on server. */
  transcriptPartialMs: number | null
  transcriptFinalMs: number | null
  normalizationMs: number
  /** DB + moderation + insert + recent + prompt prep until LLM start. */
  stateLoadMs: number
  llmMs: number
  assistantTextVisibleMs: number | null
  /** Azure Content Safety (or no-op) on assistant line. */
  moderationAssistantMs: number | null
  ttsMs: number | null
  playbackStartMs: number | null
  totalMs: number
  bottleneckStage: string
  fastPath: boolean
  modelUsed?: string
  estimatedInputTokens?: number
  estimatedOutputTokens?: number
  budgetsExceeded?: string[]
}

function roughTokenEstimate(chars: number): number {
  return Math.max(1, Math.round(chars / 4))
}

function pickBottleneck(parts: {
  stateLoadMs: number
  llmMs: number
  moderationAssistantMs: number
  persistMs: number
}): string {
  const entries: [string, number][] = [
    ['state_load', parts.stateLoadMs],
    ['llm', parts.llmMs],
    ['assistant_moderation', parts.moderationAssistantMs],
    ['persist', parts.persistMs],
  ]
  entries.sort((a, b) => b[1] - a[1])
  return entries[0]?.[0] ?? 'unknown'
}

export function buildSpeakLiveServerLatencyTrace(params: {
  perf: ConversationPerf
  threadId: string
  userMessageId: string
  normalizationMs: number
  replyPromptCharsEstimate: number
  assistantReplyChars: number
  modelLabel: string
}): LiveTurnLatencyTraceServer {
  const snap = params.perf.snapshot()
  const totalMs = snap.tTotalMs ?? 0

  const stateLoadMs = Math.max(
    0,
    params.perf.deltaBetween('afterNormalize', 'beforeReplyStream') ??
      params.perf.deltaBetween('afterPool', 'beforeReplyStream') ??
      0
  )

  const llmMs =
    params.perf.deltaBetween('beforeReplyStream', 'afterReplyStream') ??
    params.perf.deltaBetween('beforeReplyLlm', 'afterReplyLlm') ??
    0

  const moderationAssistantMs =
    params.perf.deltaBetween('afterReplyStream', 'afterAssistantMod') ??
    params.perf.deltaBetween('afterReplyLlm', 'afterAssistantMod') ??
    null

  const persistMs =
    params.perf.deltaBetween('afterAssistantMod', 'afterAssistantPersist') ??
    params.perf.deltaBetween('afterReplyStream', 'afterAssistantPersist') ??
    0

  const bottleneckStage = pickBottleneck({
    stateLoadMs,
    llmMs,
    moderationAssistantMs: moderationAssistantMs ?? 0,
    persistMs,
  })

  const budgets = getLiveSpeechPerformanceBudgets()
  const budgetRows = checkBudgetsAgainstServerTrace(budgets, { llmMs, totalMs })
  const budgetsExceeded = budgetRows.filter((r) => r.exceeded).map((r) => r.key)

  if (totalMs > LIVE_TURN_WARN_TOTAL_MS) {
    const payload = {
      msg: 'WARNING: LIVE TURN OVER BUDGET',
      totalMs,
      bottleneckStage,
      sessionId: params.threadId,
      turnId: params.userMessageId,
    }
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify(payload))
  }

  return {
    sessionId: params.threadId,
    turnId: params.userMessageId,
    transcriptPartialMs: null,
    transcriptFinalMs: null,
    normalizationMs: Math.round(params.normalizationMs),
    stateLoadMs: Math.round(stateLoadMs),
    llmMs: Math.round(llmMs),
    assistantTextVisibleMs: null,
    moderationAssistantMs:
      moderationAssistantMs != null ? Math.round(moderationAssistantMs) : null,
    ttsMs: null,
    playbackStartMs: null,
    totalMs: Math.round(totalMs),
    bottleneckStage,
    fastPath: true,
    modelUsed: params.modelLabel,
    estimatedInputTokens: roughTokenEstimate(params.replyPromptCharsEstimate),
    estimatedOutputTokens: roughTokenEstimate(params.assistantReplyChars),
    ...(budgetsExceeded.length ? { budgetsExceeded } : {}),
  }
}
