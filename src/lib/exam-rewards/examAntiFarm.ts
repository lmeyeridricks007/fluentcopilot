import { localDateKey } from '@/lib/retention/streak'
import { XP_PRACTICE_SAME_DAY_FLOOR, XP_PRACTICE_SAME_DAY_REPEAT_FACTOR } from '@/lib/retention/constants'

/**
 * Same-day soft cap for repeated identical exam units (per ref + calendar day).
 */
export function applyExamXpAntiFarm(antiFarmRef: string, amount: number): number {
  if (typeof window === 'undefined') return amount
  const dk = localDateKey()
  const k = `lt-exam-xp-${antiFarmRef}-${dk}`
  const n = parseInt(sessionStorage.getItem(k) ?? '0', 10) + 1
  sessionStorage.setItem(k, String(n))
  if (n <= 1) return amount
  return Math.max(XP_PRACTICE_SAME_DAY_FLOOR, Math.floor(amount * XP_PRACTICE_SAME_DAY_REPEAT_FACTOR))
}
