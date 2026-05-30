'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock, Layers, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import type { ExamTaskType, ExamTrainingEntryMode } from '@/lib/exam-system/types'
import { getExamProfile } from '@/lib/exam-system/examProfileRegistry'
import { labelForProgram, parseExamCode } from '@/lib/exam-system/examHubSelection'
import { computeSimulationRunPreview, formatDurationMmSs } from '@/lib/exam-system/examSimulationPreview'
import { APP_EXAM_SYSTEM, APP_EXAM_TRAINING_RUN } from '@/lib/routing/appRoutes'
import { createExamSession } from './examApi'
import { ExamHubProfilePicker } from './ExamHubProfilePicker'
import { useExamHubProfileSelection } from './useExamHubProfileSelection'
import { examTaskTypeLabel } from './examTaskLabels'
import { ExamSetupModeBanner, ExamShell } from './ui'

const TASK_TYPES: ExamTaskType[] = [
  'practical_request',
  'short_response',
  'roleplay',
  'follow_up_response',
  'give_opinion',
  'justify_reason',
  'describe_situation',
  'explain_process',
  'compare_options',
  'storytelling',
  'sequencing',
  'read_aloud_exam',
  'listening_response_exam',
  'listening_mcq_exam',
  'writing_task_exam',
  'knowledge_mcq',
]

const SUPPORT_LABELS: Record<'full_guidance' | 'light_guidance' | 'almost_exam', string> = {
  full_guidance: 'Full guidance',
  light_guidance: 'Light guidance',
  almost_exam: 'Almost exam',
}

export function ExamTrainSetupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const profileFromUrl = searchParams.get('profileId')?.trim() ?? ''
  const sectionFromUrl = searchParams.get('sectionId')?.trim() ?? ''
  const prefAlmostExam = searchParams.get('prefAlmostExam') === '1'
  const { userId, profileId, setProfileId, preferredLevel, level, profilesQ, activeProfile: summary } =
    useExamHubProfileSelection({ profileFromUrl })
  const [entryMode, setEntryMode] = useState<ExamTrainingEntryMode>('section')
  const [focusTaskType, setFocusTaskType] = useState<ExamTaskType>('practical_request')
  const [support, setSupport] = useState<'full_guidance' | 'light_guidance' | 'almost_exam'>('full_guidance')
  const [timed, setTimed] = useState(false)
  const [weaknessRepair, setWeaknessRepair] = useState(true)
  const [scope, setScope] = useState<'full' | 'section'>('section')
  const [sectionId, setSectionId] = useState('oral_basics')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!prefAlmostExam) return
    setSupport('almost_exam')
    setTimed(true)
    setEntryMode('section')
    setScope('section')
  }, [prefAlmostExam])

  const suiteLabel = summary ? labelForProgram(parseExamCode(summary.examCode).program) : 'Inburgering'
  const fullProfile = useMemo(() => (profileId ? getExamProfile(profileId) : undefined), [profileId])

  useEffect(() => {
    if (!summary?.sectionIds?.length) return
    if (sectionFromUrl && summary.sectionIds.some((s) => s.id === sectionFromUrl)) {
      setSectionId(sectionFromUrl)
      return
    }
    if (!summary.sectionIds.some((s) => s.id === sectionId)) {
      setSectionId(summary.sectionIds[0].id)
    }
  }, [summary, sectionId, sectionFromUrl])

  useEffect(() => {
    if (entryMode === 'by_task_type' || entryMode === 'by_weakness' || entryMode === 'adaptive') setScope('full')
  }, [entryMode])

  const effectiveScope: 'full' | 'section' =
    entryMode === 'section' || (entryMode === 'full_mix' && scope === 'section') ? 'section' : 'full'
  const effectiveSectionId = effectiveScope === 'section' ? sectionId : undefined

  const preview = useMemo(() => {
    if (!fullProfile) return null
    return computeSimulationRunPreview({
      profile: fullProfile,
      level,
      scope: effectiveScope,
      sectionId: effectiveSectionId,
    })
  }, [fullProfile, level, effectiveScope, effectiveSectionId])

  const start = async () => {
    if (!fullProfile) return
    setBusy(true)
    try {
      const s = await createExamSession(userId, {
        profileId: fullProfile.examId,
        level,
        mode: 'training',
        scope: effectiveScope,
        sectionId: effectiveSectionId,
        trainingSupport: support,
        timedTraining: timed || support === 'almost_exam',
        weaknessRepair: weaknessRepair || entryMode === 'by_weakness',
        trainingEntryMode: entryMode,
        focusTaskType: entryMode === 'by_task_type' ? focusTaskType : undefined,
      })
      router.push(`${APP_EXAM_TRAINING_RUN}?id=${encodeURIComponent(s.id)}`)
    } finally {
      setBusy(false)
    }
  }

  const timedEffective = timed || support === 'almost_exam'

  const footer = (
    <Button variant="primary" size="lg" fullWidth disabled={busy || !fullProfile} onClick={() => void start()}>
      {busy ? 'Starting…' : 'Start training'}
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
        mode="training"
        title="Training setup"
        subtitle="Formative mode — scaffolding and retries tuned to how much support you want."
      />

      <div className="rounded-2xl border border-primary-200/60 bg-gradient-to-br from-primary-50/90 via-white to-violet-50/25 px-4 py-3.5 mb-4 shadow-sm shadow-primary-900/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-800/75">Support mode</p>
        <p className="text-body-sm font-bold text-primary-950 mt-0.5">{SUPPORT_LABELS[support]}</p>
        <p className="text-caption text-primary-900/80 mt-1">
          {timedEffective ? 'Timers on (stricter band for XP).' : 'Soft timers — skip prep when you are ready.'}
        </p>
      </div>

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
            <p className="text-caption text-ink-secondary">Loading…</p>
          ) : (
            <ExamHubProfilePicker
              embedded
              profiles={profilesQ.data}
              profileId={profileId}
              preferredLevel={preferredLevel}
              onProfileIdChange={setProfileId}
            />
          )}
        </Card>

        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" aria-hidden />
            <CardTitle className="text-body-sm font-semibold text-ink-primary">How you enter</CardTitle>
          </div>
          <div className="space-y-2">
            {(
              [
                ['section', 'Section', 'One blueprint section.'],
                ['full_mix', 'Full mix', 'All training sections in order.'],
                ['adaptive', 'Adaptive', 'Harder types first; tail shuffled.'],
                ['by_weakness', 'By weakness', 'Exam-critical types first + repair XP.'],
                ['by_task_type', 'By task type', 'Single task family, full scope.'],
              ] as const
            ).map(([id, title, desc]) => (
              <button
                key={id}
                type="button"
                onClick={() => setEntryMode(id)}
                className={`w-full text-left rounded-xl border px-3 py-2.5 min-h-touch transition-colors ${
                  entryMode === id ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-200/60' : 'border-slate-200 bg-white'
                }`}
              >
                <p className="text-body-sm font-semibold text-ink-primary">{title}</p>
                <p className="text-caption text-ink-secondary mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
          {entryMode === 'by_task_type' ? (
            <div className="space-y-1">
              <CardDescription className="text-caption font-semibold text-ink-secondary">Task type</CardDescription>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-body-sm min-h-touch bg-white"
                value={focusTaskType}
                onChange={(e) => setFocusTaskType(e.target.value as ExamTaskType)}
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {examTaskTypeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {entryMode === 'full_mix' ? (
            <div className="space-y-2">
              <CardDescription className="text-caption font-semibold text-ink-secondary">Coverage</CardDescription>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScope('section')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-caption font-semibold min-h-touch ${
                    scope === 'section' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
                  }`}
                >
                  Section
                </button>
                <button
                  type="button"
                  onClick={() => setScope('full')}
                  className={`flex-1 rounded-xl border px-3 py-2 text-caption font-semibold min-h-touch ${
                    scope === 'full' ? 'border-primary-600 bg-primary-50' : 'border-slate-200'
                  }`}
                >
                  Full
                </button>
              </div>
            </div>
          ) : null}
          {(entryMode === 'section' || (entryMode === 'full_mix' && scope === 'section')) && summary ? (
            <div className="space-y-1">
              <CardDescription className="text-caption font-semibold text-ink-secondary">Section</CardDescription>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-body-sm min-h-touch bg-white"
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

        <Card variant="flat" padding="md" className="rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm space-y-3">
          <CardTitle className="text-body-sm font-semibold text-ink-primary">Support mode</CardTitle>
          {(
            [
              ['full_guidance', 'Full guidance', 'Hints, patterns, examples, coaching, retries.'],
              ['light_guidance', 'Light guidance', 'Lighter hints; stronger after-answer feedback.'],
              ['almost_exam', 'Almost exam', 'Exam-like timers; hints only if you ask.'],
            ] as const
          ).map(([k, title, desc]) => (
            <button
              key={k}
              type="button"
              onClick={() => setSupport(k)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 min-h-touch transition-colors ${
                support === k ? 'border-primary-600 bg-primary-50 ring-1 ring-primary-200/60' : 'border-slate-200 bg-white'
              }`}
            >
              <p className="text-body-sm font-semibold text-ink-primary">{title}</p>
              <p className="text-caption text-ink-secondary mt-0.5">{desc}</p>
            </button>
          ))}
          <label className="flex items-center gap-2 text-caption text-ink-secondary">
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => setTimed(e.target.checked)}
              disabled={support === 'almost_exam'}
            />
            Timed training (XP band)
          </label>
          <label className="flex items-center gap-2 text-caption text-ink-secondary">
            <input
              type="checkbox"
              checked={weaknessRepair}
              onChange={(e) => setWeaknessRepair(e.target.checked)}
              disabled={entryMode === 'by_weakness'}
            />
            Weakness repair XP bonus
          </label>
        </Card>

        {preview && fullProfile ? (
          <Card
            variant="flat"
            padding="md"
            className="rounded-2xl border border-violet-200/70 bg-gradient-to-br from-white to-violet-50/50 shadow-sm space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Clock className="h-4 w-4" aria-hidden />
              </span>
              <CardTitle className="text-body-sm font-bold text-ink-primary">Timer & task summary</CardTitle>
            </div>
            <p className="text-caption text-ink-secondary leading-relaxed">
              ~{preview.taskCount} tasks · ~{formatDurationMmSs(preview.estimatedSeconds)} prep+answer before entry-mode
              shaping.
            </p>
          </Card>
        ) : null}
      </div>
    </ExamShell>
  )
}
