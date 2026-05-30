/**
 * Config-driven latency budgets for Speak Live (diagnostics + dev overlay).
 * @see docs/live-speech-performance-budgets.md
 */

function parseMs(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt((raw ?? '').trim(), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export type LiveSpeechPerformanceBudgets = {
  liveTranscriptBudgetMs: number
  liveLlmBudgetMs: number
  liveTtsBudgetMs: number
  liveTotalBudgetMs: number
}

export function getLiveSpeechPerformanceBudgets(): LiveSpeechPerformanceBudgets {
  return {
    liveTranscriptBudgetMs: parseMs(process.env.LIVE_TRANSCRIPT_BUDGET_MS, 1500, 400, 8000),
    liveLlmBudgetMs: parseMs(process.env.LIVE_LLM_BUDGET_MS, 2500, 800, 20000),
    liveTtsBudgetMs: parseMs(process.env.LIVE_TTS_BUDGET_MS, 1500, 400, 12000),
    liveTotalBudgetMs: parseMs(process.env.LIVE_TOTAL_BUDGET_MS, 5000, 2000, 60000),
  }
}

/** Hard warning threshold (spec): log when a server-side turn exceeds this many ms. */
export const LIVE_TURN_WARN_TOTAL_MS = 5000

export type BudgetCheckResult = { key: keyof LiveSpeechPerformanceBudgets; exceeded: boolean; valueMs: number }

/** Server turn: only LLM + total (transcript/TTS are measured client-side). */
export function checkBudgetsAgainstServerTrace(
  budgets: LiveSpeechPerformanceBudgets,
  parts: { llmMs: number; totalMs: number }
): BudgetCheckResult[] {
  return [
    { key: 'liveLlmBudgetMs', exceeded: parts.llmMs > budgets.liveLlmBudgetMs, valueMs: parts.llmMs },
    {
      key: 'liveTotalBudgetMs',
      exceeded: parts.totalMs > budgets.liveTotalBudgetMs,
      valueMs: parts.totalMs,
    },
  ]
}
