import type { HttpRequest, HttpResponseBodyInit, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getCorsAllowedOrigins } from '../config/env'
import { ApiError, toErrorBody } from './errors'
import { createLogger, getCorrelationId } from './logging'

function corsOriginForRequest(req: HttpRequest): string | undefined {
  const origin = req.headers.get('origin') ?? req.headers.get('Origin')
  if (!origin?.trim()) return undefined
  const allowed = getCorsAllowedOrigins()
  return allowed.includes(origin.trim()) ? origin.trim() : undefined
}

export function buildCorsHeaders(req: HttpRequest): Record<string, string> {
  const allowOrigin = corsOriginForRequest(req)
  if (!allowOrigin) return {}
  const requested = req.headers.get('access-control-request-headers')
  const allowHeaders =
    requested?.trim() ||
    'Content-Type, x-user-id, x-correlation-id, authorization, accept, accept-language'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS, HEAD',
    /** So browser `fetch` can read `x-correlation-id` for client-side debugging (not in the CORS safelist). */
    'Access-Control-Expose-Headers': 'x-correlation-id',
    Vary: 'Origin',
  }
}

export type JsonHandler = (
  req: HttpRequest,
  ctx: InvocationContext
) => Promise<HttpResponseInit | Record<string, unknown>>

export function withJson(handler: JsonHandler) {
  return async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const correlationId = getCorrelationId(req)
    const log = createLogger(ctx, correlationId)
    const cors = buildCorsHeaders(req)
    if (req.method === 'OPTIONS') {
      return {
        status: 204,
        headers: { ...cors, 'x-correlation-id': correlationId },
      }
    }
    try {
      const result = await handler(req, ctx)
      if ('status' in result && typeof (result as HttpResponseInit).jsonBody !== 'undefined') {
        return {
          ...(result as HttpResponseInit),
          headers: {
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
            ...cors,
            ...(result as HttpResponseInit).headers,
          },
        }
      }
      if ('status' in result && 'body' in result) {
        const r = result as HttpResponseInit
        return { ...r, headers: { ...cors, ...r.headers } }
      }
      return {
        status: 200,
        jsonBody: result,
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
          ...cors,
        },
      }
    } catch (e) {
      log.error('handler_failed', e)
      const { status, body } = toErrorBody(e)
      return {
        status,
        jsonBody: { ...(body as Record<string, unknown>), correlationId },
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
          ...cors,
        },
      }
    }
  }
}

export async function readJson<T>(req: HttpRequest): Promise<T | undefined> {
  try {
    return (await req.json()) as T
  } catch {
    return undefined
  }
}

export type NdjsonStreamHandler = (
  req: HttpRequest,
  ctx: InvocationContext
) => AsyncGenerator<Record<string, unknown>, void, unknown>

/**
 * NDJSON streaming HTTP responses (one JSON object per line).
 * For use when `jsonBody` is too slow — e.g. token/chunk streaming to the client.
 */
export function withNdjsonStream(handler: NdjsonStreamHandler) {
  return async (req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> => {
    const correlationId = getCorrelationId(req)
    const log = createLogger(ctx, correlationId)
    const cors = buildCorsHeaders(req)
    if (req.method === 'OPTIONS') {
      return {
        status: 204,
        headers: { ...cors, 'x-correlation-id': correlationId },
      }
    }
    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const ev of handler(req, ctx)) {
            controller.enqueue(encoder.encode(`${JSON.stringify({ ...ev, correlationId })}\n`))
          }
          controller.close()
        } catch (e) {
          const { status, body } = toErrorBody(e)
          const errLine = {
            type: 'error',
            httpStatus: status,
            error: body,
            correlationId,
          }
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(errLine)}\n`))
          } catch {
            /* client disconnected */
          }
          controller.close()
          log.error('ndjson_stream_failed', e)
        }
      },
    })
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'x-correlation-id': correlationId,
        'Cache-Control': 'no-store',
        ...cors,
      },
      body: stream as unknown as HttpResponseBodyInit,
    }
  }
}

export function requireUserId(req: HttpRequest): string {
  const fromHeader = req.headers.get('x-user-id') ?? req.headers.get('X-User-Id')
  if (fromHeader?.trim()) return fromHeader.trim()
  throw new ApiError(401, 'VALIDATION_ERROR', 'Missing x-user-id header (dev) or authenticated identity')
}
