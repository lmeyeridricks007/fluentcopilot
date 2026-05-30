/**
 * Persist exam-style attempts for readiness (local only).
 */
import type { ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import type { ExamReadinessAttemptRecord } from '@/lib/exam-readiness/types'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const READINESS_BASE = PRACTICE_DOMAIN_BASE_KEYS.examReadinessAttempts

function storageKey(): string {
  if (typeof window === 'undefined') return READINESS_BASE
  return userScopedLocalKey(READINESS_BASE, getRetentionUserId())
}

/** Same-tab refresh for readiness UI after a new attempt is stored. */
export const EXAM_READINESS_STORAGE_UPDATED_EVENT = 'exam-readiness-storage-updated'
const MAX_RECORDS = 120
const MAX_AGE_MS = 120 * 24 * 60 * 60 * 1000

export function loadExamReadinessAttemptsForUserId(userId: string): ExamReadinessAttemptRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(userScopedLocalKey(READINESS_BASE, userId))
    if (!raw) return []
    const rows = JSON.parse(raw) as ExamReadinessAttemptRecord[]
    return prune(Array.isArray(rows) ? rows : [])
  } catch {
    return []
  }
}

function read(): ExamReadinessAttemptRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    return JSON.parse(raw) as ExamReadinessAttemptRecord[]
  } catch {
    return []
  }
}

function write(rows: ExamReadinessAttemptRecord[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(rows))
  } catch {
    /* quota */
  }
}

function prune(rows: ExamReadinessAttemptRecord[]): ExamReadinessAttemptRecord[] {
  const cutoff = Date.now() - MAX_AGE_MS
  return rows.filter((r) => new Date(r.at).getTime() >= cutoff)
}

export function appendExamReadinessAttempt(row: ExamReadinessAttemptRecord): void {
  const now = read()
  const next = prune([row, ...now])
    .slice(0, MAX_RECORDS)
  write(next)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EXAM_READINESS_STORAGE_UPDATED_EVENT))
  }
}

export function loadExamReadinessAttempts(): ExamReadinessAttemptRecord[] {
  return prune(read())
}

export function attemptsForModule(module: ExamPrepTypeId): ExamReadinessAttemptRecord[] {
  return loadExamReadinessAttempts().filter((r) => r.module === module)
}

export function clearExamReadinessAttempts(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(storageKey())
  window.dispatchEvent(new CustomEvent(EXAM_READINESS_STORAGE_UPDATED_EVENT))
}
