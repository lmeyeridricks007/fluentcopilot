import type { XpLedgerEntry, XpReason } from '@/lib/retention/types'

export function isoWeekKey(d: Date = new Date()): string {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

export function appendXp(input: {
  total: number
  ledger: XpLedgerEntry[]
  weeklyXp: number
  ledgerWeekKey: string
  amount: number
  reason: XpReason
  ref?: string
  now?: Date
}): { total: number; ledger: XpLedgerEntry[]; weeklyXp: number; ledgerWeekKey: string } {
  const now = input.now ?? new Date()
  const wk = isoWeekKey(now)
  let weekly = input.weeklyXp
  let weekKey = input.ledgerWeekKey
  if (weekKey !== wk) {
    weekKey = wk
    weekly = 0
  }
  weekly += input.amount
  const entry: XpLedgerEntry = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    at: now.toISOString(),
    amount: input.amount,
    reason: input.reason,
    ref: input.ref,
  }
  const ledger = [...input.ledger, entry].slice(-200)
  return {
    total: input.total + input.amount,
    ledger,
    weeklyXp: weekly,
    ledgerWeekKey: weekKey,
  }
}
