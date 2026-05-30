import type { HttpRequest, InvocationContext } from '@azure/functions'
import { z } from 'zod'
import { readJson, requireUserId } from '../../shared/http'
import { ApiError } from '../../shared/errors'
import { getSqlPool } from '../sql/sqlPool'
import * as userRepo from '../../repositories/userRepository'
import * as listeningRepo from '../../repositories/listeningModeRepository'
import * as listeningModeService from './listeningModeService'

const DRILL_TYPE_ENUM = z.enum([
  'gist',
  'detail',
  'listen_respond',
  'instruction',
  'fast_speech',
  'replay_reveal',
  'personalized_focus',
])

const ANSWER_MODE_ENUM = z.enum(['mcq', 'tap', 'voice', 'skipped'])

async function requirePool() {
  const pool = await getSqlPool()
  if (!pool) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'SQL database not configured')
  return pool
}

const CreateSessionBodySchema = z
  .object({
    trackId: z.string().min(1).max(128),
    clientSessionKey: z.string().max(128).optional().nullable(),
  })
  .strict()

const SaveAttemptBodySchema = z
  .object({
    clipKey: z.string().min(1).max(128),
    drillType: DRILL_TYPE_ENUM,
    answer: z
      .object({
        selectedIndex: z.number().int().optional().nullable(),
        selectedLabel: z.string().optional().nullable(),
        raw: z.string().optional().nullable(),
      })
      .strict(),
    answerMode: ANSWER_MODE_ENUM,
    correctGist: z.boolean().nullable().optional(),
    correctDetails: z.boolean().nullable().optional(),
    replayCount: z.number().int().min(0).max(99),
    slowerReplayUsed: z.boolean(),
    transcriptRevealed: z.boolean(),
    responseLatencyMs: z.number().int().min(0).max(120_000).nullable().optional(),
    evaluation: z
      .object({
        correct: z.boolean().optional(),
        notes: z.array(z.string()).optional().nullable(),
        tags: z.array(z.string()).optional().nullable(),
      })
      .strict()
      .optional()
      .nullable(),
  })
  .strict()

export async function handleGetListeningTracks(_req: HttpRequest, ctx: InvocationContext) {
  void ctx
  requireUserId(_req)
  return { tracks: listeningModeService.getListeningTracks() }
}

export async function handleGetListeningTrack(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  requireUserId(req)
  const trackId = req.params.trackId?.trim()
  if (!trackId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing trackId')
  const track = listeningModeService.getListeningTrackById(trackId)
  if (!track) throw new ApiError(404, 'NOT_FOUND', 'Track not found')
  return { track }
}

export async function handleGetListeningClips(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  requireUserId(req)
  const pool = await requirePool()
  let trackId = ''
  let level: string | null = null
  let scenarioKey: string | null = null
  let drillType: z.infer<typeof DRILL_TYPE_ENUM> | null = null
  try {
    const u = new URL(req.url)
    trackId = u.searchParams.get('trackId')?.trim() ?? ''
    level = u.searchParams.get('level')?.trim() ?? null
    scenarioKey = u.searchParams.get('scenarioKey')?.trim() ?? null
    const dt = u.searchParams.get('drillType')?.trim() ?? ''
    const p = DRILL_TYPE_ENUM.safeParse(dt)
    drillType = p.success ? p.data : null
  } catch {
    trackId = ''
  }
  if (!trackId) throw new ApiError(400, 'VALIDATION_ERROR', 'trackId query required')
  const clips = await listeningModeService.getListeningClipsForTrack({
    pool,
    trackId,
    level,
    scenarioKey,
    drillType,
  })
  return { clips }
}

export async function handlePostListeningSession(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  const raw = await readJson(req)
  const body = CreateSessionBodySchema.parse(raw ?? {})
  return listeningModeService.createListeningSession({ userId: uid, ...body })
}

export async function handlePostListeningAttempt(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const sessionId = req.params.sessionId?.trim()
  if (!sessionId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing sessionId')
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  const raw = await readJson(req)
  const body = SaveAttemptBodySchema.parse(raw ?? {})
  return listeningModeService.saveListeningAttempt({
    userId: uid,
    sessionId,
    clipKey: body.clipKey,
    drillType: body.drillType,
    answer: body.answer,
    answerMode: body.answerMode,
    correctGist: body.correctGist ?? null,
    correctDetails: body.correctDetails ?? null,
    replayCount: body.replayCount,
    slowerReplayUsed: body.slowerReplayUsed,
    transcriptRevealed: body.transcriptRevealed,
    responseLatencyMs: body.responseLatencyMs ?? null,
    evaluation: body.evaluation ?? null,
  })
}

export async function handlePostListeningFinalize(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const sessionId = req.params.sessionId?.trim()
  if (!sessionId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing sessionId')
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  return listeningModeService.finalizeListeningSession({ userId: uid, sessionId })
}

export async function handleGetListeningRecommendations(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  return listeningModeService.getListeningRecommendations(uid)
}

export async function handleGetListeningWeaknesses(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  const weaknesses = await listeningModeService.getListeningWeaknesses(uid)
  return { weaknesses }
}

export async function handleGetListeningReport(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const sessionId = req.params.sessionId?.trim()
  if (!sessionId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing sessionId')
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  const row = await listeningRepo.getListeningReportRowBySessionId(pool, uid, sessionId)
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Report not found')
  return {
    report: JSON.parse(row.summaryJson) as unknown,
    dimensionsJson: row.dimensionsJson,
    weakAreasJson: row.weakAreasJson,
    missedDetailsJson: row.missedDetailsJson,
    recommendedNextJson: row.recommendedNextJson,
    relatedPracticeLoopsJson: row.relatedPracticeLoopsJson,
    createdAt: row.createdAt,
  }
}
