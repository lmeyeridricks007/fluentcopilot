/**
 * Product-facing persistence API for Personalized Training Loops.
 * Wraps {@link personalizedTrainingLoopRepository} with typed helpers + audit events.
 */
import type sql from 'mssql'
import type {
  PersonalizedTrainingLoop,
  TrainingLoopCompletionResult,
  TrainingLoopDevDiagnosticsSnapshot,
  TrainingLoopGenerationDebug,
  TrainingLoopPatch,
} from '../../domain/trainingLoops/trainingLoopTypes'
import type { RecentLoopDedupeRow } from '../../domain/trainingLoops/trainingLoopGenerationEngine'
import * as repo from '../../repositories/personalizedTrainingLoopRepository'
import { getUserLearningProfile, upsertUserLearningProfile } from '../learning-memory/userLearningProfileService'
import { applyTrainingLoopCompletionToLearningProfile } from './trainingLoopProfileFeedback'
import { ALL_SKILL_IDS, type SkillId } from '../../domain/skills/skillTypes'
import { aiLogError } from '../ai/logging/aiRunLogger'
import {
  buildCompletionInsight,
  mergeTypedCompletionPayload,
} from '../../domain/trainingLoops/trainingLoopCompletionResultModels'

function asSkillIds(raw: string[]): SkillId[] {
  const allow = new Set<string>(ALL_SKILL_IDS)
  return raw.filter((id): id is SkillId => allow.has(id))
}

export async function getActiveTrainingLoops(
  pool: sql.ConnectionPool,
  userId: string,
  limit = 12,
): Promise<PersonalizedTrainingLoop[]> {
  return repo.listActiveLoopsForUser(pool, userId, limit)
}

export async function getTrainingLoopById(
  pool: sql.ConnectionPool,
  userId: string,
  loopId: string,
): Promise<PersonalizedTrainingLoop | null> {
  return repo.getLoopById(pool, userId, loopId)
}

export type CreateTrainingLoopInput = Parameters<typeof repo.insertTrainingLoop>[1]

export async function createTrainingLoop(pool: sql.ConnectionPool, input: CreateTrainingLoopInput): Promise<string> {
  return repo.insertTrainingLoop(pool, input)
}

export async function updateTrainingLoop(
  pool: sql.ConnectionPool,
  userId: string,
  loopId: string,
  patch: TrainingLoopPatch,
): Promise<boolean> {
  if (Object.keys(patch).length === 0) return true
  const ok = await repo.updateTrainingLoopPatch(pool, { userId, loopId, patch })
  if (ok) {
    try {
      await repo.insertTrainingLoopEvent({
        pool,
        loopId,
        userId,
        eventType: 'patched',
        resultJson: JSON.stringify({ patch }),
      })
    } catch {
      /* TrainingLoopEvents table optional until migration 035 */
    }
  }
  return ok
}

export async function markTrainingLoopInProgress(
  pool: sql.ConnectionPool,
  userId: string,
  loopId: string,
): Promise<boolean> {
  const ok = await repo.updateLoopStatus(pool, { userId, loopId, status: 'in_progress' })
  if (ok) {
    try {
      await repo.insertTrainingLoopEvent({
        pool,
        loopId,
        userId,
        eventType: 'started',
        resultJson: null,
      })
    } catch {
      /* optional audit table */
    }
  }
  return ok
}

export async function dismissTrainingLoop(
  pool: sql.ConnectionPool,
  userId: string,
  loopId: string,
): Promise<boolean> {
  const ok = await repo.dismissLoopWithPriorityDemotion(pool, userId, loopId)
  if (ok) {
    try {
      await repo.insertTrainingLoopEvent({
        pool,
        loopId,
        userId,
        eventType: 'dismissed',
        resultJson: null,
      })
    } catch {
      /* optional audit table */
    }
  }
  return ok
}

/** Expires active/in_progress loops past `ExpiresAt`; returns rows affected. */
export async function markStaleTrainingLoops(pool: sql.ConnectionPool, userId: string): Promise<number> {
  return repo.markStaleTrainingLoopsForUser(pool, userId)
}

export async function getRecentTrainingLoops(
  pool: sql.ConnectionPool,
  userId: string,
  maxRows = 40,
): Promise<PersonalizedTrainingLoop[]> {
  return repo.listTrainingLoopsWithFilters(pool, { userId, maxRows })
}

export async function listTrainingLoopHistory(
  pool: sql.ConnectionPool,
  userId: string,
  limit = 12,
): Promise<PersonalizedTrainingLoop[]> {
  return repo.listTrainingLoopHistoryForUser(pool, userId, limit)
}

export async function getRecentLoopDedupeRows(
  pool: sql.ConnectionPool,
  userId: string,
  maxRows: number,
): Promise<RecentLoopDedupeRow[]> {
  const rows = await repo.listRecentLoopsForUser(pool, userId, maxRows)
  return rows.map((r) => {
    let targetWeaknessKeys: string[] | undefined
    try {
      targetWeaknessKeys = JSON.parse(r.TargetWeaknessKeysJson || '[]') as string[]
    } catch {
      targetWeaknessKeys = []
    }
    return {
      dedupeKey: r.DedupeKey,
      loopType: r.LoopType as RecentLoopDedupeRow['loopType'],
      status: r.Status as RecentLoopDedupeRow['status'],
      createdAt: r.CreatedAt.toISOString(),
      targetWeaknessKeys,
    }
  })
}

export async function markTrainingLoopCompleted(params: {
  pool: sql.ConnectionPool
  userId: string
  loopId: string
  /** Optional client-supplied note / partial result (merged into stored result). */
  clientResult?: Partial<TrainingLoopCompletionResult> | null
}): Promise<{ ok: boolean; loop: PersonalizedTrainingLoop | null }> {
  const loop = await repo.getLoopById(params.pool, params.userId, params.loopId)
  if (!loop) return { ok: false, loop: null }
  if (loop.status === 'completed') return { ok: true, loop }

  const cr = params.clientResult
  const typedSummary = mergeTypedCompletionPayload(loop, cr?.typedSummary ?? null)
  const completionInsight = buildCompletionInsight(loop, typedSummary)

  let profileMergeApplied = false
  try {
    const doc = await getUserLearningProfile(params.pool, params.userId)
    const now = new Date().toISOString()
    const merged = applyTrainingLoopCompletionToLearningProfile(doc, loop, now, {
      typedCompletion: typedSummary,
    })
    await upsertUserLearningProfile(params.pool, params.userId, merged)
    profileMergeApplied = true
  } catch (e) {
    aiLogError('training_loop_profile_feedback_failed', e, { loopId: params.loopId })
  }

  const result: TrainingLoopCompletionResult = {
    completedAt: cr?.completedAt ?? new Date().toISOString(),
    profileMergeApplied,
    weaknessKeysTouched: cr?.weaknessKeysTouched ?? [...loop.targetWeaknessKeys],
    skillIdsBumped: asSkillIds(cr?.skillIdsBumped ?? loop.targetSkills),
    source: cr?.source === 'client' ? 'client' : 'server',
    clientNote: cr?.clientNote ?? null,
    typedSummary,
    completionInsight,
  }

  await repo.updateLoopStatus(params.pool, {
    userId: params.userId,
    loopId: params.loopId,
    status: 'completed',
    completionResultJson: JSON.stringify(result),
  })

  try {
    await repo.insertTrainingLoopEvent({
      pool: params.pool,
      loopId: params.loopId,
      userId: params.userId,
      eventType: 'completed',
      resultJson: JSON.stringify(result),
    })
  } catch {
    /* optional audit table */
  }

  const updated = await repo.getLoopById(params.pool, params.userId, params.loopId)
  return { ok: true, loop: updated }
}

export async function hasLoopsForSourceSession(
  pool: sql.ConnectionPool,
  userId: string,
  sourceSessionId: string,
): Promise<boolean> {
  return repo.hasLoopsForSourceSession(pool, userId, sourceSessionId)
}

export async function listLoopsForThread(
  pool: sql.ConnectionPool,
  userId: string,
  threadId: string,
): Promise<PersonalizedTrainingLoop[]> {
  return repo.listLoopsForThread(pool, userId, threadId)
}

function tryParseGenerationDebugJson(raw: string | null): TrainingLoopGenerationDebug | null {
  if (!raw?.trim()) return null
  try {
    return JSON.parse(raw) as TrainingLoopGenerationDebug
  } catch {
    return null
  }
}

function previewResultJson(raw: string | null, max = 220): string | null {
  if (!raw?.trim()) return null
  const t = raw.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

/**
 * Dev Tools only — candidates, ranking, suppressed dupes (from slot-0 GenerationDebugJson) + recent lifecycle events.
 * Safe to call in non-prod; returns empty sections if SQL objects are missing.
 */
export async function getTrainingLoopDevDiagnosticsSnapshot(
  pool: sql.ConnectionPool,
  userId: string,
): Promise<TrainingLoopDevDiagnosticsSnapshot> {
  let activeRows: Awaited<ReturnType<typeof repo.listActiveLoopsWithGenerationDebugJsonForDev>> = []
  try {
    activeRows = await repo.listActiveLoopsWithGenerationDebugJsonForDev(pool, userId, 8)
  } catch {
    activeRows = []
  }
  let eventRows: Awaited<ReturnType<typeof repo.listRecentTrainingLoopLifecycleEventsForDev>> = []
  try {
    eventRows = await repo.listRecentTrainingLoopLifecycleEventsForDev(pool, userId, 35)
  } catch {
    eventRows = []
  }
  return {
    activeLoopsWithGenerationDebug: activeRows.map((r) => ({
      loopId: r.loopId,
      loopSlot: r.loopSlot,
      threadId: r.threadId,
      sourceSessionId: r.sourceSessionId,
      loopType: r.loopType,
      title: r.title,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
      generationDebug: tryParseGenerationDebugJson(r.generationDebugJson),
    })),
    recentLifecycleEvents: eventRows.map((e) => ({
      id: e.id,
      loopId: e.loopId,
      eventType: e.eventType,
      createdAt: e.createdAt.toISOString(),
      loopType: e.loopType,
      loopTitle: e.loopTitle,
      loopSlot: e.loopSlot,
      resultPreview: previewResultJson(e.resultJson),
    })),
  }
}
