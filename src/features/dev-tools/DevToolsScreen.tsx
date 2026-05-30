'use client'

import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { DevListeningModePanel } from '@/features/dev-tools/DevListeningModePanel'
import { DevSkillSystemPanel } from '@/features/dev-tools/DevSkillSystemPanel'
import { DevStorageInspector } from '@/features/dev-tools/DevStorageInspector'
import { DevUserSwitcher } from '@/features/dev-tools/DevUserSwitcher'
import { DevResetActions } from '@/features/dev-tools/DevResetActions'
import { DevScenarioSwitcher } from '@/components/dev/DevScenarioSwitcher'

export function DevToolsScreen() {
  const user = useAuthStore((s) => s.user)
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding)
  const { planLabel } = useProductEntitlements()

  return (
    <div className="px-4 py-6 space-y-6 pb-28 max-w-lg mx-auto w-full">
      <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-50/40 px-3 py-2">
        <p className="text-caption font-bold text-amber-950 uppercase tracking-wide">Internal dev tools</p>
        <p className="text-caption text-amber-900 mt-1 leading-relaxed">
          Not a user feature. For local QA only (or when <code className="text-xs">NEXT_PUBLIC_DEV_TOOLS=true</code>).
        </p>
      </div>

      <div>
        <h1 className="text-title font-bold text-ink-primary">Dev / QA</h1>
        <Link href="/app/talk" className="text-body-sm text-primary-700 font-medium hover:underline mt-1 inline-block">
          ← Back to app
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-surface-elevated p-4 space-y-1 text-body-sm">
        <p>
          <span className="text-ink-secondary">User:</span>{' '}
          <span className="font-medium text-ink-primary">{user?.name ?? '—'}</span>{' '}
          <span className="text-caption text-ink-tertiary">({user?.email})</span>
        </p>
        <p>
          <span className="text-ink-secondary">Plan:</span> <span className="font-medium">{planLabel}</span>
        </p>
        <p>
          <span className="text-ink-secondary">Onboarding:</span>{' '}
          <span className="font-medium">{hasCompletedOnboarding ? 'complete' : 'incomplete'}</span>
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-surface-elevated p-4 space-y-2">
        <h2 className="text-body-sm font-semibold text-ink-primary">Demo data scenario</h2>
        <p className="text-caption text-ink-secondary leading-relaxed">
          Switches localStorage <code className="text-xs bg-surface-muted px-1 rounded">demoScenario</code> and reloads.
          Moved out of the main header so the product chrome stays clean.
        </p>
        <DevScenarioSwitcher />
      </section>

      <DevListeningModePanel />

      <DevSkillSystemPanel />

      <DevUserSwitcher />
      <DevResetActions />
      <DevStorageInspector />
    </div>
  )
}
