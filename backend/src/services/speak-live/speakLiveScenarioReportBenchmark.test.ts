import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildDeterministicLiveEvalLlmResult } from './liveSessionEvaluationLlm'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'
import { buildPostSessionSpeechEmergencyResult } from './speakLivePostSessionSpeechAssessment'

const speechMock = vi.fn()
const evaluatorMock = vi.fn()

vi.mock('./speakLiveAssessUserTurnsSpeechBatch', () => ({
  assessUserTurnsSpeechBatch: (...args: unknown[]) => speechMock(...args),
  buildEmergencyUserTurnsSpeechBatchResult: vi.fn(),
}))

vi.mock('./speakLiveScenarioDialogueStructuredEvaluator', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('./speakLiveScenarioDialogueStructuredEvaluator')>()
  return {
    ...actual,
    evaluateScenarioDialogueStructured: (...args: unknown[]) => evaluatorMock(...args),
  }
})

vi.mock('./speakLiveTtsGateway', () => ({
  generateSpeakLiveReferenceSpeechForReport: vi.fn(async () => ({
    mimeType: 'audio/mpeg',
    audioBase64: Buffer.alloc(180).toString('base64'),
    audioUrl: 'data:audio/mpeg;base64,AAAA',
    provider: 'openai' as const,
    cached: true,
    wordBoundaries: [],
  })),
}))

vi.mock('../storage/blobStorageService', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../storage/blobStorageService')>()
  return {
    ...mod,
    tryUploadConversationBinaryArtifact: vi.fn().mockResolvedValue('evaluation-reference/benchmark-ref.mp3'),
    uploadConversationBinaryArtifactRequired: vi.fn().mockResolvedValue('evaluation-reference/benchmark-ref.mp3'),
  }
})

import { runSpeakLivePostSessionEvaluationPipeline } from './speakLivePostSessionEvaluationPipeline'
import {
  BENCHMARK_LEARNER_LEVEL,
  BENCHMARK_THREAD_ID,
  BENCHMARK_USER_MESSAGE_IDS,
  buildBenchmarkMessages,
  buildBenchmarkScenarioConfig,
  buildBenchmarkStructuredDialogueStub,
} from './fixtures/fluentCopilotScenarioReportBenchmark.fixture'

const AZURE_LANE_MS = 52
const STRUCTURED_LLM_MS = 54

describe('FluentCopilot scenario report benchmark (mocked providers, CI)', () => {
  const prevEnv: Record<string, string | undefined> = {}

  beforeAll(() => {
    const keys = [
      'SPEAK_LIVE_PARALLEL_SCENARIO_REPORT',
      'REPORT_ENABLE_RECOMMENDATION_VERIFY',
      'REPORT_ENABLE_EXPENSIVE_AUDIT',
      'REPORT_ENABLE_TURN_ENRICHMENT_LEGACY',
      'REPORT_EVAL_PARALLEL_TURNS',
      'OPENAI_API_KEY',
      'AZURE_STORAGE_CONNECTION_STRING',
      'AI_PROVIDER',
    ] as const
    for (const k of keys) {
      prevEnv[k] = process.env[k]
    }
    process.env.SPEAK_LIVE_PARALLEL_SCENARIO_REPORT = '1'
    process.env.REPORT_ENABLE_RECOMMENDATION_VERIFY = 'false'
    process.env.REPORT_ENABLE_EXPENSIVE_AUDIT = 'false'
    process.env.REPORT_ENABLE_TURN_ENRICHMENT_LEGACY = 'false'
    /**
     * Pin the legacy single-call FAST path: this benchmark mocks
     * `evaluateScenarioDialogueStructured`. Parallel-fan-out has its own dedicated benchmark.
     */
    process.env.REPORT_EVAL_PARALLEL_TURNS = 'false'
    process.env.OPENAI_API_KEY = 'sk-ci-benchmark-placeholder'
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true'
    process.env.AI_PROVIDER = 'openai'
  })

  afterAll(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    speechMock.mockImplementation(async (input: { threadId: string; scenarioGoals: string[]; userTurns: PostSessionSpeechTurnInput[] }) => {
      await new Promise((r) => setTimeout(r, AZURE_LANE_MS))
      const turnResults = input.userTurns.map((turn) =>
        buildPostSessionSpeechEmergencyResult({
          threadId: input.threadId,
          scenarioGoals: input.scenarioGoals,
          turn,
          reason: 'benchmark: mocked Azure pronunciation lane',
        }),
      )
      return {
        turnResults,
        perTurnMetrics: turnResults.map((r, i) => ({
          turnId: r.llmFact.turnId,
          assessmentOk: true,
          pronunciationScore: 68 + i,
          fluencyScore: 70,
          prosodyScore: null,
          completenessScore: 72,
          pacingScore: 70,
          speakingRate: 118,
          hesitationCount: 0,
          weakWords: [],
          wordLevelScores: [],
          phonemeIssues: [],
        })),
        batch: {
          azureBatchMs: AZURE_LANE_MS,
          assessedTurnCount: turnResults.length,
          skippedTurnCount: 0,
          failedTurnCount: 0,
          concurrencyLimit: 4,
        },
      }
    })

    evaluatorMock.mockImplementation(
      (
        params: {
          userTurnInputs: import('./liveSessionEvaluationLlm').LiveEvalLlmTurnInput[]
        },
        opts?: {
          onDiagnostics?: (d: Record<string, unknown>) => void
        },
      ) =>
        new Promise((resolve) => {
          setTimeout(() => {
            const previewTurns = params.userTurnInputs
            const det = buildDeterministicLiveEvalLlmResult({
              scenarioTitle: 'Train station',
              scenarioGoals: buildBenchmarkScenarioConfig().goals,
              learnerLevel: BENCHMARK_LEARNER_LEVEL,
              turns: previewTurns,
              reason: 'benchmark structured lane',
              fallbackCode: 'mock_provider',
            })
            opts?.onDiagnostics?.({
              promptCharCount: 2400,
              approximateInputTokens: 600,
              approximateOutputTokens: 400,
              structuredLlmMs: STRUCTURED_LLM_MS,
              modelName: 'gpt-4o-mini',
              validationMs: 3,
              validationErrors: [],
              repairAttempted: false,
              chatMs: STRUCTURED_LLM_MS,
              repairMs: 0,
            })
            resolve({
              ok: true,
              data: det.data,
              structured: buildBenchmarkStructuredDialogueStub(),
              raw: '{}',
              diagnostics: {
                promptCharCount: 2400,
                approximateInputTokens: 600,
                approximateOutputTokens: 400,
                structuredLlmMs: STRUCTURED_LLM_MS,
                modelName: 'gpt-4o-mini',
                validationMs: 3,
                validationErrors: [],
              },
              repairAttempted: false,
              chatMs: STRUCTURED_LLM_MS,
              repairMs: 0,
            })
          }, STRUCTURED_LLM_MS)
        }),
    )
  })

  it(
    'runs optimized parallel orchestration, prints JSON metrics, and passes quality smoke checks',
    async () => {
    const messages = buildBenchmarkMessages()
    const userTurnCount = messages.filter((m) => m.sender === 'user').length
    expect(userTurnCount).toBe(3)
    expect(BENCHMARK_USER_MESSAGE_IDS.length).toBe(userTurnCount)

    const wallStarted = Date.now()
    const evaluation = await runSpeakLivePostSessionEvaluationPipeline({
      threadId: BENCHMARK_THREAD_ID,
      scenario: buildBenchmarkScenarioConfig(),
      learnerLevel: BENCHMARK_LEARNER_LEVEL,
      messages,
      summaryText: null,
      speakLiveStateJson: null,
    })
    const wallMs = Date.now() - wallStarted

    const parallel = evaluation.generationDiagnostics?.parallelOrchestrationV1
    expect(parallel).toBeDefined()
    expect(evaluation.generationDiagnostics?.orchestrator).toBeDefined()
    expect(evaluation.generationDiagnostics!.orchestrator!.totalMs).toBeGreaterThan(0)
    expect(parallel!.orchestrationMode).toBe('parallel')
    expect(parallel!.structuredLlmMs).toBeGreaterThan(0)
    expect(parallel!.azureBatchMs).toBeGreaterThan(0)
    expect(typeof parallel!.reportAssemblyMs).toBe('number')
    expect(parallel!.parallelWaitMs).toBeLessThan(AZURE_LANE_MS + STRUCTURED_LLM_MS - 25)
    expect(parallel!.parallelWaitMs).toBeLessThanOrEqual(
      Math.max(parallel!.azureBatchMs, parallel!.structuredLlmMs) + 25,
    )

    const metrics = {
      totalMs: evaluation.generationDiagnostics?.totalMs ?? wallMs,
      structuredLlmMs: parallel!.structuredLlmMs,
      azureBatchMs: parallel!.azureBatchMs,
      referenceTtsMs: parallel!.referenceTtsMs,
      reportAssemblyMs: parallel!.reportAssemblyMs ?? 0,
      persistMs: 0,
      warnings: parallel!.warnings ?? [],
      fallbackUsed: parallel!.fallbackUsed,
      cacheHits: parallel!.referenceTtsCacheHits ?? 0,
      modelName: parallel!.modelName,
      approximateInputTokens: parallel!.approximateInputTokens,
      approximateOutputTokens: parallel!.approximateOutputTokens,
      tokenEstimateTotal:
        (parallel!.approximateInputTokens ?? 0) + (parallel!.approximateOutputTokens ?? 0),
    }

    if (process.env.BENCHMARK_SCENARIO_REPORT_JSON === '1') {
      console.log(JSON.stringify(metrics))
    }

    expect(evaluation.keyTakeaway?.message?.trim().length ?? 0).toBeGreaterThan(0)
    expect(evaluation.turnEvaluations?.length ?? 0).toBe(userTurnCount)
    expect(evaluation.taskOutcome).toBeTruthy()
    expect(evaluation.overallSummary?.coachSummary?.trim().length ?? 0).toBeGreaterThan(0)
    expect(evaluation.overall?.overallScore).toBeGreaterThanOrEqual(0)
    expect(evaluation.overall?.overallScore).toBeLessThanOrEqual(100)

    const reco =
      (evaluation.recommendedActions?.length ?? 0) +
      (evaluation.recommendedFollowUps?.length ?? 0) +
      (evaluation.overallSummary?.whatToTryNext?.length ?? 0)
    expect(reco).toBeGreaterThan(0)

    for (const te of evaluation.turnEvaluations) {
      expect(te.learnerTranscript.trim().length).toBeGreaterThan(3)
      expect(typeof te.combinedScores?.overallTurnScore).toBe('number')
      expect(te.combinedScores!.overallTurnScore).toBeGreaterThanOrEqual(0)
      expect(te.combinedScores!.overallTurnScore).toBeLessThanOrEqual(100)
    }

    expect(evaluation.generationDiagnostics?.orchestrator?.legacyLlmCallsCount).toBe(0)
    expect(evaluation.generationDiagnostics?.orchestrator?.enrichTurnsMs).toBe(0)
    expect(evaluation.generationDiagnostics?.orchestrator?.recommendationVerifyMs).toBe(0)
    expect(evaluation.generationDiagnostics?.orchestrator?.reportAuditMs).toBe(0)
  },
  60_000,
  )
})
