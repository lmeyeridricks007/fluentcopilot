import type { HttpRequest, InvocationContext } from '@azure/functions'
import { z } from 'zod'
import { ApiError } from '../../shared/errors'
import { readJson, requireUserId } from '../../shared/http'
import { getSqlPool } from '../sql/sqlPool'
import * as qcApp from './quickCaptureAppService'
import type { QuickCaptureStatus, QuickCaptureType } from '../../repositories/quickCaptureRepository'
import type sql from 'mssql'

async function requireSqlPool(): Promise<sql.ConnectionPool> {
  const pool = await getSqlPool()
  if (!pool) {
    throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'Database is not configured')
  }
  return pool
}

const CaptureTypeSchema = z.enum([
  'save_word',
  'save_phrase',
  'photo_text',
  'add_place',
  'paste_text',
  'log_struggle',
  'voice_note',
])

const RawPayloadSchema = z
  .object({
    imageBase64: z.string().optional(),
    imageMimeType: z.string().max(120).optional(),
    voiceAudioBase64: z.string().optional(),
    voiceMimeType: z.string().max(120).optional(),
  })
  .strict()
  .optional()

const PostCaptureBodySchema = z
  .object({
    captureType: CaptureTypeSchema,
    title: z.string().max(500).optional().nullable(),
    bodyPrimary: z.string().max(12000).optional().nullable(),
    bodySecondary: z.string().max(8000).optional().nullable(),
    localCaptureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    placeKind: z.string().max(64).optional().nullable(),
    imageMime: z.string().max(120).optional().nullable(),
    raw: RawPayloadSchema,
    /** Optional client transcript (e.g. browser STT) stored until server enrichment runs. */
    transcript: z.string().max(16000).optional().nullable(),
  })
  .strict()

const StatusSchema = z.enum([
  'new',
  'enriched',
  'ready_for_practice',
  'included_in_practice',
  'practiced',
  'saved_long_term',
  'archived',
])

function parseBody<T>(schema: z.ZodType<T>, raw: unknown): T {
  const r = schema.safeParse(raw)
  if (!r.success) {
    const fields: Record<string, string> = {}
    for (const i of r.error.issues) {
      fields[i.path.join('.')] = i.message
    }
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body', fields)
  }
  return r.data
}

export async function handlePostQuickCapture(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<Record<string, unknown>> {
  void _ctx
  const externalUserId = requireUserId(req)
  const raw = await readJson(req)
  const body = parseBody(PostCaptureBodySchema, raw ?? {})
  const pool = await requireSqlPool()
  const res = await qcApp.createQuickCapture({
    pool,
    externalUserId,
    captureType: body.captureType as QuickCaptureType,
    title: body.title ?? null,
    bodyPrimary: body.bodyPrimary ?? null,
    bodySecondary: body.bodySecondary ?? null,
    localCaptureDate: body.localCaptureDate,
    placeKind: body.placeKind ?? null,
    imageMime: body.imageMime ?? null,
    raw: body.raw ?? null,
    transcript: body.transcript ?? null,
  })
  return { id: res.id }
}

export async function handleGetQuickCaptures(req: HttpRequest, _ctx: InvocationContext): Promise<Record<string, unknown>> {
  void _ctx
  const externalUserId = requireUserId(req)
  const url = new URL(req.url)
  const summary = url.searchParams.get('summary') === '1'
  const localDate = url.searchParams.get('localDate')?.trim()
  if (summary) {
    if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'localDate required for summary (YYYY-MM-DD)')
    }
    const pool = await requireSqlPool()
    return (await qcApp.summarizeQuickCaptures({ pool, externalUserId, localDate })) as Record<string, unknown>
  }
  const statusRaw = url.searchParams.get('status')?.trim()
  let status: QuickCaptureStatus | QuickCaptureStatus[] | undefined
  if (statusRaw) {
    const parts = statusRaw.split(',').map((s) => s.trim()).filter(Boolean)
    const parsed = parts.map((p) => StatusSchema.safeParse(p)).filter((x) => x.success).map((x) => x.data as QuickCaptureStatus)
    status = parsed.length === 1 ? parsed[0]! : parsed.length ? parsed : undefined
  }
  const pool = await requireSqlPool()
  const rows = await qcApp.listQuickCaptures({
    pool,
    externalUserId,
    status,
    localDate: localDate && /^\d{4}-\d{2}-\d{2}$/.test(localDate) ? localDate : undefined,
  })
  return { items: rows }
}

export async function handlePostFromYourDayGenerate(
  req: HttpRequest,
  _ctx: InvocationContext,
): Promise<Record<string, unknown>> {
  void _ctx
  const externalUserId = requireUserId(req)
  const raw = await readJson(req)
  const body = parseBody(
    z
      .object({
        localCaptureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        mode: z.enum(['quick_rep', 'standard', 'deeper_debrief']).optional(),
      })
      .strict(),
    raw ?? {},
  )
  const pool = await requireSqlPool()
  const out = await qcApp.generateFromYourDayPack({
    pool,
    externalUserId,
    localDate: body.localCaptureDate,
    mode: body.mode,
  })
  if ('error' in out) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Not enough ready captures for this day', { code: out.error })
  }
  return out as Record<string, unknown>
}

export async function handleGetFromYourDayPack(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<Record<string, unknown>> {
  void ctx
  const externalUserId = requireUserId(req)
  const id = req.params.packId?.trim()
  if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing packId')
  const pool = await requireSqlPool()
  const row = await qcApp.getFromYourDayPack({ pool, externalUserId, packId: id })
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Pack not found')
  return { pack: row.pack, steps: row.steps } as Record<string, unknown>
}

export async function handlePostFromYourDayComplete(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<Record<string, unknown>> {
  void ctx
  const externalUserId = requireUserId(req)
  const id = req.params.packId?.trim()
  if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing packId')
  const pool = await requireSqlPool()
  const res = await qcApp.completeFromYourDayPack({ pool, externalUserId, packId: id })
  return res as Record<string, unknown>
}

const PatchCaptureBodySchema = z
  .object({
    status: StatusSchema,
  })
  .strict()

export async function handleGetQuickCaptureVoicePlayback(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<Record<string, unknown>> {
  void ctx
  const externalUserId = requireUserId(req)
  const captureId = req.params.captureId?.trim()
  if (!captureId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing captureId')
  const pool = await requireSqlPool()
  const out = await qcApp.getQuickCaptureVoicePlaybackUrl({ pool, externalUserId, captureId })
  if ('error' in out) {
    return { error: out.error }
  }
  return { url: out.url }
}

export async function handlePatchQuickCapture(
  req: HttpRequest,
  ctx: InvocationContext,
): Promise<Record<string, unknown>> {
  void ctx
  const externalUserId = requireUserId(req)
  const id = req.params.captureId?.trim()
  if (!id) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing captureId')
  const raw = await readJson(req)
  const body = parseBody(PatchCaptureBodySchema, raw ?? {})
  const pool = await requireSqlPool()
  return (await qcApp.patchQuickCaptureStatus({
    pool,
    externalUserId,
    captureId: id,
    status: body.status as QuickCaptureStatus,
  })) as Record<string, unknown>
}
