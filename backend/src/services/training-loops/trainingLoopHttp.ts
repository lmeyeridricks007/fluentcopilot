import type { HttpRequest, InvocationContext } from '@azure/functions'
import { z } from 'zod'
import { readJson, requireUserId } from '../../shared/http'
import { ApiError } from '../../shared/errors'
import { getSqlPool } from '../sql/sqlPool'
import * as userRepo from '../../repositories/userRepository'
import type { TrainingLoopCompletionResult } from '../../domain/trainingLoops/trainingLoopCompletionResultModels'
import * as trainingLoopPersistence from './trainingLoopPersistenceService'
import { completeTrainingLoop } from './trainingLoopOrchestrator'
import * as liveEvalRepo from '../../repositories/liveSessionEvaluationRepository'
import type { LiveSessionEvaluation } from '../speak-live/liveVoiceEvaluationTypes'
import { hydratePracticeWordLoopPayload } from '../../domain/trainingLoops/weakWordPracticeTargets'

async function requirePool() {
  const pool = await getSqlPool()
  if (!pool) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'SQL database not configured')
  return pool
}

const TrainingLoopCompletionResultSchema = z
  .object({
    completedAt: z.string().optional(),
    profileMergeApplied: z.boolean().optional(),
    weaknessKeysTouched: z.array(z.string()).optional(),
    skillIdsBumped: z.array(z.string()).optional(),
    source: z.enum(['server', 'client']).optional(),
    clientNote: z.string().nullable().optional(),
    /** Per-loop-type structured outcome; merged with server defaults on completion. */
    typedSummary: z.record(z.string(), z.unknown()).optional(),
    completionInsight: z.string().nullable().optional(),
  })
  .strict()
  .optional()

const PatchStatusSchema = z
  .object({
    status: z.enum(['in_progress', 'completed', 'dismissed']),
    result: TrainingLoopCompletionResultSchema,
  })
  .strict()

export async function handleGetTrainingLoopHistory(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  let raw: string | null = null
  try {
    raw = new URL(req.url).searchParams.get('limit')
  } catch {
    raw = null
  }
  const limit = Math.min(40, Math.max(1, Number.parseInt(String(raw ?? '12'), 10) || 12))
  const loops = await trainingLoopPersistence.listTrainingLoopHistory(pool, uid, limit)
  return { loops }
}

export async function handleGetTrainingLoop(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const loopId = req.params.loopId?.trim()
  if (!loopId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing loopId')
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  const loop = await trainingLoopPersistence.getTrainingLoopById(pool, uid, loopId)
  if (!loop) throw new ApiError(404, 'NOT_FOUND', 'Loop not found')
  if (
    loop.threadId &&
    (loop.loopType === 'weak_words' || loop.loopType === 'pronunciation_drill')
  ) {
    const row = await liveEvalRepo.getEvaluationByThreadId(pool, loop.threadId)
    if (row?.status === 'complete' && row.evaluationJson) {
      try {
        const evaluation = JSON.parse(row.evaluationJson) as LiveSessionEvaluation
        const payload = hydratePracticeWordLoopPayload(loop.loopType, loop.payload, evaluation)
        return { loop: { ...loop, payload } }
      } catch {
        /* keep stored payload */
      }
    }
  }
  return { loop }
}

export async function handlePatchTrainingLoopStatus(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const loopId = req.params.loopId?.trim()
  if (!loopId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing loopId')
  const raw = await readJson(req)
  const body = PatchStatusSchema.parse(raw ?? {})
  const pool = await requirePool()
  const uid = await userRepo.ensureUser(pool, externalUserId)
  if (body.status === 'completed') {
    const res = await completeTrainingLoop({
      pool,
      userId: uid,
      loopId,
      clientResult: (body.result ?? null) as Partial<TrainingLoopCompletionResult> | null,
    })
    if (!res.ok) throw new ApiError(404, 'NOT_FOUND', 'Loop not found')
    return { ok: true, loop: res.loop }
  }
  if (body.status === 'in_progress') {
    const ok = await trainingLoopPersistence.markTrainingLoopInProgress(pool, uid, loopId)
    if (!ok) throw new ApiError(404, 'NOT_FOUND', 'Loop not found')
    const loop = await trainingLoopPersistence.getTrainingLoopById(pool, uid, loopId)
    return { ok: true, loop }
  }
  const ok = await trainingLoopPersistence.dismissTrainingLoop(pool, uid, loopId)
  if (!ok) throw new ApiError(404, 'NOT_FOUND', 'Loop not found')
  const loop = await trainingLoopPersistence.getTrainingLoopById(pool, uid, loopId)
  return { ok: true, loop }
}
