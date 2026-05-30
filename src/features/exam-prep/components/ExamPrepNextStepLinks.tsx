'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { track, ANALYTICS_EVENTS, type AnalyticsEvent } from '@/lib/analytics'
import type { NextBestAction } from '@/lib/schemas/exam/feedbackBlock.schema'
import { resolveNextBestActionHref } from '@/lib/exam-recommendations/resolveNextBestActionHref'
import { persistLastExamNextActions } from '@/lib/exam-recommendations/examLastRecommendationsStorage'

const linkBtn = clsx(
  'flex w-full min-h-touch items-center justify-between rounded-lg font-medium transition-colors',
  'px-4 py-2.5 text-body-sm bg-surface-muted text-ink-primary hover:bg-slate-200 active:bg-slate-300',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500'
)

export function ExamPrepNextStepLinks({
  actions,
  analyticsContext,
  examType,
  examMode,
  legacyAnalyticsClickEvent,
  enableSideEffects = true,
}: {
  actions: NextBestAction[]
  analyticsContext: Record<string, unknown>
  examType: string
  examMode?: string
  /** Optional second event for funnels that already track speaking/writing next-action clicks. */
  legacyAnalyticsClickEvent?: AnalyticsEvent
  /** When false, skip persist + generated/shown analytics (e.g. Practice Hub replay). */
  enableSideEffects?: boolean
}) {
  const loggedRef = useRef(false)

  useEffect(() => {
    if (!enableSideEffects || actions.length === 0 || loggedRef.current) return
    loggedRef.current = true
    const kinds = actions.map((a) => {
      const m = a.metadata as Record<string, unknown> | undefined
      return (m?.examRecKind as string) ?? a.kind
    })
    track(ANALYTICS_EVENTS.exam_recommendation_generated, {
      count: actions.length,
      exam_type: examType,
      exam_mode: examMode,
      recommendation_kinds: kinds,
      ...analyticsContext,
    })
    track(ANALYTICS_EVENTS.exam_recommendation_shown, {
      count: actions.length,
      exam_type: examType,
      ...analyticsContext,
    })
    persistLastExamNextActions({ actions, examType, mode: examMode })
  }, [actions, analyticsContext, enableSideEffects, examMode, examType])

  if (actions.length === 0) return null

  return (
    <div className="space-y-2">
      {actions.map((a) => {
        const href = resolveNextBestActionHref(a)
        const m = a.metadata as Record<string, unknown> | undefined
        const sub =
          typeof a.rationale === 'string' && a.rationale.length > 0
            ? a.rationale
            : typeof m?.rationaleSource === 'string'
              ? String(m.rationaleSource)
              : undefined
        return (
          <Link
            key={a.id}
            href={href}
            className={linkBtn}
            onClick={() => {
              const base = {
                action_id: a.id,
                target_kind: a.kind,
                target_id: a.targetId,
                recommendation_category: m?.examRecKind ?? a.kind,
                rationale_source: m?.rationaleSource,
                ...analyticsContext,
              }
              track(ANALYTICS_EVENTS.exam_recommendation_clicked, base)
              if (legacyAnalyticsClickEvent) track(legacyAnalyticsClickEvent, base)
            }}
          >
            <span className="text-left pr-2 flex-1 min-w-0">
              <span className="block font-medium text-ink-primary">{a.label}</span>
              {sub ? <span className="block text-caption text-ink-secondary mt-0.5 line-clamp-2">{sub}</span> : null}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
          </Link>
        )
      })}
    </div>
  )
}
