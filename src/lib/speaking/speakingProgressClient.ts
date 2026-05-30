'use client'

import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from '@/lib/api/apiErrors'
import { getApiUserId } from '@/lib/api/apiUser'
import type { SpeakingProgressionResponse } from './speakingProgressTypes'

function buildUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/api${p}`
}

export async function fetchSpeakingProgression(init?: { signal?: AbortSignal }): Promise<SpeakingProgressionResponse> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to load speaking progression.')
  }
  const url = buildUrl('/speaking/progression')
  const res = await fetch(url, {
    method: 'GET',
    signal: init?.signal,
    headers: {
      Accept: 'application/json',
      'x-user-id': getApiUserId(),
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
  return json as SpeakingProgressionResponse
}
