'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { clsx } from 'clsx'
import { useTalkContinueSessions } from '@/features/practice-hub/useTalkContinueSessions'
import { threadRecapHref, threadReportHref } from '@/features/practice-hub/session-history/sessionThreadLinks'
import { getSpeakLiveCatalogItem } from '@/features/speak-live/speakLiveScenarios'
import type { ApiConversationThread } from '@/lib/api/apiTypes'
import { listListeningSessionHistory } from '@/lib/listening-mode/listeningSessionStorage'
import { loadReadAloudReport } from '@/features/read-aloud/readAloudStorage'
import { readSpeakLiveSavedSessionBookmarks } from '@/features/practice-hub/session-history/speakLiveSavedSessionsRead'
import {
  APP_READ_ALOUD_REPORT,
  APP_TALK_HUB,
  appTalkThreadRecap,
  fromYourDayPackSessionHref,
  listeningModeReportHref,
  personalizedPracticeReportHref,
  speakLiveRunHref,
} from '@/lib/routing/appRoutes'
import { listPersonalizedPracticeHistory } from '@/lib/quick-capture/personalizedPracticeHistory'
import { TRAIN_DESK_HEADLINE } from '@/features/practice-hub/session-history/displayCopy'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { playAppSound } from '@/lib/interaction/appSounds'

type HistoryRowKind = 'scenario' | 'coach_chat' | 'read_aloud' | 'listening' | 'personalized_practice'

type HistoryRow = {
  id: string
  kind: HistoryRowKind
  title: string
  endedAt: string
  reportHref: string
  xp: number
  /** From-your-day themes / capture mix */
  themesLine?: string
  completionLabel?: string
  /** Generated pack: reopen session URL */
  reopenHref?: string
  /** From your day: capture modality summary */
  sourceCaptureSummary?: string
  /** 0–100 for personalized packs */
  completionPct?: number
}

type HistoryTypeFilter = 'all' | HistoryRowKind
type HistoryDateFilter = 'all' | '7d' | '30d' | '90d'

function shortThreadRef(id: string): string {
  const tail = id.replace(/-/g, '').slice(-6)
  return tail.length >= 6 ? tail : id.slice(0, 6)
}

function isSpeakLiveThread(t: ApiConversationThread | { conversationSurface?: string }): boolean {
  return 'conversationSurface' in t && t.conversationSurface === 'speak_live'
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function buildXpMap(
  rows: Array<{ sessionId: string; xpAwarded: number }> | undefined,
): Map<string, number> {
  const m = new Map<string, number>()
  if (!rows) return m
  for (const r of rows) {
    if (r.sessionId) m.set(r.sessionId, r.xpAwarded)
  }
  return m
}

function reportHrefForThread(t: ApiConversationThread): string {
  if (isSpeakLiveThread(t)) {
    const voice = threadReportHref(t)
    if (voice) return voice
    return threadRecapHref(t)
  }
  return appTalkThreadRecap(t.id)
}

function mergeHistoryRows(params: {
  completed: ApiConversationThread[]
  listening: ReturnType<typeof listListeningSessionHistory>
  personalized: ReturnType<typeof listPersonalizedPracticeHistory>
  readAloud: ReturnType<typeof loadReadAloudReport>
  bookmarks: ReturnType<typeof readSpeakLiveSavedSessionBookmarks>
  xpBySessionId: Map<string, number>
}): HistoryRow[] {
  const out: HistoryRow[] = []

  for (const t of params.completed) {
    const apiT = t as ApiConversationThread
    const speak = isSpeakLiveThread(t)
    const kind: HistoryRowKind = speak ? 'scenario' : 'coach_chat'
    const title = speak
      ? getSpeakLiveCatalogItem(t.scenarioId)?.title ?? t.scenarioId.replace(/-/g, ' ')
      : TRAIN_DESK_HEADLINE
    out.push({
      id: `thread-${t.id}`,
      kind,
      title,
      endedAt: t.updatedAt,
      reportHref: reportHrefForThread(apiT),
      xp: params.xpBySessionId.get(t.id) ?? 0,
    })
  }

  for (const row of params.listening) {
    out.push({
      id: `listen-${row.sessionId}`,
      kind: 'listening',
      title: row.packTitle,
      endedAt: row.endedAt,
      reportHref: listeningModeReportHref(row.sessionId),
      xp: params.xpBySessionId.get(row.sessionId) ?? 0,
    })
  }

  for (const row of params.personalized) {
    const r = row.report
    const pct =
      typeof r.completionPct === 'number'
        ? r.completionPct
        : Math.min(100, Math.round((r.stats.stepsCompleted / Math.max(1, r.stats.stepsTotal)) * 100))
    const sources =
      (r.sourceCaptureTypeLabels?.length ? r.sourceCaptureTypeLabels.join(' · ') : null) ||
      row.themeSummary ||
      row.sourceThemes.slice(0, 4).join(' · ')
    out.push({
      id: `personalized-${row.packId}`,
      kind: 'personalized_practice',
      title: row.title,
      endedAt: row.endedAt,
      reportHref: personalizedPracticeReportHref(row.packId),
      xp: params.xpBySessionId.get(row.progressionSessionId) ?? row.xpAwarded ?? 0,
      themesLine: row.themeSummary || row.sourceThemes.slice(0, 4).join(' · '),
      completionLabel: row.completed ? 'Completed' : 'Partial',
      reopenHref: fromYourDayPackSessionHref(row.packId, row.localDateYmd),
      sourceCaptureSummary: sources,
      completionPct: pct,
    })
  }

  if (params.readAloud) {
    out.push({
      id: 'read-aloud-latest',
      kind: 'read_aloud',
      title: params.readAloud.session.title?.trim() || 'Read aloud',
      endedAt: params.readAloud.savedAt,
      reportHref: APP_READ_ALOUD_REPORT,
      xp: params.xpBySessionId.get('read-aloud-latest') ?? 0,
    })
  }

  let bi = 0
  for (const b of params.bookmarks) {
    const item = getSpeakLiveCatalogItem(b.scenarioId)
    const title = item?.title ?? b.scenarioId.replace(/-/g, ' ')
    out.push({
      id: `bookmark-${b.savedAt}-${bi++}`,
      kind: 'scenario',
      title: `${title} (saved)`,
      endedAt: b.savedAt,
      reportHref: speakLiveRunHref({ scenarioId: b.scenarioId, level: b.level }),
      xp: 0,
    })
  }

  return out.sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt))
}

function filterRows(rows: HistoryRow[], type: HistoryTypeFilter, date: HistoryDateFilter): HistoryRow[] {
  const now = Date.now()
  const ms =
    date === '7d' ? 7 * 86_400_000 : date === '30d' ? 30 * 86_400_000 : date === '90d' ? 90 * 86_400_000 : 0
  return rows.filter((r) => {
    if (type !== 'all' && r.kind !== type) return false
    if (date === 'all') return true
    const t = Date.parse(r.endedAt)
    return !Number.isNaN(t) && t >= now - ms
  })
}

const TYPE_OPTIONS: { id: HistoryTypeFilter; label: string }[] = [
  { id: 'all', label: 'All types' },
  { id: 'scenario', label: 'Scenarios' },
  { id: 'coach_chat', label: 'Coach chats' },
  { id: 'read_aloud', label: 'Read aloud' },
  { id: 'listening', label: 'Listening' },
  { id: 'personalized_practice', label: 'From your day' },
]

const DATE_OPTIONS: { id: HistoryDateFilter; label: string }[] = [
  { id: 'all', label: 'Any date' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
]

const KIND_LABEL: Record<HistoryRowKind, string> = {
  scenario: 'Scenario',
  coach_chat: 'Coach chat',
  read_aloud: 'Read aloud',
  listening: 'Listening',
  personalized_practice: 'Personalized practice',
}

export default function HistoryPage() {
  const pathname = usePathname()
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all')
  const [dateFilter, setDateFilter] = useState<HistoryDateFilter>('all')

  const { useBackend, continueQuery, sessionHistoryQuery, completedThreadsForHistory } = useTalkContinueSessions()

  const listening = useMemo(() => {
    void pathname
    if (typeof window === 'undefined') return []
    return listListeningSessionHistory(userId)
  }, [pathname, userId])

  const readAloud = useMemo(() => {
    void pathname
    return typeof window !== 'undefined' ? loadReadAloudReport() : null
  }, [pathname])

  const bookmarks = useMemo(() => {
    void pathname
    return readSpeakLiveSavedSessionBookmarks()
  }, [pathname])

  const personalized = useMemo(() => {
    void pathname
    if (typeof window === 'undefined') return []
    return listPersonalizedPracticeHistory(userId)
  }, [pathname, userId])

  const momentumQ = useQuery({
    queryKey: ['progression', 'momentum', 'history', userId],
    queryFn: async () => {
      const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'
      const r = await fetch(`/api/progression/momentum?userId=${encodeURIComponent(userId)}`, {
        headers: { 'x-time-zone': tz, 'x-user-id': userId },
      })
      if (!r.ok) return { recentActivity: [] as Array<{ sessionId: string; xpAwarded: number }> }
      const j = (await r.json()) as { recentActivity?: Array<{ sessionId: string; xpAwarded: number }> }
      return { recentActivity: j.recentActivity ?? [] }
    },
    staleTime: 20_000,
  })

  const xpMap = useMemo(() => buildXpMap(momentumQ.data?.recentActivity), [momentumQ.data?.recentActivity])

  const allRows = useMemo(
    () =>
      mergeHistoryRows({
        completed: completedThreadsForHistory,
        listening,
        personalized,
        readAloud,
        bookmarks,
        xpBySessionId: xpMap,
      }),
    [completedThreadsForHistory, listening, personalized, readAloud, bookmarks, xpMap],
  )

  const visible = useMemo(() => filterRows(allRows, typeFilter, dateFilter), [allRows, typeFilter, dateFilter])

  return (
    <div className="min-h-[100dvh] bg-[#fafaf7] pb-28 text-[#0F172A]">
      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <header className="mb-6 space-y-3">
          <Link
            href={APP_TALK_HUB}
            onClick={() => playAppSound('tap')}
            className="inline-flex min-h-touch items-center gap-1 text-[13px] font-semibold text-[#7c3aed] underline-offset-2 hover:underline"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Talk
          </Link>
          <div>
            <h1 className="text-[1.45rem] font-bold tracking-tight text-[#0F172A]">History</h1>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
              Past sessions, scenarios, coach threads, read-alouds, listening reports, and From your day packs.
            </p>
          </div>
        </header>

        <div className="mb-5 space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div>
            <label htmlFor="hist-type" className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Type
            </label>
            <select
              id="hist-type"
              value={typeFilter}
              onChange={(e) => {
                playAppSound('tap')
                setTypeFilter(e.target.value as HistoryTypeFilter)
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] font-medium text-slate-900"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hist-date" className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Date
            </label>
            <select
              id="hist-date"
              value={dateFilter}
              onChange={(e) => {
                playAppSound('tap')
                setDateFilter(e.target.value as HistoryDateFilter)
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] font-medium text-slate-900"
            >
              {DATE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {useBackend && (continueQuery.isLoading || sessionHistoryQuery.isLoading) ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200/50" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[14px] text-slate-600">
            Nothing in this filter yet. Finish a session and it will show up here.
          </p>
        ) : (
          <ul className="space-y-3">
            {visible.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={clsx(
                      'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
                      row.kind === 'scenario' && 'bg-violet-500/[0.08] text-violet-900 ring-violet-500/15',
                      row.kind === 'coach_chat' && 'bg-emerald-500/[0.08] text-emerald-900 ring-emerald-500/15',
                      row.kind === 'read_aloud' && 'bg-fuchsia-500/[0.08] text-fuchsia-900 ring-fuchsia-500/15',
                      row.kind === 'listening' && 'bg-teal-500/[0.09] text-teal-950 ring-teal-500/18',
                      row.kind === 'personalized_practice' &&
                        'bg-indigo-500/[0.09] text-indigo-950 ring-indigo-500/18',
                    )}
                  >
                    {KIND_LABEL[row.kind]}
                  </span>
                  {row.id.startsWith('thread-') ? (
                    <span className="text-[11px] font-medium text-slate-400 tabular-nums">
                      #{shortThreadRef(row.id.replace(/^thread-/, ''))}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[16px] font-semibold leading-snug text-[#0F172A]">{row.title}</p>
                <p className="mt-1 text-[13px] text-slate-500">{formatDateLabel(row.endedAt)}</p>
                {row.kind === 'personalized_practice' && row.sourceCaptureSummary ? (
                  <p className="mt-1.5 text-[13px] leading-snug text-slate-600 line-clamp-2">
                    <span className="font-semibold text-slate-700">Sources: </span>
                    {row.sourceCaptureSummary}
                  </p>
                ) : row.themesLine ? (
                  <p className="mt-1.5 text-[13px] leading-snug text-slate-600 line-clamp-2">
                    <span className="font-semibold text-slate-700">Themes: </span>
                    {row.themesLine}
                  </p>
                ) : null}
                {row.kind === 'personalized_practice' && typeof row.completionPct === 'number' ? (
                  <p className="mt-1 text-[13px] font-medium text-slate-700">
                    {row.completionPct}% complete
                    {row.completionLabel ? ` · ${row.completionLabel}` : ''}
                  </p>
                ) : null}
                <p className="mt-2 text-[14px] font-semibold tabular-nums text-[#7c3aed]">
                  {row.xp > 0 ? `+${row.xp} XP` : '—'}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                  {row.kind === 'personalized_practice' && row.reopenHref ? (
                    <Link
                      href={row.reopenHref}
                      onClick={() => playAppSound('tap')}
                      className="inline-flex text-[14px] font-bold text-[#7c3aed] underline-offset-4 hover:underline"
                    >
                      Reopen pack
                    </Link>
                  ) : null}
                  <Link
                    href={row.reportHref}
                    onClick={() => playAppSound('tap')}
                    className="inline-flex text-[14px] font-bold text-[#7c3aed] underline-offset-4 hover:underline"
                  >
                    {row.kind === 'personalized_practice' ? 'Summary' : 'View report'}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
