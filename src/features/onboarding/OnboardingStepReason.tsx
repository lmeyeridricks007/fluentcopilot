'use client'

import { CardTitle, CardDescription } from '@/components/ui/Card'
import type { OnboardingData } from '@/store/onboardingStore'
import { LEARNING_REASON_OPTIONS } from './onboardingOptions'
import { OnboardingOptionCard } from './OnboardingOptionCard'

export function OnboardingStepReason({
  data,
  updateData,
}: {
  data: OnboardingData
  updateData: (p: Partial<OnboardingData>) => void
}) {
  return (
    <>
      <CardTitle className="text-title mt-1">Why are you learning Dutch?</CardTitle>
      <CardDescription className="mt-1.5">
        Helps us keep examples and tips relevant to your life.
      </CardDescription>
      <div className="mt-6 space-y-3">
        {LEARNING_REASON_OPTIONS.map((o) => (
          <OnboardingOptionCard
            key={o.id}
            label={o.label}
            selected={data.learningReason === o.id}
            onSelect={() => updateData({ learningReason: o.id })}
          />
        ))}
      </div>
    </>
  )
}
