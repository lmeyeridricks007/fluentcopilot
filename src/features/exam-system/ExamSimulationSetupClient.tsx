'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock, Layers } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { APP_EXAM_SIMULATION_RUN, APP_EXAM_SYSTEM } from '@/lib/routing/appRoutes'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import {
  labelForProgram,
  parseExamCode,
} from '@/lib/exam-system/examHubSelection'
import {
  computeSimulationRunPreview,
  formatDurationMmSs,
  formatSimulationScoringSummary,
} from '@/lib/exam-system/examSimulationPreview'
import { createExamSession } from './examApi'
import { ExamHubProfilePicker } from './ExamHubProfilePicker'
import { useExamHubProfileSelection } from './useExamHubProfileSelection'
import { ExamSetupModeBanner, ExamShell } from './ui'

export function ExamSimulationSetupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileFromUrl = searchParams.get('profileId')?.trim() ?? ''
  const { userId, profileId, setProfileId, preferredLevel, level, profilesQ, activeProfile: summary } =
    useExamHubProfileSelection({ profileFromUrl })
  const [scope, setScope] = useState<'full' | 'section'>('full')
  const [sectionId, setSectionId] = useState('oral_basics')
  const [busy, setBusy] = useState(false)

  const suiteLabel = summary ? labelForProgram(parseExamCode(summary.examCode).program) : 'Inburgering'
  const fullProfile = useMemo(() => (profileId ? getExamProfile(profileId) : undefined), [profileId])

  const preview = useMemo(() => {
    if (!fullProfile) return null
    return computeSimulationRunPreview({
      profile: fullProfile,
      level,
      scope,
      sectionId: scope === 'section' ? sectionId : undefined,
    })
  }, [fullProfile, level, scope, sectionId])

  const scoringLines = useMemo(() => (fullProfile ? formatSimulationScoringSummary(fullProfile) : []), [fullProfile])

  useEffect(() => {
    if (!summary?.sectionIds?.length) return
    if (!summary.sectionIds.some((s) => s.id === sectionId)) {
      setSectionId(summary.sectionIds[0].id)
    }
  }, [summary, sectionId])

  const start = async () => {
    if (!fullProfile) return
    setBusy(true)
    try {
      const s = await createExamSession(userId, {
        profileId: fullProfile.examId,
        level,
        mode: 'simulation',
        scope,
        sectionId: scope === 'section' ? sectionId : undefined,
        timedTraining: false,
        weaknessRepair: false,
      })
      router.push(`${APP_EXAM_SIMULATION_RUN}?id=${encodeURIComponent(s.id)}`)
    } finally {
      setBusy(false)
    }
  }

  const footer = (
    <Button variant="primary" size="lg" fullWidth disabled={busy || !fullProfile || !preview} onClick={() => void start()}>
      {busy ? 'Starting…' : 'Start simulation'}
    </Button>
  )

  return (
    <ExamShell footer={footer}>
      <Link
        href={APP_EXAM_SYSTEM}
        className="inline-flex items-center gap-1.5 text-caption font-semibold text-ink-secondary hover:text-ink-primary mb-2"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Exam hub
      </Link>

      <ExamSetupModeBanner
        mode="simulation"
        title="Simulation setup"
        subtitle="Strict exam flow — timers drive progression. No hints or coaching during the run."
      />

      <div className="space-y-4 pb-2">
        <Card
          variant="flat"
          padding="md"
          className="rounded-2xl border border-primary-100/90 bg-gradient-to-b from-white via-white to-violet-50/35 shadow-sm shadow-violet-900/5 space-y-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm">
                <Layers className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <CardTitle className="text-body-sm font-bold text-ink-primary">Exam profile</CardTitle>
                <p className="text-caption text-primary-900/75 mt-0.5">Module and level for this run.</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700/80 shrink-0">{suiteLabel}</span>
          </div>
          {profilesQ.isLoading ? (
            <p className="text-caption text-ink-secondary">Loading profiles…</p>
          ) : (
            <ExamHubProfilePicker
              embedded
              profiles={profilesQ.data}
              profileId={profileId}
              preferredLevel={preferredLevel}
              onProfileIdChange={setProfileId}
            />
          )}
          {summary ? (
            <p className="w-full text-caption text-ink-secondary leading-relaxed border-t border-slate-200/70 pt-3 mt-1">
              {summary.description}
            </p>
          ) : null}
        </Card>

        <Card
          variant="flat"
          padding="md"
          className="rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm space-y-3 ring-1 ring-slate-900/[0.02]"
        >
          <CardTitle className="text-body-sm font-bold text-ink-primary">Scope</CardTitle>
          <div className="flex gap-2 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/60">
            <button
              type="button"
              onClick={() => setScope('section')}
              className={`flex-1 rounded-xl px-3 py-2.5 text-caption font-semibold min-h-touch transition-all ${
                scope === 'section'
                  ? 'bg-white text-primary-950 shadow-sm ring-1 ring-primary-200/50'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Section
            </button>
            <button
              type="button"
              onClick={() => setScope('full')}
              className={`flex-1 rounded-xl px-3 py-2.5 text-caption font-semibold min-h-touch transition-all ${
                scope === 'full'
                  ? 'bg-white text-primary-950 shadow-sm ring-1 ring-primary-200/50'
                  : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              Full exam
            </button>
          </div>
          <CardDescription className="text-caption text-ink-secondary leading-relaxed">
            <span className="font-semibold text-ink-primary">Full exam</span> runs every section in order (longer run).
            <span className="font-semibold text-ink-primary"> Section</span> is a short drill from one part only (for
            example Oral basics is only a handful of tasks).
          </CardDescription>
          {scope === 'section' && summary ? (
            <div className="space-y-1.5">
              <CardDescription className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Section</CardDescription>
              <select
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-body-sm min-h-touch text-ink-primary shadow-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
              >
                {summary.sectionIds.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </Card>

        {preview && fullProfile ? (
          <Card
            variant="flat"
            padding="md"
            className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white to-violet-50/50 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Clock className="h-4 w-4" aria-hidden />
              </span>
              <CardTitle className="text-body-sm font-bold text-ink-primary">Timer & task summary</CardTitle>
            </div>
            <ul className="text-caption text-ink-secondary space-y-1.5">
              <li>
                <span className="font-semibold text-ink-primary">Tasks:</span> {preview.taskCount}
              </li>
              <li>
                <span className="font-semibold text-ink-primary">Estimated duration:</span>{' '}
                {formatDurationMmSs(preview.estimatedSeconds)} prep + answer
              </li>
              {fullProfile.simulationBlueprint.totalEstimateSeconds && scope === 'full' ? (
                <li className="text-ink-secondary/85">
                  Reference wall-clock ~{formatDurationMmSs(fullProfile.simulationBlueprint.totalEstimateSeconds)}
                </li>
              ) : null}
            </ul>
          </Card>
        ) : null}

        <Card
          variant="flat"
          padding="md"
          className="rounded-2xl border border-indigo-200/55 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/30 space-y-2"
        >
          <CardTitle className="text-body-sm font-bold text-indigo-950">During the run</CardTitle>
          <CardDescription className="text-caption text-indigo-950/85 leading-relaxed">
            No hints or examples. Timers advance automatically; when answer time ends, your best-effort text is saved if
            you have not submitted.
          </CardDescription>
        </Card>

        {scoringLines.length ? (
          <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-2">
            <CardTitle className="text-body-sm font-bold text-ink-primary">Scoring emphasis</CardTitle>
            <ul className="list-disc pl-5 text-caption text-ink-secondary space-y-1">
              {scoringLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </ExamShell>
  )
}
