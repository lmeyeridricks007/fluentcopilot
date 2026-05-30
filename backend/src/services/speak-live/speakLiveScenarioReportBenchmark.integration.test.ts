/**
 * Optional end-to-end benchmark against real OpenAI / Azure when you opt in.
 *
 * Run (from repo root):
 *   BENCHMARK_REAL_PROVIDERS=1 OPENAI_API_KEY=... npx vitest run backend/src/services/speak-live/speakLiveScenarioReportBenchmark.integration.test.ts
 *
 * Expects Azure Speech + blob storage to be configured like a normal local Functions run;
 * CI should not set `BENCHMARK_REAL_PROVIDERS`.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSpeakLivePostSessionEvaluationPipeline } from './speakLivePostSessionEvaluationPipeline'
import {
  BENCHMARK_LEARNER_LEVEL,
  BENCHMARK_THREAD_ID,
  buildBenchmarkMessages,
  buildBenchmarkScenarioConfig,
} from './fixtures/fluentCopilotScenarioReportBenchmark.fixture'

const runLive =
  process.env.BENCHMARK_REAL_PROVIDERS === '1' && Boolean(process.env.OPENAI_API_KEY?.trim())

describe.skipIf(!runLive)('FluentCopilot scenario report benchmark (real providers, opt-in)', () => {
  const prev: Record<string, string | undefined> = {}

  beforeAll(() => {
    for (const k of [
      'SPEAK_LIVE_PARALLEL_SCENARIO_REPORT',
      'REPORT_ENABLE_RECOMMENDATION_VERIFY',
      'REPORT_ENABLE_EXPENSIVE_AUDIT',
      'REPORT_ENABLE_TURN_ENRICHMENT_LEGACY',
    ] as const) {
      prev[k] = process.env[k]
    }
    process.env.SPEAK_LIVE_PARALLEL_SCENARIO_REPORT = '1'
    process.env.REPORT_ENABLE_RECOMMENDATION_VERIFY = 'false'
    process.env.REPORT_ENABLE_EXPENSIVE_AUDIT = 'false'
    process.env.REPORT_ENABLE_TURN_ENRICHMENT_LEGACY = 'false'
  })

  afterAll(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it(
    'builds a full evaluation with parallel orchestration diagnostics',
    async () => {
      const messages = buildBenchmarkMessages()
      const userTurnCount = messages.filter((m) => m.sender === 'user').length
      const evaluation = await runSpeakLivePostSessionEvaluationPipeline({
        threadId: `${BENCHMARK_THREAD_ID}-live`,
        scenario: buildBenchmarkScenarioConfig(),
        learnerLevel: BENCHMARK_LEARNER_LEVEL,
        messages,
        summaryText: null,
        speakLiveStateJson: null,
      })

      const parallel = evaluation.generationDiagnostics?.parallelOrchestrationV1
      expect(parallel?.orchestrationMode).toBe('parallel')
      expect(evaluation.turnEvaluations).toHaveLength(userTurnCount)

      const metrics = {
        totalMs: evaluation.generationDiagnostics?.totalMs,
        structuredLlmMs: parallel?.structuredLlmMs,
        azureBatchMs: parallel?.azureBatchMs,
        referenceTtsMs: parallel?.referenceTtsMs,
        reportAssemblyMs: parallel?.reportAssemblyMs ?? 0,
        persistMs: 0,
        warnings: parallel?.warnings ?? [],
        fallbackUsed: parallel?.fallbackUsed,
        cacheHits: parallel?.referenceTtsCacheHits ?? 0,
        modelName: parallel?.modelName,
        approximateInputTokens: parallel?.approximateInputTokens,
        approximateOutputTokens: parallel?.approximateOutputTokens,
        tokenEstimateTotal:
          (parallel?.approximateInputTokens ?? 0) + (parallel?.approximateOutputTokens ?? 0),
      }
      if (process.env.BENCHMARK_SCENARIO_REPORT_JSON === '1') {
        console.log(JSON.stringify(metrics))
      }
    },
    120_000,
  )
})
