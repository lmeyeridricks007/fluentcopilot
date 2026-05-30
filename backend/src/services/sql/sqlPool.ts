import sql from 'mssql'
import { getSqlConnectionString } from '../../config/env'

let pool: sql.ConnectionPool | null = null
let poolPromise: Promise<sql.ConnectionPool | null> | null = null

export async function getSqlPool(): Promise<sql.ConnectionPool | null> {
  const cs = getSqlConnectionString()
  if (!cs) return null
  if (pool?.connected) return pool
  if (!poolPromise) {
    poolPromise = sql
      .connect(cs)
      .then((p) => {
        pool = p
        return p
      })
      .catch((e) => {
        poolPromise = null
        pool = null
        throw e
      })
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
