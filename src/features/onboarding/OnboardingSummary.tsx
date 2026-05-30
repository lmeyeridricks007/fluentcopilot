'use client'

import { CardTitle, CardDescription } from '@/components/ui/Card'
import type { OnboardingData } from '@/store/onboardingStore'
import {
  currentLevelSummaryLine,
  focusSkillsSummaryLine,
  getPersonalizationHints,
  learningReasonSummaryLine,
  primaryGoalSummaryLine,
  studyRhythmSummaryLine,
  targetPathSummaryLine,
} from '@/lib/personalization/onboardingPersonalization'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-slate-100 last:border-0">
      <span className="text-body-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-body text-slate-900">{value}</span>
    </div>
  )
}

export function OnboardingSummary({
  data,
  onEnterApp,
  ctaLabel,
}: {
  data: OnboardingData
  onEnterApp: () => void
  ctaLabel: string
}) {
  const hints = getPersonalizationHints(data)

  return (
    <>
      <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mt-1 mb-3 mx-auto">
        <span className="text-2xl" aria-hidden>
          ✓
        </span>
      </div>
      <CardTitle className="text-title text-center">You&apos;re ready to start</CardTitle>
      <CardDescription className="mt-2 text-center max-w-sm mx-auto">
        Here&apos;s a quick recap. We&apos;ll route you to a starting screen that matches your path — you can change
        direction anytime from the app.
      </CardDescription>

      <div className="mt-6 rounded-xl border border-slate-200 bg-surface-elevated px-4 py-1">
        <Row label="Goal" value={primaryGoalSummaryLine(data)} />
        <Row label="Level" value={currentLevelSummaryLine(data)} />
        <Row label="Path" value={targetPathSummaryLine(data)} />
        <Row label="Focus" value={focusSkillsSummaryLine(data)} />
        <Row label="Rhythm" value={studyRhythmSummaryLine(data)} />
        <Row label="Why Dutch" value={learningReasonSummaryLine(data)} />
      </div>

      <div className="mt-6 rounded-xl bg-primary-50 border border-primary-100 px-4 py-3">
        <p className="text-body-sm font-semibold text-primary-900">Suggested first step</p>
        <p className="text-body-sm text-primary-800 mt-1 leading-snug">
          {hints.dashboardHeroHint === 'exam' && 'Dive into exam prep when you’re ready — structured tracks are in Exam prep.'}
          {hints.dashboardHeroHint === 'mastery' && 'Strengthen A2 with lessons and review before moving up.'}
          {hints.dashboardHeroHint === 'speaking' && 'Open Practice for scenarios and speaking reps.'}
          {hints.dashboardHeroHint === 'general' && 'Explore Learn for lessons, or Practice for real-life scenarios.'}
        </p>
      </div>

      <button
        type="button"
        onClick={onEnterApp}
        className="mt-8 w-full min-h-touch rounded-xl bg-primary-600 text-white font-semibold text-body shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
      >
        {ctaLabel}
      </button>
    </>
  )
}
