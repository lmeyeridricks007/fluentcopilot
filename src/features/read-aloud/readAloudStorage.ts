import type { ReadAloudEvaluateResponse } from './readAloudApi'
import { deleteReadAloudLearnerClip } from './readAloudLearnerAudioIdb'

export const READ_ALOUD_SESSION_KEY = 'languageTutor.readAloud.session.v1'
export const READ_ALOUD_REPORT_KEY = 'languageTutor.readAloud.report.v1'
export const READ_ALOUD_SAVED_DRILLS_KEY = 'languageTutor.readAloud.savedDrills.v1'

/** One-shot hint for entry screen: `{ level?, genre? }` from report next-actions. */
export const READ_ALOUD_PREFILL_GENERATE_KEY = 'languageTutor.readAloud.prefillGenerate.v1'

export type ReadAloudTextSource = 'manual' | 'photo' | 'generated'

export type ReadAloudSessionPayload = {
  targetText: string
  title?: string | null
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2'
  source: ReadAloudTextSource
  genre?: string | null
  lineFocus: boolean
  createdAt: string
}

export type ReadAloudSavedDrill = {
  id: string
  kind: 'word' | 'sentence' | 'passage'
  title: string
  content: string
  createdAt: string
}

export function loadReadAloudSession(): ReadAloudSessionPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(READ_ALOUD_SESSION_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as ReadAloudSessionPayload
    if (!p?.targetText?.trim() || !p.cefrLevel) return null
    return p
  } catch {
    return null
  }
}

export function saveReadAloudSession(p: ReadAloudSessionPayload): void {
  sessionStorage.setItem(READ_ALOUD_SESSION_KEY, JSON.stringify(p))
}

export function clearReadAloudSession(): void {
  sessionStorage.removeItem(READ_ALOUD_SESSION_KEY)
}

export type ReadAloudReportPayload = {
  session: ReadAloudSessionPayload
  result: ReadAloudEvaluateResponse
  savedAt: string
  /** Full-clip playback when small enough to store (data URL). */
  learnerAudio?: { mimeType: string; dataUrl: string } | null
  /**
   * When the clip is too large for sessionStorage JSON, the blob lives in IndexedDB under this key.
   * Keep the same key when re-saving after "Regenerate report" so playback/reprocess still work.
   */
  learnerAudioIdbKey?: string | null
}

export function saveReadAloudReport(p: ReadAloudReportPayload): void {
  sessionStorage.setItem(READ_ALOUD_REPORT_KEY, JSON.stringify(p))
}

export function loadReadAloudReport(): ReadAloudReportPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(READ_ALOUD_REPORT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ReadAloudReportPayload
  } catch {
    return null
  }
}

export function clearReadAloudReport(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(READ_ALOUD_REPORT_KEY)
    if (raw) {
      const p = JSON.parse(raw) as ReadAloudReportPayload
      const k = p?.learnerAudioIdbKey
      if (typeof k === 'string' && k.trim()) {
        void deleteReadAloudLearnerClip(k)
      }
    }
  } catch {
    /* ignore */
  }
  sessionStorage.removeItem(READ_ALOUD_REPORT_KEY)
}

export function loadSavedDrills(): ReadAloudSavedDrill[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(READ_ALOUD_SAVED_DRILLS_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as ReadAloudSavedDrill[]
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

export function addSavedDrill(item: Omit<ReadAloudSavedDrill, 'id' | 'createdAt'>): void {
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  const next: ReadAloudSavedDrill = {
    ...item,
    id,
    createdAt: new Date().toISOString(),
  }
  const cur = loadSavedDrills()
  localStorage.setItem(READ_ALOUD_SAVED_DRILLS_KEY, JSON.stringify([next, ...cur].slice(0, 80)))
}
