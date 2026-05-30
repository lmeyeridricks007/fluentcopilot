const STORAGE_KEY = 'fc-speak-live-resumable-v1'

export type ResumableLiveSession = {
  threadId: string
  scenarioId: string
  level: string
  scenarioTitle: string
  savedAt: string
}

export function readResumableLiveSession(): ResumableLiveSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Record<string, unknown>
    if (
      typeof o.threadId === 'string' &&
      typeof o.scenarioId === 'string' &&
      typeof o.level === 'string' &&
      typeof o.scenarioTitle === 'string' &&
      typeof o.savedAt === 'string'
    ) {
      return {
        threadId: o.threadId,
        scenarioId: o.scenarioId,
        level: o.level,
        scenarioTitle: o.scenarioTitle,
        savedAt: o.savedAt,
      }
    }
    return null
  } catch {
    return null
  }
}

export function writeResumableLiveSession(session: ResumableLiveSession): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearResumableLiveSession(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
