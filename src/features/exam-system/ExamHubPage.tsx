'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, ClipboardList, Gauge, GraduationCap, History, Mic2, Sparkles } from 'lucide-react'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  APP_EXAM_HUB,
  APP_EXAM_HISTORY,
  APP_EXAM_READINESS,
  APP_EXAM_SIMULATION_REPORT,
  APP_EXAM_SIMULATION_RUN,
  APP_EXAM_SIMULATION_SETUP,
  APP_EXAM_TRAIN_SETUP,
  APP_EXAM_TRAINING_REPORT,
  APP_EXAM_TRAINING_RUN,
} from '@/lib/routing/appRoutes'
import { getClientTimeZone, invalidateProgressionQueries, useTodaySuggestion } from '@/lib/hooks/useProgression'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import { formatBlueprintDebugSummary } from '@/lib/exam-system/examDevDebugFormat'
import { labelForExamCode, labelForProgram, parseExamCode } from '@/lib/exam-system/examHubSelection'
import {
  createExamSession,
  fetchExamReadiness,
  fetchExamSessions,
} from './examApi'
import { ExamHubProfilePicker } from './ExamHubProfilePicker'
import { useExamHubProfileSelection } from './useExamHubProfileSelection'
import { ExamDevDebugPanel, ExamHubPromoCard, ExamReadinessBadge, ExamShell } from './ui'

function formatDimensionLabel(s: string | null | undefined): string {
  if (!s) return '—'
  return s.replace(/_/g, ' ')
}

export function ExamHubPage() {
  const qc = useQueryClient()
  const { userId, profileId, setProfileId, preferredLevel, level, profilesQ, activeProfile } =
    useExamHubProfileSelection()
  const tz = getClientTimeZone()
  const readinessQ = useQuery({
    queryKey: ['exam', 'readiness', userId, profileId],
    queryFn: () => fetchExamReadiness(userId, profileId),
    enabled: Boolean(profileId),
  })
  const sessionsQ = useQuery({
    queryKey: ['exam', 'sessions', userId, 'hub-all'],
    queryFn: () => fetchExamSessions(userId),
    enabled: true,
  })

  const todayStrip = useTodaySuggestion()
  const [startBusy, setStartBusy] = useState<null | 'sim' | 'train'>(null)

  const setupSimHref = `${APP_EXAM_SIMULATION_SETUP}?profileId=${encodeURIComponent(profileId)}`
  const setupTrainHref = `${APP_EXAM_TRAIN_SETUP}?profileId=${encodeURIComponent(profileId)}`

  const modalityLabel = activeProfile ? labelForExamCode(activeProfile.examCode) : 'Speaking'
  const programLabel = activeProfile ? labelForProgram(parseExamCode(activeProfile.examCode).program) : 'Inburgering'

  const sessions = sessionsQ.data ?? []
  const inProgress = sessions.find((s) => s.status === 'in_progress')
  const recentDone = sessions
    .filter((s) => s.profileId === profileId && s.status === 'completed' && s.report)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]
  const snapshot = readinessQ.data?.snapshot

  const nextFocus = useMemo(() => {
    if (snapshot?.blockers?.[0]) return snapshot.blockers[0]
    if (snapshot?.persistentWeaknesses?.[0]) return `Strengthen: ${formatDimensionLabel(snapshot.persistentWeaknesses[0])}`
    return 'Complete a strict simulation to map blockers and sharpen your next rep.'
  }, [snapshot])

  const resume = async () => {
    if (!inProgress) return
    const path =
      inProgress.mode === 'simulation'
        ? `${APP_EXAM_SIMULATION_RUN}?id=${encodeURIComponent(inProgress.id)}`
        : `${APP_EXAM_TRAINING_RUN}?id=${encodeURIComponent(inProgress.id)}`
    window.location.href = path
  }

  const quickSectionId =
    getExamProfile(profileId)?.supportedSections[0]?.id ??
    (activeProfile?.sectionIds?.[0]?.id as string | undefined) ??
    'oral_basics'
  const quickSectionTitle =
    getExamProfile(profileId)?.supportedSections.find((s) => s.id === quickSectionId)?.title ??
    activeProfile?.sectionIds?.find((s) => s.id === quickSectionId)?.title ??
    'First section'

  const quickSimulation = async () => {
    if (!profileId || startBusy) return
    setStartBusy('sim')
    try {
      const s = await createExamSession(userId, {
        profileId,
        level,
        mode: 'simulation',
        scope: 'section',
        sectionId: quickSectionId,
        timedTraining: false,
        weaknessRepair: false,
      })
      void invalidateProgressionQueries(qc, userId, tz)
      window.location.href = `${APP_EXAM_SIMULATION_RUN}?id=${encodeURIComponent(s.id)}`
    } finally {
      setStartBusy(null)
    }
  }

  const quickTrain = async () => {
    if (!profileId || startBusy) return
    setStartBusy('train')
    try {
      const s = await createExamSession(userId, {
        profileId,
        level,
        mode: 'training',
        scope: 'section',
        sectionId: quickSectionId,
        trainingSupport: 'light_guidance',
        timedTraining: false,
        weaknessRepair: true,
      })
      void invalidateProgressionQueries(qc, userId, tz)
      window.location.href = `${APP_EXAM_TRAINING_RUN}?id=${encodeURIComponent(s.id)}`
    } finally {
      setStartBusy(null)
    }
  }

  const readinessScorePct =
    snapshot && typeof snapshot.score01 === 'number' ? Math.round(snapshot.score01 * 100) : null

  return (
    <ExamShell contentClassName="pb-28">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/85 to-violet-50/40 px-5 py-6 shadow-sm shadow-slate-900/5">
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-400/15 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-primary-400/10 blur-xl" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Exam prep hub</p>
        <p className="mt-2 text-caption font-semibold text-primary-900/85">{programLabel}</p>
        <h1 className="mt-1 text-title font-bold text-ink-primary tracking-tight leading-tight">{modalityLabel}</h1>
        <p className="mt-2 text-caption text-ink-secondary">
          <span className="tabular-nums font-medium text-ink-primary/90">Level {level}</span>
          <span className="text-ink-tertiary"> · </span>
          <span>Adaptive simulation and training for this module.</span>
        </p>
        <ExamHubProfilePicker
          profiles={profilesQ.data}
          profileId={profileId}
          preferredLevel={preferredLevel}
          onProfileIdChange={setProfileId}
        />
        <p className="mt-4 w-full text-caption text-ink-secondary leading-relaxed border-t border-slate-200/60 pt-4">
          {activeProfile?.description ??
            'Serious, profile-driven simulation and adaptive training — one place to rehearse the real exam.'}
        </p>

        <div className="mt-5 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Start with this profile</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="primary"
              fullWidth
              className="shadow-sm"
              disabled={!profileId || Boolean(startBusy)}
              onClick={() => void quickSimulation()}
            >
              {startBusy === 'sim' ? 'Starting…' : 'Start simulation'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              className="border-slate-200 bg-white shadow-sm"
              disabled={!profileId || Boolean(startBusy)}
              onClick={() => void quickTrain()}
            >
              {startBusy === 'train' ? 'Starting…' : 'Start training'}
            </Button>
          </div>
          <p className="text-caption text-ink-tertiary leading-snug">
            Uses the first blueprint section for this module and level.{' '}
            <Link href={setupSimHref} className="font-semibold text-primary-900 underline-offset-2 hover:underline">
              Simulation setup
            </Link>
            {' · '}
            <Link href={setupTrainHref} className="font-semibold text-primary-900 underline-offset-2 hover:underline">
              Training setup
            </Link>
            {' '}
            for full exam, timers, and options.
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-2" aria-label="Momentum and suggestions">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-secondary">
          <span className="font-semibold text-ink-primary tabular-nums">Streak {todayStrip.streak}</span>
          <span className="tabular-nums">XP today {todayStrip.xpToday}</span>
          <span className="tabular-nums">XP week {todayStrip.xpWeek}</span>
        </div>
        {todayStrip.suggestion ? (
          <Card variant="flat" padding="md" className="border border-slate-200/90 bg-white/90 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Suggested next</p>
            <p className="text-body-sm font-semibold text-ink-primary mt-1">{todayStrip.suggestion.title}</p>
            <p className="text-caption text-ink-secondary mt-1 leading-relaxed">{todayStrip.suggestion.description}</p>
            {typeof todayStrip.suggestion.action.config.href === 'string' ? (
              <Link
                href={todayStrip.suggestion.action.config.href}
                className="mt-3 inline-flex text-caption font-bold text-primary-900"
              >
                Open suggested flow →
              </Link>
            ) : null}
          </Card>
        ) : null}
      </section>

      <ExamDevDebugPanel
        title="Hub · dev internals"
        blocks={[
          ...(activeProfile && getExamProfile(profileId)
            ? [{ label: 'Blueprint summary', body: formatBlueprintDebugSummary(getExamProfile(profileId)!) }]
            : []),
          ...(snapshot
            ? [{ label: 'Readiness snapshot (API)', body: JSON.stringify(snapshot, null, 2) }]
            : [{ label: 'Readiness snapshot', body: 'No snapshot loaded yet.' }]),
          {
            label: 'Today suggestion (client/API merge)',
            body: JSON.stringify(
              {
                title: todayStrip.suggestion?.title,
                type: todayStrip.suggestion?.type,
                reason: todayStrip.suggestion?.reason,
                action: todayStrip.suggestion?.action,
              },
              null,
              2,
            ),
          },
        ]}
      />

      {/* Readiness summary */}
      <section className="mt-8 space-y-3" aria-labelledby="readiness-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="readiness-heading" className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Readiness
          </h2>
          <Link
            href={APP_EXAM_READINESS}
            className="text-caption font-semibold text-primary-900 inline-flex items-center gap-0.5"
          >
            Detail <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        <Card variant="flat" padding="md" className="border border-slate-200/90 bg-white/90 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              {readinessQ.isLoading ? (
                <p className="text-body-sm text-ink-secondary">Estimating readiness…</p>
              ) : snapshot ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <ExamReadinessBadge band={snapshot.band} />
                    <span className="text-caption text-ink-secondary">{snapshot.confidence} confidence</span>
                  </div>
                  {readinessScorePct != null ? (
                    <p className="text-body-sm text-ink-primary">
                      Model score <span className="font-bold tabular-nums">{readinessScorePct}%</span>
                      <span className="text-caption text-ink-secondary font-normal"> · rolling view</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-body-sm text-ink-secondary">
                  Finish a simulation to unlock a calibrated readiness snapshot for this profile.
                </p>
              )}
            </div>
            <Gauge className="h-9 w-9 text-slate-400 shrink-0" strokeWidth={1.5} aria-hidden />
          </div>
          {snapshot?.strongest ? (
            <p className="text-caption text-ink-secondary mt-3 pt-3 border-t border-slate-100">
              <span className="font-semibold text-emerald-900/90">Strongest signal</span>{' '}
              <span className="text-ink-primary">{formatDimensionLabel(snapshot.strongest)}</span>
            </p>
          ) : null}
          <div className="mt-3 rounded-xl bg-slate-50/90 border border-slate-100 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Next focus</p>
            <p className="text-body-sm text-ink-primary leading-snug mt-1">{nextFocus}</p>
          </div>
        </Card>
      </section>

      {/* Mode cards */}
      <section className="mt-10 space-y-3" aria-label="Exam modes">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Start</h2>
        <div className="space-y-3">
          <ExamHubPromoCard
            href={setupSimHref}
            variant="simulation"
            meta="Strict · timed"
            title="Simulation"
            subtitle="Exam rules, fixed timers, minimal coaching — validate readiness."
            icon={<Mic2 className="h-5 w-5" aria-hidden />}
          />
          <ExamHubPromoCard
            href={setupTrainHref}
            variant="training"
            meta="Guided · formative"
            title="Train"
            subtitle="Hints, retries, and coaching — bias drills to what you still owe."
            icon={<GraduationCap className="h-5 w-5" aria-hidden />}
          />
          <ExamHubPromoCard
            href={APP_EXAM_READINESS}
            variant="neutral"
            meta="Diagnostics"
            title="Readiness detail"
            subtitle="Blockers, confidence drivers, and what to rehearse next."
            icon={<ClipboardList className="h-5 w-5" aria-hidden />}
          />
        </div>
      </section>

      {/* Continue */}
      {inProgress ? (
        <section className="mt-10" aria-label="Continue session">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-3">In progress</h2>
          <Card
            variant="flat"
            padding="md"
            className="border border-primary-200/60 bg-gradient-to-br from-primary-50/90 to-white shadow-sm"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-700 text-white">
                <Sparkles className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-body font-bold text-ink-primary">Continue session</CardTitle>
                <CardDescription className="text-caption mt-1 text-ink-secondary">
                  {inProgress.mode === 'simulation' ? 'Simulation' : 'Training'} · {inProgress.tasks.length} tasks ·{' '}
                  {inProgress.level}
                </CardDescription>
              </div>
            </div>
            <Button variant="primary" fullWidth className="mt-4" onClick={() => void resume()}>
              Resume where you left off
            </Button>
          </Card>
        </section>
      ) : null}

      {/* Recommended rep */}
      <section className="mt-10 space-y-2">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommended next rep</h2>
        <Button
          variant="secondary"
          fullWidth
          className="border-slate-200 bg-white shadow-sm"
          disabled={!profileId || Boolean(startBusy)}
          onClick={() => void quickTrain()}
        >
          {startBusy === 'train' ? 'Starting…' : `Quick section train · ${quickSectionTitle.toLowerCase()} · ${level}`}
        </Button>
      </section>

      {/* Recent history */}
      {recentDone ? (
        <section className="mt-10 space-y-2" aria-label="Recent session">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recent</h2>
          <Link
            href={
              recentDone.mode === 'simulation'
                ? `${APP_EXAM_SIMULATION_REPORT}?id=${encodeURIComponent(recentDone.id)}`
                : `${APP_EXAM_TRAINING_REPORT}?id=${encodeURIComponent(recentDone.id)}`
            }
            className="block rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/50"
          >
            <p className="text-body-sm font-bold text-ink-primary">
              {recentDone.mode === 'simulation' ? 'Simulation' : 'Training'} report
            </p>
            <p className="text-caption text-ink-secondary mt-0.5">
              {recentDone.level} · {new Date(recentDone.completedAt ?? recentDone.updatedAt).toLocaleDateString()} ·{' '}
              {recentDone.scope === 'full' ? 'Full run' : `Section`}
            </p>
            <p className="text-caption font-semibold text-primary-900 mt-2 inline-flex items-center gap-1">
              Open report <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </p>
          </Link>
        </section>
      ) : null}

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-6">
        <Link
          href={APP_EXAM_HISTORY}
          className="inline-flex items-center gap-2 text-caption font-semibold text-ink-primary hover:text-primary-900"
        >
          <History className="h-4 w-4 text-slate-500" aria-hidden />
          Full history
        </Link>
        <Link href={APP_EXAM_HUB} className="text-caption font-semibold text-ink-secondary hover:text-ink-primary">
          Exam skill hubs →
        </Link>
      </footer>
    </ExamShell>
  )
}
