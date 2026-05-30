import type { HttpRequest } from '@azure/functions'
import { SpeakingAssessHttpBodySchema, SpeakingReferenceAudioQuerySchema } from '../../domain/speaking-assessment/speakingAssessmentHttpSchemas'
import { ApiError } from '../../shared/errors'
import { readJson } from '../../shared/http'
import { toSpeakingAssessmentViewModel } from './speakingAssessmentMapper'
import { createSpeakingAssessmentRepository } from './speakingAssessmentRepository'
import { getDefaultAzureTtsVoiceForReference, isSpeakingCacheEnabled } from './speakingAssessmentConfig'
import { ReferenceAudioService } from './referenceAudioService'
import { runSpeakingAssessmentOrchestration } from './speechAssessmentOrchestrator'

function assessmentIdFrom(req: HttpRequest): string {
  const id = req.params.assessmentId
  if (!id?.trim()) throw new ApiError(400, 'VALIDATION_ERROR', 'Missing assessmentId')
  return id.trim()
}

export async function handleSpeakingAssessmentPost(req: HttpRequest, externalUserId: string) {
  const raw = await readJson(req)
  const parsed = SpeakingAssessHttpBodySchema.safeParse(raw ?? {})
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const i of parsed.error.issues) {
      fields[i.path.join('.')] = i.message
    }
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body', fields)
  }
  const body = parsed.data
  let buf: Buffer
  try {
    buf = Buffer.from(body.audioBase64, 'base64')
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid base64 audio', { audioBase64: 'Invalid' })
  }
  const { view, assessmentId } = await runSpeakingAssessmentOrchestration({
    userId: externalUserId,
    body,
    audio: buf,
  })
  return { assessmentId, assessment: view }
}

export async function handleSpeakingReferenceAudioGet(req: HttpRequest) {
  const url = new URL(req.url)
  const q = Object.fromEntries(url.searchParams.entries())
  const parsed = SpeakingReferenceAudioQuerySchema.safeParse(q)
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', parsed.error.message)
  }
  const svc = new ReferenceAudioService()
  const out = await svc.resolveOneSpeed({
    text: parsed.data.text,
    locale: parsed.data.locale?.trim() || 'nl-NL',
    voice: parsed.data.voice?.trim() || getDefaultAzureTtsVoiceForReference(),
    speed: parsed.data.speed,
    cacheEnabled: isSpeakingCacheEnabled(),
  })
  return {
    speed: parsed.data.speed,
    provider: out.provider,
    url: out.url,
    cacheHit: out.cacheHit,
    useBrowserTts: out.useBrowserTts,
  }
}

export async function handleSpeakingAssessmentGet(req: HttpRequest, externalUserId: string) {
  const id = assessmentIdFrom(req)
  const repo = createSpeakingAssessmentRepository()
  const row = await repo.get(id)
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Assessment not found')
  if (row.userId !== externalUserId) throw new ApiError(403, 'VALIDATION_ERROR', 'Forbidden')
  return {
    assessmentId: row.id,
    assessment: toSpeakingAssessmentViewModel(row.canonical, row.caveats),
  }
}
