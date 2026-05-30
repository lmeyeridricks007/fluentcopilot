import type sql from 'mssql'
import { getSqlPool } from '../sql/sqlPool'
import { ApiError } from '../../shared/errors'
import * as listeningRepo from '../../repositories/listeningModeRepository'
import {
  getListeningClipsForTrack as catalogClipsForTrack,
  getListeningTrackById,
  getListeningTracks,
} from '../../domain/listening/listeningTrackCatalog'
import type { ListeningTrack } from '../../domain/listening/listeningTrack'
import type { ListeningClip } from '../../domain/listening/listeningClip'
import type { ListeningDrillType } from '../../domain/listening/listeningDrillType'
import type { ListeningAttempt, ListeningAttemptAnswer, ListeningAnswerMode } from '../../domain/listening/listeningAttempt'
import type { ListeningWeaknessSignal } from '../../domain/listening/listeningWeaknessSignal'
import type { ListeningRecommendedNext } from '../../domain/listening/listeningReport'
import { normalizeListeningLevel } from '../../domain/listening/listeningLevel'
import { buildListeningReportDocument, clipMapFromSession } from './listeningReportFromAttempts'
import { getUserLearningProfile, upsertUserLearningProfile } from '../learning-memory/userLearningProfileService'
import { applyListeningSessionToUserLearningProfile } from '../../domain/learningMemory/listeningSessionProfileMerge'
import { ingestListeningSessionForTrainingLoops } from '../learning-memory/learningMemoryPipeline'
import { aiLogError } from '../ai/logging/aiRunLogger'

async function requirePool(): Promise<sql.ConnectionPool> {
  const pool = await getSqlPool()
  if (!pool) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'SQL database not configured')
  return pool
}

export { getListeningTracks, getListeningTrackById }

export async function getListeningClipsForTrack(params: {
  pool?: sql.ConnectionPool
  trackId: string
  level?: string | null
  scenarioKey?: string | null
  drillType?: ListeningDrillType | null
}): Promise<ListeningClip[]> {
  const catalog = catalogClipsForTrack({
    trackId: params.trackId,
    level: params.level ?? undefined,
    scenarioKey: params.scenarioKey ?? undefined,
    drillType: params.drillType ?? undefined,
  })
  if (!params.pool) return catalog
  const track = getListeningTrackById(params.trackId)
  const dbClips = await listeningRepo.listListeningClipLibrary(params.pool, {
    scenarioKey: params.scenarioKey?.trim() || track?.scenarioId,
    level: params.level ?? undefined,
    drillType: params.drillType ?? undefined,
  })
  const byId = new Map<string, ListeningClip>()
  for (const c of catalog) byId.set(c.id, c)
  for (const c of dbClips) byId.set(c.id, c)
  return [...byId.values()]
}

export async function createListeningSession(params: {
  userId: string
  trackId: string
  clientSessionKey?: string | null
}): Promise<{ sessionId: string; session: import('../../domain/listening/listeningSession').ListeningSession }> {
  const pool = await requirePool()
  const track = getListeningTrackById(params.trackId)
  if (!track) throw new ApiError(404, 'NOT_FOUND', 'Unknown listening track')
  const drillIds = [...track.clipIds]
  const sessionId = await listeningRepo.insertListeningSession(pool, {
    userId: params.userId,
    trackId: track.id,
    scenarioKey: track.scenarioId,
    category: track.category,
    level: track.defaultLevel,
    drillIds,
    clientSessionKey: params.clientSessionKey ?? null,
  })
  const session = await listeningRepo.getListeningSessionById(pool, params.userId, sessionId)
  if (!session) throw new ApiError(500, 'INTERNAL', 'Failed to read listening session after insert')
  return { sessionId, session }
}

export async function saveListeningAttempt(params: {
  userId: string
  sessionId: string
  clipKey: string
  drillType: ListeningDrillType
  answer: ListeningAttemptAnswer
  answerMode: ListeningAnswerMode
  correctGist: boolean | null
  correctDetails: boolean | null
  replayCount: number
  slowerReplayUsed: boolean
  transcriptRevealed: boolean
  responseLatencyMs: number | null
  evaluation: ListeningAttempt['evaluation']
}): Promise<{ attemptId: string }> {
  const pool = await requirePool()
  const session = await listeningRepo.getListeningSessionById(pool, params.userId, params.sessionId)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Listening session not found')
  if (session.status !== 'in_progress') throw new ApiError(409, 'CONFLICT', 'Session is not accepting attempts')
  const attemptId = await listeningRepo.insertListeningAttempt(pool, {
    sessionId: params.sessionId,
    clipKey: params.clipKey,
    drillType: params.drillType,
    answerJson: JSON.stringify(params.answer),
    answerMode: params.answerMode,
    correctGist: params.correctGist,
    correctDetails: params.correctDetails,
    replayCount: params.replayCount,
    slowerReplayUsed: params.slowerReplayUsed,
    transcriptRevealed: params.transcriptRevealed,
    responseLatencyMs: params.responseLatencyMs,
    evaluationJson: params.evaluation ? JSON.stringify(params.evaluation) : null,
  })
  return { attemptId }
}

export async function generateListeningReport(params: {
  userId: string
  sessionId: string
}): Promise<{ reportJson: string }> {
  const pool = await requirePool()
  const session = await listeningRepo.getListeningSessionById(pool, params.userId, params.sessionId)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Listening session not found')
  const attempts = await listeningRepo.listListeningAttemptsForSession(pool, params.sessionId)
  const clipByKey = clipMapFromSession(session, attempts)
  const doc = buildListeningReportDocument({ session, attempts, clipByKey })
  const existing = await listeningRepo.getListeningReportRowBySessionId(pool, params.userId, params.sessionId)
  if (existing) {
    return { reportJson: existing.summaryJson }
  }
  await listeningRepo.insertListeningReportRow(pool, {
    sessionId: params.sessionId,
    userId: params.userId,
    summaryJson: JSON.stringify(doc),
    dimensionsJson: JSON.stringify(doc.dimensionScores),
    weakAreasJson: JSON.stringify(doc.weakAreas),
    missedDetailsJson: JSON.stringify(doc.missedDetails),
    recommendedNextJson: JSON.stringify(doc.recommendedNext),
    relatedPracticeLoopsJson: JSON.stringify(doc.relatedPracticeLoops),
  })
  return { reportJson: JSON.stringify(doc) }
}

export async function finalizeListeningSession(params: {
  userId: string
  sessionId: string
}): Promise<{ ok: true; reportJson: string }> {
  const pool = await requirePool()
  const session = await listeningRepo.getListeningSessionById(pool, params.userId, params.sessionId)
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Listening session not found')
  const ok = await listeningRepo.finalizeListeningSessionRow(pool, params.userId, params.sessionId, 'completed')
  if (!ok) throw new ApiError(404, 'NOT_FOUND', 'Could not finalize session')
  const { reportJson } = await generateListeningReport(params)
  await updateListeningWeaknessesFromSession({ pool, userId: params.userId, sessionId: params.sessionId })
  const attempts = await listeningRepo.listListeningAttemptsForSession(pool, params.sessionId)
  const sessionAfter = await listeningRepo.getListeningSessionById(pool, params.userId, params.sessionId)
  if (sessionAfter) {
    const doc = await getUserLearningProfile(pool, params.userId)
    applyListeningSessionToUserLearningProfile(doc, {
      session: sessionAfter,
      attempts,
      nowIso: new Date().toISOString(),
    })
    await upsertUserLearningProfile(pool, params.userId, doc)
    try {
      await ingestListeningSessionForTrainingLoops({
        pool,
        userId: params.userId,
        listeningSessionId: params.sessionId,
        scenarioId: sessionAfter.scenarioId,
        session: sessionAfter,
        attempts,
        mergedProfile: doc,
      })
    } catch (e) {
      aiLogError('listening_training_loop_ingest_failed', e, { sessionId: params.sessionId })
    }
  }
  return { ok: true, reportJson }
}

export async function getListeningWeaknesses(userId: string): Promise<ListeningWeaknessSignal[]> {
  const pool = await requirePool()
  return listeningRepo.listListeningWeaknessSignals(pool, userId, 48)
}

export async function getListeningRecommendations(userId: string): Promise<{
  tracks: ListeningTrack[]
  copy: ListeningRecommendedNext[]
}> {
  const weaknesses = await getListeningWeaknesses(userId)
  const tracks = getListeningTracks()
  const keys = new Set(weaknesses.map((w) => w.weaknessKey))
  const copy: ListeningRecommendedNext[] = []
  if (keys.has('detail_under_pressure') || keys.has('numbers_times')) {
    copy.push({
      kind: 'coach_copy',
      title: 'Catch numbers in polite bundles',
      subtitle: 'Café + train bursts still help most learners.',
    })
  }
  if (keys.has('replay_dependence')) {
    copy.push({
      kind: 'coach_copy',
      title: 'One honest first listen',
      subtitle: 'Answer, then replay slower — train the reflex you use live.',
    })
  }
  if (!copy.length) {
    copy.push({
      kind: 'coach_copy',
      title: 'Keep bursts short',
      subtitle: 'Gist first, then one detail drill — same rhythm as real counters.',
    })
  }
  return { tracks: tracks.slice(0, 4), copy }
}

export async function updateListeningWeaknessesFromSession(params: {
  pool: sql.ConnectionPool
  userId: string
  sessionId: string
}): Promise<void> {
  const { pool, userId, sessionId } = params
  const attempts = await listeningRepo.listListeningAttemptsForSession(pool, sessionId)
  for (const a of attempts) {
    const ev = a.evaluation
    const correct = ev?.correct === true
    if (!correct && (a.drillType === 'detail' || a.drillType === 'instruction')) {
      await listeningRepo.upsertListeningWeaknessSignal(pool, {
        userId,
        weaknessKey: 'detail_under_pressure',
        severity: 0.55,
        evidenceJson: JSON.stringify({ sessionId, clipId: a.clipId }),
      })
    }
    if (!correct && a.drillType === 'fast_speech') {
      await listeningRepo.upsertListeningWeaknessSignal(pool, {
        userId,
        weaknessKey: 'fast_speech',
        severity: 0.5,
        evidenceJson: JSON.stringify({ sessionId, clipId: a.clipId }),
      })
    }
    if (a.replayCount >= 3 && !correct) {
      await listeningRepo.upsertListeningWeaknessSignal(pool, {
        userId,
        weaknessKey: 'replay_dependence',
        severity: 0.42,
        evidenceJson: JSON.stringify({ sessionId, clipId: a.clipId }),
      })
    }
    if (a.transcriptRevealed && !correct) {
      await listeningRepo.upsertListeningWeaknessSignal(pool, {
        userId,
        weaknessKey: 'transcript_dependence',
        severity: 0.4,
        evidenceJson: JSON.stringify({ sessionId, clipId: a.clipId }),
      })
    }
  }
}

export function coerceListeningLevel(input: string | undefined | null): string {
  return normalizeListeningLevel(input ?? undefined)
}
