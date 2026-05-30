'use client'

import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from '@/lib/api/apiErrors'
import { getApiUserId } from '@/lib/api/apiUser'
import type { SpeakingAssessResponse, SpeakingAssessmentViewModel } from './speakingAssessmentTypes'

function buildUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/api${p}`
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to call the speaking assessment API.')
  }
  const url = buildUrl(path)
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-user-id': getApiUserId(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
  const rawText = await res.text()
  let json: unknown = null
  try {
    json = rawText ? JSON.parse(rawText) : null
  } catch {
    json = null
  }
  if (!res.ok) {
    throw parseApiErrorBody(res.status, json, rawText, { correlationId: correlationIdFromResponse(res) })
  }
  return json as T
}

export type SpeakingAssessRequestBody = {
  audioBase64: string
  mimeType: string
  locale?: string | null
  scenarioId: string
  /** Optional display name for LLM grounding (defaults to scenarioId). */
  scenarioName?: string | null
  promptId: string
  expectedText?: string | null
  transcript?: string | null
  level: 'A1' | 'A2' | 'B1'
  mode: 'reference' | 'open_response'
  includeReferenceAudio: boolean
  userClipDurationMs?: number | null
}

/** `POST /api/speaking/assess` — full orchestration (Azure + timing + coaching + optional reference wiring). */
export async function requestSpeakingAssessment(
  body: SpeakingAssessRequestBody,
  init?: { signal?: AbortSignal }
): Promise<SpeakingAssessResponse> {
  return requestJson<SpeakingAssessResponse>('/speaking/assess', {
    method: 'POST',
    signal: init?.signal,
    body: JSON.stringify(body),
  })
}

/** `GET /api/speaking/assessment/:id` */
export async function getSpeakingAssessmentById(
  assessmentId: string,
  init?: { signal?: AbortSignal }
): Promise<SpeakingAssessResponse> {
  return requestJson<SpeakingAssessResponse>(
    `/speaking/assessment/${encodeURIComponent(assessmentId)}`,
    { method: 'GET', signal: init?.signal }
  )
}

export type ReferenceAudioQuery = {
  text: string
  locale?: string
  speed: 'normal' | 'slow' | 'chunked'
  voice?: string
}

export type SpeakingReferenceAudioResponse = {
  speed: string
  provider: string
  url: string | null
  cacheHit: boolean
  /** Server has no TTS keys — use `speechSynthesis` on the client. */
  useBrowserTts: boolean
}

/** `GET /api/speaking/reference-audio` */
export async function getSpeakingReferenceAudio(
  q: ReferenceAudioQuery,
  init?: { signal?: AbortSignal }
): Promise<SpeakingReferenceAudioResponse> {
  const sp = new URLSearchParams({ text: q.text, speed: q.speed })
  if (q.locale) sp.set('locale', q.locale)
  if (q.voice) sp.set('voice', q.voice)
  return requestJson(`/speaking/reference-audio?${sp.toString()}`, { method: 'GET', signal: init?.signal })
}

export type { SpeakingAssessmentViewModel }
