import type sql from 'mssql'
import type { ConversationSummary, FeedbackItem } from '../../models/contracts'
import { extractSessionInsightsFromLiveEvaluation, extractSessionInsightsFromReadAloud, extractSessionInsightsFromTextConversation } from '../../domain/learningMemory/sessionInsightExtraction'
import type { LiveSessionEvaluation } from '../speak-live/liveVoiceEvaluationTypes'
import type { ReadAloudEvaluateResult } from '../read-aloud/readAloudEvaluateTypes'
import { aiLogError, aiLogInfo } from '../ai/logging/aiRunLogger'
import { newId } from '../../shared/ids'
import * as learningRepo from '../../repositories/userLearningMemoryRepository'
import { atomsToSkillEvidence } from '../../domain/skills/skillEvidenceAtomAdapters'
import {
  extractSkillEvidenceFromChatReport,
  extractSkillEvidenceFromCoachReport,
  extractSkillEvidenceFromReadAloudReport,
  extractSkillEvidenceFromScenarioReport,
} from '../../domain/skills/extractors'
import { mergeSessionInsightsIntoProfilePersisted, saveSessionLearningInsights } from './userLearningProfileService'
import { shouldPersistTrainingLoopGenerationDebug } from '../../domain/trainingLoops/trainingLoopDevFlags'
import { generateAndPersistTrainingLoopsForSession } from '../training-loops/trainingLoopOrchestrator'
import type { ListeningAttempt } from '../../domain/listening/listeningAttempt'
import type { ListeningSession } from '../../domain/listening/listeningSession'
import type { UserLearningProfile } from '../../domain/learningMemory/userLearningProfileDocument'
import { extractSessionInsightsFromListeningSession } from '../../domain/learningMemory/sessionInsightExtractionListening'
import {
  extractSessionInsightsFromQuickCapture,
  type QuickCaptureEnrichmentPayload,
} from '../../domain/learningMemory/sessionInsightExtractionQuickCapture'
import { extractQuickCaptureTypeSkillEvidence } from '../../domain/skills/extractors/extractSkillEvidenceFromQuickCaptureSession'
import type { QuickCaptureType } from '../../repositories/quickCaptureRepository'

/** Local DBs often omit training-loop migrations; never block capture ingest / OCR on this. */
async function tryGenerateTrainingLoopsForSession(
  params: Parameters<typeof generateAndPersistTrainingLoopsForSession>[0],
): Promise<void> {
  try {
    await generateAndPersistTrainingLoopsForSession(params)
  } catch (e) {
    aiLogError('training_loop_generation_skipped', e, {
      sessionType: params.sessionType,
      hint: 'If dbo.PersonalizedTrainingLoops is missing, apply training-loop migrations or ignore in dev.',
    })
  }
}

function sessionTypeWeightForSkillMerge(sessionType: learningRepo.SessionLearningSessionType): number {
  if (sessionType === 'speak_live') return 1
  if (sessionType === 'read_aloud') return 0.92
  if (sessionType === 'quick_capture') return 0.62
  return 0.85
}

export async function ingestSpeakLiveEvaluationInsight(params: {
  pool: sql.ConnectionPool
  userId: string
  threadId: string
  scenarioId: string | null
  scenarioSlug: string | null
  evaluation: LiveSessionEvaluation
}): Promise<void> {
  const exists = await learningRepo.hasSessionInsightForThread(params.pool, params.threadId)
  if (exists) {
    aiLogInfo('learning_memory_skip_duplicate_thread', { threadId: params.threadId })
    return
  }
  const insights = extractSessionInsightsFromLiveEvaluation({
    sessionId: params.threadId,
    userId: params.userId,
    scenarioId: params.scenarioId,
    evaluation: params.evaluation,
    scenarioSlug: params.scenarioSlug,
  })
  const at = insights.extractedAt
  const reportAtoms = [
    ...extractSkillEvidenceFromScenarioReport({
      userId: params.userId,
      sessionId: params.threadId,
      createdAt: at,
      evaluation: params.evaluation,
    }),
    ...extractSkillEvidenceFromCoachReport({
      userId: params.userId,
      sessionId: params.threadId,
      createdAt: at,
      evaluation: params.evaluation,
    }),
  ]
  const additionalSkillEvidence = atomsToSkillEvidence(reportAtoms, sessionTypeWeightForSkillMerge('speak_live'))
  const merged = await mergeSessionInsightsIntoProfilePersisted({
    pool: params.pool,
    userId: params.userId,
    insights,
    sessionType: 'speak_live',
    scenarioId: params.scenarioId,
    additionalSkillEvidence,
  })
  await saveSessionLearningInsights({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'speak_live',
    threadId: params.threadId,
    scenarioId: params.scenarioId,
    insights,
    signals: { source: 'live_session_evaluation' },
  })
  await tryGenerateTrainingLoopsForSession({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'speak_live',
    threadId: params.threadId,
    scenarioId: params.scenarioId,
    scenarioSlug: params.scenarioSlug,
    insights,
    mergedProfile: merged,
    speakLiveEvaluation: params.evaluation,
    readAloudResult: null,
    storeGenerationDebug: shouldPersistTrainingLoopGenerationDebug(),
  })
}

export async function ingestTextConversationSession(params: {
  pool: sql.ConnectionPool
  userId: string
  threadId: string
  scenarioId: string
  scenarioSlug: string | null
  summary: ConversationSummary
  feedback: FeedbackItem[]
}): Promise<void> {
  const exists = await learningRepo.hasSessionInsightForThread(params.pool, params.threadId)
  if (exists) return
  const insights = extractSessionInsightsFromTextConversation({
    sessionId: params.threadId,
    userId: params.userId,
    summary: params.summary,
    feedback: params.feedback,
    scenarioId: params.scenarioId,
    scenarioSlug: params.scenarioSlug,
  })
  const chatAtoms = extractSkillEvidenceFromChatReport({
    userId: params.userId,
    sessionId: params.threadId,
    createdAt: insights.extractedAt,
    summary: params.summary,
    feedback: params.feedback,
  })
  const additionalSkillEvidence = atomsToSkillEvidence(chatAtoms, sessionTypeWeightForSkillMerge('text_conversation'))
  const merged = await mergeSessionInsightsIntoProfilePersisted({
    pool: params.pool,
    userId: params.userId,
    insights,
    sessionType: 'text_conversation',
    scenarioId: params.scenarioId,
    additionalSkillEvidence,
  })
  await saveSessionLearningInsights({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'text_conversation',
    threadId: params.threadId,
    scenarioId: params.scenarioId,
    insights,
    signals: { source: 'text_end_conversation' },
  })
  await tryGenerateTrainingLoopsForSession({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'text_conversation',
    threadId: params.threadId,
    scenarioId: params.scenarioId,
    scenarioSlug: params.scenarioSlug,
    insights,
    mergedProfile: merged,
    speakLiveEvaluation: null,
    readAloudResult: null,
    storeGenerationDebug: shouldPersistTrainingLoopGenerationDebug(),
  })
}

export async function ingestReadAloudEvaluation(params: {
  pool: sql.ConnectionPool
  userId: string
  result: ReadAloudEvaluateResult
}): Promise<void> {
  const sessionId = newId()
  const insights = extractSessionInsightsFromReadAloud({
    sessionId,
    userId: params.userId,
    result: params.result,
  })
  const readAloudAtoms = extractSkillEvidenceFromReadAloudReport({
    userId: params.userId,
    sessionId,
    createdAt: insights.extractedAt,
    result: params.result,
  })
  const additionalSkillEvidence = atomsToSkillEvidence(readAloudAtoms, sessionTypeWeightForSkillMerge('read_aloud'))
  const merged = await mergeSessionInsightsIntoProfilePersisted({
    pool: params.pool,
    userId: params.userId,
    insights,
    sessionType: 'read_aloud',
    scenarioId: null,
    additionalSkillEvidence,
  })
  await saveSessionLearningInsights({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'read_aloud',
    threadId: null,
    scenarioId: null,
    insights,
    signals: { source: 'read_aloud_evaluate', reportKind: params.result.reportKind },
  })
  await tryGenerateTrainingLoopsForSession({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'read_aloud',
    threadId: null,
    scenarioId: null,
    scenarioSlug: null,
    insights,
    mergedProfile: merged,
    speakLiveEvaluation: null,
    readAloudResult: params.result,
    storeGenerationDebug: shouldPersistTrainingLoopGenerationDebug(),
  })
}

export function fireAndForgetLearningIngestion(run: () => Promise<void>, label: string): void {
  void run().catch((e) => aiLogError('learning_memory_ingest_failed', e, { label }))
}

/** Merge quick captures into learning memory + skill profile + personalized training loops. */
export async function ingestQuickCaptureEnriched(params: {
  pool: sql.ConnectionPool
  userId: string
  captureId: string
  captureType: QuickCaptureType
  primaryText: string
  secondaryText?: string | null
  placeKind?: string | null
  enrichment: QuickCaptureEnrichmentPayload
}): Promise<void> {
  const dup = await learningRepo.hasSessionInsightForQuickCaptureSessionId(
    params.pool,
    params.userId,
    params.captureId,
  )
  if (dup) return

  const insights = extractSessionInsightsFromQuickCapture({
    captureId: params.captureId,
    userId: params.userId,
    captureType: params.captureType,
    primaryText: params.primaryText,
    secondaryText: params.secondaryText,
    placeKind: params.placeKind ?? null,
    enrichment: { ...params.enrichment, phase: 'capture_enriched' },
    scenarioId: null,
  })
  const supplemental = extractQuickCaptureTypeSkillEvidence({
    captureId: params.captureId,
    atIso: insights.extractedAt,
    captureType: params.captureType,
    enrichment: params.enrichment,
  })
  const merged = await mergeSessionInsightsIntoProfilePersisted({
    pool: params.pool,
    userId: params.userId,
    insights,
    sessionType: 'quick_capture',
    scenarioId: insights.scenarioPerformance?.scenarioId ?? null,
    additionalSkillEvidence: supplemental,
  })
  await saveSessionLearningInsights({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'quick_capture',
    threadId: null,
    scenarioId: null,
    insights,
    signals: { source: 'quick_capture_enriched', captureId: params.captureId },
  })
  await tryGenerateTrainingLoopsForSession({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'quick_capture',
    threadId: null,
    scenarioId: insights.scenarioPerformance?.scenarioId ?? null,
    scenarioSlug: insights.scenarioPerformance?.scenarioSlug ?? null,
    insights,
    mergedProfile: merged,
    speakLiveEvaluation: null,
    readAloudResult: null,
    storeGenerationDebug: shouldPersistTrainingLoopGenerationDebug(),
  })
}

/** After a “From your day” pack is completed — one consolidated insight row keyed by pack id. */
export async function ingestQuickCaptureDayPackComplete(params: {
  pool: sql.ConnectionPool
  userId: string
  packId: string
  combinedPrimaryText: string
}): Promise<void> {
  const dup = await learningRepo.hasSessionInsightForQuickCaptureSessionId(
    params.pool,
    params.userId,
    params.packId,
  )
  if (dup) return

  const enrichment: QuickCaptureEnrichmentPayload = {
    tags: ['from_your_day'],
    scenarioSlugGuess: null,
    registerNotes: null,
    phase: 'day_practice_complete',
  }
  const insights = extractSessionInsightsFromQuickCapture({
    captureId: params.packId,
    userId: params.userId,
    captureType: 'log_struggle',
    primaryText: params.combinedPrimaryText,
    secondaryText: null,
    placeKind: null,
    enrichment,
    scenarioId: null,
  })
  const supplemental = extractQuickCaptureTypeSkillEvidence({
    captureId: params.packId,
    atIso: insights.extractedAt,
    captureType: 'log_struggle',
    enrichment,
  })
  const merged = await mergeSessionInsightsIntoProfilePersisted({
    pool: params.pool,
    userId: params.userId,
    insights,
    sessionType: 'quick_capture',
    scenarioId: insights.scenarioPerformance?.scenarioId ?? null,
    additionalSkillEvidence: supplemental,
  })
  await saveSessionLearningInsights({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'quick_capture',
    threadId: null,
    scenarioId: null,
    insights,
    signals: { source: 'quick_capture_day_pack', packId: params.packId },
  })
  await tryGenerateTrainingLoopsForSession({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'quick_capture',
    threadId: null,
    scenarioId: insights.scenarioPerformance?.scenarioId ?? null,
    scenarioSlug: insights.scenarioPerformance?.scenarioSlug ?? null,
    insights,
    mergedProfile: merged,
    speakLiveEvaluation: null,
    readAloudResult: null,
    storeGenerationDebug: shouldPersistTrainingLoopGenerationDebug(),
  })
}

/**
 * Persists session insights + personalized training loops for a completed listening session.
 * Profile merge is already applied elsewhere ({@link applyListeningSessionToUserLearningProfile}); this only
 * records analytics rows and generates drills keyed to the listening session id.
 */
export async function ingestListeningSessionForTrainingLoops(params: {
  pool: sql.ConnectionPool
  userId: string
  listeningSessionId: string
  scenarioId: string | null
  session: ListeningSession
  attempts: ListeningAttempt[]
  mergedProfile: UserLearningProfile
}): Promise<void> {
  const exists = await learningRepo.hasSessionInsightForListeningSession(
    params.pool,
    params.userId,
    params.listeningSessionId,
  )
  if (exists) {
    aiLogInfo('listening_training_loop_skip_duplicate_insight', { sessionId: params.listeningSessionId })
    return
  }
  const extractedAt = new Date().toISOString()
  const insights = extractSessionInsightsFromListeningSession({
    session: params.session,
    attempts: params.attempts,
    extractedAt,
  })
  await saveSessionLearningInsights({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'listening',
    threadId: null,
    scenarioId: params.scenarioId,
    insights,
    signals: { source: 'listening_finalize' },
  })
  const listeningSessionMeta = {
    packId: params.session.trackId ?? 'pack-cafe-burst',
    level: params.session.level,
    scenarioKey: params.session.scenarioId,
    missedClipIds: params.attempts.filter((a) => a.evaluation?.correct !== true).map((a) => a.clipId),
  }
  await tryGenerateTrainingLoopsForSession({
    pool: params.pool,
    userId: params.userId,
    sessionType: 'listening',
    threadId: null,
    scenarioId: params.scenarioId,
    scenarioSlug: params.session.scenarioId,
    insights,
    mergedProfile: params.mergedProfile,
    speakLiveEvaluation: null,
    readAloudResult: null,
    listeningSessionMeta,
    storeGenerationDebug: shouldPersistTrainingLoopGenerationDebug(),
  })
}
