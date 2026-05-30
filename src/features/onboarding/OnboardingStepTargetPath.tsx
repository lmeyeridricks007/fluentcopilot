'use client'

import { CardTitle, CardDescription } from '@/components/ui/Card'
import type { OnboardingData } from '@/store/onboardingStore'
import { TARGET_PATH_OPTIONS } from './onboardingOptions'
import { OnboardingOptionCard } from './OnboardingOptionCard'

export function OnboardingStepTargetPath({
  data,
  updateData,
}: {
  data: OnboardingData
  updateData: (p: Partial<OnboardingData>) => void
}) {
  return (
    <>
      <CardTitle className="text-title mt-1">What do you want to work toward first?</CardTitle>
      <CardDescription className="mt-1.5">
        The app has several paths — pick what matters most right now.
      </CardDescription>
      <div className="mt-6 space-y-3">
        {TARGET_PATH_OPTIONS.map((o) => (
          <OnboardingOptionCard
            key={o.id}
            label={o.label}
            description={o.description}
            selected={data.targetPath === o.id}
            onSelect={() => updateData({ targetPath: o.id })}
          />
        ))}
      </div>
    </>
  )
}
