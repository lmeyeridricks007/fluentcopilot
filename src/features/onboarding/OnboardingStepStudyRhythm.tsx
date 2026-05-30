'use client'

import { CardTitle, CardDescription } from '@/components/ui/Card'
import type { OnboardingData } from '@/store/onboardingStore'
import { STUDY_RHYTHM_OPTIONS } from './onboardingOptions'
import { OnboardingOptionCard } from './OnboardingOptionCard'

export function OnboardingStepStudyRhythm({
  data,
  updateData,
}: {
  data: OnboardingData
  updateData: (p: Partial<OnboardingData>) => void
}) {
  return (
    <>
      <CardTitle className="text-title mt-1">How often do you want to practice?</CardTitle>
      <CardDescription className="mt-1.5">
        No wrong answer — we’ll use this for gentle nudges and mission ideas later.
      </CardDescription>
      <div className="mt-6 space-y-3">
        {STUDY_RHYTHM_OPTIONS.map((o) => (
          <OnboardingOptionCard
            key={o.id}
            label={o.label}
            description={o.description}
            selected={data.studyRhythm === o.id}
            onSelect={() => updateData({ studyRhythm: o.id })}
          />
        ))}
      </div>
    </>
  )
}
