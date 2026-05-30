'use client'

import { useCallback, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import type { SpeakingTrainingFeedbackUi } from '@/lib/exam-prep/speaking/types'

export function SpeakingRubricBreakdown({
  ui,
  questionId,
}: {
  ui: SpeakingTrainingFeedbackUi
  questionId: string
}) {
  const openedRef = useRef(new Set<string>())

  const onToggle = useCallback(
    (key: string, open: boolean) => {
      if (!open || openedRef.current.has(key)) return
      openedRef.current.add(key)
      track(ANALYTICS_EVENTS.speaking_exam_category_viewed, {
        question_id: questionId,
        category_key: key,
        exam_mode: 'training',
      })
    },
    [questionId]
  )

  return (
    <div className="space-y-2">
      <h2 className="text-body font-semibold text-ink-primary">Rubric — per onderdeel</h2>
      <p className="text-caption text-ink-tertiary leading-snug">
        Tik een onderdeel open voor uitleg bij jouw score. Dit volgt het officiële spreekmodel (A2).
      </p>
      <ul className="space-y-2">
        {ui.categoryRows.map((row) => {
          const pct = row.max > 0 ? Math.round((row.score / row.max) * 100) : 0
          return (
            <li key={row.key} className="rounded-xl border border-slate-200 bg-surface-elevated overflow-hidden">
              <details
                className="group"
                onToggle={(e) => {
                  const d = e.currentTarget
                  onToggle(row.key, d.open)
                }}
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 min-h-touch">
                  <ChevronDown className="w-4 h-4 shrink-0 text-ink-tertiary transition-transform group-open:rotate-180" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 text-body-sm">
                      <span className="font-medium text-ink-primary truncate">{row.labelNl}</span>
                      <span className="text-ink-secondary shrink-0 tabular-nums">
                        {row.score}/{row.max}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-primary-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </summary>
                <div className="px-3 pb-3 pt-0 border-t border-slate-100 space-y-2">
                  <p className="text-body-sm text-ink-primary leading-relaxed pt-2">{row.learnerFeedbackNl}</p>
                  {row.evidenceNl ? (
                    <p className="text-caption text-ink-secondary leading-snug border-l-2 border-primary-200 pl-2">
                      {row.evidenceNl}
                    </p>
                  ) : null}
                  {row.detail && row.detail !== row.learnerFeedbackNl && row.detail !== row.evidenceNl ? (
                    <p className="text-caption text-ink-tertiary leading-snug">{row.detail}</p>
                  ) : null}
                </div>
              </details>
            </li>
          )
        })}
      </ul>
      {ui.executionGatedNote ? (
        <p className="text-caption text-amber-950 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-2 leading-snug">
          {ui.executionGatedNote}
        </p>
      ) : null}
    </div>
  )
}
