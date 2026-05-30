/**
 * Modal shown when user hits free-tier cap (lessons or scenarios).
 * Primary: Upgrade. Secondary: Come back later / dismiss.
 */

'use client'

import { useEffect, useRef } from 'react'
import { Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { PRICING_HREF } from '@/lib/entitlements'

export type PaywallReason = 'lesson_cap' | 'scenario_cap' | 'premium_feature'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
  reason: PaywallReason
  usage?: { used: number; limit: number }
}

export function PaywallModal({ open, onClose, reason, usage }: PaywallModalProps) {
  const router = useRouter()
  const shownForReason = useRef<PaywallReason | null>(null)

  useEffect(() => {
    if (!open) {
      shownForReason.current = null
      return
    }
    if (shownForReason.current === reason) return
    shownForReason.current = reason
    track(ANALYTICS_EVENTS.premium_block_shown, {
      paywall_reason: reason,
      usage_used: usage?.used,
      usage_limit: usage?.limit,
    })
    if (reason === 'premium_feature') {
      track(ANALYTICS_EVENTS.premium_feature_exposed, { surface: 'paywall_modal', paywall_reason: reason })
    }
  }, [open, reason, usage?.limit, usage?.used])

  if (!open) return null

  const isLesson = reason === 'lesson_cap'
  const isFeature = reason === 'premium_feature'
  const title = isLesson
    ? 'Daily lesson limit reached'
    : isFeature
      ? 'Unlock natural phrasing'
      : 'Scenario limit reached'
  const message = isLesson
    ? "You've used all your free lessons for today. Upgrade to Premium for unlimited access, or come back tomorrow."
    : isFeature
      ? '“Say it naturally” and deeper polish live on Premium — upgrade anytime, or keep practicing with free hints and phrases.'
      : "You've used all your free scenarios this week. Upgrade for unlimited practice with AI."

  const handleUpgrade = () => {
    track(ANALYTICS_EVENTS.premium_upgrade_clicked, { paywall_reason: reason })
    onClose()
    router.push('/app/premium')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <Card variant="elevated" padding="md" className="max-w-sm w-full">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
          <Crown className="w-6 h-6 text-primary-600" aria-hidden />
        </div>
        <CardTitle id="paywall-title" className="text-center">
          {title}
        </CardTitle>
        <CardDescription className="mt-2 text-center">
          {message}
        </CardDescription>
        {usage && (
          <p className="text-caption text-ink-secondary text-center mt-2">
            {usage.used} of {usage.limit} used
          </p>
        )}
        <div className="flex flex-col gap-2 mt-6">
          <Button variant="primary" fullWidth onClick={handleUpgrade}>
            Premium in the app
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              track(ANALYTICS_EVENTS.pricing_opened_from_lock, {
                paywall_reason: reason,
                destination: PRICING_HREF,
              })
              onClose()
              router.push(PRICING_HREF)
            }}
          >
            View public pricing
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            Come back later
          </Button>
        </div>
      </Card>
    </div>
  )
}
