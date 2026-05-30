'use client'

import { getApiBaseUrl } from './apiConfig'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from './apiErrors'
import { getApiUserId } from './apiUser'
import type { SaveWordResponse } from './apiTypes'

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to save words to the API.')
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

export const savedWordsClient = {
  async saveWord(input: {
    selectedText: string
    sourceThreadId?: string | null
    sourceMessageId?: string | null
    sourceScenarioId?: string | null
    meaning?: string | null
    sourceType?: string
  }): Promise<SaveWordResponse> {
    return requestJson('/saved-words', {
      method: 'POST',
      body: JSON.stringify({
        selectedText: input.selectedText,
        sourceThreadId: input.sourceThreadId ?? null,
        sourceMessageId: input.sourceMessageId ?? null,
        sourceScenarioId: input.sourceScenarioId ?? null,
        meaning: input.meaning ?? null,
        sourceType: input.sourceType ?? 'chat_manual',
      }),
    })
  },
}
