'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Shield, Mic, MapPin, Mail, HelpCircle, SlidersHorizontal, Sun, Volume2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useAuthStore } from '@/store/authStore'
import { SignOutButton } from '@/features/auth/components/SignOutButton'
import { useEntitlement } from '@/features/entitlements'
import { useProductEntitlements } from '@/features/entitlements/useProductEntitlements'
import { useLearnerProfileStore } from '@/lib/profile/profileStore'
import { selectAccountIdentity } from '@/lib/account'
import { AccountSummaryCard } from '@/features/account/AccountSummaryCard'
import { BetaInfoCard } from '@/features/account/BetaInfoCard'
import { PlanActionsCard } from '@/features/account/PlanActionsCard'
import { ResetLocalDataAction } from '@/features/account/ResetLocalDataAction'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { DEVICE_PREFS_CHANGED, loadDevicePrefs, saveDevicePrefs } from '@/lib/device/devicePrefs'

export function SettingsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { tier } = useEntitlement()
  const { planLabel, isPremiumPlan } = useProductEntitlements()
  const profileDoc = useLearnerProfileStore((s) => s.document)
  const identity = selectAccountIdentity(user, profileDoc)

  const [subtleSoundsEnabled, setSubtleSoundsEnabled] = useState(false)
  const [motionCalm, setMotionCalm] = useState(false)

  useEffect(() => {
    track(ANALYTICS_EVENTS.account_settings_viewed, {})
  }, [])

  useEffect(() => {
    const p = loadDevicePrefs()
    setSubtleSoundsEnabled(p.subtleSoundsEnabled)
    setMotionCalm(p.motionCalm === true)
    const onPrefs = () => {
      const next = loadDevicePrefs()
      setSubtleSoundsEnabled(next.subtleSoundsEnabled)
      setMotionCalm(next.motionCalm === true)
    }
    window.addEventListener(DEVICE_PREFS_CHANGED, onPrefs)
    return () => window.removeEventListener(DEVICE_PREFS_CHANGED, onPrefs)
  }, [])

  const trialNote = tier === 'trial' ? 'Demo trial flag is active in this session only.' : null

  return (
    <div className="px-4 py-6 space-y-6 pb-28">
      <div>
        <h1 className="text-title font-bold text-ink-primary">Account</h1>
        <p className="text-body-sm text-ink-secondary mt-1">Your profile, plan, and app preferences.</p>
      </div>

      <AccountSummaryCard
        identity={identity}
        planLabel={planLabel}
        isPremiumPlan={isPremiumPlan}
        onEditProfile={() => router.push('/app/settings/profile')}
      />

      <BetaInfoCard />

      <section aria-label="Plan">
        <h2 className="sr-only">Plan</h2>
        <PlanActionsCard planLabel={planLabel} isPremiumPlan={isPremiumPlan} trialNote={trialNote} />
      </section>

      <section aria-label="Preferences">
        <h2 className="text-body-sm font-semibold text-ink-secondary mb-2">Preferences</h2>
        <Card variant="outlined" padding="none" className="border-slate-200/90">
          <button
            type="button"
            onClick={() => router.push('/app/settings/notifications')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded-t-card"
          >
            <Bell className="w-5 h-5 text-ink-tertiary" aria-hidden />
            <span className="flex-1 font-medium text-ink-primary">Notifications</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/app/settings/section/email-preferences')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-slate-200 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <Mail className="w-5 h-5 text-ink-tertiary" aria-hidden />
            <span className="flex-1 font-medium text-ink-primary">Email preferences</span>
          </button>
          <label className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-slate-200 hover:bg-surface-muted cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-primary-500 rounded-none">
            <Volume2 className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
            <span className="flex-1 min-w-0">
              <span className="font-medium text-ink-primary block">Subtle sounds</span>
              <span className="text-body-sm text-ink-secondary block mt-0.5">
                Taps, navigation, practice send, and light reward cues (off by default)
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 shrink-0"
              checked={subtleSoundsEnabled}
              onChange={(e) => {
                const next = saveDevicePrefs({ subtleSoundsEnabled: e.target.checked })
                setSubtleSoundsEnabled(next.subtleSoundsEnabled)
              }}
              aria-label="Enable subtle sounds"
            />
          </label>
          <label className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-slate-200 hover:bg-surface-muted cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-primary-500 rounded-none">
            <SlidersHorizontal className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
            <span className="flex-1 min-w-0">
              <span className="font-medium text-ink-primary block">Calmer motion</span>
              <span className="text-body-sm text-ink-secondary block mt-0.5">
                Shorter transitions and less movement (in addition to system reduced motion)
              </span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary-600 shrink-0"
              checked={motionCalm}
              onChange={(e) => {
                const next = saveDevicePrefs({ motionCalm: e.target.checked })
                setMotionCalm(next.motionCalm === true)
              }}
              aria-label="Prefer calmer motion"
            />
          </label>
          <button
            type="button"
            onClick={() => router.push('/app/daily-lessons/settings')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-slate-200 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded-b-card"
          >
            <Sun className="w-5 h-5 text-ink-tertiary" aria-hidden />
            <span className="flex-1 font-medium text-ink-primary">Daily Life Lessons</span>
            <span className="text-body-sm text-ink-secondary hidden sm:inline">Turn your day into Dutch practice</span>
          </button>
        </Card>
      </section>

      <section aria-label="Permissions">
        <h2 className="text-body-sm font-semibold text-ink-secondary mb-2">Permissions</h2>
        <Card variant="outlined" padding="none" className="border-slate-200/90">
          <button
            type="button"
            onClick={() => router.push('/app/settings/section/microphone')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded-t-card"
          >
            <Mic className="w-5 h-5 text-ink-tertiary" aria-hidden />
            <span className="flex-1 font-medium text-ink-primary">Microphone</span>
            <span className="text-body-sm text-ink-secondary">For voice practice</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/app/context-prompts/settings')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-slate-200 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded-b-card"
          >
            <MapPin className="w-5 h-5 text-ink-tertiary" aria-hidden />
            <span className="flex-1 font-medium text-ink-primary">Location &amp; Smart Prompts</span>
            <span className="text-body-sm text-ink-secondary hidden sm:inline">Phrase prompts near you</span>
          </button>
        </Card>
      </section>

      <section aria-label="Privacy and data">
        <h2 className="text-body-sm font-semibold text-ink-secondary mb-2">Privacy &amp; data</h2>
        <Card variant="outlined" padding="none" className="border-slate-200/90">
          <button
            type="button"
            onClick={() => router.push('/app/settings/section/privacy')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded-t-card"
          >
            <Shield className="w-5 h-5 text-ink-tertiary" aria-hidden />
            <span className="flex-1 font-medium text-ink-primary">Privacy policy</span>
          </button>
          <button
            type="button"
            onClick={() => router.push('/app/settings/section/export-data')}
            className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-slate-200 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded-b-card"
          >
            <span className="flex-1 font-medium text-ink-primary text-left">Export my data</span>
          </button>
        </Card>
        <p className="text-caption text-ink-tertiary mt-2 px-0.5 leading-relaxed">
          Account deletion and billing are not available during closed beta. Contact the team if you need your invite
          revoked.
        </p>
      </section>

      <section aria-label="Help">
        <button
          type="button"
          onClick={() => router.push('/app/settings/section/help')}
          className="w-full flex items-center gap-3 px-4 py-3 text-left rounded-card border border-slate-200 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
        >
          <HelpCircle className="w-5 h-5 text-ink-tertiary" aria-hidden />
          <span className="flex-1 font-medium text-ink-primary">Help &amp; support</span>
        </button>
      </section>

      <ResetLocalDataAction />

      <section aria-label="Sign out" className="pt-2">
        <SignOutButton variant="secondary" analyticsSurface="account_settings" className="border-slate-200" />
      </section>
    </div>
  )
}
