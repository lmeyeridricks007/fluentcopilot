'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { FeatureCheckList } from './FeatureCheckList'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { clsx } from 'clsx'

export function PricingPlanCard({
  planId,
  tagline,
  badge,
  title,
  subtitle,
  description,
  features,
  footerNote,
  children,
  mostPopular,
  plannedPriceLabel,
  plannedPriceAmount,
  plannedPriceCadence,
  plannedPriceNote,
  whoFor,
  limitsHint,
}: {
  planId: 'free' | 'core' | 'premium'
  /** Short label e.g. "Try the system" */
  tagline?: string
  badge: string
  title: string
  subtitle?: string
  description: string
  features: string[]
  footerNote?: string
  children?: ReactNode
  /** Core tier: visual emphasis (scale, border, badge). */
  mostPopular?: boolean
  plannedPriceLabel?: string
  plannedPriceAmount?: string
  plannedPriceCadence?: string
  plannedPriceNote?: string
  whoFor?: string
  /** Optional line under title for Free tier caps */
  limitsHint?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const tracked = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || tracked.current) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !tracked.current) {
          tracked.current = true
          track(ANALYTICS_EVENTS.plan_card_viewed, { plan: planId, surface: 'pricing' })
        }
      },
      { threshold: 0.25 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [planId])

  return (
    <div
      ref={ref}
      className={clsx('h-full transition-transform duration-200 ease-out', mostPopular && 'lg:scale-[1.03] z-[1]')}
    >
      <Card
        variant="outlined"
        padding="lg"
        className={clsx(
          'flex flex-col h-full bg-surface-elevated transition-shadow duration-200 rounded-card',
          mostPopular
            ? 'border-2 border-primary-500 shadow-lg ring-4 ring-primary-100/80 relative pt-7 !overflow-visible'
            : 'border border-slate-200 shadow-card hover:shadow-md',
        )}
      >
        {mostPopular && (
          <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600 px-3 py-1 text-caption font-bold text-white whitespace-nowrap shadow-md">
            Most popular
          </span>
        )}
        {tagline && (
          <p className="text-caption font-bold uppercase tracking-wide text-primary-800 mb-1">{tagline}</p>
        )}
        <p
          className={clsx(
            'text-caption font-semibold uppercase tracking-wide',
            mostPopular ? 'text-primary-800' : 'text-ink-secondary',
          )}
        >
          {badge}
        </p>
        <h2 className="mt-1 text-title font-bold text-ink-primary">{title}</h2>
        {subtitle && <p className="mt-1 text-body-sm font-semibold text-primary-900">{subtitle}</p>}
        {(plannedPriceAmount || plannedPriceLabel) && (
          <div
            className={clsx(
              'mt-4 rounded-xl border px-4 py-3',
              mostPopular ? 'border-primary-200 bg-primary-50' : 'border-slate-200 bg-surface-muted',
            )}
          >
            {plannedPriceLabel && <p className="text-caption font-bold text-ink-primary">{plannedPriceLabel}</p>}
            {plannedPriceAmount && (
              <p className="mt-1 flex flex-wrap items-baseline gap-1.5">
                <span className="text-display font-bold text-ink-primary tracking-tight">{plannedPriceAmount}</span>
                {plannedPriceCadence && (
                  <span className="text-body-sm font-semibold text-ink-secondary">{plannedPriceCadence}</span>
                )}
              </p>
            )}
            {plannedPriceNote && (
              <p className="mt-2 text-caption text-ink-secondary leading-relaxed">{plannedPriceNote}</p>
            )}
          </div>
        )}
        {limitsHint && (
          <p className="mt-3 text-body-sm font-semibold text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {limitsHint}
          </p>
        )}
        {whoFor && (
          <p className="mt-3 text-body-sm">
            <span className="font-bold text-ink-primary">For:</span>{' '}
            <span className="text-ink-secondary">{whoFor}</span>
          </p>
        )}
        <p className="mt-3 text-body-sm text-ink-secondary leading-relaxed">{description}</p>
        <FeatureCheckList items={features.slice(0, 5)} className="mt-5" />
        {footerNote && <p className="mt-4 text-caption text-ink-secondary leading-relaxed">{footerNote}</p>}
        {children != null && (
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">{children}</div>
        )}
      </Card>
    </div>
  )
}
