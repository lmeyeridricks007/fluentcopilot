export function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** For nullable API scores — returns null when absent (do not coerce null to 0 for display). */
export function nullableNum(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  return null
}

export function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export type AudioLoadStatus = 'loading' | 'ready' | 'empty' | 'error'

/** Resolve UI status for a clip that may be data URL, blob URL, or pending fetch. */
export function clipStatus(rawStored: string, resolvedSrc: string | null, batchLoading: boolean): AudioLoadStatus {
  if (!rawStored?.trim()) return 'empty'
  if (rawStored.startsWith('data:')) return 'ready'
  if (resolvedSrc) return 'ready'
  if (batchLoading) return 'loading'
  return 'error'
}

export function referenceLabelVariant(kind: unknown): 'native' | 'natural' {
  return kind === 'more_natural_dutch' ? 'natural' : 'native'
}
