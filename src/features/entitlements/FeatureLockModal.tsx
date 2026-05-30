'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Crown } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { FeatureKey } from '@/lib/entitlements'
import { getLockedFeatureCopy } from '@/lib/entitlements'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { getSignedInPlanContext } from '@/lib/analytics/planAnalytics'

type Props = {
  open: boolean
  onClose: () => void
  featureKey: FeatureKey
  surface: string
}

export function FeatureLockModal({ open, onClose, featureKey, surface }: Props) {
  const router = useRouter()
  const copy = getLockedFeatureCopy(featureKey)
  const shown = useRef(false)

  useEffect(() => {
    if (!open) {
      shown.current = false
      return
    }
    if (shown.current) return
    shown.current = true
    const { user_plan, beta_user } = getSignedInPlanContext()
    track(ANALYTICS_EVENTS.premium_feature_viewed, {
      feature_key: featureKey,
      surface,
      locked: true,
      user_plan,
      beta_user,
    })
  }, [open, featureKey, surface])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <Card variant="elevated" padding="md" className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-card sm:m-0 max-h-[90vh] overflow-y-auto">
        <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-2">
          <Crown className="w-5 h-5 text-primary-600" aria-hidden />
        </div>
        <CardTitle id="lock-modal-title" className="text-center">
          {copy.title}
        </CardTitle>
        <CardDescription className="mt-2 text-center leading-relaxed">{copy.body}</CardDescription>
        <div className="flex flex-col gap-2 mt-5">
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              track(ANALYTICS_EVENTS.premium_feature_cta_clicked, {
                feature_key: featureKey,
                surface,
                destination: copy.primaryHref,
              })
              onClose()
              router.push(copy.primaryHref)
            }}
          >
            {copy.primaryCta}
          </Button>
          {copy.secondaryCta && copy.secondaryHref ? (
            <Link
              href={copy.secondaryHref}
              onClick={() =>
                track(ANALYTICS_EVENTS.pricing_opened_from_lock, {
                  feature_key: featureKey,
                  surface,
                  destination: copy.secondaryHref,
                })
              }
              className="inline-flex w-full min-h-touch items-center justify-center font-medium rounded-lg transition-colors bg-surface-muted text-ink-primary hover:bg-slate-200 px-4 py-2.5 text-body"
            >
              {copy.secondaryCta}
            </Link>
          ) : null}
          <Button variant="ghost" fullWidth onClick={onClose}>
            Not now
          </Button>
        </div>
      </Card>
    </div>
  )
}
