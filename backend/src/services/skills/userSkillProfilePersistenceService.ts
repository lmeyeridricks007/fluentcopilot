/**
 * High-level skill profile persistence + recompute orchestration.
 */
import type sql from 'mssql'
import type { SessionLearningInsights } from '../../domain/learningMemory/sessionLearningInsightTypes'
import type { MergeContext } from '../../domain/learningMemory/userLearningProfileMergeService'
import type { SkillId, UserSkillProfile } from '../../domain/skills/skillTypes'
import { createEmptyUserSkillProfile } from '../../domain/skills/skillProfileDefaults'
import {
  appendConsolidatedSkillSnapshot,
  mergeUserSkillProfileFromSession,
} from '../../domain/skills/skillProfileMerge'
import * as learningRepo from '../../repositories/userLearningMemoryRepository'
import * as skillRepo from '../../repositories/userSkillProfileRepository'
import * as userLearningProfileService from '../learning-memory/userLearningProfileService'

function sessionWeight(t: learningRepo.SessionLearningSessionType): number {
  if (t === 'speak_live') return 1
  if (t === 'read_aloud') return 0.92
  if (t === 'listening') return 0.88
  return 0.85
}

export async function getUserSkillProfile(pool: sql.ConnectionPool, userId: string): Promise<UserSkillProfile> {
  return skillRepo.getUserSkillProfile(pool, userId)
}

export async function saveUserSkillProfile(
  pool: sql.ConnectionPool,
  userId: string,
  profile: UserSkillProfile,
): Promise<void> {
  return skillRepo.saveUserSkillProfile(pool, userId, profile)
}

export async function patchUserSkillProfile(
  pool: sql.ConnectionPool,
  userId: string,
  updater: (prev: UserSkillProfile) => UserSkillProfile,
): Promise<UserSkillProfile> {
  return skillRepo.patchUserSkillProfile(pool, userId, updater)
}

export async function getSkillMetrics(pool: sql.ConnectionPool, userId: string) {
  return skillRepo.getSkillMetrics(pool, userId)
}

export async function getSkillMetric(pool: sql.ConnectionPool, userId: string, skillId: SkillId) {
  return skillRepo.getSkillMetric(pool, userId, skillId)
}

/**
 * Rebuilds **only** `userSkillProfile` from `SessionLearningInsights` history (chronological),
 * without re-merging weakness rows (those stay as already persisted on `UserLearningProfile`).
 *
 * Snapshots: per-session snapshots suppressed during replay; one consolidated snapshot appended.
 */
export async function recomputeUserSkillProfile(pool: sql.ConnectionPool, userId: string): Promise<UserSkillProfile> {
  const rows = await learningRepo.listSessionLearningInsightsForUser({ pool, userId, maxRows: 1200 })
  let doc = await userLearningProfileService.getUserLearningProfile(pool, userId)
  const uid = doc.userId ?? userId
  doc.userSkillProfile = createEmptyUserSkillProfile(uid)

  for (const row of rows) {
    try {
      const insights = JSON.parse(row.insightsJson) as SessionLearningInsights
      if (insights.schemaVersion !== 2 || !insights.sessionId || !insights.userId) continue
      if (!Array.isArray(insights.strengths)) (insights as { strengths: unknown }).strengths = []
      const mergeCtx: MergeContext = {
        nowIso: insights.extractedAt || row.createdAt,
        scenarioId: row.scenarioId,
        sessionTypeWeight: sessionWeight(row.sessionType),
        sessionType: row.sessionType,
      }
      mergeUserSkillProfileFromSession(doc, insights, mergeCtx, { appendSnapshot: false })
    } catch {
      /* skip bad row */
    }
  }

  const nowIso = new Date().toISOString()
  appendConsolidatedSkillSnapshot(doc, nowIso)
  if (doc.userSkillProfile) {
    doc.userSkillProfile.lastRecomputedAt = nowIso
  }

  await userLearningProfileService.upsertUserLearningProfile(pool, userId, doc)
  return doc.userSkillProfile ?? createEmptyUserSkillProfile(uid)
}

/**
 * Full profile replay (weaknesses + skills) from stored insight rows — heavier; use offline/admin.
 * Delegates to existing backfill helper.
 */
export async function recomputeFullLearningProfileFromInsights(params: {
  pool: sql.ConnectionPool
  userId: string
}): Promise<void> {
  const rows = await learningRepo.listSessionLearningInsightsForUser({
    pool: params.pool,
    userId: params.userId,
    maxRows: 1200,
  })
  const newestFirst = [...rows].reverse()
  await userLearningProfileService.backfillProfileFromSessionInsights({
    pool: params.pool,
    userId: params.userId,
    rows: newestFirst.map((r) => ({
      insightsJson: r.insightsJson,
      sessionType: r.sessionType,
      scenarioId: r.scenarioId,
    })),
  })
}

/** @internal Tests — replay skills only without DB. */
export function recomputeUserSkillProfileOnDocFromInsightsRows(
  doc: import('../../domain/learningMemory/userLearningProfileDocument').UserLearningProfile,
  rows: Array<{ insightsJson: string; sessionType: learningRepo.SessionLearningSessionType; scenarioId: string | null; createdAt: string }>,
): UserSkillProfile {
  const uid = doc.userId ?? 'unknown'
  doc.userSkillProfile = createEmptyUserSkillProfile(uid)
  for (const row of rows) {
    try {
      const insights = JSON.parse(row.insightsJson) as SessionLearningInsights
      if (insights.schemaVersion !== 2 || !insights.sessionId) continue
      if (!Array.isArray(insights.strengths)) (insights as { strengths: unknown }).strengths = []
      const mergeCtx: MergeContext = {
        nowIso: insights.extractedAt || row.createdAt,
        scenarioId: row.scenarioId,
        sessionTypeWeight: sessionWeight(row.sessionType),
        sessionType: row.sessionType,
      }
      mergeUserSkillProfileFromSession(doc, insights, mergeCtx, { appendSnapshot: false })
    } catch {
      /* skip */
    }
  }
  appendConsolidatedSkillSnapshot(doc, new Date().toISOString())
  return doc.userSkillProfile ?? createEmptyUserSkillProfile(uid)
}
