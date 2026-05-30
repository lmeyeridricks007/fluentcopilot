/**
 * Banner shown when user is in trial: "Your trial ends on {date}". Dismissible.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useEntitlement } from './EntitlementContext'

const DISMISS_KEY = 'entitlements-trial-banner-dismissed'

export function TrialBanner() {
  const { tier, trialEndsAt, manageUrl } = useEntitlement()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DISMISS_KEY) === '1'
  })

  if (tier !== 'trial' || !trialEndsAt || dismissed) return null

  const endDate = new Date(trialEndsAt)
  const formatted = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleManage = () => {
    router.push(manageUrl ?? '/app/settings')
  }

  return (
    <div
      role="banner"
      className="bg-primary-50 border-b border-primary-200 px-4 py-2 flex items-center justify-between gap-3"
    >
      <p className="text-body-sm text-ink-primary flex-1 min-w-0">
        Your trial ends on <strong>{formatted}</strong>.{' '}
        <button
          type="button"
          onClick={handleManage}
          className="font-medium text-primary-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 rounded"
        >
          Manage subscription
        </button>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="p-1 rounded hover:bg-primary-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 shrink-0"
        aria-label="Dismiss trial banner"
      >
        <X className="w-5 h-5 text-ink-secondary" aria-hidden />
      </button>
    </div>
  )
}
