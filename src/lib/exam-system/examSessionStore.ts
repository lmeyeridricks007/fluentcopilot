import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { ExamSessionRecord } from './types'

export type ExamSessionPersistedFile = {
  schemaVersion: 1
  userId: string
  sessions: ExamSessionRecord[]
}

const SCHEMA_VERSION = 1 as const
const MAX_SESSIONS = 200

function dataPath(userId: string): string {
  const safe = encodeURIComponent(userId)
  return join(process.cwd(), '.data', 'exam-system', `${safe}.json`)
}

function normalize(raw: unknown, userId: string): ExamSessionPersistedFile {
  if (!raw || typeof raw !== 'object') {
    return { schemaVersion: SCHEMA_VERSION, userId, sessions: [] }
  }
  const o = raw as Record<string, unknown>
  const sessions = Array.isArray(o.sessions) ? (o.sessions as ExamSessionRecord[]) : []
  return {
    schemaVersion: SCHEMA_VERSION,
    userId,
    sessions: sessions.filter((s) => s && typeof s.id === 'string' && s.userId === userId),
  }
}

export async function loadExamSessions(userId: string): Promise<ExamSessionPersistedFile> {
  const file = dataPath(userId)
  try {
    const raw = await readFile(file, 'utf8')
    return normalize(JSON.parse(raw) as unknown, userId)
  } catch {
    return normalize(null, userId)
  }
}

export async function saveExamSessions(state: ExamSessionPersistedFile): Promise<void> {
  const file = dataPath(state.userId)
  await mkdir(dirname(file), { recursive: true })
  const trimmed: ExamSessionPersistedFile = {
    ...state,
    sessions: state.sessions.slice(-MAX_SESSIONS),
  }
  await writeFile(file, JSON.stringify(trimmed, null, 2), 'utf8')
}

export async function upsertExamSession(userId: string, session: ExamSessionRecord): Promise<void> {
  const draft = await loadExamSessions(userId)
  const idx = draft.sessions.findIndex((s) => s.id === session.id)
  if (idx >= 0) draft.sessions[idx] = session
  else draft.sessions.push(session)
  await saveExamSessions(draft)
}

export async function getExamSession(userId: string, sessionId: string): Promise<ExamSessionRecord | null> {
  const draft = await loadExamSessions(userId)
  return draft.sessions.find((s) => s.id === sessionId) ?? null
}
