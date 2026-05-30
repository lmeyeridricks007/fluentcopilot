import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { buildCorsHeaders, readJson, requireUserId } from '../../shared/http'
import { ApiError, toErrorBody } from '../../shared/errors'
import { getCorrelationId, createLogger } from '../../shared/logging'
import { tryDownloadConversationBinaryArtifact } from '../storage/blobStorageService'
import * as messageRepo from '../../repositories/conversationMessageRepository'
import * as threadRepo from '../../repositories/conversationThreadRepository'
import * as userRepo from '../../repositories/userRepository'
import { getSqlPool } from '../sql/sqlPool'
import {
  getLiveSessionEvaluation,
  listSavedTrainingItems,
  runLiveSessionEvaluation,
  saveLiveTrainingItem,
} from './liveSessionEvaluationAppService'

function wrapPcmInWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) >>> 3
  const blockAlign = (channels * bitsPerSample) >>> 3
  const dataSize = pcm.byteLength
  const ab = new ArrayBuffer(44)
  const dv = new DataView(ab)
  const u8 = new Uint8Array(ab)
  u8.set([0x52, 0x49, 0x46, 0x46], 0)       // "RIFF"
  dv.setUint32(4, 36 + dataSize, true)        // chunk size
  u8.set([0x57, 0x41, 0x56, 0x45], 8)        // "WAVE"
  u8.set([0x66, 0x6d, 0x74, 0x20], 12)       // "fmt "
  dv.setUint32(16, 16, true)                  // sub-chunk size
  dv.setUint16(20, 1, true)                   // PCM format
  dv.setUint16(22, channels, true)
  dv.setUint32(24, sampleRate, true)
  dv.setUint32(28, byteRate, true)
  dv.setUint16(32, blockAlign, true)
  dv.setUint16(34, bitsPerSample, true)
  u8.set([0x64, 0x61, 0x74, 0x61], 36)       // "data"
  dv.setUint32(40, dataSize, true)
  const header = Buffer.from(u8)
  const wav = Buffer.concat([header, pcm])
  console.log(`[WAV] header hex: ${wav.subarray(0, 48).toString('hex')}`)
  return wav
}

function isRawPcmMime(mime: string): boolean {
  const m = mime.toLowerCase()
  return m.includes('l16') || (m.includes('pcm') && !m.includes('wav'))
}

function parsePcmMime(mime: string): { sampleRate: number; channels: number } {
  const rateMatch = /rate=(\d+)/i.exec(mime)
  const chMatch = /channels=(\d+)/i.exec(mime)
  return {
    sampleRate: rateMatch ? parseInt(rateMatch[1], 10) : 16000,
    channels: chMatch ? parseInt(chMatch[1], 10) : 1,
  }
}

async function requirePool() {
  const pool = await getSqlPool()
  if (!pool) throw new ApiError(503, 'DEPENDENCY_UNAVAILABLE', 'SQL database not configured')
  return pool
}

export async function handleGetLiveEvaluation(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const threadId = req.params.threadId?.trim()
  if (!threadId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing threadId')
  const devToolsHeader = req.headers.get('x-fluentcopilot-dev-tools') === '1'
  const attachTrainingLoopDebug = process.env.NODE_ENV !== 'production' && devToolsHeader
  return getLiveSessionEvaluation({ externalUserId, threadId, attachTrainingLoopDebug })
}

export async function handlePostLiveEvaluationRun(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const threadId = req.params.threadId?.trim()
  if (!threadId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing threadId')
  const raw = await readJson(req)
  const forceRestart = Boolean(raw && typeof raw === 'object' && 'forceRestart' in raw && (raw as { forceRestart?: unknown }).forceRestart === true)
  return runLiveSessionEvaluation({ externalUserId, threadId, forceRestart })
}

export async function handlePostSavedTrainingItem(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  const raw = await readJson(req)
  return saveLiveTrainingItem({ externalUserId, rawBody: raw ?? {} })
}

export async function handleGetSavedTrainingItems(req: HttpRequest, ctx: InvocationContext) {
  void ctx
  const externalUserId = requireUserId(req)
  let tagCategory: string | null = null
  let itemType: string | null = null
  let limit = 80
  try {
    const u = new URL(req.url)
    tagCategory = u.searchParams.get('tagCategory')
    itemType = u.searchParams.get('itemType')
    const l = u.searchParams.get('limit')
    if (l) {
      const n = Number(l)
      if (Number.isFinite(n)) limit = n
    }
  } catch {
    /* ignore malformed URL */
  }
  return listSavedTrainingItems({ externalUserId, tagCategory, itemType, limit })
}

async function assertSpeakLiveBinaryAccess(params: {
  externalUserId: string
  threadId: string
  messageId: string
}): Promise<{ blobPath: string; mimeType: string }> {
  const pool = await requirePool()
  const userInternalId = await userRepo.ensureUser(pool, params.externalUserId)
  const thread = await threadRepo.getThreadById(pool, params.threadId)
  if (!thread || thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  if (thread.conversationSurface !== 'speak_live') throw new ApiError(400, 'VALIDATION_ERROR', 'Not Speak Live')
  const msg = await messageRepo.getMessageById(pool, params.messageId)
  if (!msg || msg.threadId !== thread.id || msg.sender !== 'user') {
    throw new ApiError(404, 'NOT_FOUND', 'Message not found')
  }
  const meta = msg.metadata as Record<string, unknown> | null | undefined
  const blobPath = typeof meta?.learnerAudioBlobPath === 'string' ? meta.learnerAudioBlobPath : null
  const mimeType = typeof meta?.learnerAudioMimeType === 'string' ? meta.learnerAudioMimeType : 'audio/webm'
  if (!blobPath) throw new ApiError(404, 'NOT_FOUND', 'No learner audio for this turn')
  return { blobPath, mimeType }
}

export async function handleGetSpeakLiveLearnerAudio(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(req)
  const log = createLogger(ctx, correlationId)
  const cors = buildCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: { ...cors, 'x-correlation-id': correlationId } }
  }
  try {
    const externalUserId = requireUserId(req)
    const threadId = req.params.threadId?.trim()
    const messageId = req.params.messageId?.trim()
    if (!threadId || !messageId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing ids')
    const { blobPath, mimeType } = await assertSpeakLiveBinaryAccess({ externalUserId, threadId, messageId })
    const dl = await tryDownloadConversationBinaryArtifact(threadId, blobPath)
    if (!dl) throw new ApiError(404, 'NOT_FOUND', 'Audio blob not available')
    const isGeneric = !dl.contentType || dl.contentType === 'application/octet-stream'
    const effectiveMime = isGeneric ? mimeType : dl.contentType

    if (isRawPcmMime(effectiveMime)) {
      const { sampleRate, channels } = parsePcmMime(effectiveMime)
      const wav = wrapPcmInWav(dl.buffer, sampleRate, channels, 16)
      log.info('learner_audio_served_pcm_as_wav', { blobPath, originalMime: effectiveMime, sampleRate, channels, pcmBytes: dl.buffer.byteLength, wavBytes: wav.byteLength })
      return {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'audio/wav',
          'Cache-Control': 'no-cache',
          'x-correlation-id': correlationId,
        },
        body: wav,
      }
    }

    log.info('learner_audio_served', { blobPath, blobCt: dl.contentType, msgMime: mimeType, servingCt: effectiveMime, bytes: dl.buffer.byteLength })
    return {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': effectiveMime,
        'Cache-Control': 'private, max-age=3600',
        'x-correlation-id': correlationId,
      },
      body: dl.buffer,
    }
  } catch (e) {
    log.error('learner_audio_failed', e)
    const { status, body } = toErrorBody(e)
    return {
      status,
      jsonBody: body,
      headers: { 'Content-Type': 'application/json', ...cors, 'x-correlation-id': correlationId },
    }
  }
}

export async function handleGetSpeakLiveReferenceAudio(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = getCorrelationId(req)
  const log = createLogger(ctx, correlationId)
  const cors = buildCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: { ...cors, 'x-correlation-id': correlationId } }
  }
  try {
    const externalUserId = requireUserId(req)
    const threadId = req.params.threadId?.trim()
    const messageId = req.params.messageId?.trim()
    if (!threadId || !messageId) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing ids')
    const pool = await requirePool()
    const userInternalId = await userRepo.ensureUser(pool, externalUserId)
    const thread = await threadRepo.getThreadById(pool, threadId)
    if (!thread || thread.userId !== userInternalId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
    const ext = 'mp3'
    const fileName = `evaluation-reference/${messageId}.${ext}`
    const dl = await tryDownloadConversationBinaryArtifact(threadId, fileName)
    if (!dl) {
      const alt = await tryDownloadConversationBinaryArtifact(threadId, `evaluation-reference/${messageId}.audio`)
      if (!alt) throw new ApiError(404, 'NOT_FOUND', 'Reference audio not found')
      const altCt = (!alt.contentType || alt.contentType === 'application/octet-stream') ? 'audio/mpeg' : alt.contentType
      return {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': altCt,
          'Cache-Control': 'private, max-age=86400',
          'x-correlation-id': correlationId,
        },
        body: alt.buffer,
      }
    }
    const refCt = (!dl.contentType || dl.contentType === 'application/octet-stream') ? 'audio/mpeg' : dl.contentType
    return {
      status: 200,
      headers: {
        ...cors,
        'Content-Type': refCt,
        'Cache-Control': 'private, max-age=86400',
        'x-correlation-id': correlationId,
      },
      body: dl.buffer,
    }
  } catch (e) {
    log.error('reference_audio_failed', e)
    const { status, body } = toErrorBody(e)
    return {
      status,
      jsonBody: body,
      headers: { 'Content-Type': 'application/json', ...cors, 'x-correlation-id': correlationId },
    }
  }
}
