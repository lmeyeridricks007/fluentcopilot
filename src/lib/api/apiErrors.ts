export type ApiErrorPayload = {
  error: {
    code: string
    message: string
    fields?: Record<string, string>
  }
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  readonly rawBody?: string
  /** From response header `x-correlation-id` (Azure Functions `withJson`). */
  readonly correlationId?: string

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    rawBody?: string,
    correlationId?: string
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.fields = fields
    this.rawBody = rawBody
    this.correlationId = correlationId?.trim() || undefined
  }
}

export type ParseApiErrorOptions = {
  correlationId?: string
}

/** Reads `x-correlation-id` from an API response (pair with {@link parseApiErrorBody}). */
export function correlationIdFromResponse(res: Response): string | undefined {
  return res.headers.get('x-correlation-id')?.trim() || undefined
}

function correlationIdFromErrorJson(json: unknown): string | undefined {
  if (!json || typeof json !== 'object') return undefined
  const o = json as { correlationId?: unknown }
  return typeof o.correlationId === 'string' && o.correlationId.trim() ? o.correlationId.trim() : undefined
}

export function parseApiErrorBody(
  status: number,
  json: unknown,
  rawText: string,
  options?: ParseApiErrorOptions
): ApiRequestError {
  const correlationId = options?.correlationId ?? correlationIdFromErrorJson(json)
  if (json && typeof json === 'object' && 'error' in json) {
    const e = (json as ApiErrorPayload).error
    if (e && typeof e === 'object' && e.message != null) {
      const message =
        typeof e.message === 'string' ? e.message : String((e as { message: unknown }).message)
      return new ApiRequestError(
        status,
        typeof e.code === 'string' ? e.code : 'UNKNOWN',
        message,
        e.fields && typeof e.fields === 'object' ? (e.fields as Record<string, string>) : undefined,
        rawText,
        correlationId
      )
    }
  }
  return new ApiRequestError(
    status,
    'UNKNOWN',
    rawText?.slice(0, 200) || `Request failed (${status})`,
    undefined,
    rawText,
    correlationId
  )
}
