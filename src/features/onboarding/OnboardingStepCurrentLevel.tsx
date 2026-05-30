'use client'

import { CardTitle, CardDescription } from '@/components/ui/Card'
import type { OnboardingData } from '@/store/onboardingStore'
import { CURRENT_LEVEL_OPTIONS } from './onboardingOptions'
import { OnboardingOptionCard } from './OnboardingOptionCard'

export function OnboardingStepCurrentLevel({
  data,
  updateData,
}: {
  data: OnboardingData
  updateData: (p: Partial<OnboardingData>) => void
}) {
  return (
    <>
      <CardTitle className="text-title mt-1">Which level feels closest to you?</CardTitle>
      <CardDescription className="mt-1.5">Your best guess is enough — we’ll adapt as you learn.</CardDescription>
      <div className="mt-6 space-y-3">
        {CURRENT_LEVEL_OPTIONS.map((o) => (
          <OnboardingOptionCard
            key={o.id}
            label={o.label}
            description={o.description}
            selected={data.currentLevelSelfReport === o.id}
            onSelect={() => updateData({ currentLevelSelfReport: o.id })}
          />
        ))}
      </div>
    </>
  )
}
