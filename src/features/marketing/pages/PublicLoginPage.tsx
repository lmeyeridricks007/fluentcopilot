'use client'

import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { Card } from '@/components/ui/Card'
import { MarketingPageTracker } from '../components/MarketingPageTracker'
import { InviteOnlyCallout } from '../components/InviteOnlyCallout'
import { BetaRequestForm } from '../components/BetaRequestForm'
import { SignupComingSoonControl } from '../components/SignupComingSoonControl'
import { ANALYTICS_EVENTS } from '@/lib/analytics'

export function PublicLoginPage() {
  return (
    <>
      <MarketingPageTracker event={ANALYTICS_EVENTS.login_page_viewed} page="login" />

      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
        <div className="mb-6">
          <InviteOnlyCallout />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-title font-bold text-ink-primary">Sign in to FluentCopilot</h1>
          <p className="mt-2 text-body text-ink-secondary leading-relaxed">
            <span className="font-semibold text-ink-primary">Invited learners:</span> use the email and password from your
            invite. <span className="font-semibold text-ink-primary">Everyone else:</span> request access below — we&apos;ll
            email you when a seat opens.
          </p>
        </div>

        <LoginForm
          showSocialRow={false}
          signUpSlot={
            <div className="space-y-6">
              <Card variant="elevated" padding="md" className="border border-primary-200 bg-surface-elevated shadow-card">
                <p className="text-body-sm font-bold text-ink-primary">Request early access</p>
                <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
                  Not on the invite list yet? Enter your email — we&apos;ll notify you when we extend the beta. Nothing
                  to compose in your mail client.
                </p>
                <div className="mt-4">
                  <BetaRequestForm sourceSurface="login_page" variant="compact" showFirstName />
                </div>
                <p className="mt-4 text-body-sm text-ink-secondary">
                  Want the full story first?{' '}
                  <Link href="/beta" className="font-semibold text-primary-900 hover:text-primary-950">
                    How the beta works
                  </Link>
                  .
                </p>
              </Card>

              <SignupComingSoonControl surface="login_page" />

              <p className="text-body-sm text-ink-secondary text-center">
                <Link href="/pricing" className="font-semibold text-primary-900 hover:text-primary-950">
                  Pricing &amp; plans
                </Link>
                {' · '}
                <Link href="/contact" className="font-semibold text-primary-900 hover:text-primary-950">
                  Contact support
                </Link>
                {' · '}
                <Link href="/" className="font-semibold text-primary-900 hover:text-primary-950">
                  Home
                </Link>
              </p>
            </div>
          }
        />
      </div>
    </>
  )
}
