import type {
  ExamProfile,
  ExamSessionRecord,
  ExamTaskType,
  ExamVoiceAssessmentSnapshot,
  ReadinessSnapshot,
} from '@/lib/exam-system/types'
import { listExamProfiles } from '@/lib/exam-system/examProfileRegistry'
import { fetchWithTimeout } from '@/lib/http/fetchWithTimeout'

export type ExamProfileSummary = {
  examId: string
  examCode: string
  level: 'A1' | 'A2' | 'B1'
  title: string
  description: string
  defaultLevel: 'A1' | 'A2' | 'B1'
  supportedLevels: ('A1' | 'A2' | 'B1')[]
  supportedModalities: string[]
  tags: string[]
  sectionIds: { id: string; title: string }[]
}

/** Same mapping as `GET /api/exam/profiles` — use for instant client paint (registry is the source of truth). */
export function mapExamProfilesToSummaries(profiles: ExamProfile[]): ExamProfileSummary[] {
  return profiles.map((p) => ({
    examId: p.examId,
    examCode: p.examCode,
    level: p.level,
    title: p.title,
    description: p.description,
    defaultLevel: p.defaultLevel,
    supportedLevels: p.supportedLevels,
    supportedModalities: p.supportedModalities,
    tags: p.tags,
    sectionIds: p.supportedSections.map((s) => ({ id: s.id, title: s.title })),
  }))
}

export function getExamProfileSummariesFromRegistry(): ExamProfileSummary[] {
  return mapExamProfilesToSummaries(listExamProfiles())
}

export async function fetchExamProfiles(): Promise<ExamProfileSummary[]> {
  const r = await fetch('/api/exam/profiles', { cache: 'no-store' })
  if (!r.ok) throw new Error(await r.text())
  const j = (await r.json()) as { profiles: ExamProfileSummary[] }
  return j.profiles
}

export async function fetchExamSessions(
  userId: string,
  q?: { mode?: string; level?: string; profileId?: string; since?: string },
): Promise<ExamSessionRecord[]> {
  const p = new URLSearchParams()
  p.set('userId', userId)
  if (q?.mode) p.set('mode', q.mode)
  if (q?.level) p.set('level', q.level)
  if (q?.profileId) p.set('profileId', q.profileId)
  if (q?.since) p.set('since', q.since)
  const r = await fetch(`/api/exam/sessions?${p}`, {
    headers: { 'x-user-id': userId },
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(await r.text())
  const j = (await r.json()) as { sessions: ExamSessionRecord[] }
  return j.sessions
}

export async function createExamSession(
  userId: string,
  body: {
    profileId: string
    level: 'A1' | 'A2' | 'B1'
    mode: 'simulation' | 'training'
    scope: 'full' | 'section'
    sectionId?: string
    trainingSupport?: 'full_guidance' | 'light_guidance' | 'almost_exam'
    timedTraining?: boolean
    weaknessRepair?: boolean
    trainingEntryMode?: 'adaptive' | 'by_task_type' | 'by_weakness' | 'section' | 'full_mix'
    focusTaskType?: ExamTaskType
  },
): Promise<ExamSessionRecord> {
  const r = await fetch('/api/exam/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  const j = (await r.json()) as { session: ExamSessionRecord }
  return j.session
}

export async function fetchExamSession(userId: string, sessionId: string): Promise<ExamSessionRecord> {
  const r = await fetch(`/api/exam/sessions/${encodeURIComponent(sessionId)}?userId=${encodeURIComponent(userId)}`, {
    headers: { 'x-user-id': userId },
    cache: 'no-store',
  })
  if (!r.ok) throw new Error(await r.text())
  const j = (await r.json()) as { session: ExamSessionRecord }
  return j.session
}

export async function submitExamTask(
  userId: string,
  sessionId: string,
  body: {
    taskId: string
    answerText: string
    retriesUsed?: number
    prepUsedSeconds?: number
    answerUsedSeconds?: number
    appendAsRetry?: boolean
    voice?: ExamVoiceAssessmentSnapshot | null
  },
): Promise<ExamSessionRecord> {
  const r = await fetchWithTimeout(`/api/exam/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify(body),
    timeoutMs: 90_000,
  })
  if (!r.ok) throw new Error(await r.text())
  const j = (await r.json()) as { session: ExamSessionRecord }
  return j.session
}

export async function completeExamSession(
  userId: string,
  sessionId: string,
): Promise<{
  session: ExamSessionRecord
  progression: { xpAwarded: number; newStreak: number; streakChanged: boolean } | null
}> {
  const r = await fetchWithTimeout(`/api/exam/sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: 'POST',
    headers: { 'x-user-id': userId, 'x-time-zone': Intl.DateTimeFormat().resolvedOptions().timeZone },
    timeoutMs: 120_000,
  })
  if (!r.ok) throw new Error(await r.text())
  return (await r.json()) as {
    session: ExamSessionRecord
    progression: { xpAwarded: number; newStreak: number; streakChanged: boolean } | null
  }
}

/** Re-score attempts, rebuild report, and for simulations re-run AI answer-fit + sample-answer glosses (no XP change). */
export async function reprocessExamReport(userId: string, sessionId: string): Promise<ExamSessionRecord> {
  const r = await fetch(`/api/exam/sessions/${encodeURIComponent(sessionId)}/reprocess-report`, {
    method: 'POST',
    headers: { 'x-user-id': userId },
  })
  if (!r.ok) throw new Error(await parseExamApiError(r))
  const j = (await r.json()) as { session: ExamSessionRecord }
  return j.session
}

/**
 * Full re-score (heuristic) + answer-fit evaluation + persistence.
 * Simulation: blends fit into per-task composites and rebuilds the simulation report.
 */
export async function evaluateExamSessionAnswers(
  userId: string,
  sessionId: string,
  opts?: { force?: boolean },
): Promise<ExamSessionRecord> {
  const q = opts?.force ? '?force=1' : ''
  const r = await fetch(
    `/api/exam/sessions/${encodeURIComponent(sessionId)}/evaluate-answers${q}`,
    {
      method: 'POST',
      headers: { 'x-user-id': userId },
    },
  )
  if (!r.ok) throw new Error(await parseExamApiError(r))
  const j = (await r.json()) as { session: ExamSessionRecord }
  return j.session
}

async function parseExamApiError(r: Response): Promise<string> {
  const text = await r.text()
  try {
    const j = JSON.parse(text) as { error?: string }
    if (j.error?.trim()) return j.error.trim()
  } catch {
    // not JSON
  }
  return text.trim() || `Request failed (${r.status})`
}

export async function fetchExamReadiness(
  userId: string,
  profileId: string,
): Promise<{ snapshot: ReadinessSnapshot }> {
  const p = new URLSearchParams({ userId, profileId })
  const r = await fetch(`/api/exam/readiness?${p}`, { headers: { 'x-user-id': userId }, cache: 'no-store' })
  if (!r.ok) throw new Error(await r.text())
  return (await r.json()) as { snapshot: ReadinessSnapshot }
}
