'use client'

import { ApiRequestError } from '@/lib/api/apiErrors'

export type SpeakLivePipelinePhase =
  | 'prepare_audio'
  | 'transcribe'
  | 'speak_live_turn'
  | 'conversation_messages_stream'
  | 'tts_after_stream'
  | 'tts_after_bundled_turn'
  | 'tts_chunk'
  | 'auto_commit'
  | 'fast_turn'

export type SpeakLivePipelineErrorReport = {
  phase: SpeakLivePipelinePhase
  at: string
  kind: 'api' | 'error'
  message: string
  status?: number
  code?: string
  correlationId?: string
  fields?: Record<string, string>
  /** Truncated JSON/text body from the API when available */
  rawBodyPreview?: string
  stackPreview?: string
}

export function speakLivePipelineErrorReport(
  phase: SpeakLivePipelinePhase,
  err: unknown
): SpeakLivePipelineErrorReport {
  const at = new Date().toISOString()
  if (err instanceof ApiRequestError) {
    return {
      phase,
      at,
      kind: 'api',
      message: err.message,
      status: err.status,
      code: err.code,
      correlationId: err.correlationId,
      fields: err.fields,
      rawBodyPreview: err.rawBody?.slice(0, 4000),
    }
  }
  if (err instanceof Error) {
    return {
      phase,
      at,
      kind: 'error',
      message: err.message,
      stackPreview: err.stack?.split('\n').slice(0, 8).join('\n'),
    }
  }
  return {
    phase,
    at,
    kind: 'error',
    message: typeof err === 'string' ? err : JSON.stringify(err),
  }
}

/** Log diagnostics (warn avoids Next.js dev overlay treating it as an app error). */
export function logSpeakLivePipelineFailure(report: SpeakLivePipelineErrorReport): void {
  if (typeof console === 'undefined' || !console.warn) return
  console.warn('[Speak Live pipeline]', report.phase, report)
}
