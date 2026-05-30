'use client'

import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { Bug } from 'lucide-react'
import { isExamDevDebugEnabled } from '@/lib/exam-system/examDevDebug'

export type ExamDevDebugBlock = { label: string; body: string }

export function ExamDevDebugPanel(props: { title?: string; blocks: ExamDevDebugBlock[] }) {
  const [open, setOpen] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    setAllowed(isExamDevDebugEnabled())
  }, [])

  if (!allowed || !props.blocks.length) return null

  return (
    <section
      className="mt-6 rounded-2xl border border-amber-300/80 bg-amber-50/95 text-amber-950 shadow-sm"
      aria-label="Developer exam debug"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-900">
          <Bug className="h-4 w-4 shrink-0" aria-hidden />
          {props.title ?? 'Exam dev debug'}
        </span>
        <span className="text-[11px] font-semibold tabular-nums text-amber-900/80">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-amber-200/90 px-3 py-3">
          {props.blocks.map((b) => (
            <div key={b.label}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/70">{b.label}</p>
              <pre
                className={clsx(
                  'mt-1 max-h-64 overflow-auto rounded-lg bg-white/90 px-2 py-2 text-[11px] leading-snug',
                  'border border-amber-200/80 text-slate-800',
                )}
              >
                {b.body}
              </pre>
            </div>
          ))}
          <p className="text-[10px] leading-relaxed text-amber-900/75 pb-1">
            Non-production only. Enable with <code className="rounded bg-white/80 px-1">NEXT_PUBLIC_EXAM_DEV_DEBUG=1</code> or add{' '}
            <code className="rounded bg-white/80 px-1">?examDebug=1</code> to any exam URL once.
          </p>
        </div>
      ) : null}
    </section>
  )
}
