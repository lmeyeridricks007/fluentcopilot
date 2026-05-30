import { STORAGE_NS } from '@/lib/storage/storageKeys'
import type { ListeningSessionRecord } from '@/lib/listening-mode/schema'
import { getListeningPack } from '@/lib/listening-mode/catalog'

function keySession(sessionId: string): string {
  return `${STORAGE_NS}.listening-session-record.${sessionId}`
}

function keyHistory(userId: string): string {
  return `${STORAGE_NS}.listening-session-history.${userId}`
}

const HISTORY_MAX = 60

/** Indexed completed sessions for Talk activity / archive (per learner). */
export type ListeningSessionHistoryEntry = {
  sessionId: string
  packId: string
  scenarioId: string
  packTitle: string
  level: ListeningSessionRecord['level']
  endedAt: string
  correctCount: number
  totalAttempts: number
  coachSummarySnippet: string
}

function historyEntryFromRecord(record: ListeningSessionRecord): ListeningSessionHistoryEntry {
  const pack = getListeningPack(record.packId)
  const packTitle = pack?.title?.trim() || record.packId.replace(/-/g, ' ')
  const endedAt = record.endedAt ?? record.startedAt
  const correctCount = record.attempts.filter((a) => a.correct).length
  const totalAttempts = record.attempts.length
  const rawSummary = record.coachSummary?.trim() || ''
  const coachSummarySnippet = rawSummary.length > 140 ? `${rawSummary.slice(0, 137)}…` : rawSummary
  return {
    sessionId: record.sessionId,
    packId: record.packId,
    scenarioId: record.scenarioId,
    packTitle,
    level: record.level,
    endedAt,
    correctCount,
    totalAttempts,
    coachSummarySnippet,
  }
}

function parseHistoryJson(raw: string | null): ListeningSessionHistoryEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (row): row is ListeningSessionHistoryEntry =>
        Boolean(row) &&
        typeof row === 'object' &&
        typeof (row as ListeningSessionHistoryEntry).sessionId === 'string' &&
        typeof (row as ListeningSessionHistoryEntry).endedAt === 'string',
    )
  } catch {
    return []
  }
}

function readPersistedHistoryIndex(userId: string): ListeningSessionHistoryEntry[] {
  if (typeof window === 'undefined') return []
  return parseHistoryJson(window.localStorage.getItem(keyHistory(userId)))
}

function persistHistoryIndex(userId: string, entries: ListeningSessionHistoryEntry[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(keyHistory(userId), JSON.stringify(entries.slice(0, HISTORY_MAX)))
  } catch {
    /* ignore quota */
  }
}

/** Rebuild index from `listening-session-record.*` keys (pre-index installs). */
function scanSessionRecordsForUser(userId: string): ListeningSessionHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const prefix = `${STORAGE_NS}.listening-session-record.`
  const out: ListeningSessionHistoryEntry[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (!k?.startsWith(prefix)) continue
    try {
      const raw = window.localStorage.getItem(k)
      if (!raw) continue
      const record = JSON.parse(raw) as ListeningSessionRecord
      if (!record?.sessionId || record.userId !== userId) continue
      if (!Array.isArray(record.attempts)) continue
      out.push(historyEntryFromRecord(record))
    } catch {
      /* skip */
    }
  }
  return out.sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt)).slice(0, HISTORY_MAX)
}

export function listListeningSessionHistory(userId: string): ListeningSessionHistoryEntry[] {
  if (typeof window === 'undefined') return []
  const indexed = readPersistedHistoryIndex(userId).sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
  if (indexed.length > 0) return indexed
  const rebuilt = scanSessionRecordsForUser(userId)
  if (rebuilt.length > 0) persistHistoryIndex(userId, rebuilt)
  return rebuilt
}

function appendListeningSessionHistory(userId: string, entry: ListeningSessionHistoryEntry): void {
  if (typeof window === 'undefined') return
  try {
    const prev = readPersistedHistoryIndex(userId).filter((e) => e.sessionId !== entry.sessionId)
    const next = [entry, ...prev].slice(0, HISTORY_MAX)
    persistHistoryIndex(userId, next)
  } catch {
    /* ignore quota */
  }
}

export function writeListeningSessionRecord(record: ListeningSessionRecord): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(keySession(record.sessionId), JSON.stringify(record))
  } catch {
    /* ignore quota */
    return
  }
  appendListeningSessionHistory(record.userId, historyEntryFromRecord(record))
}

export function readListeningSessionRecord(sessionId: string): ListeningSessionRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(keySession(sessionId))
    if (!raw) return null
    return JSON.parse(raw) as ListeningSessionRecord
  } catch {
    return null
  }
}
