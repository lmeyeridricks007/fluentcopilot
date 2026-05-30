import { applyScenarioRuntimeConfig } from '../../domain/speakLive/orderingFoodScenario'
import { parseSpeakLiveState } from '../../domain/speakLive/speakLiveFsm'
import { normalizeSpeakLiveCefrLevel } from '../../domain/speakLive/speakLiveSupportStrategy'
import type { ConversationThread } from '../../models/contracts'
import type { ScenarioConfig } from '../../models/contracts'
import type { LiveSessionEvaluation } from './liveVoiceEvaluationTypes'
import { buildPostSessionEvaluationReport } from './postSessionEvaluationService'
import {
  buildStoredReportQa,
  createQaPhaseStatus,
  runSecondPassReportQa,
  storedEvaluationNeedsRefreshFromJson,
} from './liveSessionEvaluationQa'
import * as liveEvalRepo from '../../repositories/liveSessionEvaluationRepository'
import * as messageRepo from '../../repositories/conversationMessageRepository'
import * as scenarioRepo from '../../repositories/scenarioRepository'
import * as savedTrainingItemRepo from '../../repositories/savedTrainingItemRepository'
import * as threadRepo from '../../repositories/conversationThreadRepository'
import * as userLearningMemoryRepository from '../../repositories/userLearningMemoryRepository'
import * as userRepo from '../../repositories/userRepository'
import { parseUserLearningProfileDocument } from '../../domain/learningMemory/userLearningProfileDocument'
import {
  buildReportPersonalizationRibbon,
  extractSessionWeakHintsForRibbon,
  type ReportLearningMemoryRibbon,
} from '../../domain/learningMemory/learningMemoryRecommendationService'
import { fireAndForgetLearningIngestion, ingestSpeakLiveEvaluationInsight } from '../learning-memory/learningMemoryPipeline'
import { publishAppEvent } from '../serviceBus/serviceBusPublisher'
import { loadPracticeNowBundleForThread } from '../training-loops/trainingLoopOrchestrator'
import type { TrainingLoopPracticeNowBundle } from '../../domain/trainingLoops/trainingLoopTypes'
import { appendSpeakingProgressFromSpeakLiveEvaluation } from '../speaking-progress/speakingProgressAppend'
import { ApiError } from '../../shared/errors'
import { getSqlPool } from '../sql/sqlPool'
import { aiLogError } from '../ai/logging/aiRunLogger'
import { z } from 'zod'
import {
  buildSpeakLiveEvaluationProgressV1,
  parseSpeakLiveEvaluationProgressV1,
  type SpeakLiveEvaluationPipelinePhase,
  type SpeakLiveEvaluationProgressV1,
} from './speakLiveAsyncEvaluationProgress'

async function requirePool() {
  const pool = await getSqlPool()
  if (!pool) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'SQL database not configured')
  return pool
}

function isSpeakLiveEvalQaEnabled(): boolean {
  return process.env.SPEAK_LIVE_EVAL_QA_ENABLED !== '0'
}

function learnerLevelFromScenario(scenario: { difficultyBand: string }): string {
  const b = (scenario.difficultyBand ?? '').toUpperCase()
  if (b.includes('A1')) return normalizeSpeakLiveCefrLevel('A1')
  if (b.includes('B1') || b.includes('B2')) return normalizeSpeakLiveCefrLevel('B1')
  return normalizeSpeakLiveCefrLevel('A2')
}

/** Parses CEFR from Speak Live thread summary (`… · Speak Live · … · A2`). */
export function learnerCefrLevelForLiveEvaluation(thread: ConversationThread, scenario: ScenarioConfig): string {
  const s = thread.summaryText?.trim() ?? ''
  if (s.includes('Speak Live')) {
    const parts = s.split(' · ').map((p) => p.trim())
    const last = parts[parts.length - 1]?.toUpperCase() ?? ''
    if (/^(A1|A2|B1|B2|C1|C2)$/.test(last)) return normalizeSpeakLiveCefrLevel(last)
  }
  return learnerLevelFromScenario(scenario)
}

export type LiveEvaluationApiPayload = {
  status: liveEvalRepo.LiveEvaluationStatus
  evaluation: LiveSessionEvaluation | null
  errorMessage?: string | null
  speakLivePostSessionPhase?: import('../../models/contracts').SpeakLivePostSessionPhase | null
  /** Fine-grained pipeline phase while `status === 'running'` (poll-friendly). */
  evaluationPhase?: SpeakLiveEvaluationPipelinePhase | null
  /** Raw progress envelope (versioned JSON persisted server-side). */
  evaluationProgress?: SpeakLiveEvaluationProgressV1 | null
  /** Short learner-facing strings when the server has early coaching snippets. */
  partialEvaluationInsights?: string[] | null
  qaStatus?: 'pending' | 'running' | 'passed' | 'failed'
  qaSummary?: string | null
  qaIssues?: string[]
  /** DEV-oriented progress hints while the job runs (best-effort). */
  evaluationDiagnostics?: {
    audioScoring: 'pending' | 'running' | 'done'
    languageCoaching: 'pending' | 'running' | 'done'
    finalAssembly: 'pending' | 'running' | 'done'
    qaReview: 'pending' | 'running' | 'done' | 'failed'
    runningForMs?: number
    timings?: {
      totalMs?: number
      inputLoadMs?: number
      reportBuildMs?: number
      qaMs?: number
      persistMs?: number
      orchestratorTotalMs?: number
      assessTurnsMs?: number
      llmMs?: number
      coachMergeMs?: number
      referenceTtsMs?: number
      feedbackBuildMs?: number
      enrichTurnsMs?: number
      premiumScoringMs?: number
      sessionAssemblyMs?: number
      recommendationVerifyMs?: number
      reportAuditMs?: number
      turnCount?: number
      qaAttemptCount?: number
      flaggedIssueCount?: number
      unresolvedIssueCount?: number
      fixedIssueCount?: number
      qaRulesTriggered?: string[]
      slowestTurns?: Array<{
        turnIndex: number
        totalMs: number
        blobDownloadMs: number
        audioAssessmentMs: number
        timingAnalysisMs: number
        assessmentOk: boolean
      }>
    }
  }
  /** Subtle cross-session context for the report UI — never raw scores. */
  learningMemoryRibbon?: ReportLearningMemoryRibbon | null
  /** Personalized follow-up drills for this thread (Practice now). */
  practiceNow?: TrainingLoopPracticeNowBundle | null
  /**
   * DEV-only: when subsystems for `learningMemoryRibbon` / `practiceNow` fail we no longer
   * silently null them. The reason is logged via `aiLogError` and (when dev diagnostics are
   * enabled) surfaced here so it is obvious WHY a section is empty in the browser.
   */
  reportSectionDiagnostics?: {
    learningMemoryRibbonError?: string | null
    practiceNowError?: string | null
    storedEvaluationParseError?: string | null
  }
}

function buildTimingDiagnostics(evaluation: LiveSessionEvaluation | null, runningForMs?: number) {
  const d = evaluation?.generationDiagnostics
  const orchestrator = d?.orchestrator
  const qa = d?.qa
  return {
    runningForMs,
    timings: d || runningForMs != null ? {
      totalMs: d?.totalMs,
      inputLoadMs: d?.app?.inputLoadMs,
      reportBuildMs: d?.app?.reportBuildMs,
      qaMs: d?.app?.qaMs,
      persistMs: d?.app?.persistMs,
      orchestratorTotalMs: orchestrator?.totalMs,
      assessTurnsMs: orchestrator?.assessTurnsMs,
      llmMs: orchestrator?.llmMs,
      coachMergeMs: orchestrator?.coachMergeMs,
      referenceTtsMs: orchestrator?.referenceTtsMs,
      feedbackBuildMs: orchestrator?.feedbackBuildMs,
      enrichTurnsMs: orchestrator?.enrichTurnsMs,
      premiumScoringMs: orchestrator?.premiumScoringMs,
      sessionAssemblyMs: orchestrator?.sessionAssemblyMs,
      recommendationVerifyMs: orchestrator?.recommendationVerifyMs,
      reportAuditMs: orchestrator?.reportAuditMs,
      turnCount: orchestrator?.turnCount,
      qaAttemptCount: d?.app?.qaAttemptCount,
      flaggedIssueCount: qa?.flaggedIssueCount,
      unresolvedIssueCount: qa?.unresolvedIssueCount,
      fixedIssueCount: qa?.fixedIssueCount,
      qaRulesTriggered: qa?.qaRulesTriggered,
      slowestTurns: orchestrator?.turnTimings
        ?.slice()
        .sort((a, b) => b.totalMs - a.totalMs)
        .slice(0, 3)
        .map((t) => ({
          turnIndex: t.turnIndex,
          totalMs: t.totalMs,
          blobDownloadMs: t.blobDownloadMs,
          audioAssessmentMs: t.audioAssessmentMs,
          timingAnalysisMs: t.timingAnalysisMs,
          assessmentOk: t.assessmentOk,
        })),
    } : undefined,
  }
}

function storedEvaluationNeedsRefresh(json: string): boolean {
  if (!isSpeakLiveEvalQaEnabled()) return false
  return storedEvaluationNeedsRefreshFromJson(json)
}

function liveEvalProgressPayloadFromRow(
  row: liveEvalRepo.LiveSessionEvaluationRow | null,
): Pick<LiveEvaluationApiPayload, 'evaluationPhase' | 'evaluationProgress' | 'partialEvaluationInsights'> {
  if (!row) {
    return { evaluationPhase: null, evaluationProgress: null, partialEvaluationInsights: null }
  }
  if (row.status === 'complete') {
    return { evaluationPhase: 'completed', evaluationProgress: null, partialEvaluationInsights: null }
  }
  if (row.status === 'failed') {
    return {
      evaluationPhase: 'failed',
      evaluationProgress: parseSpeakLiveEvaluationProgressV1(row.progressJson),
      partialEvaluationInsights: null,
    }
  }
  if (row.status === 'running') {
    const p = parseSpeakLiveEvaluationProgressV1(row.progressJson)
    return {
      evaluationPhase: p?.phase ?? 'queued',
      evaluationProgress: p,
      partialEvaluationInsights: p?.partial?.insightPreview ?? null,
    }
  }
  if (row.status === 'pending') {
    const p = parseSpeakLiveEvaluationProgressV1(row.progressJson)
    return {
      evaluationPhase: p?.phase ?? 'queued',
      evaluationProgress: p,
      partialEvaluationInsights: p?.partial?.insightPreview ?? null,
    }
  }
  return { evaluationPhase: null, evaluationProgress: null, partialEvaluationInsights: null }
}

export async function getLiveSessionEvaluation(params: {
  externalUserId: string
  threadId: string
  /** When true, includes engine debug for training loops (dev tools / non-production). */
  attachTrainingLoopDebug?: boolean
}): Promise<LiveEvaluationApiPayload> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.conversationSurface !== 'speak_live') {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Not a Speak Live session. Voice reports only attach to Speak Live threads. If text chat was already active for this scenario, close it or start Speak Live again so a voice thread is created.'
    )
  }

  const row = await liveEvalRepo.getEvaluationByThreadId(pool, params.threadId)
  const phase = thread.speakLivePostSessionPhase ?? null
  const runningForMs = row?.status === 'running' ? Math.max(0, Date.now() - Date.parse(row.updatedAt)) : undefined
  const qaDiag =
    (phase ?? '').toLowerCase() === 'verifying'
      ? ('running' as const)
      : row?.status === 'complete'
        ? ('done' as const)
        : row?.status === 'failed' && /report qa/i.test(row?.errorMessage ?? '')
          ? ('failed' as const)
          : ('pending' as const)
  const devDiag =
    process.env.SPEAK_LIVE_EVALUATION_DEV_DIAGNOSTICS === '1'
      ? ({
          audioScoring: row?.status === 'running' ? ('running' as const) : row?.status === 'complete' ? ('done' as const) : ('pending' as const),
          languageCoaching:
            row?.status === 'running' ? ('running' as const) : row?.status === 'complete' ? ('done' as const) : ('pending' as const),
          finalAssembly: row?.status === 'complete' ? ('done' as const) : row?.status === 'running' ? ('running' as const) : ('pending' as const),
          qaReview: qaDiag,
          runningForMs,
        } satisfies NonNullable<LiveEvaluationApiPayload['evaluationDiagnostics']>)
      : undefined
  if (!row) {
    return {
      status: 'pending',
      evaluation: null,
      errorMessage: null,
      speakLivePostSessionPhase: phase,
      qaStatus: 'pending',
      qaSummary: null,
      evaluationDiagnostics: devDiag,
      ...liveEvalProgressPayloadFromRow(row),
    }
  }
  if (row.status === 'complete' && row.evaluationJson) {
    try {
      const evaluation = JSON.parse(row.evaluationJson) as LiveSessionEvaluation
      const qaStatus = createQaPhaseStatus({
        rowStatus: row.status,
        speakLivePostSessionPhase: phase,
        evaluation,
        errorMessage: row.errorMessage,
      })
      if (isSpeakLiveEvalQaEnabled() && storedEvaluationNeedsRefresh(row.evaluationJson)) {
        return {
          status: 'pending',
          evaluation: null,
          errorMessage: null,
          speakLivePostSessionPhase: phase,
          qaStatus: qaStatus === 'passed' ? 'pending' : qaStatus,
          qaSummary: 'Refreshing this report because it does not pass the current trust checks yet.',
          evaluationDiagnostics: devDiag,
          learningMemoryRibbon: null,
          ...liveEvalProgressPayloadFromRow(row),
        }
      }
      let learningMemoryRibbon: LiveEvaluationApiPayload['learningMemoryRibbon'] = null
      let practiceNow: LiveEvaluationApiPayload['practiceNow'] = null
      let learningMemoryRibbonError: string | null = null
      let practiceNowError: string | null = null
      try {
        const pj = await userLearningMemoryRepository.getUserLearningProfileJson(pool, userInternalId)
        const doc = parseUserLearningProfileDocument(pj, userInternalId)
        learningMemoryRibbon = buildReportPersonalizationRibbon({
          doc,
          sessionWeakHints: extractSessionWeakHintsForRibbon(evaluation),
          practiceLevel: evaluation.targetLevel,
        })
      } catch (e) {
        /** No silent fallback — record the real reason so the missing section is explainable. */
        learningMemoryRibbonError = e instanceof Error ? e.message : String(e)
        aiLogError('live_eval_learning_memory_ribbon_failed', e, { threadId: params.threadId })
        learningMemoryRibbon = null
      }
      try {
        const pn = await loadPracticeNowBundleForThread({
          pool,
          userId: userInternalId,
          threadId: params.threadId,
          attachDebug: Boolean(params.attachTrainingLoopDebug),
        })
        practiceNow =
          pn.primary || pn.secondary || pn.stretch
            ? pn
            : null
      } catch (e) {
        /** No silent fallback — record the real reason so the missing section is explainable. */
        practiceNowError = e instanceof Error ? e.message : String(e)
        aiLogError('live_eval_practice_now_load_failed', e, { threadId: params.threadId })
        practiceNow = null
      }
      const includeReportSectionDiagnostics =
        process.env.SPEAK_LIVE_EVALUATION_DEV_DIAGNOSTICS === '1' || Boolean(params.attachTrainingLoopDebug)
      return {
        status: 'complete',
        evaluation,
        errorMessage: null,
        speakLivePostSessionPhase: phase,
        qaStatus: 'passed',
        qaSummary: evaluation.reportQa?.fixesApplied?.length
          ? `Verified and repaired ${evaluation.reportQa.fixesApplied.length} report issue(s) before publishing.`
          : null,
        qaIssues:
          process.env.SPEAK_LIVE_EVALUATION_DEV_DIAGNOSTICS === '1' ? evaluation.reportQa?.issues ?? [] : undefined,
        evaluationDiagnostics: devDiag ? { ...devDiag, ...buildTimingDiagnostics(evaluation) } : undefined,
        learningMemoryRibbon,
        practiceNow,
        ...(includeReportSectionDiagnostics
          ? {
              reportSectionDiagnostics: {
                learningMemoryRibbonError,
                practiceNowError,
                storedEvaluationParseError: null,
              },
            }
          : {}),
        ...liveEvalProgressPayloadFromRow(row),
      }
    } catch (e) {
      /** Surface the real parse/QA reason instead of the previous opaque string. */
      const reason = e instanceof Error ? e.message : String(e)
      aiLogError('live_eval_stored_evaluation_parse_failed', e, { threadId: params.threadId })
      const includeReportSectionDiagnostics =
        process.env.SPEAK_LIVE_EVALUATION_DEV_DIAGNOSTICS === '1' || Boolean(params.attachTrainingLoopDebug)
      return {
        status: 'failed',
        evaluation: null,
        errorMessage: `Stored evaluation JSON was invalid: ${reason.slice(0, 1900)}`,
        speakLivePostSessionPhase: phase,
        qaStatus: 'failed',
        qaSummary: 'The stored report could not be verified.',
        evaluationDiagnostics: devDiag,
        ...(includeReportSectionDiagnostics
          ? {
              reportSectionDiagnostics: {
                learningMemoryRibbonError: null,
                practiceNowError: null,
                storedEvaluationParseError: reason,
              },
            }
          : {}),
        ...liveEvalProgressPayloadFromRow(row),
      }
    }
  }
  return {
    status: row.status,
    evaluation: null,
    errorMessage: row.errorMessage,
    speakLivePostSessionPhase: phase,
    qaStatus: createQaPhaseStatus({
      rowStatus: row.status,
      speakLivePostSessionPhase: phase,
      evaluation: null,
      errorMessage: row.errorMessage,
    }),
    qaSummary:
      row.status === 'failed' && /report qa/i.test(row.errorMessage ?? '')
        ? 'We are still verifying this report because some feedback did not match the session closely enough.'
        : null,
    evaluationDiagnostics: devDiag,
    ...liveEvalProgressPayloadFromRow(row),
  }
}

async function executeSpeakLiveEvaluationWork(params: {
  pool: import('mssql').ConnectionPool
  thread: ConversationThread
  threadId: string
  externalUserId: string
  userInternalId: string
  runStartedAt: number
  progressReporter: import('./speakLiveAsyncEvaluationProgress').SpeakLiveEvaluationProgressReporter
}): Promise<void> {
  const { pool, thread, threadId, externalUserId, userInternalId, runStartedAt, progressReporter } = params
  try {
    const inputLoadStartedAt = Date.now()
    console.log('[EvalTiming] app:input_load:start', { threadId })
    const scenarioBase = await scenarioRepo.getScenarioById(pool, thread.scenarioId)
    const slForScenario = parseSpeakLiveState(thread.speakLiveStateJson)
    const scenario = applyScenarioRuntimeConfig(scenarioBase, slForScenario?.scenarioRuntimeConfig ?? null)
    const messages = await messageRepo.listMessagesForThread(pool, thread.id)
    const learnerLevel = learnerCefrLevelForLiveEvaluation(thread, scenario)
    let finalEvaluation: LiveSessionEvaluation | null = null
    const appStartedAt = Date.now()
    const inputLoadMs = appStartedAt - runStartedAt
    console.log('[EvalTiming] app:input_load:end', {
      threadId,
      elapsedMs: Date.now() - inputLoadStartedAt,
      messageCount: messages.length,
      scenarioId: scenario.id,
    })
    let totalQaMs = 0

    for (let qaRetryCount = 0; qaRetryCount <= 1; qaRetryCount += 1) {
      const reportBuildStartedAt = Date.now()
      console.log('[EvalTiming] app:report_build:start', {
        threadId,
        qaRetryCount,
      })
      const evaluation = await buildPostSessionEvaluationReport({
        threadId: thread.id,
        scenario,
        learnerLevel,
        messages,
        summaryText: thread.summaryText,
        speakLiveStateJson: thread.speakLiveStateJson,
        externalUserId,
        evaluationProgressReporter: progressReporter,
      })
      const reportBuildMs = Date.now() - reportBuildStartedAt
      console.log('[EvalTiming] app:report_build:end', {
        threadId,
        qaRetryCount,
        reportBuildMs,
      })
      if (!isSpeakLiveEvalQaEnabled()) {
        const completedAt = new Date().toISOString()
        evaluation.reportQa = {
          version: 1,
          status: 'passed',
          checkedAt: completedAt,
          issues: [],
          fixesApplied: [],
          rerunCount: 0,
        }
        evaluation.generationDiagnostics = {
          ...(evaluation.generationDiagnostics ?? {
            startedAt: new Date(runStartedAt).toISOString(),
            completedAt,
            totalMs: Date.now() - runStartedAt,
          }),
          startedAt: evaluation.generationDiagnostics?.startedAt ?? new Date(runStartedAt).toISOString(),
          completedAt,
          totalMs: Date.now() - runStartedAt,
          app: {
            inputLoadMs,
            reportBuildMs,
            qaMs: 0,
            persistMs: 0,
            totalMs: Date.now() - appStartedAt,
            qaAttemptCount: qaRetryCount + 1,
          },
        }
        finalEvaluation = evaluation
        break
      }

      await threadRepo.updateThreadState(pool, threadId, { speakLivePostSessionPhase: 'verifying' })
      const qaStartedAt = Date.now()
      console.log('[EvalTiming] app:qa:start', {
        threadId,
        qaRetryCount,
      })
      const qaResult = runSecondPassReportQa(evaluation)
      const qaMs = Date.now() - qaStartedAt
      totalQaMs += qaMs
      const completedAt = new Date().toISOString()
      evaluation.generationDiagnostics = {
        ...(evaluation.generationDiagnostics ?? {
          startedAt: new Date(runStartedAt).toISOString(),
          completedAt,
          totalMs: Date.now() - runStartedAt,
        }),
        startedAt: evaluation.generationDiagnostics?.startedAt ?? new Date(runStartedAt).toISOString(),
        completedAt,
        totalMs: Date.now() - runStartedAt,
        app: {
          inputLoadMs,
          reportBuildMs,
          qaMs: totalQaMs,
          persistMs: 0,
          totalMs: Date.now() - appStartedAt,
          qaAttemptCount: qaRetryCount + 1,
        },
        qa: {
          totalMs: qaMs,
          flaggedIssueCount: qaResult.issues.length,
          unresolvedIssueCount: qaResult.unresolvedIssues.length,
          fixedIssueCount: qaResult.fixesApplied.length,
          shouldRerun: qaResult.shouldRerun,
          qaAttemptIndex: qaRetryCount,
          qaRulesTriggered: qaResult.qaRulesTriggered,
        },
      }
      console.log('[EvalTiming] QA attempt', {
        threadId,
        qaRetryCount,
        reportBuildMs,
        qaMs,
        totalElapsedMs: Date.now() - runStartedAt,
        flaggedIssues: qaResult.issues.map((issue) => issue.code),
        unresolvedIssues: qaResult.unresolvedIssues.map((issue) => issue.code),
        fixesApplied: qaResult.fixesApplied,
      })
      if (qaResult.shouldRerun) {
        console.warn('[EvalAppService] Report QA requested rerun', {
          threadId,
          qaRetryCount,
          issues: qaResult.issues.map((issue) => issue.code),
        })
        if (qaRetryCount === 0) continue
        const qaError = `Report QA failed after retry: ${qaResult.blockingReason ?? 'Unspecified trust issue'}`
        await liveEvalRepo.updateEvaluationProgressJson(pool, {
          threadId,
          progressJson: JSON.stringify(buildSpeakLiveEvaluationProgressV1('failed')),
        })
        await liveEvalRepo.updateEvaluationStatus(pool, {
          threadId,
          status: 'failed',
          errorMessage: qaError,
        })
        await threadRepo.updateThreadState(pool, threadId, { speakLivePostSessionPhase: 'failed' })
        return
      }

      evaluation.reportQa = buildStoredReportQa(qaResult, qaRetryCount)
      finalEvaluation = evaluation
      break
    }

    if (!finalEvaluation) throw new Error('Report QA failed to produce a publishable evaluation')

    const persistStartedAt = Date.now()
    console.log('[EvalTiming] app:persist:start', {
      threadId,
    })
    if (finalEvaluation.generationDiagnostics?.app) {
      finalEvaluation.generationDiagnostics.app.persistMs = 0
      finalEvaluation.generationDiagnostics.app.totalMs = Date.now() - appStartedAt
    }
    await liveEvalRepo.updateEvaluationStatus(pool, {
      threadId,
      status: 'complete',
      evaluationJson: JSON.stringify(finalEvaluation),
      errorMessage: null,
    })
    const persistMs = Date.now() - persistStartedAt
    if (finalEvaluation.generationDiagnostics?.app) {
      finalEvaluation.generationDiagnostics.completedAt = new Date().toISOString()
      finalEvaluation.generationDiagnostics.totalMs = Date.now() - runStartedAt
      finalEvaluation.generationDiagnostics.app.persistMs = persistMs
      finalEvaluation.generationDiagnostics.app.totalMs = Date.now() - appStartedAt
      await liveEvalRepo.updateEvaluationStatus(pool, {
        threadId,
        status: 'complete',
        evaluationJson: JSON.stringify(finalEvaluation),
        errorMessage: null,
      })
    }
    console.log('[EvalTiming] Evaluation completed', {
      threadId,
      totalMs: Date.now() - runStartedAt,
      inputLoadMs,
      totalQaMs,
      persistMs,
      orchestratorMs: finalEvaluation.generationDiagnostics?.orchestrator?.totalMs,
    })
    await threadRepo.updateThreadState(pool, threadId, { speakLivePostSessionPhase: 'evaluated' })
    fireAndForgetLearningIngestion(
      () =>
        ingestSpeakLiveEvaluationInsight({
          pool,
          userId: userInternalId,
          threadId,
          scenarioId: scenario.id,
          scenarioSlug: scenario.slug,
          evaluation: finalEvaluation,
        }),
      'speak_live_post_eval',
    )
    void appendSpeakingProgressFromSpeakLiveEvaluation({
      userId: externalUserId,
      threadId,
      evaluation: finalEvaluation,
    }).catch(() => undefined)
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 1900) : 'Evaluation failed'
    aiLogError('live_session_evaluation_failed', e, { threadId })
    await liveEvalRepo.updateEvaluationProgressJson(pool, {
      threadId,
      progressJson: JSON.stringify(buildSpeakLiveEvaluationProgressV1('failed')),
    }).catch(() => undefined)
    await liveEvalRepo.updateEvaluationStatus(pool, {
      threadId,
      status: 'failed',
      errorMessage: msg,
    })
    await threadRepo.updateThreadState(pool, threadId, { speakLivePostSessionPhase: 'failed' })
  }
}

export async function runLiveSessionEvaluation(params: { externalUserId: string; threadId: string; forceRestart?: boolean }): Promise<LiveEvaluationApiPayload> {
  const runStartedAt = Date.now()
  console.log('[EvalTiming] runLiveSessionEvaluation:start', {
    threadId: params.threadId,
    startedAt: new Date(runStartedAt).toISOString(),
  })
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread) throw new ApiError(404, 'NOT_FOUND', 'Thread not found')
  if (thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.conversationSurface !== 'speak_live') {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Not a Speak Live session. Voice reports only attach to Speak Live threads. If text chat was already active for this scenario, close it or start Speak Live again so a voice thread is created.'
    )
  }
  if (thread.status !== 'completed') {
    throw new ApiError(409, 'CONFLICT', 'Session must be completed before evaluation')
  }

  let existing = await liveEvalRepo.getEvaluationByThreadId(pool, params.threadId)
  if (!existing) {
    await liveEvalRepo.upsertPendingEvaluation(pool, { threadId: params.threadId, userInternalId })
    existing = await liveEvalRepo.getEvaluationByThreadId(pool, params.threadId)
  }
  if (params.forceRestart) {
    console.log('[EvalAppService] Force restart requested', {
      threadId: params.threadId,
      previousStatus: existing?.status ?? 'missing',
    })
    await liveEvalRepo.updateEvaluationStatus(pool, {
      threadId: params.threadId,
      status: 'pending',
      evaluationJson: null,
      errorMessage: null,
    })
    await threadRepo.updateThreadState(pool, params.threadId, { speakLivePostSessionPhase: 'evaluating' })
    existing = await liveEvalRepo.getEvaluationByThreadId(pool, params.threadId)
  }
  if (existing?.status === 'complete' && existing.evaluationJson) {
    const needsRerun = storedEvaluationNeedsRefresh(existing.evaluationJson)
    if (!needsRerun) {
      return getLiveSessionEvaluation(params)
    }
    console.log('[EvalAppService] Stale deterministic evaluation detected — re-running')
  }
  if (existing?.status === 'running') {
    return getLiveSessionEvaluation(params)
  }

  await threadRepo.updateThreadState(pool, params.threadId, { speakLivePostSessionPhase: 'evaluating' })
  const claimed = await liveEvalRepo.tryClaimEvaluationRun(pool, {
    threadId: params.threadId,
  })
  if (!claimed) {
    console.log('[EvalAppService] Evaluation run already claimed by another request', {
      threadId: params.threadId,
    })
    return getLiveSessionEvaluation(params)
  }

  const progressReporter = async (u: SpeakLiveEvaluationProgressV1) => {
    await liveEvalRepo.updateEvaluationProgressJson(pool, {
      threadId: params.threadId,
      progressJson: JSON.stringify(u),
    })
  }

  const useBackgroundJob = process.env.SPEAK_LIVE_EVAL_SYNCHRONOUS !== '1'

  const kick = () =>
    executeSpeakLiveEvaluationWork({
      pool,
      thread,
      threadId: params.threadId,
      externalUserId: params.externalUserId,
      userInternalId,
      runStartedAt,
      progressReporter,
    })

  if (useBackgroundJob) {
    await liveEvalRepo.updateEvaluationProgressJson(pool, {
      threadId: params.threadId,
      progressJson: JSON.stringify(buildSpeakLiveEvaluationProgressV1('queued')),
    })
    void publishAppEvent('speak_live.evaluation.requested', {
      threadId: params.threadId,
      externalUserId: params.externalUserId,
    })
    void kick().catch((e) => {
      const msg = e instanceof Error ? e.message.slice(0, 1900) : 'Evaluation failed'
      aiLogError('live_session_evaluation_async_job_failed', e, { threadId: params.threadId })
      void liveEvalRepo
        .updateEvaluationProgressJson(pool, {
          threadId: params.threadId,
          progressJson: JSON.stringify(buildSpeakLiveEvaluationProgressV1('failed')),
        })
        .catch(() => undefined)
      void liveEvalRepo
        .updateEvaluationStatus(pool, {
          threadId: params.threadId,
          status: 'failed',
          errorMessage: msg,
        })
        .catch(() => undefined)
      void threadRepo
        .updateThreadState(pool, params.threadId, { speakLivePostSessionPhase: 'failed' })
        .catch(() => undefined)
    })
    return getLiveSessionEvaluation(params)
  }

  await kick()
  return getLiveSessionEvaluation(params)
}

export async function seedPendingLiveEvaluation(params: { externalUserId: string; threadId: string }): Promise<void> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread || thread.userId !== userInternalId) return
  if (thread.conversationSurface !== 'speak_live') return
  try {
    await liveEvalRepo.upsertPendingEvaluation(pool, { threadId: params.threadId, userInternalId })
  } catch (e) {
    aiLogError('live_eval_pending_seed_failed', e, { threadId: params.threadId })
  }
}

const SavedTrainingTagCategorySchema = z.enum([
  'library',
  'coach_follow_up',
  'review_queue',
  'speaking_drill',
  'pronunciation_drill',
  'rhythm_drill',
  'phrasing_upgrade',
  'general',
])

const SaveTrainingItemRequestSchema = z
  .object({
    sourceSessionId: z.string().uuid(),
    sourceTurnId: z.string().max(80).optional().nullable(),
    type: z.enum([
      'word',
      'phrase',
      'library_word',
      'library_phrase',
      'save_phrase',
      'save_improved_version',
      'save_pronunciation_word',
      'save_rhythm_drill',
      'save_natural_phrasing',
      'scenario_follow_up',
      'pronunciation_drill',
      'rhythm_drill',
      'phrasing_drill',
      'natural_phrasing_drill',
      'scenario_followup',
      'repeat_scenario',
      'sentence_drill',
      'speaking_drill',
      'coach_followup',
      'coach_follow_up',
      'review_queue',
    ]),
    title: z.string().min(1).max(512),
    content: z.string().min(1).max(16_000),
    audioReferenceUrl: z.string().max(2048).optional().nullable(),
    learnerAudioUrl: z.string().max(2048).optional().nullable(),
    /** Scenario slug or id (e.g. train-station) — stored for downstream filters. */
    sourceScenarioId: z.string().max(200).optional().nullable(),
    learnerOriginalSentence: z.string().max(8000).optional().nullable(),
    improvedSentence: z.string().max(8000).optional().nullable(),
    tagCategory: SavedTrainingTagCategorySchema.optional().nullable(),
    suggestedTrainingMode: z.string().max(64).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

type SaveRequestType = z.infer<typeof SaveTrainingItemRequestSchema>['type']

function mapSaveRequestToItemType(t: SaveRequestType): savedTrainingItemRepo.SavedTrainingItemType {
  if (t === 'repeat_scenario' || t === 'scenario_follow_up' || t === 'scenario_followup') return 'scenario_followup'
  if (t === 'library_phrase' || t === 'save_phrase' || t === 'save_improved_version') return 'phrase'
  if (t === 'library_word' || t === 'word') return 'word'
  if (t === 'save_pronunciation_word') return 'pronunciation_drill'
  if (t === 'save_rhythm_drill') return 'rhythm_drill'
  if (t === 'save_natural_phrasing') return 'natural_phrasing_drill'
  if (t === 'coach_follow_up') return 'coach_followup'
  return t as savedTrainingItemRepo.SavedTrainingItemType
}

function defaultTagCategoryForRequest(t: SaveRequestType): savedTrainingItemRepo.SavedTrainingTagCategory {
  switch (t) {
    case 'library_word':
    case 'library_phrase':
    case 'save_phrase':
    case 'word':
    case 'phrase':
    case 'save_improved_version':
      return 'library'
    case 'coach_followup':
    case 'coach_follow_up':
    case 'scenario_follow_up':
    case 'scenario_followup':
    case 'repeat_scenario':
      return 'coach_follow_up'
    case 'review_queue':
      return 'review_queue'
    case 'sentence_drill':
      return 'review_queue'
    case 'speaking_drill':
      return 'speaking_drill'
    case 'pronunciation_drill':
    case 'save_pronunciation_word':
      return 'pronunciation_drill'
    case 'rhythm_drill':
    case 'save_rhythm_drill':
      return 'rhythm_drill'
    case 'phrasing_drill':
    case 'natural_phrasing_drill':
    case 'save_natural_phrasing':
      return 'phrasing_upgrade'
    default:
      return 'general'
  }
}

function defaultSuggestedModeForRequest(t: SaveRequestType): string {
  switch (t) {
    case 'library_word':
    case 'library_phrase':
    case 'save_phrase':
    case 'word':
    case 'phrase':
      return 'talk_focus'
    case 'save_improved_version':
    case 'phrasing_drill':
    case 'natural_phrasing_drill':
    case 'save_natural_phrasing':
      return 'read_aloud'
    case 'sentence_drill':
    case 'review_queue':
      return 'review_then_speak'
    case 'speaking_drill':
      return 'voice_session'
    case 'pronunciation_drill':
    case 'save_pronunciation_word':
      return 'voice_session'
    case 'rhythm_drill':
    case 'save_rhythm_drill':
      return 'shadowing'
    case 'coach_followup':
    case 'coach_follow_up':
    case 'scenario_follow_up':
    case 'scenario_followup':
    case 'repeat_scenario':
      return 'coach_card'
    default:
      return 'practice_object'
  }
}

export async function saveLiveTrainingItem(params: {
  externalUserId: string
  rawBody: unknown
}): Promise<{ item: savedTrainingItemRepo.SavedTrainingItemRow }> {
  const parsed = SaveTrainingItemRequestSchema.safeParse(params.rawBody)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const i of parsed.error.issues) fields[i.path.join('.')] = i.message
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body', fields)
  }
  const body = parsed.data
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, body.sourceSessionId)
  if (!thread || thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')

  const scenario = await scenarioRepo.getScenarioById(pool, thread.scenarioId)
  const scenarioSlug = scenario?.slug?.trim() || thread.scenarioId

  const itemType = mapSaveRequestToItemType(body.type)
  const parsedTag = body.tagCategory != null ? SavedTrainingTagCategorySchema.safeParse(body.tagCategory) : null
  const tagCategory: savedTrainingItemRepo.SavedTrainingTagCategory =
    parsedTag?.success === true ? parsedTag.data : defaultTagCategoryForRequest(body.type)
  const suggestedTrainingMode =
    body.suggestedTrainingMode?.trim() || defaultSuggestedModeForRequest(body.type)
  const sourceScenarioId = body.sourceScenarioId?.trim() || scenarioSlug
  const learnerOriginal = body.learnerOriginalSentence?.trim() || null
  const improved = body.improvedSentence?.trim() || null

  const meta = {
    ...(body.metadata ?? {}),
    saveRequestType: body.type,
    threadScenarioId: thread.scenarioId,
  }

  const item = await savedTrainingItemRepo.insertSavedTrainingItem(pool, {
    userInternalId,
    sourceSessionId: body.sourceSessionId,
    sourceTurnId: body.sourceTurnId ?? null,
    sourceScenarioId,
    learnerOriginalSentence: learnerOriginal,
    improvedSentence: improved,
    tagCategory,
    suggestedTrainingMode,
    itemType,
    title: body.title,
    content: body.content,
    audioReferenceUrl: body.audioReferenceUrl ?? null,
    learnerAudioUrl: body.learnerAudioUrl ?? null,
    metadata: meta,
  })
  return { item }
}

const SavedItemTypeFilterSchema = z.enum([
  'word',
  'phrase',
  'pronunciation_drill',
  'rhythm_drill',
  'phrasing_drill',
  'natural_phrasing_drill',
  'scenario_followup',
  'sentence_drill',
  'coach_followup',
  'review_queue',
  'speaking_drill',
])

export async function listSavedTrainingItems(params: {
  externalUserId: string
  tagCategory?: string | null
  itemType?: string | null
  limit?: number
}): Promise<{ items: savedTrainingItemRepo.SavedTrainingItemRow[] }> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const limit = Math.min(Math.max(params.limit ?? 80, 1), 200)
  const tag =
    params.tagCategory &&
    SavedTrainingTagCategorySchema.safeParse(params.tagCategory).success
      ? (params.tagCategory as savedTrainingItemRepo.SavedTrainingTagCategory)
      : null
  const itParsed = params.itemType?.trim() ? SavedItemTypeFilterSchema.safeParse(params.itemType.trim()) : null
  const itype = itParsed?.success ? itParsed.data : null
  const items = await savedTrainingItemRepo.listSavedTrainingItemsForUser(pool, {
    userInternalId,
    limit,
    tagCategory: tag,
    itemType: itype,
  })
  return { items }
}
