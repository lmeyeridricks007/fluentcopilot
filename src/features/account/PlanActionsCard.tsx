'use client'

import { Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { UsageIndicator } from '@/features/entitlements'
import { PRICING_HREF, IN_APP_PREMIUM_HREF } from '@/lib/entitlements'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'

export type PlanActionsCardProps = {
  planLabel: string
  isPremiumPlan: boolean
  trialNote?: string | null
}

export function PlanActionsCard({ planLabel, isPremiumPlan, trialNote }: PlanActionsCardProps) {
  const router = useRouter()

  const goPremium = () => {
    track(ANALYTICS_EVENTS.pricing_from_account_clicked, { surface: 'account_plan_card', target: 'in_app_premium' })
    router.push(IN_APP_PREMIUM_HREF)
  }

  const goPublicPricing = () => {
    track(ANALYTICS_EVENTS.pricing_from_account_clicked, { surface: 'account_plan_card', target: 'public_pricing' })
    router.push(PRICING_HREF)
  }

  return (
    <Card variant="outlined" padding="md" className="space-y-3 border-slate-200/90">
      <div className="flex items-start gap-3">
        <Crown className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-ink-primary">Your plan</p>
          <p className="text-body-sm text-ink-secondary mt-1 leading-relaxed">
            <span className="font-medium text-ink-primary">{planLabel}</span>
            {isPremiumPlan
              ? ' — full exam prep, voice, tracks, and premium practice surfaces.'
              : ' — lessons and core practice stay open; Premium adds deeper exam prep and more.'}
          </p>
          {!isPremiumPlan ? (
            <p className="text-caption text-ink-tertiary mt-2">
              <UsageIndicator variant="both" />
            </p>
          ) : null}
          {trialNote ? <p className="text-caption text-ink-tertiary mt-2">{trialNote}</p> : null}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {!isPremiumPlan ? (
          <Button variant="primary" size="sm" className="flex-1" type="button" onClick={goPremium}>
            What Premium includes
          </Button>
        ) : null}
        <Button
          variant={isPremiumPlan ? 'primary' : 'secondary'}
          size="sm"
          className="flex-1"
          type="button"
          onClick={goPublicPricing}
        >
          Compare plans
        </Button>
      </div>
    </Card>
  )
}
