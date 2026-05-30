import type sql from 'mssql'
import type { SessionLearningInsights } from '../../domain/learningMemory/sessionLearningInsightTypes'
import type { UserLearningProfile } from '../../domain/learningMemory/userLearningProfileDocument'
import type { LiveSessionEvaluation } from '../speak-live/liveVoiceEvaluationTypes'
import type { ReadAloudEvaluateResult } from '../read-aloud/readAloudEvaluateTypes'
import {
  buildTrainingLoopCandidates,
  buildTrainingLoopPracticeBundle,
  candidatesToSummaries,
  rankAndSelectTrainingLoops,
  type LoopGenerationInput,
} from '../../domain/trainingLoops/trainingLoopGenerationEngine'
import type {
  PersonalizedTrainingLoop,
  TrainingLoopCompletionResult,
  TrainingLoopPracticeNowBundle,
} from '../../domain/trainingLoops/trainingLoopTypes'
import * as trainingLoopPersistence from './trainingLoopPersistenceService'
import { aiLogError, aiLogInfo } from '../ai/logging/aiRunLogger'

function sourceSessionIdFor(params: {
  sessionType: 'speak_live' | 'text_conversation' | 'read_aloud' | 'listening' | 'quick_capture'
  threadId: string | null
  insightsSessionId: string
}): string {
  if (params.threadId) return params.threadId
  return params.insightsSessionId
}

export async function generateAndPersistTrainingLoopsForSession(params: {
  pool: sql.ConnectionPool
  userId: string
  sessionType: 'speak_live' | 'text_conversation' | 'read_aloud' | 'listening' | 'quick_capture'
  threadId: string | null
  scenarioId: string | null
  scenarioSlug: string | null
  insights: SessionLearningInsights
  mergedProfile: UserLearningProfile
  speakLiveEvaluation: LiveSessionEvaluation | null
  readAloudResult: ReadAloudEvaluateResult | null
  listeningSessionMeta?: LoopGenerationInput['listeningSessionMeta']
  /** When true, persists full candidate/rank debug on primary loop row (dev/staging only; see {@link shouldPersistTrainingLoopGenerationDebug}). */
  storeGenerationDebug: boolean
}): Promise<void> {
  const sourceSessionId = sourceSessionIdFor({
    sessionType: params.sessionType,
    threadId: params.threadId,
    insightsSessionId: params.insights.sessionId,
  })
  const exists = await trainingLoopPersistence.hasLoopsForSourceSession(
    params.pool,
    params.userId,
    sourceSessionId,
  )
  if (exists) {
    aiLogInfo('training_loop_skip_existing_session', { sourceSessionId })
    return
  }
  const recentRows = await trainingLoopPersistence.getRecentLoopDedupeRows(params.pool, params.userId, 36)
  const input: LoopGenerationInput = {
    userId: params.userId,
    sourceSessionId,
    threadId: params.threadId,
    scenarioId: params.scenarioId,
    scenarioSlug: params.scenarioSlug,
    sessionType: params.sessionType,
    insights: params.insights,
    profile: params.mergedProfile,
    speakLiveEvaluation: params.speakLiveEvaluation,
    readAloudResult: params.readAloudResult,
    listeningSessionMeta: params.listeningSessionMeta ?? null,
  }
  const candidates = buildTrainingLoopCandidates(input, recentRows)
  const ranked = rankAndSelectTrainingLoops({
    candidates,
    recent: recentRows,
  })
  const summaries = candidatesToSummaries(candidates)
  const bundle = buildTrainingLoopPracticeBundle({
    userId: params.userId,
    selected: ranked,
    summaries,
    suppressedDuplicates: ranked.suppressedDuplicates,
    rankingNotes: ranked.rankingNotes,
    includeDebug: params.storeGenerationDebug,
  })
  const debugJson =
    params.storeGenerationDebug && bundle.debug ? JSON.stringify(bundle.debug) : null

  const loops: PersonalizedTrainingLoop[] = [bundle.primary, bundle.secondary, bundle.stretch].filter(
    Boolean,
  ) as PersonalizedTrainingLoop[]

  if (!loops.length) {
    aiLogInfo('training_loop_no_candidates', { sourceSessionId })
    return
  }

  for (const L of loops) {
    await trainingLoopPersistence.createTrainingLoop(params.pool, {
      userId: params.userId,
      id: L.id,
      sourceSessionId: L.sourceSessionId,
      threadId: L.threadId,
      sourceType: L.sourceType,
      sourceScenarioId: L.sourceScenarioId,
      loopType: L.loopType,
      loopSlot: L.loopSlot,
      title: L.title,
      subtitle: L.subtitle ?? null,
      reason: L.reason,
      targetSkills: L.targetSkills,
      targetWeaknessKeys: L.targetWeaknessKeys,
      estimatedMinutes: L.estimatedMinutes,
      difficulty: L.difficulty,
      payload: L.payload,
      status: L.status,
      confidence: L.confidence,
      priorityScore: L.priorityScore,
      dedupeKey: L.dedupeKey ?? null,
      generationDebugJson: L.loopSlot === 0 ? debugJson : null,
      expiresAt: L.expiresAt ?? null,
    })
  }
  aiLogInfo('training_loop_persisted', { sourceSessionId, count: loops.length })
}

export async function completeTrainingLoop(params: {
  pool: sql.ConnectionPool
  userId: string
  loopId: string
  clientResult?: Partial<TrainingLoopCompletionResult> | null
}): Promise<{ ok: boolean; loop: PersonalizedTrainingLoop | null }> {
  return trainingLoopPersistence.markTrainingLoopCompleted({
    pool: params.pool,
    userId: params.userId,
    loopId: params.loopId,
    clientResult: params.clientResult,
  })
}

export async function loadPracticeNowBundleForThread(params: {
  pool: sql.ConnectionPool
  userId: string
  threadId: string
  attachDebug: boolean
}): Promise<TrainingLoopPracticeNowBundle> {
  const rows = await trainingLoopPersistence.listLoopsForThread(params.pool, params.userId, params.threadId)
  const primary = rows.find((r) => r.loopSlot === 0) ?? rows[0] ?? null
  const secondary = rows.find((r) => r.loopSlot === 1) ?? null
  const stretch = rows.find((r) => r.loopSlot === 2) ?? null
  if (!primary && !secondary && !stretch) {
    return { primary: null, secondary: null, stretch: null, debug: undefined }
  }
  let debug = null
  if (params.attachDebug && primary) {
    try {
      const raw = await params.pool
        .request()
        .input('id', primary.id)
        .query<{ GenerationDebugJson: string | null }>(`
          SELECT GenerationDebugJson FROM dbo.PersonalizedTrainingLoops WHERE Id = @id
        `)
      const gj = raw.recordset[0]?.GenerationDebugJson
      if (gj) {
        try {
          debug = JSON.parse(gj) as TrainingLoopPracticeNowBundle['debug']
        } catch {
          debug = null
        }
      }
    } catch (e) {
      aiLogError('training_loop_debug_load_failed', e, { loopId: primary.id })
    }
  }
  return { primary, secondary, stretch, debug: params.attachDebug ? debug : undefined }
}
