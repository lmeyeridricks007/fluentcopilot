import { describe, expect, it } from 'vitest'
import {
  checkBudgetsAgainstServerTrace,
  getLiveSpeechPerformanceBudgets,
} from '../../config/liveSpeechPerformanceBudgets'

describe('liveSpeechPerformanceBudgets', () => {
  it('returns sane defaults', () => {
    const b = getLiveSpeechPerformanceBudgets()
    expect(b.liveTranscriptBudgetMs).toBeGreaterThan(0)
    expect(b.liveLlmBudgetMs).toBeGreaterThan(0)
    expect(b.liveTotalBudgetMs).toBeGreaterThan(0)
  })

  it('flags LLM over budget', () => {
    const b = getLiveSpeechPerformanceBudgets()
    const rows = checkBudgetsAgainstServerTrace(b, {
      llmMs: b.liveLlmBudgetMs + 1,
      totalMs: b.liveTotalBudgetMs,
    })
    expect(rows.find((r) => r.key === 'liveLlmBudgetMs')?.exceeded).toBe(true)
  })
})
