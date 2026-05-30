'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ExamPrepTypeRow } from '@/features/exam-prep/examPrepCatalog'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { trackPremiumFeatureLockedForBasicUser } from '@/lib/analytics/planAnalytics'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { FeatureLockModal } from '@/features/entitlements/FeatureLockModal'
import { useExamReadinessBundle } from '@/features/exam-prep/hooks/useExamReadinessBundle'
import { EXAM_SKILL_LAUNCH } from '@/lib/exam-prep/examPrepSkillLaunch'
import { formatExamLastWorkedNl } from '@/lib/exam-prep/formatExamLastWorkedNl'
import type { ModuleReadinessModel } from '@/lib/exam-readiness/types'
import { nativePress } from '@/lib/design/cardTiers'
import { clsx } from 'clsx'

type Props = {
  type: ExamPrepTypeRow
  href: string
}

function statusLine(m: ModuleReadinessModel | undefined, simulationAvailable: boolean): string {
  if (!m || m.attemptCount === 0) return 'Nog niet gestart'
  const parts: string[] = []
  if (m.readinessScore != null) parts.push(`${m.readinessScore}% gereedheid`)
  else
    parts.push(
      `${m.attemptCount} sessie${m.attemptCount === 1 ? '' : 's'} · score na 2+ sessies betrouwbaarder`
    )
  if (simulationAvailable) parts.push('Simulatie beschikbaar')
  return parts.join(' · ')
}

/**
 * Vaardigheidshub: bovenblok opent hub; knoppen starten modi direct.
 */
export function GatedExamTypeCard({ type, href }: Props) {
  const { canAccess } = useProductEntitlements()
  const [open, setOpen] = useState(false)
  const bundle = useExamReadinessBundle()
  const mod = bundle.modules.find((m) => m.module === type.id)
  const launch = EXAM_SKILL_LAUNCH[type.id]
  const allowed = canAccess('exam_prep_modules')
  const hasMocks = allowed && canAccess('exam_practice_exams')
  const Icon = type.icon
  const line = statusLine(mod, launch.simulationHref != null)
  const lastWorked =
    mod?.lastAttemptAt && mod.attemptCount > 0 ? formatExamLastWorkedNl(mod.lastAttemptAt) : null

  const openLock = (surface: string) => {
    trackPremiumFeatureLockedForBasicUser({
      feature_key: 'exam_prep_modules',
      surface,
      exam_type: type.id,
    })
    setOpen(true)
  }

  const hubLinkClass =
    'block rounded-xl -m-px p-3 -outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500'

  const trainLabel = type.id === 'kmn' ? 'Onderwerpen' : 'Start training'
  const simLabel = 'Start simulatie'

  return (
    <>
      <Card
        variant="outlined"
        padding="none"
        className="overflow-hidden border-slate-200/95 bg-surface-elevated shadow-sm transition-[transform,box-shadow] duration-200 ease-out motion-safe:hover:shadow-md active:scale-[0.99]"
      >
        {allowed ? (
          <Link
            href={href}
            className={hubLinkClass}
            onClick={() => track(ANALYTICS_EVENTS.exam_prep_type_selected, { exam_type: type.id, destination: 'hub' })}
          >
            <ExamSkillCardHeader
              Icon={Icon}
              type={type}
              line={line}
              lastWorked={lastWorked}
              showPremiumBadge={false}
              showMockBadge={hasMocks}
            />
          </Link>
        ) : (
          <button
            type="button"
            className={clsx(hubLinkClass, 'w-full text-left')}
            onClick={() => openLock('exam_prep_landing_hub')}
          >
            <ExamSkillCardHeader
              Icon={Icon}
              type={type}
              line={line}
              lastWorked={lastWorked}
              showPremiumBadge
              showMockBadge={false}
            />
          </button>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-200/80 px-3 py-3 bg-slate-50/40">
          {allowed ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href={launch.trainingHref}
                onClick={() =>
                  track(ANALYTICS_EVENTS.exam_prep_type_selected, {
                    exam_type: type.id,
                    destination: 'training_cta',
                  })
                }
                className={clsx(
                  nativePress,
                  'flex-1 min-h-touch flex items-center justify-center rounded-lg bg-primary-600 text-white text-caption font-bold px-3 py-2.5 shadow-sm ring-1 ring-primary-500/40'
                )}
              >
                {trainLabel}
              </Link>
              {launch.simulationHref ? (
                <Link
                  href={launch.simulationHref}
                  onClick={() =>
                    track(ANALYTICS_EVENTS.exam_prep_type_selected, {
                      exam_type: type.id,
                      destination: 'simulation_cta',
                    })
                  }
                  className={clsx(
                    nativePress,
                    'flex-1 min-h-touch flex items-center justify-center rounded-lg bg-slate-800 text-white text-caption font-bold px-3 py-2.5 shadow-sm ring-1 ring-slate-600/40'
                  )}
                >
                  {simLabel}
                </Link>
              ) : (
                <span className="flex-1 min-h-touch flex items-center justify-center rounded-lg border border-dashed border-slate-300/90 bg-white/60 text-caption font-semibold text-ink-tertiary px-3 py-2.5 text-center">
                  Simulatie volgt
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => openLock('exam_prep_landing_training')}
                className={clsx(
                  nativePress,
                  'flex-1 min-h-touch rounded-lg bg-primary-600 text-white text-caption font-bold px-3 py-2.5'
                )}
              >
                {trainLabel}
              </button>
              <button
                type="button"
                onClick={() => openLock('exam_prep_landing_simulation')}
                className={clsx(
                  nativePress,
                  'flex-1 min-h-touch rounded-lg border border-slate-300 bg-white text-ink-primary text-caption font-bold px-3 py-2.5'
                )}
              >
                {simLabel}
              </button>
            </div>
          )}
        </div>
      </Card>
      <FeatureLockModal
        open={open}
        onClose={() => setOpen(false)}
        featureKey="exam_prep_modules"
        surface="exam_prep_landing"
      />
    </>
  )
}

function ExamSkillCardHeader({
  Icon,
  type,
  line,
  lastWorked,
  showPremiumBadge,
  showMockBadge,
}: {
  Icon: ExamPrepTypeRow['icon']
  type: ExamPrepTypeRow
  line: string
  lastWorked: string | null
  showPremiumBadge: boolean
  showMockBadge: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-slate-700" aria-hidden />
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-body font-semibold text-ink-primary">{type.titleNl}</h2>
              {showPremiumBadge ? (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                  Premium
                </span>
              ) : null}
              {showMockBadge ? (
                <span
                  title="Oefenexamens vind je in de vaardigheidshub"
                  className="text-[10px] font-semibold uppercase tracking-wide text-violet-900 bg-violet-100 border border-violet-200 px-1.5 py-0.5 rounded-md"
                >
                  Oefenexamens
                </span>
              ) : null}
            </div>
            <p className="text-caption text-ink-secondary mt-0.5 leading-snug">{type.tagline}</p>
            <p className="text-caption text-ink-tertiary mt-1 leading-snug line-clamp-2">{type.whyItMatters}</p>
            <p className="text-caption text-ink-secondary/90 mt-2 leading-snug font-medium">{line}</p>
            {lastWorked ? (
              <p className="text-caption text-ink-tertiary mt-1 leading-snug">{lastWorked}</p>
            ) : null}
          </div>
          <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0 mt-0.5" aria-hidden />
        </div>
        <p className="text-[11px] font-medium text-primary-700 mt-2">Open vaardigheidshub</p>
      </div>
    </div>
  )
}
