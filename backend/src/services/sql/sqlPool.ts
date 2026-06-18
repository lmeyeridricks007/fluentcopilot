import sql from 'mssql'
import { getSqlConnectionString } from '../../config/env'

let pool: sql.ConnectionPool | null = null
let poolPromise: Promise<sql.ConnectionPool | null> | null = null

const CONNECT_ATTEMPTS = 3

function isTransientConnectError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  return /Failed to connect|ECONNRESET|ETIMEDOUT|Connection lost|socket hang up|Timeout/i.test(msg)
}

export async function getSqlPool(): Promise<sql.ConnectionPool | null> {
  const cs = getSqlConnectionString()
  if (!cs) return null
  if (pool?.connected) return pool
  if (!poolPromise) {
    poolPromise = (async () => {
      let lastErr: unknown
      for (let attempt = 0; attempt < CONNECT_ATTEMPTS; attempt++) {
        try {
          const p = await sql.connect(cs)
          pool = p
          return p
        } catch (e) {
          lastErr = e
          pool = null
          poolPromise = null
          if (attempt < CONNECT_ATTEMPTS - 1 && isTransientConnectError(e)) {
            await new Promise<void>((r) => {
              setTimeout(r, 500 * (attempt + 1))
            })
            continue
          }
          throw e
        }
      }
      throw lastErr
    })()
  }
  return poolPromise
}

export async function closeSqlPool(): Promise<void> {
  if (pool) {
    await pool.close()
    pool = null
    poolPromise = null
  }
}
