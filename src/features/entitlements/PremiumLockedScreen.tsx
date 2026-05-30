'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Crown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle, CardDescription } from '@/components/ui/Card'
import type { FeatureKey } from '@/lib/entitlements'
import { getLockedFeatureCopy } from '@/lib/entitlements'
import { useEffect, useRef } from 'react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { trackPremiumFeatureLockedForBasicUser } from '@/lib/analytics/planAnalytics'

type Props = {
  featureKey: FeatureKey
  /** e.g. back to exam prep home */
  backHref: string
  backLabel: string
  surface: string
}

export function PremiumLockedScreen({ featureKey, backHref, backLabel, surface }: Props) {
  const router = useRouter()
  const copy = getLockedFeatureCopy(featureKey)
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    trackPremiumFeatureLockedForBasicUser({ feature_key: featureKey, surface })
  }, [featureKey, surface])

  return (
    <div className="px-4 py-8 pb-28 max-w-lg mx-auto space-y-6">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-600 hover:underline min-h-touch py-1"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
        {backLabel}
      </button>

      <Card variant="elevated" padding="md" className="border-primary-200/80 bg-primary-50/30">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-3">
          <Crown className="w-6 h-6 text-primary-600" aria-hidden />
        </div>
        <span className="text-caption font-semibold text-primary-800 uppercase tracking-wide">Premium</span>
        <CardTitle className="mt-1">{copy.title}</CardTitle>
        <CardDescription className="mt-2 leading-relaxed">{copy.body}</CardDescription>
        <div className="flex flex-col gap-2 mt-6">
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              track(ANALYTICS_EVENTS.premium_feature_cta_clicked, {
                feature_key: featureKey,
                surface,
                destination: copy.primaryHref,
              })
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
        </div>
      </Card>
    </div>
  )
}
