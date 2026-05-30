import { afterAll, beforeAll, describe, expect, it, vi, beforeEach } from 'vitest'
import { buildDeterministicLiveEvalLlmResult } from './liveSessionEvaluationLlm'

/**
 * These tests target the **legacy single-call** FAST path (mocking `evaluateScenarioDialogueStructured`).
 * Force `REPORT_EVAL_PARALLEL_TURNS=false` so the orchestrator does not silently swap to the new
 * parallel-fan-out path (which has its own dedicated test file).
 */
const PRIOR_PARALLEL_FLAG = process.env.REPORT_EVAL_PARALLEL_TURNS
beforeAll(() => {
  process.env.REPORT_EVAL_PARALLEL_TURNS = 'false'
})
afterAll(() => {
  if (PRIOR_PARALLEL_FLAG === undefined) delete process.env.REPORT_EVAL_PARALLEL_TURNS
  else process.env.REPORT_EVAL_PARALLEL_TURNS = PRIOR_PARALLEL_FLAG
})

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

import { buildScenarioVoiceReportOptimized } from './speakLiveScenarioVoiceReportOptimized'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'
import type { TurnEvaluation } from './liveVoiceEvaluationTypes'
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'

describe('buildScenarioVoiceReportOptimized', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs Azure speech assessment and structured dialogue eval concurrently (wall time ~ max, not sum)', async () => {
    const delay = 55
    speechMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
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
                    totalMs: delay,
                    blobDownloadMs: 0,
                    audioAssessmentMs: delay,
                    timingAnalysisMs: 0,
                    blobBytes: 100,
                    hadAudio: true,
                    assessmentOk: true,
                    assessmentSource: 'live',
                    providerRequestMs: delay,
                  },
                },
              ],
              perTurnMetrics: [
                {
                  turnId: 't1',
                  assessmentOk: true,
                  pronunciationScore: 70,
                  fluencyScore: 70,
                  prosodyScore: null,
                  completenessScore: 70,
                  pacingScore: 70,
                  speakingRate: 120,
                  hesitationCount: 0,
                  weakWords: [],
                  wordLevelScores: [],
                  phonemeIssues: [],
                },
              ],
              batch: {
                azureBatchMs: delay,
                assessedTurnCount: 1,
                skippedTurnCount: 0,
                failedTurnCount: 0,
                concurrencyLimit: 4,
                azureMode: 'live',
                providerRequestMs: delay,
              },
            })
          }, delay)
        }),
    )
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
    const structuredStub = {
      overall: {
        summary: 'Kort.',
        scenarioOutcomeScore: 60,
        taskCompletionScore: 60,
        languageScore: 60,
        conversationFlowScore: 60,
        grammarScore: 60,
        vocabularyScore: 60,
        naturalnessScore: 60,
        estimatedLevel: 'A2' as const,
        confidence: 70,
        primaryFocus: { title: 'x', why: 'y', pattern: 'z', example: 'e' },
      },
      goals: [],
      turns: [],
      recommendations: {
        nextDrillTitle: 'Drill',
        nextDrillReason: 'Because',
        suggestedScenarioId: null,
        suggestedPracticeType: 'coach' as const,
      },
    } as ScenarioDialogueStructuredOutput

    evaluatorMock.mockImplementation(
      (
        _params: unknown,
        opts?: {
          onDiagnostics?: (d: Record<string, unknown>) => void
          onOpenAiDiagnostics?: (d: Record<string, unknown>) => void
        },
      ) =>
        new Promise((resolve) => {
          setTimeout(() => {
            opts?.onDiagnostics?.({
              promptCharCount: 800,
              approximateInputTokens: 200,
              approximateOutputTokens: 120,
              structuredLlmMs: delay,
              modelName: 'gpt-4o-mini',
              validationMs: 2,
              validationErrors: [],
              repairAttempted: false,
              chatMs: delay,
              repairMs: 0,
            })
            opts?.onOpenAiDiagnostics?.({
              schemaName: 'fast',
              schemaSizeChars: 540,
              modelName: 'gpt-4o-mini',
              requestStartedAt: new Date().toISOString(),
              requestCompletedAt: new Date().toISOString(),
              requestBuildMs: 1,
              providerNetworkMs: delay,
              responseReadMs: 0,
              jsonParseMs: 1,
              schemaValidationMs: 1,
              repairAttempted: false,
              repairMs: 0,
              retryCount: 0,
              promptCharCount: 800,
              responseCharCount: 100,
              approximateInputTokens: 200,
              approximateOutputTokens: 120,
            })
            resolve({
              ok: true,
              data: det.data,
              structured: structuredStub,
              raw: '{}',
              diagnostics: {
                promptCharCount: 800,
                approximateInputTokens: 200,
                approximateOutputTokens: 120,
                structuredLlmMs: delay,
                modelName: 'gpt-4o-mini',
                validationMs: 2,
                validationErrors: [],
              },
              openaiDiagnostics: {
                schemaName: 'fast',
                schemaSizeChars: 540,
                modelName: 'gpt-4o-mini',
                requestStartedAt: new Date().toISOString(),
                requestCompletedAt: new Date().toISOString(),
                requestBuildMs: 1,
                providerNetworkMs: delay,
                responseReadMs: 0,
                jsonParseMs: 1,
                schemaValidationMs: 1,
                repairAttempted: false,
                repairMs: 0,
                retryCount: 0,
                promptCharCount: 800,
                responseCharCount: 100,
                approximateInputTokens: 200,
                approximateOutputTokens: 120,
              },
              repairAttempted: false,
              chatMs: delay,
              repairMs: 0,
              schemaName: 'fast',
            })
          }, delay)
        }),
    )

    const wallStarted = Date.now()
    const out = await buildScenarioVoiceReportOptimized({
      threadId: 'th-1',
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
            threadId: 'th-1',
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
    const wall = Date.now() - wallStarted
    expect(speechMock).toHaveBeenCalledTimes(1)
    expect(evaluatorMock).toHaveBeenCalledTimes(1)
    expect(out.llmResult.source).toBe('llm')
    expect(out.parallelOrchestrationV1.orchestrationMode).toBe('parallel')
    expect(out.parallelOrchestrationV1.llmValidationMs).toBe(2)
    expect(out.parallelOrchestrationV1.evaluationSchemaName).toBe('fast')
    expect(out.parallelOrchestrationV1.azureSpeechBatch?.azureMode).toBe('live')
    expect(out.parallelOrchestrationV1.openaiDiagnostics?.schemaName).toBe('fast')
    expect(out.parallelOrchestrationV1.openaiDiagnostics?.providerNetworkMs).toBeGreaterThan(0)
    expect(wall).toBeLessThan(delay * 2 - 20)
  })

  it('passes mode: "fast" with attemptJsonRepair: false to the evaluator (no extra repair LLM call in sync path)', async () => {
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
    let capturedOpts: { mode?: string; attemptJsonRepair?: boolean } | undefined
    evaluatorMock.mockImplementation((_p: unknown, opts: { mode?: string; attemptJsonRepair?: boolean }) => {
      capturedOpts = opts
      return Promise.resolve({
        ok: true,
        data: det.data,
        structured: stub,
        raw: '{}',
        diagnostics: {
          promptCharCount: 0,
          approximateInputTokens: 0,
          approximateOutputTokens: 0,
          structuredLlmMs: 0,
          modelName: 'm',
          validationMs: 0,
          validationErrors: [],
        },
        openaiDiagnostics: {
          schemaName: 'fast',
          schemaSizeChars: 540,
          modelName: 'm',
          requestStartedAt: new Date().toISOString(),
          requestCompletedAt: new Date().toISOString(),
          requestBuildMs: 0,
          providerNetworkMs: 1,
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
        chatMs: 1,
        repairMs: 0,
        schemaName: 'fast',
      })
    })
    await buildScenarioVoiceReportOptimized({
      threadId: 'th-2',
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
    expect(capturedOpts?.mode).toBe('fast')
    expect(capturedOpts?.attemptJsonRepair).toBe(false)
  })

  it('does NOT warn about exceeding the fast token budget when the dynamic budget allows it', async () => {
    /** Repro of the misleading prod warning: 1631 actual output > 1100 static default but still under
     *  the 1990 dynamic budget for a 7-turn session. The new comparison must use the dynamic budget. */
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
    const oa1 = {
      schemaName: 'fast' as const,
      schemaSizeChars: 540,
      modelName: 'gpt-4o-mini',
      requestStartedAt: new Date().toISOString(),
      requestCompletedAt: new Date().toISOString(),
      requestBuildMs: 0,
      providerNetworkMs: 1,
      responseReadMs: 0,
      jsonParseMs: 0,
      schemaValidationMs: 0,
      repairAttempted: false,
      repairMs: 0,
      retryCount: 0,
      promptCharCount: 0,
      responseCharCount: 0,
      actualOutputTokens: 1631,
      maxOutputTokensRequested: 1990,
    }
    evaluatorMock.mockImplementation(
      (
        _p: unknown,
        opts?: { onOpenAiDiagnostics?: (d: Record<string, unknown>) => void },
      ) => {
        opts?.onOpenAiDiagnostics?.(oa1)
        return Promise.resolve({
          ok: true,
          data: det.data,
          structured: stub,
          raw: '{}',
          diagnostics: {
            promptCharCount: 0,
            approximateInputTokens: 0,
            approximateOutputTokens: 0,
            structuredLlmMs: 1,
            modelName: 'gpt-4o-mini',
            validationMs: 0,
            validationErrors: [],
          },
          openaiDiagnostics: oa1,
          repairAttempted: false,
          chatMs: 1,
          repairMs: 0,
          schemaName: 'fast',
        })
      },
    )
    const out = await buildScenarioVoiceReportOptimized({
      threadId: 'th-3',
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
    /** The warning should NOT appear: 1631 ≤ 1990 (dynamic). */
    const warns = out.parallelOrchestrationV1.warnings
    expect(warns.some((w) => w.includes('Fast schema output exceeded'))).toBe(false)
  })

  it('DOES warn when actualOutputTokens > maxOutputTokensRequested (real budget overrun)', async () => {
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
    const oa2 = {
      schemaName: 'fast' as const,
      schemaSizeChars: 540,
      modelName: 'gpt-4o-mini',
      requestStartedAt: new Date().toISOString(),
      requestCompletedAt: new Date().toISOString(),
      requestBuildMs: 0,
      providerNetworkMs: 1,
      responseReadMs: 0,
      jsonParseMs: 0,
      schemaValidationMs: 0,
      repairAttempted: false,
      repairMs: 0,
      retryCount: 0,
      promptCharCount: 0,
      responseCharCount: 0,
      actualOutputTokens: 2200,
      maxOutputTokensRequested: 1500,
    }
    evaluatorMock.mockImplementation(
      (
        _p: unknown,
        opts?: { onOpenAiDiagnostics?: (d: Record<string, unknown>) => void },
      ) => {
        opts?.onOpenAiDiagnostics?.(oa2)
        return Promise.resolve({
          ok: true,
          data: det.data,
          structured: stub,
          raw: '{}',
          diagnostics: {
            promptCharCount: 0,
            approximateInputTokens: 0,
            approximateOutputTokens: 0,
            structuredLlmMs: 1,
            modelName: 'gpt-4o-mini',
            validationMs: 0,
            validationErrors: [],
          },
          openaiDiagnostics: oa2,
          repairAttempted: false,
          chatMs: 1,
          repairMs: 0,
          schemaName: 'fast',
        })
      },
    )
    const out = await buildScenarioVoiceReportOptimized({
      threadId: 'th-4',
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
    expect(out.parallelOrchestrationV1.warnings.some((w) => /Fast schema output exceeded.+2200 > 1500/.test(w))).toBe(true)
  })
})
