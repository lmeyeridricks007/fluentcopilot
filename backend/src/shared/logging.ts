import { randomUUID } from 'crypto'
import type { InvocationContext } from '@azure/functions'

export type LogFields = Record<string, string | number | boolean | undefined>

export function createLogger(ctx: InvocationContext, correlationId: string) {
  const base = { correlationId, invocationId: ctx.invocationId }
  return {
    info(msg: string, fields?: LogFields) {
      ctx.log(`[INFO] ${msg} ${JSON.stringify({ ...base, ...fields })}`)
    },
    warn(msg: string, fields?: LogFields) {
      ctx.log(`[WARN] ${msg} ${JSON.stringify({ ...base, ...fields })}`)
    },
    error(msg: string, err?: unknown, fields?: LogFields) {
      const e = err instanceof Error ? { err: err.message, stack: err.stack } : { err: String(err) }
      ctx.log(`[ERROR] ${msg} ${JSON.stringify({ ...base, ...e, ...fields })}`)
    },
  }
}

export function getCorrelationId(req: { headers: Headers }): string {
  const h = req.headers.get('x-correlation-id') ?? req.headers.get('X-Correlation-Id')
  if (h?.trim()) return h.trim()
  return randomUUID()
}
