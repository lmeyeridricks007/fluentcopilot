'use client'

import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from '@/lib/api/apiErrors'
import { getApiUserId } from '@/lib/api/apiUser'

function buildUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/api${p}`
}

export type GenerateSpeechResponse = {
  mimeType: string
  audioBase64: string
  /** Convenience data URL for HTMLAudioElement */
  audioUrl: string
  provider?: 'openai' | 'azure'
  cached?: boolean
}

export async function requestGenerateSpeech(
  input: {
    text: string
    language?: string
    voice?: string
    speed?: number
    messageId?: string
    threadId?: string
    /** `speak_live_assistant` — same TTS as Speak Live turn replies (voice, prosody, OpenAI model/speed). */
    purpose?: string
  },
  init?: { signal?: AbortSignal }
): Promise<GenerateSpeechResponse> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to use server TTS.')
  }
  const url = buildUrl('/audio/tts')
  const res = await fetch(url, {
    method: 'POST',
    signal: init?.signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-user-id': getApiUserId(),
    },
    body: JSON.stringify({
      text: input.text,
      language: input.language ?? 'nl-NL',
      voice: input.voice,
      speed: input.speed,
      messageId: input.messageId,
      threadId: input.threadId,
      ...(input.purpose ? { purpose: input.purpose } : {}),
    }),
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
  return json as GenerateSpeechResponse
}
