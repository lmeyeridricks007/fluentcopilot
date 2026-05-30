'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MarketingPageTracker } from '../components/MarketingPageTracker'
import { JoinWaitlistAnchor } from '../components/JoinWaitlistAnchor'
import { SignupComingSoonControl } from '../components/SignupComingSoonControl'
import { InviteOnlyCallout } from '../components/InviteOnlyCallout'
import { ANALYTICS_EVENTS } from '@/lib/analytics'

export function ComingSoonSignUpPage() {
  return (
    <>
      <MarketingPageTracker event={ANALYTICS_EVENTS.public_page_viewed} page="signup_coming_soon" />

      <div className="mx-auto max-w-lg px-4 py-10 sm:py-16">
        <div className="mb-6">
          <InviteOnlyCallout />
        </div>

        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 mb-6">
            <Sparkles className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-title font-bold text-ink-primary">Sign-up coming soon</h1>
          <p className="mt-3 text-body text-ink-secondary">
            Public registration isn&apos;t available during our <strong className="text-ink-primary">closed beta</strong>.
            We&apos;re onboarding in waves so exam prep and feedback stay sharp — invite-only is deliberate.
          </p>
        </div>

        <SignupComingSoonControl surface="signup_page" />

        <Card variant="outlined" padding="md" className="mt-8 text-left border-primary-100 bg-primary-50/30">
          <h2 className="font-semibold text-ink-primary text-body">What you can do instead</h2>
          <ul className="mt-4 space-y-4 text-body-sm text-ink-secondary">
            <li className="flex flex-col gap-2">
              <span className="font-medium text-ink-primary">Request early access</span>
              <JoinWaitlistAnchor
                surface="signup_page"
                className="inline-flex w-full sm:w-auto min-h-touch items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-body-sm font-semibold text-white hover:bg-primary-700 shadow-card"
              >
                Request early access
              </JoinWaitlistAnchor>
            </li>
            <li>
              <Link href="/login" className="font-medium text-primary-700 hover:underline">
                Sign in
              </Link>{' '}
              if you already have an invite
            </li>
            <li>
              <Link href="/beta" className="font-medium text-primary-700 hover:underline">
                Read how closed beta works
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="font-medium text-primary-700 hover:underline">
                See pricing &amp; plans
              </Link>
            </li>
          </ul>
        </Card>

        <p className="mt-10 text-body-sm text-ink-tertiary text-center">
          <Link href="/" className="text-primary-700 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </>
  )
}
