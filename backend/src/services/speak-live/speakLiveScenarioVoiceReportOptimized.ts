/**
 * Optimized FluentCopilot scenario voice report **lane**: overlaps Azure speech assessment with
 * structured scenario-dialogue JSON LLM using preview turn facts (no Azure text summaries in the LLM prompt).
 *
 * @see buildLiveSessionEvaluationRecord — full report assembly stays in the orchestrator.
 */
import {
  getReportEvalFastModelDiagnosticsLabel,
  getReportEvalMaxOutputTokensFast,
  isReportDeepEnrichmentEnabled,
  isReportEvalParallelTurnsEnabled,
  isReportExpensiveAuditEnabled,
  isReportLegacyTurnEnrichmentEnabled,
  isReportRecommendationVerifyEnabled,
} from '../ai/config/aiProviderConfig'
import type { LiveEvalLlmResult } from './liveSessionEvaluationLlm'
import { buildDeterministicLiveEvalLlmResult } from './liveSessionEvaluationLlm'
import type { ConversationMessage } from '../../models/contracts'
import type {
  AzureSpeechTurnSkippedReason,
  SpeakLiveCoachingFallbackCode,
  SpeakLiveOpenAiEvaluationDiagnosticsV1,
  SpeakLiveParallelOrchestrationDiagnosticsV1,
} from './liveVoiceEvaluationTypes'
import { SPEAK_LIVE_AZURE_REQUIRED_MODE } from './liveVoiceEvaluationTypes'
import { getPronunciationRuntimeMode, isAzurePronunciationConfigured } from '../speech/pronunciationAssessmentConfig'
import { buildPostSessionLlmTurnInputsPreview } from './speakLivePostSessionLlmTurnInputsPreview'
import type { PostSessionSpeechTurnInput } from './speakLiveNormalizedConversation'
import {
  buildScenarioDialogueStructuredEvalInputFromMessages,
  evaluateScenarioDialogueStructured,
  estimateApproximateTokensFromChars,
  type ScenarioDialogueStructuredEvalDiagnostics,
} from './speakLiveScenarioDialogueStructuredEvaluator'
import {
  evaluateScenarioDialogueParallel,
  type ParallelEvaluationDiagnostics,
} from './speakLiveScenarioDialogueParallelEvaluator'
import {
  assessUserTurnsSpeechBatch,
  buildEmergencyUserTurnsSpeechBatchResult,
} from './speakLiveAssessUserTurnsSpeechBatch'
import type { PostSessionSpeechTurnResult } from './speakLivePostSessionSpeechAssessment'
import type { ScenarioDialogueStructuredOutput } from './speakLiveScenarioDialogueStructured.schema'

export type BuildScenarioVoiceReportOptimizedInput = {
  threadId: string
  scenarioTitle: string
  scenarioSlug: string
  scenarioGoals: string[]
  learnerLevel: string
  recapGoalsCompleted: string[]
  recapGoalsMissed: string[]
  recapWhatWentWell: string[]
  recapWhatToImprove: string[]
  userTurns: PostSessionSpeechTurnInput[]
  messages: ConversationMessage[]
  sessionDurationSeconds: number
  /** Optional weak-area labels from prior sessions (trimmed in the evaluator prompt). */
  previousWeakAreas?: string[]
}

function buildPerformanceWarnings(
  d: SpeakLiveParallelOrchestrationDiagnosticsV1,
  wallMs: number,
): string[] {
  const w = [...d.warnings]
  if (wallMs > 15_000) w.push('[latency] Total parallel lane wall time exceeded 15s — inspect Speech + OpenAI latency.')
  if (d.structuredLlmMs > 8000) w.push('[latency] structuredLlmMs exceeded 8s — consider a faster structured eval model.')
  if (d.openaiDiagnostics && d.openaiDiagnostics.providerNetworkMs > 12_000) {
    w.push('[latency] openaiDiagnostics.providerNetworkMs exceeded 12s — provider call dominates the report.')
  }
  if (d.openaiDiagnostics && d.openaiDiagnostics.providerNetworkMs > 30_000) {
    /** 30s+ for gpt-4.1-mini at <2k tokens is provider degradation (not our prompt size). */
    w.push(
      `[latency] openaiDiagnostics.providerNetworkMs=${d.openaiDiagnostics.providerNetworkMs}ms — provider deployment likely degraded; consider switching REPORT_EVAL_MODEL_FAST or AZURE_OPENAI_DEPLOYMENT_SPEAK_LIVE_STRUCTURED.`,
    )
  }
  if (d.parallelEvaluation?.enabled && d.parallelEvaluation.partialTurnFailureCount > 0) {
    w.push(
      `[parallel] ${d.parallelEvaluation.partialTurnFailureCount} per-turn sub-call(s) failed and were filled with deterministic stubs — check provider availability.`,
    )
  }
  if (d.evaluationSchemaName === 'deep') {
    w.push('[policy] Deep schema was used in the synchronous report path — deep should be background-only.')
  }
  if (
    d.evaluationSchemaName === 'fast' &&
    d.openaiDiagnostics?.actualOutputTokens != null
  ) {
    /**
     * Compare against the *dynamic* budget actually requested for this call
     * ({@link computeReportEvalMaxOutputTokensFastForTurns}), not the static minimum default —
     * that produced misleading "exceeded budget" warnings for many-turn sessions where the
     * dynamic budget gave plenty of headroom.
     */
    const requested = d.openaiDiagnostics.maxOutputTokensRequested ?? getReportEvalMaxOutputTokensFast()
    if (d.openaiDiagnostics.actualOutputTokens > requested) {
      w.push(
        `[policy] Fast schema output exceeded the configured token budget (${d.openaiDiagnostics.actualOutputTokens} > ${requested}).`,
      )
    }
  }
  if (d.azureBatchMs > 6000) w.push('[latency] azureBatchMs exceeded 6s — check Azure Speech service latency.')
  if (d.referenceTtsMs > 1500) w.push('[latency] referenceTtsMs exceeded 1.5s — TTS or blob persist may be slow.')
  if (d.promptCharCount > 42_000) w.push('Prompt payload is large (>42k chars) — truncation risk on edge sessions.')
  if (d.userTurnCount > 12) w.push('High userTurnCount — session may exceed typical 3–6 turn scenario.')
  if (d.fallbackUsed) w.push('Coaching used deterministic or legacy fallback — review LLM validation logs.')
  if (d.llmRepairAttempted && d.fallbackUsed) w.push('JSON repair was attempted but coaching still fell back.')
  if (d.azureSpeechBatch && d.azureSpeechBatch.azureMode !== SPEAK_LIVE_AZURE_REQUIRED_MODE) {
    w.push(
      `[policy] azureSpeechBatch.azureMode='${d.azureSpeechBatch.azureMode}' but FluentCopilot requires '${SPEAK_LIVE_AZURE_REQUIRED_MODE}'.`,
    )
  }
  const azureLane = getPronunciationRuntimeMode() === 'azure' && isAzurePronunciationConfigured()
  for (const row of d.azurePerTurnTimings) {
    const evidence = row.hadAudio || (row.blobBytes ?? 0) >= 32
    if (evidence && row.skippedReason === 'no_audio') {
      w.push(
        `[azure] Turn ${row.turnIndex}: had audio evidence but skippedReason=no_audio (blobBytes=${row.blobBytes}, hadAudio=${row.hadAudio}).`,
      )
    }
    if (evidence && row.assessmentOk && row.skippedReason === 'no_audio') {
      w.push(`[azure] Turn ${row.turnIndex}: assessmentOk=true conflicts with skippedReason=no_audio.`)
    }
    if (azureLane && evidence && row.skippedReason === 'azure_disabled') {
      w.push(`[azure] Turn ${row.turnIndex}: Azure lane enabled in config but turn marked azure_disabled — check runtime keys.`)
    }
    if (row.assessmentSource && row.assessmentSource !== SPEAK_LIVE_AZURE_REQUIRED_MODE) {
      w.push(
        `[azure] Turn ${row.turnIndex}: assessmentSource='${row.assessmentSource}' but FluentCopilot requires '${SPEAK_LIVE_AZURE_REQUIRED_MODE}'.`,
      )
    }
    if (
      row.assessmentOk &&
      evidence &&
      (!row.providerRequestMs || row.providerRequestMs <= 0) &&
      (!row.audioAssessmentMs || row.audioAssessmentMs <= 0)
    ) {
      w.push(
        `[azure] Turn ${row.turnIndex}: assessmentOk=true but Azure live timings are zero (providerRequestMs=0, audioAssessmentMs=0).`,
      )
    }
  }
  return [...new Set(w)]
}

/**
 * Runs Azure per-turn assessment and transcript coaching LLM **concurrently**, then returns
 * speech lane artifacts + merged LLM coaching envelope + rich diagnostics for persistence.
 */
export async function buildScenarioVoiceReportOptimized(
  input: BuildScenarioVoiceReportOptimizedInput,
): Promise<{
  turnResults: PostSessionSpeechTurnResult[]
  assessTurnsMs: number
  llmResult: LiveEvalLlmResult
  llmMs: number
  parallelOrchestrationV1: SpeakLiveParallelOrchestrationDiagnosticsV1
  /** Azure Speech batch + per-turn metrics (parallel lane). */
  speechBatch: import('./speakLiveAssessUserTurnsSpeechBatch').AssessUserTurnsSpeechBatchResult
  /** Raw structured JSON when the structured evaluator succeeded (for deterministic score merge). */
  structuredDialogue?: ScenarioDialogueStructuredOutput
}> {
  const modelName = getReportEvalFastModelDiagnosticsLabel()
  const previewTurns = buildPostSessionLlmTurnInputsPreview(input.userTurns, input.scenarioGoals)
  const dialogueEval = buildScenarioDialogueStructuredEvalInputFromMessages({
    threadId: input.threadId,
    scenarioTitle: input.scenarioTitle,
    scenarioSlug: input.scenarioSlug,
    scenarioGoals: input.scenarioGoals,
    learnerLevel: input.learnerLevel,
    messages: input.messages,
    recapGoalsCompleted: input.recapGoalsCompleted,
    recapGoalsMissed: input.recapGoalsMissed,
    recapWhatWentWell: input.recapWhatWentWell,
    recapWhatToImprove: input.recapWhatToImprove,
    previousWeakAreas: input.previousWeakAreas,
  })
  const transcriptTurnCount = input.messages.filter((m) => m.sender === 'user' || m.sender === 'assistant').length
  const assistantTurnCount = input.messages.filter((m) => m.sender === 'assistant').length

  const failedSubtasks: SpeakLiveParallelOrchestrationDiagnosticsV1['failedSubtasks'] = []
  const parallelWaitStarted = Date.now()

  let capturedStructuredDialogue: ScenarioDialogueStructuredOutput | undefined

  let llmTelemetry = {
    chatMs: 0,
    repairMs: 0,
    repairAttempted: false,
    validationErrorsCount: 0,
  }
  let scenarioEvalDiag: ScenarioDialogueStructuredEvalDiagnostics | undefined
  let openaiDiagnostics: SpeakLiveOpenAiEvaluationDiagnosticsV1 | undefined
  let parallelEvaluationDiag: ParallelEvaluationDiagnostics | undefined
  const useParallel = isReportEvalParallelTurnsEnabled()

  const azureBatchStartedAt = Date.now()
  const speechP = assessUserTurnsSpeechBatch({
    threadId: input.threadId,
    scenarioGoals: input.scenarioGoals,
    userTurns: input.userTurns,
  }).catch((e) => {
    const reason = e instanceof Error ? e.message : String(e)
    failedSubtasks.push({ task: 'azure_speech_batch', reason })
    return buildEmergencyUserTurnsSpeechBatchResult({
      threadId: input.threadId,
      scenarioGoals: input.scenarioGoals,
      userTurns: input.userTurns,
      batchStarted: azureBatchStartedAt,
      error: e,
    })
  })

  const captureDiagnostics = {
    onDiagnostics: (d: ScenarioDialogueStructuredEvalDiagnostics & { repairAttempted: boolean; chatMs: number; repairMs: number }) => {
      llmTelemetry = {
        chatMs: d.chatMs,
        repairMs: d.repairMs,
        repairAttempted: d.repairAttempted,
        validationErrorsCount: d.validationErrors.length,
      }
      scenarioEvalDiag = {
        promptCharCount: d.promptCharCount,
        approximateInputTokens: d.approximateInputTokens,
        approximateOutputTokens: d.approximateOutputTokens,
        structuredLlmMs: d.structuredLlmMs,
        modelName: d.modelName,
        validationMs: d.validationMs,
        validationErrors: d.validationErrors,
      }
    },
    onOpenAiDiagnostics: (oa: SpeakLiveOpenAiEvaluationDiagnosticsV1) => {
      openaiDiagnostics = oa
    },
  }

  const llmP = (useParallel
    ? evaluateScenarioDialogueParallel({
        dialogue: dialogueEval,
        userTurnInputs: previewTurns,
        scenarioTitle: input.scenarioTitle,
        scenarioGoals: input.scenarioGoals,
        learnerLevel: input.learnerLevel,
        ...captureDiagnostics,
        onParallelDiagnostics: (d) => {
          parallelEvaluationDiag = d
        },
      })
    : evaluateScenarioDialogueStructured(
        {
          dialogue: dialogueEval,
          userTurnInputs: previewTurns,
          scenarioTitle: input.scenarioTitle,
          scenarioGoals: input.scenarioGoals,
          learnerLevel: input.learnerLevel,
        },
        {
          /**
           * FAST schema is the synchronous production default. The DEEP schema is reserved for the
           * optional async enrichment pass and never blocks this lane.
           */
          mode: 'fast',
          /**
           * Skip the JSON repair retry on the fast path so a single primary call dominates wall time.
           * Repair adds another full provider call; the deterministic fallback path is preferred when
           * the fast schema does not validate.
           */
          attemptJsonRepair: false,
          ...captureDiagnostics,
        },
      ))
    .then((r): LiveEvalLlmResult => {
      if (r.ok) {
        capturedStructuredDialogue = r.structured
        return { source: 'llm' as const, data: r.data }
      }
      let fallbackCode: SpeakLiveCoachingFallbackCode = 'validation_error'
      if (r.reason === 'no_api_key') fallbackCode = 'no_api_key'
      else if (r.reason === 'azure_openai_not_configured') fallbackCode = 'no_api_key'
      else if (r.reason === 'mock_provider') fallbackCode = 'mock_provider'
      else if (/parse|parse_error/i.test(r.reason)) fallbackCode = 'parse_error'
      else if (/network|timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(r.reason)) fallbackCode = 'timeout_or_network'
      return buildDeterministicLiveEvalLlmResult({
        scenarioTitle: input.scenarioTitle,
        scenarioGoals: input.scenarioGoals,
        learnerLevel: input.learnerLevel,
        turns: previewTurns,
        reason: `Structured scenario dialogue eval failed: ${r.reason}`.slice(0, 2000),
        fallbackCode,
      })
    })
    .catch((e) => {
      const reason = e instanceof Error ? e.message : String(e)
      failedSubtasks.push({ task: 'scenario_dialogue_structured_eval', reason })
      return buildDeterministicLiveEvalLlmResult({
        scenarioTitle: input.scenarioTitle,
        scenarioGoals: input.scenarioGoals,
        learnerLevel: input.learnerLevel,
        turns: previewTurns,
        reason: `Parallel LLM lane failed: ${reason}`,
        fallbackCode: 'timeout_or_network',
      })
    })

  const settled = await Promise.allSettled([speechP, llmP])
  const parallelWaitMs = Date.now() - parallelWaitStarted

  const speechOutcome = settled[0]
  const llmOutcome = settled[1]

  const speechBundle: import('./speakLiveAssessUserTurnsSpeechBatch').AssessUserTurnsSpeechBatchResult =
    speechOutcome.status === 'fulfilled'
      ? speechOutcome.value
      : buildEmergencyUserTurnsSpeechBatchResult({
          threadId: input.threadId,
          scenarioGoals: input.scenarioGoals,
          userTurns: input.userTurns,
          batchStarted: azureBatchStartedAt,
          error: speechOutcome.reason,
        })
  if (speechOutcome.status === 'rejected') {
    const reason = speechOutcome.reason instanceof Error ? speechOutcome.reason.message : String(speechOutcome.reason)
    failedSubtasks.push({ task: 'azure_speech_batch', reason })
  }

  const { turnResults } = speechBundle
  const assessTurnsMs = speechBundle.batch.azureBatchMs

  const llmResult: LiveEvalLlmResult =
    llmOutcome.status === 'fulfilled'
      ? llmOutcome.value
      : buildDeterministicLiveEvalLlmResult({
          scenarioTitle: input.scenarioTitle,
          scenarioGoals: input.scenarioGoals,
          learnerLevel: input.learnerLevel,
          turns: previewTurns,
          reason: 'Parallel LLM lane rejected.',
          fallbackCode: 'validation_error',
        })

  const structuredLlmMs = scenarioEvalDiag?.structuredLlmMs ?? llmTelemetry.chatMs + llmTelemetry.repairMs
  const fallbackUsed = llmResult.source !== 'llm'

  const promptCharCount = scenarioEvalDiag?.promptCharCount ?? 0
  const approximateInputTokens =
    scenarioEvalDiag?.approximateInputTokens ?? estimateApproximateTokensFromChars(promptCharCount)
  const approximateOutputTokens =
    scenarioEvalDiag?.approximateOutputTokens ??
    estimateApproximateTokensFromChars(llmResult.source === 'llm' ? JSON.stringify(llmResult.data).length : 400)

  const userTurnsWithAudio = turnResults.filter(
    (r) => r.turnTiming.hadAudio || (r.turnTiming.blobBytes ?? 0) > 0,
  ).length

  const skipReasonsByTurn: Record<string, AzureSpeechTurnSkippedReason | 'none'> = {}
  for (const tr of turnResults) {
    skipReasonsByTurn[tr.turnEval.turnId] = tr.turnTiming.skippedReason ?? 'none'
  }

  const azureEnabled = getPronunciationRuntimeMode() === 'azure'
  const azureConfigPresent = isAzurePronunciationConfigured()

  const parallelOrchestrationV1: SpeakLiveParallelOrchestrationDiagnosticsV1 = {
    pipelineVersion: 1,
    orchestrationMode: 'parallel',
    modelName,
    transcriptTurnCount,
    userTurnCount: input.userTurns.length,
    assistantTurnCount,
    promptCharCount,
    approximateInputTokens,
    approximateOutputTokens,
    structuredLlmMs,
    legacyLlmCallsCount: 0,
    expensiveAuditEnabled: isReportExpensiveAuditEnabled(),
    recommendationVerifyEnabled: isReportRecommendationVerifyEnabled(),
    legacyTurnEnrichmentEnabled: isReportLegacyTurnEnrichmentEnabled(),
    azureEnabled,
    azureConfigPresent,
    userTurnsWithAudio,
    userTurnsAssessed: speechBundle.batch.assessedTurnCount,
    userTurnsSkipped: speechBundle.batch.skippedTurnCount,
    skipReasonsByTurn,
    llmValidationMs: scenarioEvalDiag?.validationMs ?? 0,
    llmRepairMs: llmTelemetry.repairMs,
    llmRepairAttempted: llmTelemetry.repairAttempted,
    llmValidationErrorsCount: llmTelemetry.validationErrorsCount,
    openaiDiagnostics,
    evaluationSchemaName: 'fast',
    deepEnrichmentScheduledCount: isReportDeepEnrichmentEnabled() ? 1 : 0,
    parallelEvaluation: useParallel
      ? (() => {
          const subs = parallelEvaluationDiag?.subcallProviderNetworkMs ?? []
          const slowest = subs.reduce((a, b) => Math.max(a, b), 0)
          const sum = subs.reduce((a, b) => a + b, 0)
          return {
            enabled: true,
            subcallCount: parallelEvaluationDiag?.subcallCount ?? 0,
            partialTurnFailureCount: parallelEvaluationDiag?.partialTurnFailureCount ?? 0,
            slowestSubcallMs: slowest,
            wallTimeSavedMs: Math.max(0, sum - slowest),
          }
        })()
      : undefined,
    azureBatchMs: assessTurnsMs,
    azurePerTurnTimings: turnResults.map((r) => r.turnTiming),
    referenceTtsMs: 0,
    referenceTtsRequestedCount: 0,
    referenceTtsCacheHits: 0,
    referenceTtsCacheMisses: 0,
    referenceTtsGeneratedCount: 0,
    parallelWaitMs,
    failedSubtasks,
    fallbackUsed,
    fallbackReason: fallbackUsed && llmResult.source === 'deterministic' ? llmResult.reason : undefined,
    warnings: [],
    transcriptEvalUsedParallelAudioContext: true,
    azureSpeechBatch: speechBundle.batch,
    azurePerTurnSpeechMetrics: speechBundle.perTurnMetrics,
  }
  parallelOrchestrationV1.warnings = buildPerformanceWarnings(parallelOrchestrationV1, parallelWaitMs)

  return {
    turnResults,
    assessTurnsMs,
    llmResult,
    llmMs: parallelWaitMs,
    parallelOrchestrationV1,
    speechBatch: speechBundle,
    structuredDialogue: capturedStructuredDialogue,
  }
}
