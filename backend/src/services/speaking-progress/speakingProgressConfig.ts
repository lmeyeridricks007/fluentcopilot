import * as path from 'node:path'

function trimEnv(k: string): string {
  return process.env[k]?.trim() ?? ''
}

function envBool(k: string, defaultValue = false): boolean {
  const v = trimEnv(k).toLowerCase()
  if (!v) return defaultValue
  return v === '1' || v === 'true' || v === 'yes'
}

/** When true or `SPEAKING_PROGRESS_STORE_PATH` is set, append + read speaking progression rows. */
export function isSpeakingProgressEnabled(): boolean {
  return envBool('SPEAKING_PROGRESS_ENABLED', false) || Boolean(trimEnv('SPEAKING_PROGRESS_STORE_PATH'))
}

export function getSpeakingProgressStoreDir(): string {
  const p = trimEnv('SPEAKING_PROGRESS_STORE_PATH')
  return p ? p : path.join(process.cwd(), 'data', 'speaking-progress')
}
