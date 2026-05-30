import type sql from 'mssql'
import * as qcRepo from '../../repositories/quickCaptureRepository'
import { createQuickCaptureDomainRepository } from '../../repositories/sql/quickCaptureDomainSqlRepository'
import { getUserActiveWeaknesses } from '../learning-memory/userLearningProfileService'
import { aiLogError, aiLogInfo } from '../ai/logging/aiRunLogger'
import { buildThemeClusters, orderedCaptureIdsFromClusters } from './dailyCaptureBundleClustering'

async function weaknessTokenKeys(pool: sql.ConnectionPool, userId: string): Promise<string[]> {
  try {
    const w = await getUserActiveWeaknesses(pool, userId)
    const keys = new Set<string>()
    for (const v of w.vocabulary) {
      if (v.normalizedKey) keys.add(v.normalizedKey.toLowerCase())
      const dt = v.displayText?.trim().toLowerCase()
      if (dt && dt.length >= 3) keys.add(dt)
    }
    for (const g of w.grammarPatterns) {
      const id = g.patternId?.trim().toLowerCase()
      if (id) keys.add(id)
      const lb = g.label?.trim().toLowerCase()
      if (lb && lb.length >= 3) keys.add(lb)
    }
    return [...keys].slice(0, 160)
  } catch {
    return []
  }
}

/**
 * Rebuilds {@link dbo.UserDailyCaptureBundles} for one user + calendar day from `UserQuickCaptures`.
 * - Ignores `archived` rows for clustering (see {@link buildThemeClusters}).
 * - Prioritization is baked into cluster `priorityScore` (status, recency, struggle, weakness overlap, theme density).
 * - Preserves `generatedPracticePackIds` when updating an existing row.
 */
export async function rebuildDailyCaptureBundleForDate(params: {
  pool: sql.ConnectionPool
  userId: string
  localDate: string
}): Promise<void> {
  const { pool, userId, localDate } = params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return

  const rows = await qcRepo.listQuickCapturesForUser({
    pool,
    userId,
    localDate,
    limit: 220,
  })

  const weaknessKeys = await weaknessTokenKeys(pool, userId)
  const clusters = buildThemeClusters(rows, weaknessKeys)
  const captureIds = orderedCaptureIdsFromClusters(clusters)

  const domain = createQuickCaptureDomainRepository()
  const existing = await domain.getDailyCaptureBundleByDate(pool, userId, localDate)
  const generatedPracticePackIds = existing?.generatedPracticePackIds ?? []

  await domain.createDailyCaptureBundle(pool, {
    userId,
    date: localDate,
    captureIds,
    themeClusters: clusters,
    generatedPracticePackIds,
  })

  aiLogInfo('daily_capture_bundle_rebuilt', {
    userId,
    localDate,
    clusterCount: clusters.length,
    captureCount: captureIds.length,
  })
}

export async function rebuildDailyCaptureBundleSafe(params: {
  pool: sql.ConnectionPool
  userId: string
  localDate: string
}): Promise<void> {
  try {
    await rebuildDailyCaptureBundleForDate(params)
  } catch (e) {
    aiLogError('daily_capture_bundle_rebuild_failed', e, {
      userId: params.userId,
      localDate: params.localDate,
    })
  }
}
