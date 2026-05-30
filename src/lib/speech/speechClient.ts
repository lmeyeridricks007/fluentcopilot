'use client'

import { getApiBaseUrl, getMaxTranscribePayloadHintChars } from '@/lib/api/apiConfig'
import { ApiRequestError, correlationIdFromResponse, parseApiErrorBody } from '@/lib/api/apiErrors'
import { getApiUserId } from '@/lib/api/apiUser'
import type { PronunciationFeedback } from '@/lib/speech/pronunciationTypes'
import type { SpeakingCoachingRequestBody, SpeakingCoachingResult } from '@/lib/speech/speakingCoachingTypes'
import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'

function buildUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}/api${p}`
}

export type TranscribeSpeechResponse = {
  text: string
  provider?: string
  durationSeconds?: number
  detectedLanguage?: string
  pronunciation?: PronunciationFeedback
}

export type PronunciationProgressMetaInput = {
  scenarioId?: string | null
  scenarioTitle?: string | null
  threadId?: string | null
  level?: 'A1' | 'A2' | 'B1' | null
}

export async function requestPronunciationAssessment(
  input: {
    audioBase64: string
    mimeType: string
    transcript: string
    expectedText?: string | null
    locale?: string
    scenarioHint?: string | null
    assessmentMode: 'reference' | 'open_response'
    /** Stored server-side for progression trends when `SPEAKING_PROGRESS_ENABLED` or store path is set. */
    progressMeta?: PronunciationProgressMetaInput | null
  },
  init?: { signal?: AbortSignal }
): Promise<PronunciationAssessmentApiResponse> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL for pronunciation assessment.')
  }
  const url = buildUrl('/speech/pronunciation-assessment')
  const res = await fetch(url, {
    method: 'POST',
    signal: init?.signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-user-id': getApiUserId(),
    },
    body: JSON.stringify({
      audioBase64: input.audioBase64,
      mimeType: input.mimeType,
      transcript: input.transcript,
      expectedText: input.expectedText ?? null,
      locale: input.locale,
      scenarioHint: input.scenarioHint ?? null,
      assessmentMode: input.assessmentMode,
      progressMeta: input.progressMeta ?? undefined,
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
  return json as PronunciationAssessmentApiResponse
}

export async function transcribeSpeechAudio(
  input: {
    audioBase64: string
    mimeType: string
    language?: string
    evaluatePronunciation?: boolean
    cefrLevel?: 'A1' | 'A2' | 'B1'
    scenarioHint?: string
    /** Vocabulary / style hint for server STT (e.g. target line in reference practice). */
    transcriptionPrompt?: string
    threadId?: string
    scenarioId?: string
    /** Server logging / routing hint (e.g. `shadow_retry` for chunk shadow flow). */
    purpose?: string
  },
  init?: { signal?: AbortSignal }
): Promise<TranscribeSpeechResponse> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL to use server transcription.')
  }
  const url = buildUrl('/speech/transcribe')
  const res = await fetch(url, {
    method: 'POST',
    signal: init?.signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-user-id': getApiUserId(),
    },
    body: JSON.stringify({
      audioBase64: input.audioBase64,
      mimeType: input.mimeType,
      language: input.language ?? 'nl',
      evaluatePronunciation: input.evaluatePronunciation ?? false,
      cefrLevel: input.cefrLevel,
      scenarioHint: input.scenarioHint,
      transcriptionPrompt: input.transcriptionPrompt,
      threadId: input.threadId,
      scenarioId: input.scenarioId,
      purpose: input.purpose,
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
  return json as TranscribeSpeechResponse
}

export type EvaluateTranscriptResponse = {
  pronunciation: PronunciationFeedback
}

export type SpeakingCoachingApiResponse = {
  coaching: SpeakingCoachingResult
}

export async function evaluateSpeakingCoaching(
  input: SpeakingCoachingRequestBody,
  init?: { signal?: AbortSignal }
): Promise<SpeakingCoachingResult> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL for speaking coaching.')
  }
  const url = buildUrl('/speech/speaking-coaching')
  const res = await fetch(url, {
    method: 'POST',
    signal: init?.signal,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-user-id': getApiUserId(),
    },
    body: JSON.stringify(input),
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
  const body = json as SpeakingCoachingApiResponse | null
  if (!body?.coaching) {
    throw new ApiRequestError(502, 'PARSE', 'Speaking coaching response was incomplete.')
  }
  return body.coaching
}

export async function evaluateTranscriptPronunciation(
  input: { text: string; cefrLevel?: 'A2' | 'B1'; scenarioHint?: string },
  init?: { signal?: AbortSignal }
): Promise<EvaluateTranscriptResponse> {
  const base = getApiBaseUrl()
  if (!base) {
    throw new ApiRequestError(0, 'CONFIG', 'Set NEXT_PUBLIC_API_BASE_URL for pronunciation evaluation.')
  }
  const url = buildUrl('/speech/evaluate-transcript')
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
      cefrLevel: input.cefrLevel ?? 'A2',
      scenarioHint: input.scenarioHint,
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
  return json as EvaluateTranscriptResponse
}

/** Legacy cap — prefer {@link getMaxTranscribePayloadHintChars} from apiConfig. */
export const MAX_TRANSCRIBE_BASE64_CHARS = 5_000_000

export function maxTranscribeBase64Chars(): number {
  return Math.min(MAX_TRANSCRIBE_BASE64_CHARS, getMaxTranscribePayloadHintChars())
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => {
      const s = r.result
      if (typeof s !== 'string') {
        reject(new Error('Could not read audio'))
        return
      }
      const comma = s.indexOf(',')
      const b64 = comma >= 0 ? s.slice(comma + 1) : s
      resolve(b64)
    }
    r.onerror = () => reject(r.error ?? new Error('Read failed'))
    r.readAsDataURL(blob)
  })
}

/** Short, safe copy for STT failures in UI (exam, voice chips, etc.). */
export function userFacingTranscriptionErrorMessage(
  err: unknown,
  opts?: { typingFallback?: boolean },
): string {
  const tail = opts?.typingFallback === false ? '' : ' You can also use “Type instead”.'
  if (err instanceof ApiRequestError) {
    if (err.status === 413) return `The recording is too large to send.${tail}`
    if (err.status === 429) return `Transcription is busy — wait a few seconds and try again.${tail}`
    if (err.status >= 500) return `The transcription service had a problem. Try again shortly.${tail}`
    if (err.status === 401 || err.status === 403) return `Your session may have expired. Refresh or sign in again.${tail}`
    if (err.status === 0 && err.code === 'CONFIG')
      return `Transcription is not configured in this app build (missing API URL).${tail}`
    const m = err.message?.trim()
    if (m && m.length > 0 && m.length < 180 && !m.includes('<') && !m.includes('\n')) {
      return `${m.endsWith('.') ? m.slice(0, -1) : m}.${tail}`
    }
  }
  if (err instanceof Error) {
    const m = err.message
    if (m === 'Failed to fetch' || m.includes('NetworkError')) return `Could not reach the server. Check your connection.${tail}`
    if (m.includes('Decoded audio was empty') || m.includes('too large')) return `${m}${tail}`
  }
  return `Transcription failed. Check your connection.${tail}`
}
