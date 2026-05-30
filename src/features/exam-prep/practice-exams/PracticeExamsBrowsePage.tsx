'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import type { PracticeExamModule } from '@/lib/exam-prep/practice-exams/types'
import { listPracticeExamSetsForModule } from '@/lib/exam-prep/practice-exams/practiceExamRegistry'
import { progressForPracticeExamSet } from '@/lib/exam-prep/practice-exams/practiceExamProgressService'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

function basePath(module: PracticeExamModule): string {
  if (module === 'kmn') return '/app/exam-prep/kmn/practice-exams'
  return `/app/exam-prep/${module}/practice-exams`
}

function hubPath(module: PracticeExamModule): string {
  if (module === 'kmn') return '/app/exam-prep/kmn'
  return `/app/exam-prep/${module}`
}

export function PracticeExamsBrowsePage({
  module,
  titleNl,
  introNl,
}: {
  module: PracticeExamModule
  titleNl: string
  introNl: string
}) {
  const sets = listPracticeExamSetsForModule(module)

  useEffect(() => {
    track(ANALYTICS_EVENTS.practice_exam_set_viewed, {
      exam_type: module,
      set_count: sets.length,
      context: 'browse_list',
    })
  }, [module, sets.length])

  return (
    <div className="px-4 py-6 pb-28 space-y-6 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-2 -mt-1">
        <Link
          href={hubPath(module)}
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Terug
        </Link>
      </div>

      <header className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
          <ClipboardList className="w-6 h-6 text-violet-800" aria-hidden />
        </div>
        <div>
          <h1 className="text-title font-bold text-ink-primary tracking-tight">{titleNl}</h1>
          <p className="text-body-sm text-ink-secondary mt-1 leading-snug">{introNl}</p>
        </div>
      </header>

      <Card variant="outlined" padding="md" className="border-violet-200/70 bg-violet-50/30">
        <CardTitle className="text-body font-semibold text-ink-primary">Vaste mock-examens</CardTitle>
        <CardDescription className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
          Elke set blijft hetzelfde — zo ziet u trend en herhaalt u onder realistische omstandigheden. Geen officiële
          examenuitslag.
        </CardDescription>
      </Card>

      <ul className="space-y-3 list-none p-0 m-0">
        {sets.map((s) => {
          const prog = progressForPracticeExamSet(s.id)
          return (
            <li key={s.id}>
              <Link
                href={`${basePath(module)}/${s.id}`}
                className="block rounded-xl border border-slate-200 bg-surface-elevated p-4 shadow-sm hover:border-violet-300/80 hover:bg-violet-50/20 transition-colors min-h-touch"
                onClick={() =>
                  track(ANALYTICS_EVENTS.practice_exam_set_viewed, {
                    exam_type: module,
                    set_id: s.id,
                    context: 'card_click',
                  })
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body font-semibold text-ink-primary">{s.titleNl}</p>
                    <p className="text-caption text-ink-secondary mt-1 leading-snug line-clamp-2">{s.subtitleNl}</p>
                  </div>
                  <span className="text-caption font-semibold text-violet-900 bg-violet-100 border border-violet-200 rounded-md px-2 py-0.5 shrink-0">
                    ~{s.estimatedMinutes} min
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-caption text-ink-tertiary">
                  {prog.attemptCount > 0 ? (
                    <>
                      <span>
                        Pogingen: <span className="font-medium text-ink-secondary">{prog.attemptCount}</span>
                      </span>
                      {prog.lastPercent != null ? (
                        <span>
                          Laatst: <span className="font-medium text-ink-secondary">{Math.round(prog.lastPercent)}%</span>
                        </span>
                      ) : null}
                      {prog.bestPercent != null ? (
                        <span>
                          Beste: <span className="font-medium text-ink-secondary">{Math.round(prog.bestPercent)}%</span>
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span>Nog niet gedaan — start wanneer u er klaar voor bent.</span>
                  )}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
