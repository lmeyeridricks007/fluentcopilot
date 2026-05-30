import type sql from 'mssql'
import * as userRepo from '../../repositories/userRepository'
import * as qcRepo from '../../repositories/quickCaptureRepository'
import { runQuickCaptureEnrichment, type RawCapturePayload } from './quickCaptureEnrichment'
import { buildPersonalizedDayPracticePack, type PracticePackMode } from './quickCaptureDayPackService'
import { createQuickCaptureDomainRepository } from '../../repositories/sql/quickCaptureDomainSqlRepository'
import {
  ingestQuickCaptureDayPackComplete,
  ingestQuickCaptureEnriched,
} from '../learning-memory/learningMemoryPipeline'
import { aiLogError, aiLogInfo } from '../ai/logging/aiRunLogger'
import { publishAppEvent } from '../serviceBus/serviceBusPublisher'
import { rebuildDailyCaptureBundleSafe } from './dailyCaptureBundleService'
import { tryGetBlobReadSasUrl } from '../storage/blobStorageService'

/**
 * Inserts should not stay on `new` when the client already sent practiceable text.
 * Otherwise “From your day” (which lists `ready_for_practice`) stays empty until async enrichment runs —
 * which often never happens in local/dev without the enrichment worker.
 */
export function initialInsertStatusForQuickCapture(
  captureType: qcRepo.QuickCaptureType,
  bodyPrimary: string | null,
  transcript: string | null,
): qcRepo.QuickCaptureStatus {
  const primary = (bodyPrimary ?? '').trim()
  const tr = (transcript ?? '').trim()
  const hasText = primary.length > 0 || tr.length > 0
  if (!hasText) return 'new'
  switch (captureType) {
    case 'save_word':
    case 'save_phrase':
    case 'paste_text':
    case 'log_struggle':
    case 'add_place':
    case 'voice_note':
      return 'ready_for_practice'
    case 'photo_text':
      // Typed caption / OCR text in primary → ok; image-only capture waits for enrichment.
      return primary.length > 0 ? 'ready_for_practice' : 'new'
    default:
      return 'new'
  }
}

const EXCLUDED_FROM_FROM_YOUR_DAY_PACK: qcRepo.QuickCaptureStatus[] = ['archived', 'practiced', 'saved_long_term']

function rowUsableForFromYourDayPack(r: qcRepo.QuickCaptureRow): boolean {
  const text = (r.bodyPrimary ?? r.transcript ?? '').trim()
  return text.length > 0 && !EXCLUDED_FROM_FROM_YOUR_DAY_PACK.includes(r.status)
}

export async function createQuickCapture(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  captureType: qcRepo.QuickCaptureType
  title: string | null
  bodyPrimary: string | null
  bodySecondary: string | null
  localCaptureDate: string
  placeKind?: string | null
  imageMime?: string | null
  raw?: RawCapturePayload | null
  transcript?: string | null
}): Promise<{ id: string }> {
  const userId = await userRepo.ensureUser(params.pool, params.externalUserId)
  const rawJson = params.raw ? JSON.stringify(params.raw) : null
  const insertStatus = initialInsertStatusForQuickCapture(
    params.captureType,
    params.bodyPrimary,
    params.transcript ?? null,
  )
  const id = await qcRepo.insertQuickCapture({
    pool: params.pool,
    userId,
    captureType: params.captureType,
    status: insertStatus,
    title: params.title,
    bodyPrimary: params.bodyPrimary,
    bodySecondary: params.bodySecondary,
    rawJson,
    localCaptureDate: params.localCaptureDate,
    placeKind: params.placeKind ?? null,
    imageMime: params.imageMime ?? null,
    transcript: params.transcript?.trim() ? params.transcript.trim() : null,
  })

  void publishAppEvent('quick_capture_enrichment_requested', {
    captureId: id,
    userId,
    captureType: params.captureType,
  }).catch(() => {})

  void enrichQuickCaptureJob({ pool: params.pool, userId, captureId: id, captureType: params.captureType }).catch(
    (e) => aiLogError('quick_capture_enrich_job_failed', e, { captureId: id }),
  )

  return { id }
}

async function enrichQuickCaptureJob(input: {
  pool: sql.ConnectionPool
  userId: string
  captureId: string
  captureType: qcRepo.QuickCaptureType
}): Promise<void> {
  const row = await qcRepo.getQuickCaptureById(input.pool, input.userId, input.captureId)
  if (!row) return
  const bundleDate = row.localCaptureDate
  try {
    let raw: RawCapturePayload | null = null
    if (row.rawJson) {
      try {
        raw = JSON.parse(row.rawJson) as RawCapturePayload
      } catch {
        raw = null
      }
    }
    const enriched = await runQuickCaptureEnrichment({
      captureType: row.captureType,
      bodyPrimary: row.bodyPrimary,
      bodySecondary: row.bodySecondary,
      raw,
      userId: input.userId,
      captureId: input.captureId,
      title: row.title,
      transcriptHint: row.transcript,
    })
    const enrichedJson = JSON.stringify({
      ...enriched.enrichment,
      ocrText: enriched.ocrText,
      capturedAt: row.createdAt,
      pipelineVersion: 2,
    })
    const mergedPrimary = (enriched.bodyPrimary ?? row.bodyPrimary ?? '').trim()
    const nextStatus: qcRepo.QuickCaptureStatus = mergedPrimary ? 'ready_for_practice' : 'enriched'
    await qcRepo.updateQuickCaptureEnriched({
      pool: input.pool,
      captureId: input.captureId,
      userId: input.userId,
      enrichedJson,
      status: nextStatus,
      title: row.title,
      bodyPrimary: enriched.bodyPrimary ?? row.bodyPrimary,
      bodySecondary: enriched.bodySecondary ?? row.bodySecondary,
      transcript: enriched.transcript ?? row.transcript,
    })

    if (enriched.replacementRawJson) {
      await qcRepo.updateQuickCaptureRawJson({
        pool: input.pool,
        captureId: input.captureId,
        userId: input.userId,
        rawJson: enriched.replacementRawJson,
      })
    }

    const primary = mergedPrimary
    if (!primary) {
      aiLogInfo('quick_capture_enrich_skip_memory', { captureId: input.captureId, reason: 'empty_primary' })
      return
    }
    await ingestQuickCaptureEnriched({
      pool: input.pool,
      userId: input.userId,
      captureId: input.captureId,
      captureType: row.captureType,
      primaryText: primary,
      secondaryText: enriched.bodySecondary ?? row.bodySecondary,
      placeKind: row.placeKind,
      enrichment: enriched.enrichment,
    })
  } finally {
    await rebuildDailyCaptureBundleSafe({
      pool: input.pool,
      userId: input.userId,
      localDate: bundleDate,
    })
  }
}

export async function listQuickCaptures(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  status?: qcRepo.QuickCaptureStatus | qcRepo.QuickCaptureStatus[]
  localDate?: string
}): Promise<qcRepo.QuickCaptureRow[]> {
  const userId = await userRepo.ensureUser(params.pool, params.externalUserId)
  return qcRepo.listQuickCapturesForUser({
    pool: params.pool,
    userId,
    status: params.status,
    localDate: params.localDate,
    limit: 200,
  })
}

export type QuickCaptureVoicePlaybackResult =
  | { url: string }
  | { error: 'not_found' | 'not_voice' | 'no_audio' | 'unavailable' }

export async function getQuickCaptureVoicePlaybackUrl(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  captureId: string
}): Promise<QuickCaptureVoicePlaybackResult> {
  const userId = await userRepo.getUserInternalId(params.pool, params.externalUserId)
  if (!userId) return { error: 'not_found' }
  const row = await qcRepo.getQuickCaptureById(params.pool, userId, params.captureId)
  if (!row) return { error: 'not_found' }
  if (row.captureType !== 'voice_note') return { error: 'not_voice' }
  let raw: Record<string, unknown> | null = null
  if (row.rawJson) {
    try {
      raw = JSON.parse(row.rawJson) as Record<string, unknown>
    } catch {
      raw = null
    }
  }
  const blobPath = typeof raw?.voiceBlobPath === 'string' ? raw.voiceBlobPath.trim() : ''
  if (!blobPath) return { error: 'no_audio' }
  const url = await tryGetBlobReadSasUrl(blobPath)
  if (!url) return { error: 'unavailable' }
  return { url }
}

export type QuickCaptureTodaySummary = {
  readyCount: number
  newCount: number
  /** Same-day captures that can start a From-your-day pack (has text + ready_for_practice). */
  practiceReadyCount: number
  struggleCaptureCount: number
  maxSameTopicRepeats: number
  highValueCaptureCount: number
  suggestionPriorityScore: number
  previewFragments: string[]
  /** Short text samples for weakness / skill overlap scoring (Today suggestion). */
  primarySnippets: string[]
}

function parseScenarioSlugGuess(enrichedJson: string | null): string | null {
  if (!enrichedJson) return null
  try {
    const j = JSON.parse(enrichedJson) as { scenarioSlugGuess?: string | null }
    const s = typeof j.scenarioSlugGuess === 'string' ? j.scenarioSlugGuess.trim().toLowerCase() : ''
    return s.length ? s : null
  } catch {
    return null
  }
}

function placeKindPreviewLabel(placeKind: string | null): string | null {
  if (!placeKind?.trim()) return null
  const raw = placeKind.trim().toLowerCase().replace(/[_-]+/g, ' ')
  return raw.replace(/\b\w/g, (c) => c.toUpperCase())
}

function primaryText(r: qcRepo.QuickCaptureRow): string {
  const a = (r.bodyPrimary ?? '').trim()
  const b = (r.transcript ?? '').trim()
  return a.length ? a : b
}

/**
 * Counts + lightweight signals for Today suggestion ranking (From your day).
 * `readyCount` remains “enriched or ready” for legacy callers; practice uses {@link QuickCaptureTodaySummary.practiceReadyCount}.
 */
export async function summarizeQuickCaptures(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  localDate: string
}): Promise<QuickCaptureTodaySummary> {
  const userId = await userRepo.ensureUser(params.pool, params.externalUserId)
  const rows = await qcRepo.listQuickCapturesForUser({
    pool: params.pool,
    userId,
    localDate: params.localDate,
    limit: 400,
  })
  let readyCount = 0
  let newCount = 0
  let practiceReadyCount = 0
  let struggleCaptureCount = 0
  let highValueCaptureCount = 0
  const placeKindCounts = new Map<string, number>()
  const scenarioCounts = new Map<string, number>()
  const primarySnippets: string[] = []

  for (const r of rows) {
    if (r.status === 'ready_for_practice' || r.status === 'enriched') readyCount += 1
    if (r.status === 'new') newCount += 1

    const text = primaryText(r)
    const usable = text.length > 0 && ['new', 'enriched', 'ready_for_practice'].includes(r.status)
    if (!usable) continue

    if (r.status === 'ready_for_practice' && text.length > 0) practiceReadyCount += 1

    if (r.captureType === 'log_struggle') struggleCaptureCount += 1

    const hv =
      r.captureType === 'add_place' ||
      r.captureType === 'voice_note' ||
      r.captureType === 'log_struggle' ||
      r.captureType === 'save_phrase' ||
      r.captureType === 'photo_text' ||
      r.captureType === 'paste_text'
    if (hv) highValueCaptureCount += 1

    if (r.captureType === 'add_place' && r.placeKind?.trim()) {
      const k = r.placeKind.trim().toLowerCase()
      placeKindCounts.set(k, (placeKindCounts.get(k) ?? 0) + 1)
    }
    const slug = parseScenarioSlugGuess(r.enrichedJson)
    if (slug) scenarioCounts.set(slug, (scenarioCounts.get(slug) ?? 0) + 1)

    if (r.status === 'ready_for_practice' && primarySnippets.length < 4) {
      primarySnippets.push(text.slice(0, 56))
    }
  }

  let maxSameTopicRepeats = 1
  for (const c of placeKindCounts.values()) maxSameTopicRepeats = Math.max(maxSameTopicRepeats, c)
  for (const c of scenarioCounts.values()) maxSameTopicRepeats = Math.max(maxSameTopicRepeats, c)

  let suggestionPriorityScore = Math.min(26, practiceReadyCount * 8)
  suggestionPriorityScore += Math.min(36, struggleCaptureCount * 18)
  suggestionPriorityScore += Math.min(24, Math.max(0, maxSameTopicRepeats - 1) * 12)
  suggestionPriorityScore += Math.min(22, highValueCaptureCount * 4)
  suggestionPriorityScore = Math.min(100, Math.round(suggestionPriorityScore))

  const previewFragments: string[] = []
  const placeEntries = [...placeKindCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [pk] of placeEntries.slice(0, 2)) {
    const label = placeKindPreviewLabel(pk)
    if (label) previewFragments.push(label)
  }
  if (struggleCaptureCount >= 1) previewFragments.push('one phrase fix')
  else if (rows.some((r) => r.captureType === 'save_phrase' && primaryText(r))) previewFragments.push('real phrases')
  else if (rows.some((r) => r.captureType === 'voice_note' && primaryText(r))) previewFragments.push('voice moments')

  const cappedPreview = previewFragments.slice(0, 3)

  return {
    readyCount,
    newCount,
    practiceReadyCount,
    struggleCaptureCount,
    maxSameTopicRepeats,
    highValueCaptureCount,
    suggestionPriorityScore,
    previewFragments: cappedPreview,
    primarySnippets,
  }
}

export async function generateFromYourDayPack(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  localDate: string
  mode?: PracticePackMode
}): Promise<
  | {
      packId: string
      steps: unknown[]
      mode: PracticePackMode
      estimatedMinutes: number
      title: string
    }
  | { error: string }
> {
  const userId = await userRepo.ensureUser(params.pool, params.externalUserId)
  await rebuildDailyCaptureBundleSafe({
    pool: params.pool,
    userId,
    localDate: params.localDate,
  })
  const candidates = await qcRepo.listQuickCapturesForUser({
    pool: params.pool,
    userId,
    localDate: params.localDate,
    limit: 80,
  })
  const usable = candidates.filter(rowUsableForFromYourDayPack)
  if (usable.length < 1) {
    return { error: 'no_captures' }
  }
  const domain = createQuickCaptureDomainRepository()
  let bundle = null
  try {
    bundle = await domain.getDailyCaptureBundleByDate(params.pool, userId, params.localDate)
  } catch {
    bundle = null
  }
  const content = buildPersonalizedDayPracticePack({
    localDate: params.localDate,
    captures: usable,
    themeClusters: bundle?.themeClusters ?? [],
    bundleCaptureIds: bundle?.captureIds ?? null,
    mode: params.mode ?? 'standard',
  })
  if (!content.steps.length) {
    return { error: 'no_steps' }
  }
  const packId = await qcRepo.insertDayPracticePack({
    pool: params.pool,
    userId,
    localDate: params.localDate,
    title: content.title,
    stepsJson: JSON.stringify(content.steps),
    captureIdsJson: JSON.stringify(content.captureIds),
  })
  await qcRepo.attachCapturesToPack({
    pool: params.pool,
    userId,
    packId,
    captureIds: content.captureIds,
    status: 'included_in_practice',
  })
  if (bundle) {
    try {
      const generatedPracticePackIds = [...new Set([...bundle.generatedPracticePackIds, packId])]
      await domain.createDailyCaptureBundle(params.pool, {
        userId,
        date: bundle.date,
        captureIds: bundle.captureIds,
        themeClusters: bundle.themeClusters,
        generatedPracticePackIds,
      })
    } catch {
      /* bundle row optional in some environments */
    }
  }
  await rebuildDailyCaptureBundleSafe({
    pool: params.pool,
    userId,
    localDate: params.localDate,
  })
  return {
    packId,
    steps: content.steps,
    mode: content.mode,
    estimatedMinutes: content.estimatedMinutes,
    title: content.title,
  }
}

export async function getFromYourDayPack(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  packId: string
}): Promise<{ pack: qcRepo.DayPracticePackRow; steps: unknown[] } | null> {
  const userId = await userRepo.getUserInternalId(params.pool, params.externalUserId)
  if (!userId) return null
  const pack = await qcRepo.getDayPracticePack(params.pool, userId, params.packId)
  if (!pack) return null
  let steps: unknown[] = []
  try {
    steps = JSON.parse(pack.stepsJson) as unknown[]
  } catch {
    steps = []
  }
  return { pack, steps }
}

export async function completeFromYourDayPack(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  packId: string
}): Promise<{ ok: boolean }> {
  const userId = await userRepo.getUserInternalId(params.pool, params.externalUserId)
  if (!userId) return { ok: false }
  const pack = await qcRepo.getDayPracticePack(params.pool, userId, params.packId)
  if (!pack || pack.status !== 'active') return { ok: false }
  await qcRepo.completeDayPracticePack({ pool: params.pool, packId: params.packId, userId })
  await qcRepo.markCapturesPracticedForPack({ pool: params.pool, userId, packId: params.packId })

  let captureTexts = ''
  try {
    const ids = JSON.parse(pack.captureIdsJson) as string[]
    const parts: string[] = []
    for (const id of ids.slice(0, 12)) {
      const c = await qcRepo.getQuickCaptureById(params.pool, userId, id)
      if (c?.bodyPrimary?.trim()) parts.push(c.bodyPrimary.trim())
    }
    captureTexts = parts.join(' | ')
  } catch {
    captureTexts = pack.title
  }

  await ingestQuickCaptureDayPackComplete({
    pool: params.pool,
    userId,
    packId: params.packId,
    combinedPrimaryText: captureTexts.slice(0, 2000) || 'From your day practice',
  })
  await rebuildDailyCaptureBundleSafe({
    pool: params.pool,
    userId,
    localDate: pack.localDate,
  })
  return { ok: true }
}

export async function patchQuickCaptureStatus(params: {
  pool: sql.ConnectionPool
  externalUserId: string
  captureId: string
  status: qcRepo.QuickCaptureStatus
}): Promise<{ ok: boolean }> {
  const userId = await userRepo.getUserInternalId(params.pool, params.externalUserId)
  if (!userId) return { ok: false }
  const before = await qcRepo.getQuickCaptureById(params.pool, userId, params.captureId)
  await qcRepo.updateQuickCaptureStatus({
    pool: params.pool,
    captureId: params.captureId,
    userId,
    status: params.status,
  })
  const localDate = before?.localCaptureDate
  if (localDate) {
    await rebuildDailyCaptureBundleSafe({ pool: params.pool, userId, localDate })
  }
  return { ok: true }
}
