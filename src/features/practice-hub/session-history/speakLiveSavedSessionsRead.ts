/**
 * Read-only access to Speak Live bookmark rows (same storage as {@link SpeakLiveRunView}).
 * Does not change write format or keys — only surfaces data on the session history page.
 */
const STORAGE_KEY = 'fc-speak-live-saved-sessions'

export type SpeakLiveSavedSessionBookmark = {
  savedAt: string
  scenarioId: string
  level: string
  note: string
}

export function readSpeakLiveSavedSessionBookmarks(): SpeakLiveSavedSessionBookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return (parsed as SpeakLiveSavedSessionBookmark[]).filter(
      (r) =>
        r &&
        typeof r.savedAt === 'string' &&
        typeof r.scenarioId === 'string' &&
        typeof r.level === 'string' &&
        typeof r.note === 'string',
    )
  } catch {
    return []
  }
}
