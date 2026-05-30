/**
 * Integration test: the optimized FAST orchestrator MUST use the parallel-fan-out evaluator by
 * default. Mocks `evaluateScenarioDialogueParallel` (NOT the legacy single-call evaluator) and
 * verifies the orchestrator routes there + surfaces parallel-specific diagnostics.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildDeterministicLiveEvalLlmResult } from './liveSessionEvaluationLlm'

const speechMock = vi.fn()
const parallelEvaluatorMock = vi.fn()

vi.mock('./speakLiveAssessUserTurnsSpeechBatch', () => ({
  assessUserTurnsSpeechBatch: (...args: unknown[]) => speechMock(...args),
  buildEmergencyUserTurnsSpeechBatchResult: vi.fn(),
}))

vi.mock('./speakLiveScenarioDialogueParallelEvaluator', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('./speakLiveScenarioDialogueParallelEvaluator')
  >()
  return {
    ...actual,
    evaluateScenarioDialogueParallel: (...args: unknown[]) => parallelEvaluatorMock(...args),
  }
})

import { buildScenarioVoiceReportOptimized } from './speakLiveScenarioVoiceReportOptimized'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'
import type { TurnEvaluation } from './liveVoiceEvaluationTypes'
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'

/** Force the parallel path on (it's already the default; pin it here for hermetic tests). */
const PRIOR_FLAG = process.env.REPORT_EVAL_PARALLEL_TURNS
beforeAll(() => {
  process.env.REPORT_EVAL_PARALLEL_TURNS = 'true'
})
afterAll(() => {
  if (PRIOR_FLAG === undefined) delete process.env.REPORT_EVAL_PARALLEL_TURNS
  else process.env.REPORT_EVAL_PARALLEL_TURNS = PRIOR_FLAG
})

describe('buildScenarioVoiceReportOptimized — parallel default path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes to evaluateScenarioDialogueParallel by default and surfaces parallelEvaluation diagnostics', async () => {
    speechMock.mockResolvedValue({
      turnResults: [
        {
          llmFact: {
            turnId: 't1',
            turnIndex: 0,
            learnerTranscript: 'Hoi',
            learnerTranscriptNormalized: 'Hoi',
            assistantReply: 'Hey',
            hasLearnerAudio: true,
            sessionGoals: ['g'],
            azureSummary: 'az',
          },
          turnEval: { turnId: 't1', turnIndex: 0 } as TurnEvaluation,
          weakWordList: [],
          audioCtx: null,
          turnTiming: {
            turnId: 't1',
            turnIndex: 0,
            totalMs: 50,
            blobDownloadMs: 0,
            audioAssessmentMs: 50,
            timingAnalysisMs: 0,
            blobBytes: 100,
            hadAudio: true,
            assessmentOk: true,
            assessmentSource: 'live',
            providerRequestMs: 50,
          },
        },
      ],
      perTurnMetrics: [
        {
          turnId: 't1',
          assessmentOk: true,
          pronunciationScore: 80,
          fluencyScore: 80,
          prosodyScore: null,
          completenessScore: 90,
          pacingScore: 80,
          speakingRate: 130,
          hesitationCount: 0,
          weakWords: [],
          wordLevelScores: [],
          phonemeIssues: [],
        },
      ],
      batch: {
        azureBatchMs: 50,
        assessedTurnCount: 1,
        skippedTurnCount: 0,
        failedTurnCount: 0,
        concurrencyLimit: 4,
        azureMode: 'live',
        providerRequestMs: 50,
      },
    })

    const det = buildDeterministicLiveEvalLlmResult({
      scenarioTitle: 'Cafe',
      scenarioGoals: ['g'],
      learnerLevel: 'A2',
      turns: [
        {
          turnId: 't1',
          turnIndex: 0,
          learnerTranscript: 'Hoi',
          learnerTranscriptNormalized: 'Hoi',
          assistantReply: 'Hey',
          hasLearnerAudio: true,
          sessionGoals: ['g'],
          azureSummary: null,
        },
      ],
      reason: 'test',
      fallbackCode: 'mock_provider',
    })

    const stub: ScenarioDialogueStructuredOutput = {
      overall: {
        summary: 'Korte samenvatting.',
        scenarioOutcomeScore: 70,
        taskCompletionScore: 70,
        languageScore: 70,
        conversationFlowScore: 70,
        grammarScore: 70,
        vocabularyScore: 70,
        naturalnessScore: 70,
        estimatedLevel: 'A2',
        confidence: 75,
        primaryFocus: { title: 'x', why: 'y', pattern: 'z', example: 'e' },
      },
      goals: [],
      turns: [],
      recommendations: {
        nextDrillTitle: 'Drill',
        nextDrillReason: 'Because',
        suggestedScenarioId: null,
        suggestedPracticeType: 'coach',
      },
    }

    parallelEvaluatorMock.mockImplementation(
      (params: {
        onDiagnostics?: (d: Record<string, unknown>) => void
        onOpenAiDiagnostics?: (d: Record<string, unknown>) => void
        onParallelDiagnostics?: (d: Record<string, unknown>) => void
      }) => {
        params.onDiagnostics?.({
          promptCharCount: 800,
          approximateInputTokens: 200,
          approximateOutputTokens: 120,
          structuredLlmMs: 30,
          modelName: 'gpt-4.1-mini',
          validationMs: 1,
          validationErrors: [],
          repairAttempted: false,
          chatMs: 30,
          repairMs: 0,
        })
        params.onOpenAiDiagnostics?.({
          schemaName: 'fast',
          schemaSizeChars: 540,
          modelName: 'gpt-4.1-mini',
          requestStartedAt: new Date().toISOString(),
          requestCompletedAt: new Date().toISOString(),
          requestBuildMs: 1,
          providerNetworkMs: 30, // max of sub-calls
          responseReadMs: 0,
          jsonParseMs: 1,
          schemaValidationMs: 1,
          repairAttempted: false,
          repairMs: 0,
          retryCount: 0,
          promptCharCount: 800,
          responseCharCount: 200,
          approximateInputTokens: 200,
          approximateOutputTokens: 120,
          subcallCount: 2, // 1 overall + 1 per-turn
          subcallProviderNetworkMs: [25, 30],
        })
        params.onParallelDiagnostics?.({
          subcallCount: 2,
          subcallProviderNetworkMs: [25, 30],
          partialTurnFailureCount: 0,
          perTurnFailures: {},
        })
        return Promise.resolve({
          ok: true,
          data: det.data,
          structured: stub,
          raw: '{}',
          diagnostics: {
            promptCharCount: 800,
            approximateInputTokens: 200,
            approximateOutputTokens: 120,
            structuredLlmMs: 30,
            modelName: 'gpt-4.1-mini',
            validationMs: 1,
            validationErrors: [],
          },
          openaiDiagnostics: {
            schemaName: 'fast',
            schemaSizeChars: 540,
            modelName: 'gpt-4.1-mini',
            requestStartedAt: new Date().toISOString(),
            requestCompletedAt: new Date().toISOString(),
            requestBuildMs: 1,
            providerNetworkMs: 30,
            responseReadMs: 0,
            jsonParseMs: 1,
            schemaValidationMs: 1,
            repairAttempted: false,
            repairMs: 0,
            retryCount: 0,
            promptCharCount: 800,
            responseCharCount: 200,
            approximateInputTokens: 200,
            approximateOutputTokens: 120,
            subcallCount: 2,
            subcallProviderNetworkMs: [25, 30],
          },
          repairAttempted: false,
          chatMs: 30,
          repairMs: 0,
          schemaName: 'fast',
        })
      },
    )

    const out = await buildScenarioVoiceReportOptimized({
      threadId: 'th-parallel-1',
      scenarioTitle: 'Cafe',
      scenarioSlug: 'cafe',
      scenarioGoals: ['g'],
      learnerLevel: 'A2',
      recapGoalsCompleted: [],
      recapGoalsMissed: [],
      recapWhatWentWell: [],
      recapWhatToImprove: [],
      userTurns: [
        {
          msg: {
            id: 't1',
            sender: 'user',
            content: 'Hoi',
            createdAt: '2026-05-01T10:00:00.000Z',
            threadId: 'th-parallel-1',
            messageType: 'text',
            metadata: { learnerAudioBlobPath: 'x.webm' },
          } as unknown as PostSessionSpeechTurnInput['msg'],
          assistant: 'Hey',
          index: 0,
        },
      ],
      messages: [{ id: 'a1', sender: 'assistant', content: 'Hey', createdAt: '2026-05-01T10:00:01.000Z' }] as import('../../models/contracts').ConversationMessage[],
      sessionDurationSeconds: 10,
    })

    expect(parallelEvaluatorMock).toHaveBeenCalledTimes(1)
    expect(out.parallelOrchestrationV1.parallelEvaluation?.enabled).toBe(true)
    expect(out.parallelOrchestrationV1.parallelEvaluation?.subcallCount).toBe(2)
    expect(out.parallelOrchestrationV1.parallelEvaluation?.partialTurnFailureCount).toBe(0)
    /** slowestSubcallMs = max([25, 30]) = 30; sum = 55; wallTimeSavedMs = 25. */
    expect(out.parallelOrchestrationV1.parallelEvaluation?.slowestSubcallMs).toBe(30)
    expect(out.parallelOrchestrationV1.parallelEvaluation?.wallTimeSavedMs).toBe(25)
    expect(out.parallelOrchestrationV1.openaiDiagnostics?.subcallCount).toBe(2)
    expect(out.parallelOrchestrationV1.openaiDiagnostics?.subcallProviderNetworkMs).toEqual([25, 30])
  })

  it('warns when partialTurnFailureCount > 0 (some per-turn calls fell back to deterministic stubs)', async () => {
    speechMock.mockResolvedValue({
      turnResults: [],
      perTurnMetrics: [],
      batch: {
        azureBatchMs: 1,
        assessedTurnCount: 0,
        skippedTurnCount: 0,
        failedTurnCount: 0,
        concurrencyLimit: 4,
        azureMode: 'live',
        providerRequestMs: 1,
      },
    })

    const det = buildDeterministicLiveEvalLlmResult({
      scenarioTitle: 'Cafe',
      scenarioGoals: ['g'],
      learnerLevel: 'A2',
      turns: [],
      reason: 'no inputs',
      fallbackCode: 'mock_provider',
    })

    const stub: ScenarioDialogueStructuredOutput = {
      overall: {
        summary: 's',
        scenarioOutcomeScore: 50,
        taskCompletionScore: 50,
        languageScore: 50,
        conversationFlowScore: 50,
        grammarScore: 50,
        vocabularyScore: 50,
        naturalnessScore: 50,
        estimatedLevel: 'A2',
        confidence: 50,
        primaryFocus: { title: '', why: '', pattern: '', example: '' },
      },
      goals: [],
      turns: [],
      recommendations: {
        nextDrillTitle: '',
        nextDrillReason: '',
        suggestedScenarioId: null,
        suggestedPracticeType: 'coach',
      },
    }

    parallelEvaluatorMock.mockImplementation(
      (params: {
        onParallelDiagnostics?: (d: Record<string, unknown>) => void
        onOpenAiDiagnostics?: (d: Record<string, unknown>) => void
        onDiagnostics?: (d: Record<string, unknown>) => void
      }) => {
        params.onDiagnostics?.({
          promptCharCount: 0,
          approximateInputTokens: 0,
          approximateOutputTokens: 0,
          structuredLlmMs: 5,
          modelName: 'gpt-4.1-mini',
          validationMs: 0,
          validationErrors: [],
          repairAttempted: false,
          chatMs: 5,
          repairMs: 0,
        })
        params.onOpenAiDiagnostics?.({
          schemaName: 'fast',
          schemaSizeChars: 540,
          modelName: 'gpt-4.1-mini',
          requestStartedAt: new Date().toISOString(),
          requestCompletedAt: new Date().toISOString(),
          requestBuildMs: 0,
          providerNetworkMs: 5,
          responseReadMs: 0,
          jsonParseMs: 0,
          schemaValidationMs: 0,
          repairAttempted: false,
          repairMs: 0,
          retryCount: 0,
          promptCharCount: 0,
          responseCharCount: 0,
        })
        params.onParallelDiagnostics?.({
          subcallCount: 4,
          subcallProviderNetworkMs: [5, 5, 5, 5],
          partialTurnFailureCount: 2,
          perTurnFailures: { 1: 'simulated', 2: 'simulated' },
        })
        return Promise.resolve({
          ok: true,
          data: det.data,
          structured: stub,
          raw: '{}',
          diagnostics: {
            promptCharCount: 0,
            approximateInputTokens: 0,
            approximateOutputTokens: 0,
            structuredLlmMs: 5,
            modelName: 'gpt-4.1-mini',
            validationMs: 0,
            validationErrors: [],
          },
          openaiDiagnostics: {
            schemaName: 'fast',
            schemaSizeChars: 540,
            modelName: 'gpt-4.1-mini',
            requestStartedAt: new Date().toISOString(),
            requestCompletedAt: new Date().toISOString(),
            requestBuildMs: 0,
            providerNetworkMs: 5,
            responseReadMs: 0,
            jsonParseMs: 0,
            schemaValidationMs: 0,
            repairAttempted: false,
            repairMs: 0,
            retryCount: 0,
            promptCharCount: 0,
            responseCharCount: 0,
          },
          repairAttempted: false,
          chatMs: 5,
          repairMs: 0,
          schemaName: 'fast',
        })
      },
    )

    const out = await buildScenarioVoiceReportOptimized({
      threadId: 'th-parallel-2',
      scenarioTitle: 'Cafe',
      scenarioSlug: 'cafe',
      scenarioGoals: ['g'],
      learnerLevel: 'A2',
      recapGoalsCompleted: [],
      recapGoalsMissed: [],
      recapWhatWentWell: [],
      recapWhatToImprove: [],
      userTurns: [],
      messages: [],
      sessionDurationSeconds: 1,
    })

    expect(out.parallelOrchestrationV1.parallelEvaluation?.partialTurnFailureCount).toBe(2)
    expect(
      out.parallelOrchestrationV1.warnings.some((w) =>
        /\[parallel\] 2 per-turn sub-call\(s\) failed/.test(w),
      ),
    ).toBe(true)
  })
})
