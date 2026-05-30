'use client'

import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { OnboardingStepCurrentLevel } from './OnboardingStepCurrentLevel'
import { OnboardingStepFocusSkills } from './OnboardingStepFocusSkills'
import { OnboardingStepGoal } from './OnboardingStepGoal'
import { OnboardingStepReason } from './OnboardingStepReason'
import { OnboardingStepStudyRhythm } from './OnboardingStepStudyRhythm'
import { OnboardingStepTargetPath } from './OnboardingStepTargetPath'
import { OnboardingSummary } from './OnboardingSummary'
import { useOnboardingFlow } from './useOnboardingFlow'

export function OnboardingFlow() {
  const {
    step,
    totalSteps,
    data,
    updateData,
    canProceed,
    goNext,
    goBack,
    completeAndEnterApp,
    summaryCta,
    isSummaryStep,
  } = useOnboardingFlow()

  return (
    <div className="min-h-screen flex flex-col bg-surface safe-area-pb safe-area-pt">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-caption font-medium text-ink-secondary">
            Step {step + 1} of {totalSteps}
          </p>
          <p className="text-caption text-ink-tertiary" aria-hidden>
            {Math.round(((step + 1) / totalSteps) * 100)}%
          </p>
        </div>
        <ProgressBar value={step + 1} max={totalSteps} showLabel={false} />
      </div>

      <div className="flex-1 overflow-auto px-4 pb-6">
        {step === 0 && <OnboardingStepGoal data={data} updateData={updateData} />}
        {step === 1 && <OnboardingStepCurrentLevel data={data} updateData={updateData} />}
        {step === 2 && <OnboardingStepTargetPath data={data} updateData={updateData} />}
        {step === 3 && <OnboardingStepFocusSkills data={data} updateData={updateData} />}
        {step === 4 && <OnboardingStepStudyRhythm data={data} updateData={updateData} />}
        {step === 5 && <OnboardingStepReason data={data} updateData={updateData} />}
        {step === 6 && (
          <OnboardingSummary data={data} onEnterApp={completeAndEnterApp} ctaLabel={summaryCta} />
        )}
      </div>

      {!isSummaryStep ? (
        <div className="p-4 border-t border-slate-200 bg-surface-elevated safe-area-pb">
          <div className="flex gap-3">
            <Button variant="ghost" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button onClick={goNext} disabled={!canProceed} className="flex-[2]">
              Continue
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
