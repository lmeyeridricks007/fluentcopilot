'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/features/account/ConfirmDialog'
import { resetAllLocalLearningDataOnDevice, resetOnboardingProgressOnly } from '@/lib/account'
import { ROUTES } from '@/lib/routing/authRedirects'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export function ResetLocalDataAction() {
  const router = useRouter()
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [fullOpen, setFullOpen] = useState(false)

  const confirmOnboardingReset = () => {
    track(ANALYTICS_EVENTS.reset_progress_confirmed, { scope: 'onboarding_only' })
    resetOnboardingProgressOnly()
    setOnboardingOpen(false)
    router.replace(ROUTES.onboarding)
  }

  const confirmFullReset = () => {
    track(ANALYTICS_EVENTS.reset_progress_confirmed, { scope: 'all_local_learning' })
    const ok = resetAllLocalLearningDataOnDevice()
    setFullOpen(false)
    if (ok) {
      router.replace(ROUTES.login)
    }
  }

  return (
    <>
      <Card variant="outlined" padding="md" className="border-dashed border-slate-300 bg-surface-muted/30">
        <div className="flex gap-3 items-start">
          <FlaskConical className="w-5 h-5 text-ink-tertiary shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-body-sm font-semibold text-ink-primary">Beta testing tools</p>
            <p className="text-caption text-ink-secondary leading-relaxed">
              Reset local data on <strong>this device only</strong> for your signed-in account. Does not sign you out.
              Use when you need a clean slate for QA.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => {
                  track(ANALYTICS_EVENTS.reset_progress_clicked, { scope: 'onboarding_only' })
                  setOnboardingOpen(true)
                }}
              >
                Reset onboarding only
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 border-amber-200 text-amber-950 hover:bg-amber-50"
                onClick={() => {
                  track(ANALYTICS_EVENTS.reset_progress_clicked, { scope: 'all_local_learning' })
                  setFullOpen(true)
                }}
              >
                Reset all local learning data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={onboardingOpen}
        title="Reset onboarding?"
        description={
          <>
            <p>
              Your onboarding answers and completion flag will be cleared. Lesson progress, XP, and exam drafts stay on
              this device unless you use the full reset.
            </p>
            <p className="text-ink-tertiary">You&apos;ll continue with the same account and plan.</p>
          </>
        }
        confirmLabel="Reset onboarding"
        onCancel={() => setOnboardingOpen(false)}
        onConfirm={confirmOnboardingReset}
      />

      <ConfirmDialog
        open={fullOpen}
        title="Reset all local learning data?"
        destructive
        description={
          <>
            <p>
              This removes lessons progress, XP, review data, missions, exam attempts, drafts, and your learner profile
              document on <strong>this browser</strong> for <strong>this account</strong>.
            </p>
            <p className="font-medium text-ink-primary">You will be signed out and asked to log in again.</p>
            <p className="text-ink-tertiary">
              A fresh profile will be created from your invite. You&apos;ll go through onboarding again.
            </p>
          </>
        }
        confirmLabel="Erase and start fresh"
        onCancel={() => setFullOpen(false)}
        onConfirm={confirmFullReset}
      />
    </>
  )
}
