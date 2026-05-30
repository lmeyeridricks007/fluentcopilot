'use client'

import Link from 'next/link'
import { MasterySnapshotCard } from '@/features/dashboard'
import { ExamPrepEntryCard } from '@/features/exam-prep'
import type { PracticeDashboardSummary } from '../usePracticeDashboardSummary'
import type { PracticeHubViewModel } from '../types'
import { DailyMissionCard } from '../components/DailyMissionCard'
import { LastExamPrepRecapSection } from '../components/LastExamPrepRecapSection'
import { ImproveSectionIntro } from '../improve/ImproveSectionIntro'
import { ImproveTopFocus } from '../improve/ImproveTopFocus'
import { ImproveSlipsSection } from '../improve/ImproveSlipsSection'
import { ImproveConfidenceReadiness } from '../improve/ImproveConfidenceReadiness'
import { IMPROVE_CTA } from '../improve/improveCtas'
import type { FeatureKey } from '@/lib/entitlements'

type Props = {
  vm: PracticeHubViewModel
  dash: PracticeDashboardSummary
  readinessDetailsHref: string
  readinessDetailsLabel: string
  canAccess: (feature: FeatureKey) => boolean
}

/** Flat coaching surface — no accordions; scan-first, action-forward. */
export function PracticeImprovePanel({
  vm,
  dash,
  readinessDetailsHref,
  readinessDetailsLabel,
  canAccess,
}: Props) {
  const hasStretch = Boolean(vm.weeklyMission || vm.skillFocusMission)

  return (
    <div className="space-y-8 motion-safe:animate-learn-segment-crossfade pb-2 sm:space-y-10">
      {/* Tab already reads “Sharpen” — single intro lives on Top focus to avoid stacked micro-headers */}
      <ImproveTopFocus vm={vm} />

      <ImproveSlipsSection areas={vm.weakAreas} />

      <section className="space-y-3 border-t border-slate-200/80 pt-8" aria-label="Practical abilities">
        <ImproveSectionIntro
          title="Practical abilities"
          kicker="Snapshot only — depth lives under Coach → Progress."
        />
        <MasterySnapshotCard rows={dash.masterySnapshot} variant="preview" maxRows={3} />
      </section>

      <ImproveConfidenceReadiness
        readiness={dash.readiness}
        readinessDetailsHref={readinessDetailsHref}
        readinessDetailsLabel={readinessDetailsLabel}
        insightLocked={!canAccess('insights_readiness_detail')}
        confidenceTrend={dash.confidenceTrend}
        section={vm.confidence}
      />

      <section className="space-y-2 border-t border-slate-200/80 pt-8" aria-label="Exam preparation">
        <ImproveSectionIntro
          title="Exam track"
          kicker="Exam when you need it — real-life confidence still lives in Talk."
        />
        <ExamPrepEntryCard variant="compact" />
      </section>

      <LastExamPrepRecapSection />

      <section
        className={`space-y-3 border-t border-slate-200/80 ${hasStretch ? 'pt-8' : 'pt-6'}`}
        aria-label="Stretch missions"
      >
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink-tertiary">When you want more</p>
          <p className="text-body-sm font-medium text-ink-secondary">Stretch missions</p>
          <p className="text-caption text-ink-tertiary leading-snug">
            Optional depth — your daily move stays on Talk → Now.
          </p>
        </div>
        {vm.weeklyMission ? <DailyMissionCard mission={vm.weeklyMission} compact /> : null}
        {vm.skillFocusMission ? <DailyMissionCard mission={vm.skillFocusMission} compact /> : null}
        {!hasStretch ? (
          <p className="text-caption text-ink-tertiary">No extra missions queued right now.</p>
        ) : null}
        <Link
          href="/app/talk"
          className="inline-flex text-[13px] font-semibold text-[#7c3aed] underline-offset-2 hover:underline"
        >
          {IMPROVE_CTA.seePracticeHub}
        </Link>
      </section>
    </div>
  )
}
