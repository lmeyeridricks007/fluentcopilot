'use client'

import { CardTitle, CardDescription } from '@/components/ui/Card'
import type { OnboardingData } from '@/store/onboardingStore'
import { PRIMARY_GOAL_OPTIONS } from './onboardingOptions'
import { OnboardingOptionCard } from './OnboardingOptionCard'

export function OnboardingStepGoal({
  data,
  updateData,
}: {
  data: OnboardingData
  updateData: (p: Partial<OnboardingData>) => void
}) {
  return (
    <>
      <CardTitle className="text-title mt-1">What do you want to achieve first?</CardTitle>
      <CardDescription className="mt-1.5">
        We’ll tune suggestions and your starting path around this — you can always adjust later.
      </CardDescription>
      <div className="mt-6 space-y-3">
        {PRIMARY_GOAL_OPTIONS.map((o) => (
          <OnboardingOptionCard
            key={o.id}
            label={o.label}
            description={o.description}
            selected={data.primaryGoal === o.id}
            onSelect={() => updateData({ primaryGoal: o.id })}
          />
        ))}
      </div>
    </>
  )
}
