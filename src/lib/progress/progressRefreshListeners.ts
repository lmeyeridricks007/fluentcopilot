'use client'

import { RETENTION_UPDATED_EVENT } from '@/lib/retention/persistence'
import { useAuthStore } from '@/store/authStore'
import { refreshLearnerProgressSnapshot } from './progressActions'

const EVENTS = [
  RETENTION_UPDATED_EVENT,
  'lt-practice-progress-updated',
  'lt-mastery-updated',
  'exam-readiness-storage-updated',
  'lt-weakness-updated',
  'lt-kmn-progress-updated',
  'lt-skill-track-progress-updated',
  'lt-practice-exam-attempts-updated',
] as const

/**
 * Keeps `useLearnerProgressStore` aligned when domain modules emit browser events after writes.
 * Subscribe once per authenticated session (e.g. from `AuthProvider`).
 */
export function attachLearnerProgressAutoRefresh(): () => void {
  if (typeof window === 'undefined') return () => {}

  let t: number | null = null
  const schedule = () => {
    if (t != null) window.clearTimeout(t)
    t = window.setTimeout(() => {
      t = null
      const uid = useAuthStore.getState().user?.id
      if (uid) refreshLearnerProgressSnapshot(uid)
    }, 120)
  }

  for (const ev of EVENTS) {
    window.addEventListener(ev, schedule)
  }
  return () => {
    for (const ev of EVENTS) {
      window.removeEventListener(ev, schedule)
    }
    if (t != null) window.clearTimeout(t)
  }
}
