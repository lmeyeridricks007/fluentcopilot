'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen, Dumbbell, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type { ExamScoringDimension } from '@/lib/exam-system/types'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import { formatBlueprintDebugSummary } from '@/lib/exam-system/examDevDebugFormat'
import { APP_EXAM_SYSTEM, APP_EXAM_TRAINING_RUN, APP_EXAM_TRAIN_SETUP } from '@/lib/routing/appRoutes'
import { examDimensionLabelFriendly } from '@/lib/exam-system/examReportUserCopy'
import { fetchExamSession, reprocessExamReport } from './examApi'
import { ExamDevDebugPanel, ExamShell } from './ui'

function dimLabel(d: ExamScoringDimension | string) {
  return examDimensionLabelFriendly(d)
}

export function ExamTrainingReportClient() {
  const search = useSearchParams()
  const sessionId = search.get('id')?.trim() ?? ''
  const xpQ = search.get('xp')
  const xpFlash = xpQ != null && xpQ !== '' ? Number(xpQ) : null
  const userId = useAuthStore((s) => s.user?.id) ?? LOCAL_ANONYMOUS_LEARNER_ID
  const qc = useQueryClient()
  const [reprocessing, setReprocessing] = useState(false)
  const [reprocessErr, setReprocessErr] = useState<string | null>(null)

  const sessionQ = useQuery({
    queryKey: ['exam', 'session', userId, sessionId],
    queryFn: () => fetchExamSession(userId, sessionId),
    enabled: Boolean(sessionId),
    staleTime: 0,
  })

  const session = sessionQ.data
  const report = session?.report

  if (!sessionId) {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">
          Missing session id.{' '}
          <Link href={APP_EXAM_TRAIN_SETUP} className="font-semibold text-primary-900">
            Training setup
          </Link>
        </p>
      </ExamShell>
    )
  }

  if (sessionQ.isError) {
    return (
      <ExamShell>
        <p className="text-body-sm text-red-700">Could not load session.</p>
      </ExamShell>
    )
  }

  if (sessionQ.isLoading || !session) {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">Loading report…</p>
      </ExamShell>
    )
  }

  if (session.mode !== 'training' || report?.kind !== 'training') {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">This page only shows completed training reports.</p>
        <Link href={APP_EXAM_SYSTEM} className="mt-4 block">
          <Button variant="secondary" fullWidth>
            Exam hub
          </Button>
        </Link>
      </ExamShell>
    )
  }

  if (session.status !== 'completed') {
    return (
      <ExamShell>
        <p className="text-body-sm text-ink-secondary">
          Session not finished.{' '}
          <Link href={`${APP_EXAM_TRAINING_RUN}?id=${encodeURIComponent(sessionId)}`} className="font-semibold text-primary-900">
            Continue training
          </Link>
        </p>
      </ExamShell>
    )
  }

  const keyWeakness = report.blockingDimensions[0]
  const supportLabel = report.trainingSupport.replace(/_/g, ' ')
  const profile = getExamProfile(session.profileId)

  const onReprocessReport = async () => {
    setReprocessErr(null)
    setReprocessing(true)
    try {
      const updated = await reprocessExamReport(userId, sessionId)
      qc.setQueryData(['exam', 'session', userId, sessionId], updated)
      void qc.invalidateQueries({ queryKey: ['exam', 'sessions', userId] })
    } catch (e) {
      setReprocessErr(e instanceof Error ? e.message : 'Could not recalculate report.')
    } finally {
      setReprocessing(false)
    }
  }

  return (
    <ExamShell contentClassName="pb-28">
      <Link
        href={APP_EXAM_SYSTEM}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-ink-secondary hover:text-ink-primary mb-4"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Exam hub
      </Link>

      {/* Improvement summary */}
      <section className="rounded-3xl border border-primary-200/40 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-950 px-5 py-6 text-white shadow-lg shadow-primary-900/20">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Training outcome</p>
        <h1 className="mt-2 text-title font-bold tracking-tight text-white">How you moved</h1>
        <p className="text-caption text-white/75 mt-2">
          {supportLabel} · {session.level}
          {report.trainingEntryMode ? ` · ${report.trainingEntryMode.replace(/_/g, ' ')}` : ''}
        </p>
        <p className="mt-5 text-display font-bold tabular-nums tracking-tight">
          {(report.qualityScore01 * 100).toFixed(0)}
          <span className="text-body-lg font-semibold text-white/70">%</span>
        </p>
        <p className="text-caption text-white/70 mt-1">Formative quality (trend-aware, not pass/fail)</p>
        <p className="text-caption text-white/55 mt-3">
          Evidence: <span className="text-white/85 font-medium">{report.sessionEvidenceConfidence}</span>
        </p>
        <div className="mt-5 border-t border-white/10 pt-4 space-y-2">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={reprocessing}
            onClick={() => void onReprocessReport()}
            className="border-white/25 bg-white/10 text-white hover:bg-white/15 disabled:opacity-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <RefreshCw className={`h-4 w-4 shrink-0 ${reprocessing ? 'animate-spin' : ''}`} aria-hidden />
              {reprocessing ? 'Recalculating…' : 'Recalculate report with latest scoring'}
            </span>
          </Button>
          <p className="text-caption text-white/55 leading-relaxed">
            Re-scores your attempts with the latest scoring and saves the updated report. XP is not changed.
          </p>
          {reprocessErr ? <p className="text-caption text-rose-200">{reprocessErr}</p> : null}
        </div>
      </section>

      {typeof xpFlash === 'number' && !Number.isNaN(xpFlash) && xpFlash > 0 ? (
        <p className="mt-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-caption font-semibold text-emerald-950">
          +{xpFlash} XP awarded
        </p>
      ) : null}

      {report.sessionEvidenceNotes?.length ? (
        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm mt-5 space-y-2">
          <CardTitle className="text-body-sm font-semibold text-ink-primary">Session notes</CardTitle>
          <ul className="list-disc pl-5 text-caption text-ink-secondary space-y-1">
            {report.sessionEvidenceNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {report.retryLift01 != null ? (
        <p className="mt-4 text-caption text-ink-secondary">
          Retry lift: <span className="font-mono font-semibold text-ink-primary">{report.retryLift01.toFixed(2)}</span>
        </p>
      ) : null}

      {/* What improved */}
      <section className="mt-8 space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Improvement</h2>
        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-emerald-700" aria-hidden />
            <CardTitle className="text-body-sm font-semibold text-ink-primary">What improved</CardTitle>
          </div>
          {report.improvedDimensions.length ? (
            <ul className="space-y-2">
              {report.improvedDimensions.map((d) => (
                <li key={d} className="text-body-sm text-ink-primary font-medium">
                  {dimLabel(d)}
                </li>
              ))}
            </ul>
          ) : (
            <CardDescription className="text-caption text-ink-secondary leading-relaxed">
              Keep going — the next block usually surfaces clearer lift signals.
            </CardDescription>
          )}
        </Card>
      </section>

      {/* Key weakness */}
      <section className="mt-8 space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Key weakness</h2>
        <Card variant="flat" padding="md" className="rounded-2xl border border-amber-200/60 bg-amber-50/35 space-y-3">
          <CardTitle className="text-body-sm font-semibold text-amber-950">
            {keyWeakness ? dimLabel(keyWeakness) : 'No single blocker flagged'}
          </CardTitle>
          {report.blockingDimensions.length > 1 ? (
            <ul className="list-disc pl-5 text-caption text-amber-950/85 space-y-1">
              {report.blockingDimensions.slice(1).map((d) => (
                <li key={d}>{dimLabel(d)}</li>
              ))}
            </ul>
          ) : null}
          {report.blockedMarksExplainers?.length ? (
            <div className="pt-2 border-t border-amber-200/50">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/80">Why marks were blocked</p>
              <ul className="list-disc pl-5 text-caption text-amber-950/85 space-y-1 mt-1.5">
                {report.blockedMarksExplainers.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </section>

      {report.strongestDimension ? (
        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-slate-50/50 mt-4 space-y-1">
          <CardTitle className="text-body-sm font-semibold text-ink-primary">Strongest area</CardTitle>
          <p className="text-body-sm text-ink-primary">{dimLabel(report.strongestDimension)}</p>
        </Card>
      ) : null}

      {/* Corrected examples */}
      {report.correctedExampleNl ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Corrected example</h2>
          <Card variant="flat" padding="md" className="rounded-2xl border border-slate-800/10 bg-slate-900 text-white shadow-md">
            <div className="flex items-center gap-2 text-white/70 mb-3">
              <BookOpen className="h-4 w-4" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Model phrasing</span>
            </div>
            <blockquote className="text-body-sm leading-relaxed whitespace-pre-wrap text-white/95 border-l-2 border-white/25 pl-4">
              {report.correctedExampleNl}
            </blockquote>
          </Card>
        </section>
      ) : null}

      {/* Retry + next drill */}
      <section className="mt-8 space-y-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Retry & next drill</h2>
        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary-800" aria-hidden />
            <CardTitle className="text-body-sm font-semibold text-ink-primary">Suggested retries</CardTitle>
          </div>
          <ul className="list-disc pl-5 text-caption text-ink-secondary space-y-1.5">
            {report.retrySuggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>

        <Card variant="flat" padding="md" className="rounded-2xl border border-primary-200/50 bg-gradient-to-br from-primary-50/90 to-white shadow-sm space-y-2">
          <CardTitle className="text-body-sm font-semibold text-primary-950">Best next drill</CardTitle>
          <p className="text-body-sm text-ink-primary leading-relaxed">{report.bestNextDrill}</p>
          <p className="text-caption text-ink-secondary pt-1 border-t border-primary-100">
            Next action: <span className="font-semibold text-ink-primary">{report.nextBestTrainingAction}</span>
          </p>
        </Card>
      </section>

      {(report.readinessMovementLabel || report.readinessDelta01 != null) && (
        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white shadow-sm mt-6 space-y-2">
          <CardTitle className="text-body-sm font-semibold text-ink-primary">Readiness movement</CardTitle>
          {report.readinessMovementLabel ? (
            <p className="text-caption text-ink-secondary leading-relaxed">{report.readinessMovementLabel}</p>
          ) : null}
          {report.readinessDelta01 != null ? (
            <p className="text-caption text-ink-secondary">
              Practice lift estimate:{' '}
              <span className="font-mono tabular-nums font-semibold text-ink-primary">+{report.readinessDelta01.toFixed(2)}</span>
            </p>
          ) : null}
        </Card>
      )}

      <ExamDevDebugPanel
        title="Training report · dev internals"
        blocks={[
          ...(profile ? [{ label: 'Blueprint summary', body: formatBlueprintDebugSummary(profile) }] : []),
          { label: 'Report payload', body: JSON.stringify(report, null, 2) },
          {
            label: 'Drill / recommendation fields',
            body: JSON.stringify(
              {
                bestNextDrill: report.bestNextDrill,
                nextBestTrainingAction: report.nextBestTrainingAction,
                retrySuggestions: report.retrySuggestions,
              },
              null,
              2,
            ),
          },
        ]}
      />

      <div className="mt-10 flex flex-col gap-2">
        <Link href={APP_EXAM_TRAIN_SETUP}>
          <Button variant="primary" fullWidth size="lg">
            New training session
          </Button>
        </Link>
        <Link href={APP_EXAM_SYSTEM}>
          <Button variant="secondary" fullWidth>
            Back to Exam hub
          </Button>
        </Link>
      </div>
    </ExamShell>
  )
}
