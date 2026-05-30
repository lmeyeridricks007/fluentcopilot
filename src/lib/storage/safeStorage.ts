/**
 * Low-level localStorage access with safe JSON parse and bounded error handling.
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (raw == null || raw === '') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function safeReadJson<T>(key: string, fallback: T): T {
  return safeParseJson(safeGetItem(key), fallback)
}

export function safeWriteJson(key: string, value: unknown): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value))
  } catch {
    return false
  }
}
