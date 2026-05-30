'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, ClipboardList } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { surfacePrimaryCta, tier2ExamShell } from '@/lib/design/cardTiers'
import { playOptInTapSound } from '@/lib/device/deviceFeedback'
import { clsx } from 'clsx'
import { getExamPrepType } from '@/features/exam-prep/examPrepCatalog'
import { useExamReadinessBundle } from '@/features/exam-prep/hooks/useExamReadinessBundle'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { FeatureLockModal } from '@/features/entitlements/FeatureLockModal'
import { pickExamPrepRecommendedHref } from '@/lib/exam-prep/examPrepRecommendedStep'
import {
  examPrepTypeIdFromTargetHref,
  inferExamActionMode,
  minutesForRecommendedHref,
} from '@/lib/exam-prep/examPrepSkillLaunch'

export function ExamPrepStartHero() {
  const bundle = useExamReadinessBundle()
  const { canAccess } = useProductEntitlements()
  const [lockOpen, setLockOpen] = useState(false)
  const allowed = canAccess('exam_prep_modules')

  const { href, title, subline, ctaLabel } = useMemo(() => {
    const target = pickExamPrepRecommendedHref(bundle.modules)
    const skillId = examPrepTypeIdFromTargetHref(target)
    const row = skillId ? getExamPrepType(skillId) : undefined
    const minutes = skillId ? minutesForRecommendedHref(target, skillId) : 8
    const mode = skillId ? inferExamActionMode(target) : 'training'

    const titleNl = row?.titleNl ?? row?.title ?? 'Examen'
    const modeLabelNl =
      mode === 'simulation' ? 'Simulatie' : mode === 'kmn_path' ? 'KNM-vervolg' : 'Training'

    let title: string
    let ctaLabel: string
    if (mode === 'simulation') {
      title = `Start simulatie — ${titleNl}`
      ctaLabel = 'Start simulatie'
    } else if (mode === 'kmn_path') {
      title = 'Ga verder met KNM'
      ctaLabel = 'Open KNM'
    } else {
      title = `Start training — ${titleNl}`
      ctaLabel = 'Start nu'
    }

    const subline = `${titleNl} · ${modeLabelNl} · ca. ${minutes} min`

    return { href: target, title, subline, ctaLabel }
  }, [bundle.modules])

  const onLocked = () => {
    track(ANALYTICS_EVENTS.dashboard_next_action_clicked, {
      surface: 'exam_prep_start_hero',
      kind: 'exam_prep_next_step_locked',
      href,
    })
    setLockOpen(true)
  }

  const ctaClass = clsx(
    surfacePrimaryCta,
    'group min-h-[52px] px-4 py-3.5 text-body text-white w-full',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
  )

  return (
    <>
      <section aria-label="Volgende examenstap" className={tier2ExamShell('primary')}>
        <div className="flex items-start gap-3">
          <div
            className="w-14 h-14 rounded-2xl bg-gradient-to-b from-primary-600 to-primary-800 text-white flex items-center justify-center shrink-0 shadow-[0_10px_28px_-8px_rgba(91,33,182,0.55)] ring-1 ring-white/30"
            aria-hidden
          >
            <ClipboardList className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-800/75">
                Uw volgende examenstap
              </p>
              <h2 className="text-[1.25rem] sm:text-[1.45rem] font-bold text-ink-primary mt-0.5 leading-tight tracking-tight pr-1">
                {title}
              </h2>
              <p className="text-body-sm text-ink-secondary mt-1 leading-snug">{subline}</p>
            </div>
            {allowed ? (
              <Link
                href={href}
                onClick={() => {
                  playOptInTapSound()
                  track(ANALYTICS_EVENTS.dashboard_next_action_clicked, {
                    surface: 'exam_prep_start_hero',
                    kind: 'exam_prep_next_step',
                    href,
                  })
                }}
                className={ctaClass}
              >
                {ctaLabel}
                <ChevronRight
                  className="w-4 h-4 opacity-95 group-hover:translate-x-0.5 transition-transform duration-200"
                  aria-hidden
                />
              </Link>
            ) : (
              <button type="button" onClick={onLocked} className={ctaClass}>
                Ontgrendel met Premium
                <ChevronRight className="w-4 h-4 opacity-95" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </section>
      <FeatureLockModal
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        featureKey="exam_prep_modules"
        surface="exam_prep_start_hero"
      />
    </>
  )
}
