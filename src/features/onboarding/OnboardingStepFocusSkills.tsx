'use client'

import clsx from 'clsx'
import { CardTitle, CardDescription } from '@/components/ui/Card'
import type { OnboardingData } from '@/store/onboardingStore'
import { FOCUS_SKILL_OPTIONS } from './onboardingOptions'

export function OnboardingStepFocusSkills({
  data,
  updateData,
}: {
  data: OnboardingData
  updateData: (p: Partial<OnboardingData>) => void
}) {
  const toggle = (id: string) => {
    const set = new Set(data.focusSkills)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    updateData({ focusSkills: [...set] })
  }

  return (
    <>
      <CardTitle className="text-title mt-1">What would you like more help with?</CardTitle>
      <CardDescription className="mt-1.5">Choose any that apply — tap again to remove.</CardDescription>
      <div className="mt-6 flex flex-wrap gap-2">
        {FOCUS_SKILL_OPTIONS.map((o) => {
          const selected = data.focusSkills.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={clsx(
                'min-h-touch px-4 py-2.5 rounded-full border text-body-sm font-semibold transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
                selected
                  ? 'border-primary-500 bg-primary-50 text-primary-800'
                  : 'border-slate-200 bg-surface-elevated text-slate-800 hover:bg-surface-muted'
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
