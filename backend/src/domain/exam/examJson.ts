/** Shared JSON + date helpers for exam persistence rows. */

export function parseExamJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || !String(raw).trim()) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function examDateToIso(d: Date | string | null | undefined): string {
  if (d == null) return ''
  if (d instanceof Date) return d.toISOString()
  const t = Date.parse(String(d))
  return Number.isNaN(t) ? String(d) : new Date(t).toISOString()
}

export function examDateToIsoOrNull(d: Date | string | null | undefined): string | null {
  if (d == null) return null
  return examDateToIso(d)
}
