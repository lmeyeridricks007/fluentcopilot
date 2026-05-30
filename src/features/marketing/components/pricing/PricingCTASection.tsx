'use client'

import Link from 'next/link'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { BetaRequestForm } from '../BetaRequestForm'

const btnSecondary =
  'inline-flex w-full sm:w-auto min-h-touch items-center justify-center rounded-lg px-6 py-3 text-body font-semibold border border-slate-300 bg-surface-elevated text-ink-primary hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500'

/**
 * Conversion block: in-browser beta request first, supporting links second.
 */
export function PricingCTASection() {
  return (
    <section className="rounded-card border border-slate-200 bg-surface-elevated px-5 py-10 sm:px-10 sm:py-12 shadow-md">
      <h2 className="text-title font-bold text-ink-primary text-center sm:text-left">Request early access</h2>
      <p className="mt-2 text-body-sm text-ink-secondary text-center sm:text-left max-w-2xl leading-relaxed">
        Leave your email — we&apos;ll notify you when new beta seats open. Billing and self-serve checkout land when
        public sign-up goes live.
      </p>
      <div className="mt-8 grid gap-10 lg:grid-cols-5 lg:gap-12 items-start">
        <div className="lg:col-span-3">
          <BetaRequestForm sourceSurface="pricing_cta_section" variant="compact" showFirstName />
        </div>
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Link
            href="/beta"
            onClick={() =>
              track(ANALYTICS_EVENTS.pricing_cta_clicked, { surface: 'pricing_cta_section', cta: 'beta_info' })
            }
            className={btnSecondary}
          >
            How beta access works
          </Link>
          <Link
            href="/login"
            onClick={() => track(ANALYTICS_EVENTS.sign_in_clicked, { surface: 'pricing_page' })}
            className="text-center sm:text-left text-body-sm font-semibold text-primary-900 hover:text-primary-950 py-2"
          >
            Already invited? Sign in
          </Link>
        </div>
      </div>
    </section>
  )
}
