'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Card, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { APP_EXAM_SYSTEM, APP_EXAM_TRAIN_SETUP } from '@/lib/routing/appRoutes'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import { formatBlueprintDebugSummary } from '@/lib/exam-system/examDevDebugFormat'
import { fetchExamReadiness } from './examApi'
import { ExamDevDebugPanel, ExamReadinessBadge, ExamShell } from './ui'
import { useExamHubProfileSelection } from './useExamHubProfileSelection'

export function ExamReadinessClient() {
  const { userId, profileId, setProfileId, profilesQ } = useExamHubProfileSelection()

  const q = useQuery({
    queryKey: ['exam', 'readiness', userId, profileId],
    queryFn: () => fetchExamReadiness(userId, profileId),
    enabled: Boolean(profileId),
  })
  const s = q.data?.snapshot
  const fullProfile = profileId ? getExamProfile(profileId) : undefined

  return (
    <ExamShell contentClassName="pb-28">
      <Link
        href={APP_EXAM_SYSTEM}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-ink-secondary hover:text-ink-primary mb-5"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Exam hub
      </Link>

      <header className="space-y-2 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Diagnostics</p>
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Readiness detail</h1>
        {profilesQ.data && profilesQ.data.length > 0 ? (
          <label className="flex flex-wrap items-center gap-2 text-caption text-ink-secondary">
            <span className="font-semibold text-ink-primary">Profile</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-body-sm font-semibold text-ink-primary"
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
            >
              {profilesQ.data.map((p) => (
                <option key={p.examId} value={p.examId}>
                  {p.title} ({p.level})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-caption text-ink-secondary">Profile · {profileId || '—'}</p>
        )}
      </header>

      {q.isLoading ? <p className="text-body-sm text-ink-secondary">Loading…</p> : null}
      {q.isError ? <p className="text-body-sm text-red-700">Could not load readiness.</p> : null}

      {s ? (
        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <ExamReadinessBadge band={s.band} />
            <span className="text-caption text-ink-secondary">{s.confidence} confidence</span>
          </div>
          <p className="text-display font-bold tabular-nums text-ink-primary leading-none">{(s.score01 * 100).toFixed(0)}%</p>
          {s.rationale?.length ? (
            <CardDescription className="leading-relaxed">{s.rationale.join(' ')}</CardDescription>
          ) : null}
          {s.blockers?.length ? (
            <div>
              <p className="text-caption font-semibold text-ink-primary">Blockers</p>
              <ul className="mt-2 list-disc pl-5 text-body-sm text-ink-secondary space-y-1">
                {s.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link href={`${APP_EXAM_TRAIN_SETUP}?profileId=${encodeURIComponent(profileId)}&prefAlmostExam=1`}>
            <Button variant="primary" fullWidth>
              Train on blockers
            </Button>
          </Link>
        </Card>
      ) : null}

      <ExamDevDebugPanel
        title="Readiness · dev internals"
        blocks={
          fullProfile
            ? [{ label: 'Blueprint summary', body: formatBlueprintDebugSummary(fullProfile) }]
            : []
        }
      />
    </ExamShell>
  )
}
