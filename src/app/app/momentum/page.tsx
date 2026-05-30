'use client'

import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Flame, History, LineChart } from 'lucide-react'
import { clsx } from 'clsx'
import { APP_HISTORY } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type { MomentumDayBucket } from '@/lib/progression/momentumLast7'

type MomentumApiResponse = {
  streak: number
  longestStreak: number
  totalXP: number
  weeklyXP: number
  last7Days: MomentumDayBucket[]
  daysPracticedLast7: number
  recentActivity: Array<{
    sessionId: string
    type: string
    completed: boolean
    xpAwarded: number
    createdAt: string
  }>
}

function SectionShell({
  kicker,
  title,
  children,
  className,
}: {
  kicker: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={clsx(
        'rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-5 shadow-sm ring-1 ring-slate-900/[0.02] sm:px-5 sm:py-6',
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{kicker}</p>
      <h2 className="mt-1 text-lg font-bold text-[#0F172A]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function WeeklyXpChart({ days }: { days: MomentumDayBucket[] }) {
  const maxXp = useMemo(() => Math.max(1, ...days.map((d) => d.xpEarned)), [days])
  return (
    <div className="flex h-36 items-end justify-between gap-1.5 sm:gap-2" aria-label="XP over the last seven days">
      {days.map((d) => {
        const hPct = d.xpEarned <= 0 ? 0 : Math.max(10, Math.round((d.xpEarned / maxXp) * 100))
        return (
          <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end justify-center">
              <div
                className={clsx(
                  'w-full max-w-[2.25rem] rounded-t-lg transition-colors',
                  d.xpEarned > 0 ? 'bg-[#7c3aed]' : 'bg-slate-200/80',
                )}
                style={{ height: d.xpEarned > 0 ? `${hPct}%` : '5px' }}
                title={`${d.date}: ${d.xpEarned} XP`}
              />
            </div>
            <p className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{d.labelShort}</p>
            <p className="text-[10px] tabular-nums text-slate-400">{d.xpEarned}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function MomentumPage() {
  const authUserId = useAuthStore((s) => s.user?.id)
  const userId = authUserId ?? LOCAL_ANONYMOUS_LEARNER_ID
  const timeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

  const q = useQuery({
    queryKey: ['progression', 'momentum', 'page', userId, timeZone],
    queryFn: async (): Promise<MomentumApiResponse> => {
      const r = await fetch(`/api/progression/momentum?userId=${encodeURIComponent(userId)}`, {
        headers: { 'x-time-zone': timeZone, 'x-user-id': userId },
      })
      if (!r.ok) throw new Error(await r.text())
      return (await r.json()) as MomentumApiResponse
    },
    staleTime: 20_000,
    retry: 1,
  })

  const data = q.data
  const last7 = data?.last7Days ?? []

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 pb-28">
      <header className="mb-6">
        <h1 className="text-[1.65rem] font-bold tracking-tight text-[#0F172A]">Momentum</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">Streak, XP, and how often you show up.</p>
      </header>

      {q.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/50" />
          ))}
        </div>
      ) : q.isError ? (
        <p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          Could not load momentum. Try again in a moment.
        </p>
      ) : (
        <div className="space-y-5">
          {/* 1 — Streak */}
          <SectionShell kicker="Streak" title="Keep the habit warm">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-orange-100 bg-gradient-to-br from-amber-50 to-orange-50/40 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-orange-900/70">Current</p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums text-[#0F172A]">
                  <Flame className="h-6 w-6 text-orange-500" aria-hidden />
                  {data!.streak > 0 ? `${data!.streak}d` : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Longest</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-[#0F172A]">
                  {data!.longestStreak > 0 ? `${data!.longestStreak}d` : '—'}
                </p>
              </div>
            </div>
          </SectionShell>

          {/* 2 — XP */}
          <SectionShell kicker="XP" title="Totals and this week">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total XP</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-[#7c3aed]">{data!.totalXP}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Weekly counter</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-800">{data!.weeklyXP}</p>
              </div>
            </div>
            <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Weekly XP chart</p>
            <WeeklyXpChart days={last7} />
            <p className="mt-2 text-[12px] leading-snug text-slate-500">Bars use XP logged per day (rolling seven days).</p>
          </SectionShell>

          {/* 3 — Activity */}
          <SectionShell kicker="Activity" title="Last 7 days">
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {last7.map((d) => (
                <li key={d.date} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span className="font-medium text-slate-800">{d.labelShort}</span>
                  <span className="tabular-nums text-slate-600">
                    {d.practiced ? (
                      <span className="text-emerald-700">+{d.xpEarned} XP</span>
                    ) : (
                      <span className="text-slate-400">Rest</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </SectionShell>

          {/* 4 — Consistency */}
          <SectionShell kicker="Consistency" title="Days with practice">
            <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-3">
              <LineChart className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" aria-hidden />
              <div>
                <p className="text-3xl font-bold tabular-nums text-[#0F172A]">{data!.daysPracticedLast7}</p>
                <p className="mt-1 text-[13px] leading-snug text-slate-600">
                  Days you logged meaningful practice in the rolling week (same window as the chart).
                </p>
              </div>
            </div>
          </SectionShell>

          {/* 5 — History */}
          <section className="rounded-2xl border border-slate-200/90 bg-slate-50/60 px-4 py-5 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">History</p>
            <h2 className="mt-1 text-lg font-bold text-[#0F172A]">Sessions & recaps</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
              Full threads, Speak Live runs, and reports stay in one place.
            </p>
            <Link
              href={APP_HISTORY}
              onClick={() => playAppSound('tap')}
              className="mt-4 inline-flex items-center gap-1 text-[14px] font-semibold text-[#7c3aed] underline-offset-4 hover:underline"
            >
              <History className="h-4 w-4" aria-hidden />
              View history
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        </div>
      )}
    </div>
  )
}
