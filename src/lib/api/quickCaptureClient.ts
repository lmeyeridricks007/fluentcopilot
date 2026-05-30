'use client'

import { getApiBaseUrl } from './apiConfig'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from './apiErrors'
import { getApiUserId } from './apiUser'

export type QuickCaptureApiType =
  | 'save_word'
  | 'save_phrase'
  | 'photo_text'
  | 'add_place'
  | 'paste_text'
  | 'log_struggle'
  | 'voice_note'

export type QuickCaptureApiStatus =
  | 'new'
  | 'enriched'
  | 'ready_for_practice'
  | 'included_in_practice'
  | 'practiced'
  | 'saved_long_term'
  | 'archived'

export type QuickCaptureItem = {
  id: string
  captureType: QuickCaptureApiType
  status: QuickCaptureApiStatus
  title: string | null
  bodyPrimary: string | null
  bodySecondary: string | null
  enrichedJson: string | null
  rawJson: string | null
  localCaptureDate: string
  placeKind: string | null
  imageMime: string | null
  transcript: string | null
  dayPackId: string | null
  createdAt: string
  updatedAt: string
}

export type DayPracticePackApi = {
  id: string
  userId: string
  localDate: string
  title: string
  stepsJson: string
  captureIdsJson: string
  status: string
  createdAt: string
  completedAt: string | null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to use Quick Capture API.')
  }
  const url = `${base.replace(/\/$/, '')}/api${path.startsWith('/') ? path : `/${path}`}`
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

function localDateYmd(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export const quickCaptureClient = {
  localDateYmd,

  async create(input: {
    captureType: QuickCaptureApiType
    title?: string | null
    bodyPrimary?: string | null
    bodySecondary?: string | null
    localCaptureDate?: string
    placeKind?: string | null
    imageMime?: string | null
    transcript?: string | null
    raw?: {
      imageBase64?: string
      imageMimeType?: string
      voiceAudioBase64?: string
      voiceMimeType?: string
    } | null
  }): Promise<{ id: string }> {
    return requestJson('/quick-captures', {
      method: 'POST',
      body: JSON.stringify({
        captureType: input.captureType,
        title: input.title ?? null,
        bodyPrimary: input.bodyPrimary ?? null,
        bodySecondary: input.bodySecondary ?? null,
        localCaptureDate: input.localCaptureDate ?? localDateYmd(),
        placeKind: input.placeKind ?? null,
        imageMime: input.imageMime ?? null,
        transcript: input.transcript ?? undefined,
        raw: input.raw ?? undefined,
      }),
    })
  },

  async list(params?: { status?: QuickCaptureApiStatus | QuickCaptureApiStatus[]; localDate?: string }): Promise<{
    items: QuickCaptureItem[]
  }> {
    const q = new URLSearchParams()
    if (params?.localDate) q.set('localDate', params.localDate)
    if (params?.status) {
      const s = Array.isArray(params.status) ? params.status.join(',') : params.status
      q.set('status', s)
    }
    const qs = q.toString()
    return requestJson(`/quick-captures${qs ? `?${qs}` : ''}`, { method: 'GET' })
  },

  async summary(localDate: string): Promise<{
    readyCount: number
    newCount: number
    practiceReadyCount?: number
    struggleCaptureCount?: number
    maxSameTopicRepeats?: number
    highValueCaptureCount?: number
    suggestionPriorityScore?: number
    previewFragments?: string[]
    primarySnippets?: string[]
  }> {
    const q = new URLSearchParams({ summary: '1', localDate })
    return requestJson(`/quick-captures?${q.toString()}`, { method: 'GET' })
  },

  async generatePack(
    localCaptureDate: string,
    options?: { mode?: 'quick_rep' | 'standard' | 'deeper_debrief' },
  ): Promise<{ packId: string; steps: unknown[]; mode?: string; estimatedMinutes?: number; title?: string }> {
    return requestJson('/quick-captures/from-your-day/generate', {
      method: 'POST',
      body: JSON.stringify({
        localCaptureDate,
        ...(options?.mode ? { mode: options.mode } : {}),
      }),
    })
  },

  async getPack(packId: string): Promise<{ pack: DayPracticePackApi; steps: unknown[] }> {
    return requestJson(`/quick-captures/from-your-day/${encodeURIComponent(packId)}`, { method: 'GET' })
  },

  async completePack(packId: string): Promise<{ ok: boolean }> {
    return requestJson(`/quick-captures/from-your-day/${encodeURIComponent(packId)}/complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },

  async patchCapture(captureId: string, status: QuickCaptureApiStatus): Promise<{ ok: boolean }> {
    return requestJson(`/quick-captures/${encodeURIComponent(captureId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  /** Signed blob URL for stored voice (after enrichment). Inline base64 stays client-side only. */
  async getVoicePlaybackUrl(captureId: string): Promise<{ url: string } | { error: string }> {
    return requestJson(`/quick-captures/${encodeURIComponent(captureId)}/voice-playback`, { method: 'GET' })
  },
}
