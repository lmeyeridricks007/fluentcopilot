import { AiConfigurationError } from '../services/ai/errors'

function isSqlConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /Failed to connect|ECONNRESET|ETIMEDOUT|Connection lost|socket hang up|ConnectionError|Timeout/i.test(
    msg,
  )
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'MODERATION_BLOCKED'
  | 'LLM_ERROR'
  | 'DATABASE_ERROR'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'TTS_UNAVAILABLE'
  | 'STT_UNAVAILABLE'
  | 'SPEECH_RECOGNITION_ERROR'
  | 'EVALUATION_UNAVAILABLE'
  | 'COACHING_UNAVAILABLE'
  | 'INTERNAL'

export class ApiError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly fields?: Record<string, string>

  constructor(status: number, code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export function toErrorBody(err: unknown): {
  status: number
  body: Record<string, unknown>
} {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.fields ? { fields: err.fields } : {}),
        },
      },
    }
  }
  if (err instanceof AiConfigurationError) {
    return {
      status: 503,
      body: {
        error: {
          code: 'DEPENDENCY_UNAVAILABLE' as const,
          message: err.message,
        },
      },
    }
  }
  if (isSqlConnectionError(err)) {
    return {
      status: 503,
      body: {
        error: {
          code: 'DATABASE_ERROR' as const,
          message: 'Database is temporarily unreachable. Please try again in a moment.',
        },
      },
    }
  }
  const message = err instanceof Error ? err.message : 'Internal server error'
  return {
    status: 500,
    body: { error: { code: 'INTERNAL' as const, message } },
  }
}
