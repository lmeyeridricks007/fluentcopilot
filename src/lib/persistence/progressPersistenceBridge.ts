import { notifyProgressDomainChanged } from '@/lib/progress/progressActions'

/**
 * After any domain module writes mutable progress to user-scoped storage, refresh the aggregate progress store.
 * Domain writes themselves should use storage helpers; this only updates the in-memory snapshot.
 */
export function refreshProgressAfterDomainWrite(userId: string | undefined): void {
  if (!userId) return
  notifyProgressDomainChanged(userId)
}
