'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { APP_EXAM_SYSTEM } from '@/lib/routing/appRoutes'
import { SessionHistoryCard } from '@/features/practice-hub/session-history/SessionHistoryCard'
import { fetchExamProfiles, fetchExamSessions } from './examApi'
import { ExamDevDebugPanel, ExamShell } from './ui'
import {
  defaultExamHistoryFilters,
  examSessionCardSubtitle,
  examSessionCardTitle,
  examSessionFootNote,
  examSessionHistoryStatus,
  examSessionModality,
  examSessionPrimaryAction,
  examSessionSecondaryAction,
  examSessionSummaryLine,
  filterExamSessions,
  type ExamHistoryFilterState,
} from './examHistoryCopy'

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortSessionRef(id: string): string {
  const compact = id.replace(/-/g, '')
  const tail = compact.slice(-6)
  return tail.length >= 6 ? tail : id.slice(0, 6)
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors ${
        active ? 'border-primary-900 bg-primary-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

export function ExamHistoryClient() {
  const userId = useAuthStore((s) => s.user?.id) ?? LOCAL_ANONYMOUS_LEARNER_ID
  const [filters, setFilters] = useState<ExamHistoryFilterState>(defaultExamHistoryFilters)

  const profilesQ = useQuery({
    queryKey: ['exam', 'profiles'],
    queryFn: fetchExamProfiles,
  })

  const sessionsQ = useQuery({
    queryKey: ['exam', 'sessions', userId, 'archive'],
    queryFn: () => fetchExamSessions(userId),
  })

  const profileTitleById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of profilesQ.data ?? []) {
      m.set(p.examId, p.title)
    }
    return m
  }, [profilesQ.data])

  const filtered = useMemo(() => {
    const raw = sessionsQ.data ?? []
    return filterExamSessions(raw, filters)
  }, [sessionsQ.data, filters])

  const profileOptions = profilesQ.data ?? []

  return (
    <ExamShell contentClassName="pb-28">
      <Link
        href={APP_EXAM_SYSTEM}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-ink-secondary hover:text-ink-primary mb-5"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Exam hub
      </Link>

      <header className="space-y-2 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Archive</p>
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Session history</h1>
        <p className="text-caption text-ink-secondary leading-relaxed">
          Simulations and training across profiles — filter, then reopen a report or continue an in-progress run.
        </p>
      </header>

      <section aria-label="Filters" className="mb-8 space-y-4 rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Filters</p>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-600">Mode</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['simulation', 'Simulation'],
                ['training', 'Training'],
              ] as const
            ).map(([id, label]) => (
              <FilterChip
                key={id}
                active={filters.runMode === id}
                onClick={() => setFilters((f) => ({ ...f, runMode: id }))}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-600">Level</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All'],
                ['A1', 'A1'],
                ['A2', 'A2'],
                ['B1', 'B1'],
              ] as const
            ).map(([id, label]) => (
              <FilterChip
                key={id}
                active={filters.level === id}
                onClick={() => setFilters((f) => ({ ...f, level: id }))}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-slate-600" htmlFor="exam-filter-profile">
            Exam profile
          </label>
          <select
            id="exam-filter-profile"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm text-ink-primary"
            value={filters.profileId}
            onChange={(e) => {
              const v = e.target.value as 'all' | string
              setFilters((f) => ({ ...f, profileId: v === 'all' ? 'all' : v }))
            }}
          >
            <option value="all">All profiles</option>
            {profileOptions.map((p) => (
              <option key={p.examId} value={p.examId}>
                {p.title} ({p.examId})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-slate-600">Date</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'Any time'],
                ['7d', 'Last 7 days'],
                ['30d', 'Last 30 days'],
              ] as const
            ).map(([id, label]) => (
              <FilterChip
                key={id}
                active={filters.datePreset === id}
                onClick={() => setFilters((f) => ({ ...f, datePreset: id }))}
              >
                {label}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      {sessionsQ.isLoading ? <p className="text-body-sm text-ink-secondary">Loading…</p> : null}
      {sessionsQ.isError ? <p className="text-body-sm text-red-700">Could not load history.</p> : null}

      <ul className="space-y-3 list-none p-0 m-0">
        {filtered.map((s) => {
          const profileTitle = profileTitleById.get(s.profileId)
          const modality = examSessionModality(s)
          const primary = examSessionPrimaryAction(s)
          const secondary = examSessionSecondaryAction(s)
          return (
            <li key={s.id}>
              <SessionHistoryCard
                modality={modality}
                title={examSessionCardTitle(profileTitle, s)}
                titleHint={`#${shortSessionRef(s.id)}`}
                subtitle={`${examSessionCardSubtitle(profileTitle, s)} · ${examSessionSummaryLine(s)}`}
                dateLabel={formatUpdated(s.updatedAt)}
                status={examSessionHistoryStatus(s)}
                footNote={examSessionFootNote(s)}
                primaryAction={primary}
                secondaryAction={secondary}
              />
            </li>
          )
        })}
      </ul>

      {!sessionsQ.isLoading && filtered.length === 0 ? (
        <p className="mt-6 text-body-sm text-ink-secondary">
          No sessions match these filters.{' '}
          <button type="button" className="font-semibold text-primary-900 underline" onClick={() => setFilters(defaultExamHistoryFilters())}>
            Clear filters
          </button>
        </p>
      ) : null}

      <ExamDevDebugPanel
        title="History archive · dev internals"
        blocks={[
          { label: 'Active filters', body: JSON.stringify(filters, null, 2) },
          {
            label: 'Session counts',
            body: JSON.stringify(
              {
                raw: sessionsQ.data?.length ?? 0,
                filtered: filtered.length,
              },
              null,
              2,
            ),
          },
        ]}
      />

      <Link href={APP_EXAM_SYSTEM} className="mt-10 block">
        <Button variant="secondary" fullWidth>
          Back to hub
        </Button>
      </Link>
    </ExamShell>
  )
}
