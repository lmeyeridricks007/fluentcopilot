'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/features/account/ConfirmDialog'
import {
  devToolsClearAllLearningDataForCurrentUser,
  devToolsClearDraftsOnly,
  devToolsClearProfileDocumentOnly,
  devToolsClearProgressStackOnly,
  devToolsResetOnboardingOnly,
  devToolsWipeAllLtV1KeysOnDevice,
} from '@/lib/dev-tools'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/lib/routing/authRedirects'

export function DevResetActions() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const label = user ? `${user.name} (${user.email})` : 'this session'

  const [confirm, setConfirm] = useState<
    null | 'profile' | 'progress' | 'drafts' | 'full' | 'onboarding' | 'ltv1'
  >(null)

  const close = () => setConfirm(null)

  const afterMaybeOnboarding = () => {
    router.replace(ROUTES.onboarding)
    router.refresh()
  }

  return (
    <>
      <Card variant="outlined" padding="md" className="space-y-3 border-red-200/60 bg-red-50/10">
        <h2 className="text-body-sm font-bold text-error uppercase tracking-wide">Destructive / reset</h2>
        <p className="text-caption text-ink-secondary leading-relaxed">
          Scoped to <strong>{label}</strong> on this browser unless noted. All paths use real wipe helpers +{' '}
          <code className="text-xs">runAccountBootstrap</code> where appropriate.
        </p>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm('drafts')}>
            Clear drafts &amp; autosave only
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm('profile')}>
            Clear profile document only
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm('progress')}>
            Clear progress stack only (retention, review, manifest…)
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm('full')}>
            Full wipe — simulate first login (profile + progress + drafts…)
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setConfirm('onboarding')}>
            Reset onboarding only (keep XP / lessons)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="border-error/40 text-error"
            onClick={() => setConfirm('ltv1')}
          >
            Wipe all lt.v1 keys (every user on this device)
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={confirm === 'drafts'}
        title="Clear drafts?"
        description="Removes the drafts/autosave document for the signed-in user only. Profile and progress stay."
        confirmLabel="Clear drafts"
        onCancel={close}
        onConfirm={() => {
          devToolsClearDraftsOnly()
          close()
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={confirm === 'profile'}
        title="Clear profile document?"
        description="Removes the learner profile JSON and recreates it from the current session via bootstrap. Progress and drafts are not removed."
        confirmLabel="Clear profile"
        onCancel={close}
        onConfirm={() => {
          devToolsClearProfileDocumentOnly()
          close()
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={confirm === 'progress'}
        title="Clear progress stack?"
        description="Removes progress manifest, retention row, review banks, missions, and practice client keys. Learner profile and drafts stay. Bootstrap re-runs."
        confirmLabel="Clear progress"
        onCancel={close}
        onConfirm={() => {
          devToolsClearProgressStackOnly()
          close()
          router.refresh()
        }}
      />

      <ConfirmDialog
        open={confirm === 'full'}
        title="Clear all learning data for this user?"
        description={
          <>
            <p>
              Same as first-login cold start: profile, progress, retention, review, drafts, and related keys for{' '}
              <strong>{label}</strong> only.
            </p>
            <p className="mt-2">You stay signed in; a fresh profile is created from your invite.</p>
          </>
        }
        confirmLabel="Clear everything"
        destructive
        onCancel={close}
        onConfirm={() => {
          devToolsClearAllLearningDataForCurrentUser()
          close()
          afterMaybeOnboarding()
        }}
      />

      <ConfirmDialog
        open={confirm === 'onboarding'}
        title="Reset onboarding only?"
        description="Clears onboarding answers and completion on the profile. Lesson progress and XP remain."
        confirmLabel="Reset onboarding"
        onCancel={close}
        onConfirm={() => {
          devToolsResetOnboardingOnly()
          close()
          afterMaybeOnboarding()
        }}
      />

      <ConfirmDialog
        open={confirm === 'ltv1'}
        title="Wipe every lt.v1 key?"
        description={
          <>
            <p>
              Deletes <strong>all</strong> localStorage keys starting with <code>lt.v1</code> — every beta
              user&apos;s profile/progress/drafts on this browser.
            </p>
            <p className="mt-2 font-medium text-ink-primary">Does not remove auth-storage.</p>
            <p className="mt-2">Current user is re-bootstrapped afterward.</p>
          </>
        }
        confirmLabel="Wipe all lt.v1"
        destructive
        onCancel={close}
        onConfirm={() => {
          devToolsWipeAllLtV1KeysOnDevice()
          close()
          afterMaybeOnboarding()
        }}
      />
    </>
  )
}
