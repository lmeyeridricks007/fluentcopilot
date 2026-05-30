'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { track, ANALYTICS_EVENTS, trackReadinessBandTransition } from '@/lib/analytics'
import { getExamPrepType, type ExamPrepTypeId } from '@/features/exam-prep/examPrepCatalog'
import { useExamReadinessBundle } from '@/features/exam-prep/hooks/useExamReadinessBundle'
import { passLikelihoodNl } from '@/lib/exam-readiness/passLikelihoodBuilder'
import {
  passLikelihoodShortNl,
  readinessStateAccent,
  readinessTrendNl,
} from '@/lib/exam-readiness/readinessPresenterModel'
import { pickExamPrepRecommendedHref } from '@/lib/exam-prep/examPrepRecommendedStep'

export type ExamReadinessCardSurface =
  | 'exam_prep_readiness_detail'
  | 'exam_prep_type_hub'
  | 'speaking_simulation_report'
  | 'writing_simulation_report'

type Props = {
  surface: ExamReadinessCardSurface
  /** Highlights one exam type (hub + post-simulation). */
  focusModule?: ExamPrepTypeId
}

export function ExamReadinessCard({ surface, focusModule }: Props) {
  const bundle = useExamReadinessBundle()
  const prevStateKey = useRef<string | null>(null)
  const prevOverallScoreRef = useRef<number | null>(null)
  const focused = focusModule ? bundle.modules.find((m) => m.module === focusModule) : undefined
  const passOverall = passLikelihoodNl(bundle.overall.passLikelihood)
  const accentOverall = readinessStateAccent(bundle.overall.state)
  const ctaHref = pickExamPrepRecommendedHref(bundle.modules, focusModule)

  useEffect(() => {
    const mod = focusModule ? bundle.modules.find((m) => m.module === focusModule) : undefined
    const moduleStates = bundle.modules.map((m) => ({
      module: m.module,
      state: m.state,
      pass_likelihood: m.passLikelihood,
      score: m.readinessScore,
    }))
    track(ANALYTICS_EVENTS.exam_readiness_viewed, {
      surface,
      focus_module: focusModule ?? null,
      updated_at: bundle.updatedAt,
      overall_readiness_state: bundle.overall.state,
      pass_likelihood: bundle.overall.passLikelihood,
      readiness_score: bundle.overall.readinessScore,
      weak_category_count: bundle.modules.reduce((n, m) => n + m.weakCategories.length, 0),
      modules_with_data: bundle.overall.modulesWithData,
      module_states: moduleStates,
    })
    track(ANALYTICS_EVENTS.pass_likelihood_viewed, {
      surface,
      scope: focusModule ?? 'overall',
      label: mod?.passLikelihood ?? bundle.overall.passLikelihood,
    })
    const weakPool = mod?.weakCategories ?? bundle.modules.flatMap((m) => m.weakCategories)
    const weakKeys = [...new Set(weakPool.map((w) => w.key))]
    if (weakKeys.length > 0) {
      track(ANALYTICS_EVENTS.weak_category_viewed, {
        surface,
        scope: focusModule ?? 'aggregated',
        weak_category_count: mod ? mod.weakCategories.length : weakKeys.length,
        weak_category_keys: weakKeys.slice(0, 8),
      })
    }
    track(ANALYTICS_EVENTS.exam_module_ready_state_viewed, { surface, modules: moduleStates })

    const stateKey = `${bundle.overall.state}:${bundle.overall.passLikelihood}`
    if (prevStateKey.current !== null && prevStateKey.current !== stateKey) {
      track(ANALYTICS_EVENTS.exam_readiness_state_changed, {
        surface,
        from: prevStateKey.current,
        to: stateKey,
      })
    }
    prevStateKey.current = stateKey

    const score = bundle.overall.readinessScore
    const prevScore = prevOverallScoreRef.current
    if (prevScore !== null && score != null && score !== prevScore) {
      const direction =
        score > prevScore ? 'improved' : score < prevScore ? 'regressed' : ('flat' as const)
      trackReadinessBandTransition({
        surface,
        scope: 'overall',
        from_score: prevScore,
        to_score: score,
        direction,
        from_state: undefined,
        to_state: bundle.overall.state,
        pass_likelihood: bundle.overall.passLikelihood,
      })
    }
    if (score != null) prevOverallScoreRef.current = score
  }, [surface, focusModule, bundle])

  if (focused) {
    const accent = readinessStateAccent(focused.state)
    const passMod = passLikelihoodNl(focused.passLikelihood)
    const trendLine = readinessTrendNl(focused.trend)
    return (
      <Card
        variant="outlined"
        padding="md"
        className={`border-2 ${accent.border} bg-gradient-to-b from-white to-slate-50/40 shadow-sm`}
      >
        <p className="text-caption font-semibold text-slate-600 uppercase tracking-wide">Examen-readiness</p>
        <CardTitle className="mt-1 text-body font-semibold text-ink-primary leading-snug">{focused.headlineNl}</CardTitle>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`text-caption font-semibold rounded-md px-2 py-0.5 border border-black/5 ${accent.badgeBg} ${accent.badgeText}`}
          >
            {focused.readinessScore != null ? `${focused.readinessScore}%` : 'Nog meten'}
          </span>
          <span className="text-caption text-ink-secondary">{passLikelihoodShortNl(focused.passLikelihood)}</span>
          {trendLine ? <span className="text-caption text-ink-tertiary">{trendLine}</span> : null}
        </div>
        <p className="mt-2 text-body-sm font-medium text-ink-primary">{passMod.title}</p>
        <p className="mt-1 text-body-sm text-ink-secondary leading-relaxed">{passMod.sub}</p>
        {focused.weakCategories.length > 0 ? (
          <div className="mt-4">
            <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide">Aandachtspunten</p>
            <ul className="mt-2 space-y-1.5 text-body-sm text-ink-secondary">
              {focused.weakCategories.map((w) => (
                <li key={w.key} className="flex gap-2">
                  <span className="text-primary-600 font-medium shrink-0">·</span>
                  <span>{w.labelNl}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-4 text-body-sm text-ink-secondary leading-relaxed">{focused.explanationNl}</p>
        <p className="mt-2 text-body-sm text-ink-primary leading-relaxed font-medium">{focused.nextHintNl}</p>
        <p className="mt-3 text-caption text-ink-tertiary leading-snug">{bundle.overall.disclaimerNl}</p>
        <Link
          href={ctaHref}
          onClick={() =>
            track(ANALYTICS_EVENTS.exam_readiness_recommendation_clicked, {
              surface,
              href: ctaHref,
              focus_module: focusModule ?? null,
              next_action: 'primary_cta',
            })
          }
          className="mt-4 flex min-h-touch w-full items-center justify-center rounded-lg bg-slate-900 text-slate-50 text-body-sm font-semibold px-4 py-2.5 hover:bg-slate-800 transition-colors"
        >
          Open aanbevolen vervolgstap
        </Link>
      </Card>
    )
  }

  const trendOverallLine = readinessTrendNl(bundle.overall.trend)

  return (
    <Card
      variant="outlined"
      padding="md"
      className={`border-2 ${accentOverall.border} bg-gradient-to-b from-white to-slate-50/30`}
    >
      <p className="text-caption font-semibold text-slate-600 uppercase tracking-wide">Examen-readiness</p>
      <CardTitle className="mt-1 text-title font-bold text-ink-primary leading-snug">{bundle.overall.headlineNl}</CardTitle>
      <CardDescription className="mt-2 text-body text-ink-secondary leading-relaxed">{bundle.overall.explanationNl}</CardDescription>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`text-caption font-semibold rounded-md px-2.5 py-1 border border-black/5 ${accentOverall.badgeBg} ${accentOverall.badgeText}`}
        >
          {bundle.overall.readinessScore != null ? `Score ${bundle.overall.readinessScore}%` : 'Nog meten'}
        </span>
        <span className="text-body-sm font-medium text-ink-primary">{passOverall.title}</span>
        {trendOverallLine ? <span className="text-caption text-ink-tertiary">{trendOverallLine}</span> : null}
      </div>
      <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{passOverall.sub}</p>
      <p className="mt-3 text-body-sm text-ink-primary font-medium">{bundle.overall.nextHintNl}</p>

      <div className="mt-5 rounded-xl border border-slate-200/90 bg-white/80 p-3">
        <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide">Per onderdeel</p>
        <ul className="mt-2 space-y-2 list-none p-0 m-0">
          {bundle.modules.map((m) => {
            const row = getExamPrepType(m.module)
            const ac = readinessStateAccent(m.state)
            return (
              <li
                key={m.module}
                className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <span className="text-body-sm font-semibold text-ink-primary">{row?.titleNl ?? row?.title ?? m.module}</span>
                  <p className="text-caption text-ink-secondary leading-snug line-clamp-2">{m.headlineNl}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`text-caption font-semibold rounded px-2 py-0.5 ${ac.badgeBg} ${ac.badgeText}`}>
                    {m.readinessScore != null ? `${m.readinessScore}%` : '—'}
                  </span>
                  <Link
                    href={`/app/exam-prep/${m.module}`}
                    onClick={() =>
                      track(ANALYTICS_EVENTS.exam_readiness_recommendation_clicked, {
                        surface,
                        href: `/app/exam-prep/${m.module}`,
                        focus_module: m.module,
                        next_action: 'module_hub',
                      })
                    }
                    className="text-caption font-semibold text-primary-700 hover:underline"
                  >
                    Naar hub
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-4 text-caption text-ink-tertiary leading-snug">{bundle.overall.disclaimerNl}</p>
      <Link
        href={ctaHref}
        onClick={() =>
          track(ANALYTICS_EVENTS.exam_readiness_recommendation_clicked, {
            surface,
            href: ctaHref,
            focus_module: null,
            next_action: 'primary_cta',
          })
        }
        className="mt-3 flex min-h-touch w-full items-center justify-center rounded-lg bg-slate-900 text-slate-50 text-body-sm font-semibold px-4 py-2.5 hover:bg-slate-800 transition-colors"
      >
        Ga naar aanbevolen vervolgstap
      </Link>
    </Card>
  )
}
