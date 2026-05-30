'use client'

import Link from 'next/link'
import { ClipboardCheck, ChevronRight } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

type Variant = 'hub' | 'compact'

/**
 * Prominent entry from Practice hub (or elsewhere). Distinct from scenario tiles.
 */
export function ExamPrepEntryCard({ variant = 'hub' }: { variant?: Variant }) {
  if (variant === 'compact') {
    return (
      <Link
        href="/app/exam-prep"
        className="flex items-center gap-3 min-h-touch rounded-xl border border-slate-200 bg-surface-elevated px-3 py-3 hover:bg-slate-50/80 transition-colors"
        onClick={() => track(ANALYTICS_EVENTS.exam_prep_entry_clicked, { surface: 'compact' })}
      >
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-slate-700" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-semibold text-ink-primary">Exam prep</p>
          <p className="text-caption text-ink-secondary">A2 · Speaking, writing, listening, reading, KNM</p>
        </div>
        <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
      </Link>
    )
  }

  return (
    <Link
      href="/app/exam-prep"
      className="block min-h-touch rounded-2xl border border-slate-300/90 bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-4 shadow-sm hover:border-slate-400/80 hover:shadow transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
      onClick={() => track(ANALYTICS_EVENTS.exam_prep_entry_clicked, { surface: 'practice_hub' })}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-inner">
          <ClipboardCheck className="w-6 h-6" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption font-semibold text-slate-600 uppercase tracking-wide">Structured track</p>
          <p className="text-body-lg font-bold text-ink-primary mt-0.5">Exam prep</p>
          <p className="text-body-sm text-ink-secondary mt-1 leading-snug">
            Prepare for the Dutch A2 exam — not the same as everyday practice. Rubrics, tasks, and training vs simulation.
          </p>
          <span className="inline-flex items-center gap-1 mt-3 text-body-sm font-semibold text-slate-800">
            Open exam prep
            <ChevronRight className="w-4 h-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}
