'use client'

import { clsx } from 'clsx'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useExamReadinessBundle } from '@/features/exam-prep/hooks/useExamReadinessBundle'
import { pickExamPrepRecommendedHref } from '@/lib/exam-prep/examPrepRecommendedStep'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { surfacePrimaryCta, tier3ReviewShell } from '@/lib/design/cardTiers'
import { passLikelihoodShortNl } from '@/lib/exam-readiness/readinessPresenterModel'

/**
 * Landing-only: beantwoordt „genoeg data?” zonder zware rapportage.
 */
export function ExamReadinessSummary() {
  const bundle = useExamReadinessBundle()
  const { overall, modules } = bundle
  const ctaHref = pickExamPrepRecommendedHref(modules)
  const hasSignal = overall.passLikelihood !== 'not_enough_data' && overall.state !== 'needs_data'
  const startedCount = modules.filter((m) => m.attemptCount > 0).length

  const headline =
    hasSignal && overall.readinessScore != null
      ? `Gereedheid ca. ${overall.readinessScore}%`
      : 'Gereedheid nog niet beschikbaar'

  let body: string
  if (hasSignal) {
    body = `${passLikelihoodShortNl(overall.passLikelihood)} · ${startedCount} van ${modules.length} onderdelen aangeraakt.`
  } else if (startedCount > 0) {
    body = `Je bent ${startedCount} onderdeel${startedCount === 1 ? '' : 'en'} gestart — plan 2–3 korte sessies over verschillende vaardigheden voor een betrouwbaar beeld.`
  } else {
    body = 'Plan 2–3 korte sessies over verschillende onderdelen om je globale gereedheid te ontgrendelen.'
  }

  return (
    <section aria-label="Samenvatting examengereedheid" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-body-sm font-semibold text-ink-primary">Gereedheid</h2>
        <Link
          href="/app/exam-prep/readiness"
          onClick={() =>
            track(ANALYTICS_EVENTS.exam_readiness_recommendation_clicked, {
              surface: 'exam_prep_landing_summary',
              href: '/app/exam-prep/readiness',
              focus_module: null,
              next_action: 'readiness_detail',
            })
          }
          className="text-caption font-semibold text-primary-700 shrink-0 hover:underline"
        >
          Bekijk details
        </Link>
      </div>
      <div className={clsx(tier3ReviewShell('primary'), 'px-3.5 py-3')}>
        <p className="text-body-sm font-semibold text-ink-primary">{headline}</p>
        <p className="text-caption text-ink-secondary mt-1 leading-snug">{body}</p>
        <Link
          href={ctaHref}
          onClick={() =>
            track(ANALYTICS_EVENTS.exam_readiness_recommendation_clicked, {
              surface: 'exam_prep_landing_summary',
              href: ctaHref,
              focus_module: null,
              next_action: 'start_sessions',
            })
          }
          className={clsx(
            surfacePrimaryCta,
            'mt-3 flex w-full items-center justify-center gap-1 min-h-[48px] px-3 py-2.5 text-caption font-bold text-white',
            'touch-manipulation select-none active:scale-[0.98] active:opacity-95 transition-[transform,opacity] duration-100'
          )}
        >
          {hasSignal ? 'Blijf bouwen' : 'Start nu'}
          <ChevronRight className="w-3.5 h-3.5 opacity-80" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
