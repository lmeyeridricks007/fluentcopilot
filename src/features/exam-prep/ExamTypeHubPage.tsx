'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { ExamReadinessCard } from '@/features/exam-prep/components/ExamReadinessCard'
import { getExamPrepType, isExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export function ExamTypeHubPage({ examType }: { examType: string }) {
  const router = useRouter()
  const valid = isExamPrepTypeId(examType)
  const row = valid ? getExamPrepType(examType) : undefined

  useEffect(() => {
    if (valid) {
      track(ANALYTICS_EVENTS.exam_prep_type_hub_viewed, { exam_type: examType })
    }
  }, [examType, valid])

  if (!valid || !row) {
    return (
      <div className="px-4 py-8 pb-28 max-w-lg mx-auto space-y-4">
        <p className="text-body text-ink-secondary">This exam area isn’t available.</p>
        <Button variant="secondary" onClick={() => router.push('/app/exam-prep')}>
          Back to exam preparation
        </Button>
      </div>
    )
  }

  const Icon = row.icon

  return (
    <div className="px-4 py-6 pb-28 space-y-6 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href="/app/exam-prep"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Exam preparation
        </Link>
      </div>

      <header className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-slate-700" aria-hidden />
        </div>
        <div>
          <h1 className="text-title font-bold text-ink-primary tracking-tight">{row.title}</h1>
          <p className="text-body-sm text-ink-secondary mt-1 leading-snug">{row.tagline}</p>
        </div>
      </header>

      <ExamReadinessCard surface="exam_prep_type_hub" focusModule={row.id} />

      {examType === 'speaking' ||
      examType === 'writing' ||
      examType === 'listening' ||
      examType === 'reading' ||
      examType === 'kmn' ? (
        <Link
          href={`/app/exam-prep/${row.id}/practice-exams`}
          className="block rounded-xl border-2 border-violet-200 bg-violet-50/50 p-4 shadow-sm hover:border-violet-300 hover:bg-violet-50/80 transition-colors min-h-touch"
          onClick={() =>
            track(ANALYTICS_EVENTS.exam_prep_type_selected, {
              exam_type: examType,
              destination: 'practice_exams_browse',
            })
          }
        >
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-body font-semibold text-ink-primary">Practice exams (mock)</CardTitle>
            <span className="text-caption font-semibold text-violet-900 bg-violet-100 border border-violet-200 rounded-md px-2 py-0.5 shrink-0">
              4 sets
            </span>
          </div>
          <CardDescription className="mt-1 leading-relaxed text-ink-secondary">
            Fixed exam sets to practise under pressure — repeatable, comparable, and closer to the real format than loose drills.
          </CardDescription>
        </Link>
      ) : null}

      <div className="grid grid-cols-1 gap-3">
        {examType === 'speaking' ? (
          <>
            <Link
              href="/app/exam-prep/speaking/training"
              className="block rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 hover:bg-primary-50/20 transition-colors min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: examType, destination: 'speaking_training' })
              }
            >
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Training mode</CardTitle>
                <span className="text-caption font-semibold text-primary-800 bg-primary-50 border border-primary-200/80 rounded-md px-2 py-0.5">
                  Open
                </span>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Exam-style questions in Dutch, rubric scoring, compact feedback, and a model answer — one question at a time.
              </CardDescription>
            </Link>
            <Link
              href="/app/exam-prep/speaking/simulation"
              className="block rounded-card border border-slate-300 bg-slate-50/90 p-4 shadow-sm hover:border-slate-400 hover:bg-slate-50 transition-colors min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: examType, destination: 'speaking_simulation' })
              }
            >
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Exam simulation</CardTitle>
                <span className="text-caption font-semibold text-slate-100 bg-slate-800 border border-slate-700 rounded-md px-2 py-0.5">
                  Open
                </span>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Timed speaking round, no per-question tips — one full rubric report at the end.
              </CardDescription>
            </Link>
          </>
        ) : examType === 'listening' ? (
          <>
            <Link
              href="/app/exam-prep/listening/training"
              className="block rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 hover:bg-primary-50/20 transition-colors min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: examType, destination: 'listening_training' })
              }
            >
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Training mode</CardTitle>
                <span className="text-caption font-semibold text-primary-800 bg-primary-50 border border-primary-200/80 rounded-md px-2 py-0.5">
                  Open
                </span>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Short clips and multiple-choice tasks (gist, detail, intent), with bounded replay.
              </CardDescription>
            </Link>
            <Card variant="outlined" padding="md" className="opacity-90">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Exam simulation</CardTitle>
                <span className="text-caption font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5">
                  Coming soon
                </span>
              </div>
              <CardDescription className="mt-1">Tighter timing and one continuous listening session — coming later.</CardDescription>
            </Card>
          </>
        ) : examType === 'reading' ? (
          <>
            <Link
              href="/app/exam-prep/reading/training"
              className="block rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 hover:bg-primary-50/20 transition-colors min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: examType, destination: 'reading_training' })
              }
            >
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Training mode</CardTitle>
                <span className="text-caption font-semibold text-primary-800 bg-primary-50 border border-primary-200/80 rounded-md px-2 py-0.5">
                  Open
                </span>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Short notices, signs, and emails: find facts fast and grasp what the text is doing — with clear explanations.
              </CardDescription>
            </Link>
            <Card variant="outlined" padding="md" className="opacity-90">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Exam simulation</CardTitle>
                <span className="text-caption font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5">
                  Coming soon
                </span>
              </div>
              <CardDescription className="mt-1">Longer reading bundle under time pressure — coming later.</CardDescription>
            </Card>
          </>
        ) : examType === 'writing' ? (
          <>
            <Link
              href="/app/exam-prep/writing/training"
              className="block rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 hover:bg-primary-50/20 transition-colors min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: examType, destination: 'writing_training' })
              }
            >
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Training mode</CardTitle>
                <span className="text-caption font-semibold text-primary-800 bg-primary-50 border border-primary-200/80 rounded-md px-2 py-0.5">
                  Open
                </span>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Form, message, or open text — with bullet prompts, rubric, and a model answer.
              </CardDescription>
            </Link>
            <Link
              href="/app/exam-prep/writing/simulation"
              className="block rounded-card border border-slate-300 bg-slate-50/90 p-4 shadow-sm hover:border-slate-400 hover:bg-slate-50 transition-colors min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: examType, destination: 'writing_simulation' })
              }
            >
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Exam simulation</CardTitle>
                <span className="text-caption font-semibold text-slate-100 bg-slate-800 border border-slate-700 rounded-md px-2 py-0.5">
                  Open
                </span>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Full writing session: form, two messages, one general text — timed; one report at the end.
              </CardDescription>
            </Link>
          </>
        ) : examType === 'kmn' ? (
          <>
            <Link
              href="/app/exam-prep/kmn"
              className="block rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-primary-300/80 hover:bg-primary-50/20 transition-colors min-h-touch"
              onClick={() =>
                track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: examType, destination: 'kmn_module' })
              }
            >
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">KNM learning path</CardTitle>
                <span className="text-caption font-semibold text-primary-800 bg-primary-50 border border-primary-200/80 rounded-md px-2 py-0.5">
                  Open
                </span>
              </div>
              <CardDescription className="mt-1 leading-relaxed">
                Work, care, government, and culture — quizzes, SRS flashcards, and mini-scenarios. Ties into your review queue.
              </CardDescription>
            </Link>
            <Card variant="outlined" padding="md" className="opacity-90">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-body">Exam simulation</CardTitle>
                <span className="text-caption font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5">
                  Soon
                </span>
              </div>
              <CardDescription className="mt-1">Full timed KNM exam session — coming later.</CardDescription>
            </Card>
          </>
        ) : (
          <Card variant="outlined" padding="md" className="opacity-90">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-body">Training mode</CardTitle>
              <span className="text-caption font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5">
                Soon
              </span>
            </div>
            <CardDescription className="mt-1">Hints, model answers, and supportive feedback while you learn the task types.</CardDescription>
          </Card>
        )}
        {examType !== 'speaking' &&
        examType !== 'writing' &&
        examType !== 'listening' &&
        examType !== 'reading' &&
        examType !== 'kmn' ? (
          <Card variant="outlined" padding="md" className="opacity-90">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-body">Exam simulation</CardTitle>
              <span className="text-caption font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2 py-0.5">
                Coming soon
              </span>
            </div>
            <CardDescription className="mt-1">Stricter timing and scoring — closer to the real exam.</CardDescription>
          </Card>
        ) : null}
      </div>

      <Link
        href="/app/exam-prep"
        className="flex min-h-touch w-full items-center justify-center rounded-lg font-medium bg-surface-muted text-ink-primary hover:bg-slate-200 px-4 py-2.5 text-body"
      >
        All exam areas
      </Link>
    </div>
  )
}
