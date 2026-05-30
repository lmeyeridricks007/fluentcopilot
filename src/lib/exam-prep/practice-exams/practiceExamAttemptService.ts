/**
 * Append-only local history for practice exam attempts (per fixed set).
 */
import type { PracticeExamAttemptStored, PracticeExamSetId } from '@/lib/exam-prep/practice-exams/types'
import { getRetentionUserId } from '@/lib/retention/retentionService'
import { PRACTICE_DOMAIN_BASE_KEYS, userScopedLocalKey } from '@/lib/storage/storageKeys'

const EXAM_ATTEMPTS_BASE = PRACTICE_DOMAIN_BASE_KEYS.practiceExamAttempts
const MAX = 400

function storageKey(): string {
  if (typeof window === 'undefined') return EXAM_ATTEMPTS_BASE
  return userScopedLocalKey(EXAM_ATTEMPTS_BASE, getRetentionUserId())
}

export function loadPracticeExamAttemptsForUserId(userId: string): PracticeExamAttemptStored[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(userScopedLocalKey(EXAM_ATTEMPTS_BASE, userId))
    if (!raw) return []
    return JSON.parse(raw) as PracticeExamAttemptStored[]
  } catch {
    return []
  }
}

function read(): PracticeExamAttemptStored[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return []
    return JSON.parse(raw) as PracticeExamAttemptStored[]
  } catch {
    return []
  }
}

function write(rows: PracticeExamAttemptStored[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(), JSON.stringify(rows))
    window.dispatchEvent(new CustomEvent('lt-practice-exam-attempts-updated'))
  } catch {
    /* quota */
  }
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `pe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function appendPracticeExamAttempt(row: Omit<PracticeExamAttemptStored, 'id'>): PracticeExamAttemptStored {
  const full: PracticeExamAttemptStored = { ...row, id: newId() }
  const next = [full, ...read()].slice(0, MAX)
  write(next)
  return full
}

export function loadPracticeExamAttempts(): PracticeExamAttemptStored[] {
  return read()
}

export function attemptsForPracticeExamSet(setId: PracticeExamSetId): PracticeExamAttemptStored[] {
  return read()
    .filter((a) => a.setId === setId)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
}
