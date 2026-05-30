'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CheckCircle2, LogIn, Sparkles, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MarketingPageTracker } from '../components/MarketingPageTracker'
import { BetaNoticeBanner, SignupComingSoonPanel } from '../components/pricing'
import { BetaRequestForm } from '../components/BetaRequestForm'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { BETA_REQUEST_SECTION_ID } from '../marketingConstants'

export function MarketingBetaPage() {
  const pathname = usePathname() ?? ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash === `#${BETA_REQUEST_SECTION_ID}`) {
      requestAnimationFrame(() => {
        document.getElementById(BETA_REQUEST_SECTION_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [])

  return (
    <>
      <MarketingPageTracker
        event={ANALYTICS_EVENTS.beta_page_viewed}
        route={pathname || '/beta'}
        source_surface="beta_marketing_page"
      />

      <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
        <BetaNoticeBanner />
      </div>

      <section className="mx-auto max-w-3xl px-4 pt-10 pb-8 text-center sm:text-left">
        <p className="text-caption font-semibold uppercase tracking-wide text-primary-800">Early access</p>
        <h1 className="mt-2 text-display sm:text-3xl font-bold text-ink-primary">
          FluentCopilot beta — small waves, on purpose
        </h1>
        <p className="mt-4 text-body-lg text-ink-secondary max-w-2xl mx-auto sm:mx-0 leading-relaxed">
          We are opening FluentCopilot in <strong className="text-ink-primary">controlled invite waves</strong> so we can
          keep feedback quality high while we harden speaking flows, exam simulations, and personalization. Public
          self-serve sign-up is not open yet — that is a product choice, not a shortage of enthusiasm.
        </p>
        <p className="mt-4 text-body text-ink-secondary max-w-2xl mx-auto sm:mx-0 leading-relaxed">
          Request access with your email only. We follow up from the same system — you do not need to compose a manual
          email in your mail client.
        </p>
      </section>

      <div className="mx-auto max-w-3xl px-4 space-y-6 pb-6">
        <SignupComingSoonPanel surface="beta_page" />
      </div>

      <div className="mx-auto max-w-3xl px-4 space-y-6 pb-8">
        <Card variant="elevated" padding="lg" className="border border-slate-200 shadow-card">
          <div className="flex gap-3 mb-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-900">
              <Users className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-bold text-title text-ink-primary">Who we are prioritising right now</h2>
              <p className="mt-1 text-body-sm text-ink-secondary leading-relaxed">
                Learners living in the Netherlands who need practical Dutch for work, care, and daily life — often with
                A2 or inburgering timelines. We also welcome thoughtful feedback from experienced Dutch learners who will
                stress-test scenarios and exam flows.
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" padding="lg" className="border border-slate-200 shadow-card">
          <div className="flex gap-3 mb-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-900">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-bold text-title text-ink-primary">Where the product is strongest today</h2>
              <p className="mt-1 text-body-sm text-ink-secondary leading-relaxed">
                Scenario-based messaging and speaking, feedback that names next steps, writing revision patterns, and
                exam-oriented modules are the focus of current waves. Read-aloud depth, reminders, and follow-up content
                continue to expand as we onboard more learners.
              </p>
            </div>
          </div>
        </Card>

        <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
          <h3 className="font-semibold text-ink-primary">How invites work</h3>
          <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary list-disc pl-5 leading-relaxed">
            <li>You submit your email (optional first name helps us personalise).</li>
            <li>We review requests and send invitations in batches — not everyone receives one immediately.</li>
            <li>Your tier at first login follows your invite; self-serve checkout arrives with public launch.</li>
          </ul>
          <p className="mt-4 text-body-sm text-ink-secondary">
            We aim to acknowledge serious requests within a few business days when volume allows; invite timing depends on
            wave capacity, not on how long your message is.
          </p>
        </Card>
      </div>

      <div className="mx-auto max-w-3xl px-4 space-y-6 pb-16">
        <Card variant="elevated" padding="lg" className="border border-primary-200/90 shadow-card scroll-mt-28">
          <div className="flex gap-3 mb-6">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-bold text-title text-ink-primary">Request early access</h2>
              <p className="mt-1 text-body-sm text-ink-secondary">
                Enter your email — we will reach out when a seat opens in your wave.
              </p>
            </div>
          </div>
          <BetaRequestForm sourceSurface="beta_page" id={BETA_REQUEST_SECTION_ID} />
        </Card>

        <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
          <div className="flex gap-3">
            <LogIn className="h-6 w-6 text-primary-700 shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-ink-primary">Already invited</h2>
              <p className="mt-1 text-body-sm text-ink-secondary leading-relaxed">
                Use the email and password from your invite. You will complete a short onboarding, then enter the full app.
              </p>
              <Link
                href="/login"
                onClick={() => track(ANALYTICS_EVENTS.sign_in_clicked, { surface: 'beta_page' })}
                className="mt-4 inline-flex min-h-touch items-center justify-center rounded-lg border border-slate-300 bg-surface-muted px-5 py-2.5 text-body-sm font-semibold text-ink-primary hover:bg-slate-200 w-full sm:w-auto"
              >
                Sign in
              </Link>
            </div>
          </div>
        </Card>

        <Card variant="outlined" padding="md" className="bg-primary-50/70 border border-primary-200">
          <h3 className="font-semibold text-ink-primary">After you sign up</h3>
          <ul className="mt-3 space-y-2 text-body-sm text-ink-secondary list-disc pl-5 leading-relaxed">
            <li>You stay in a clear state: requested, invited, or signed in — no fake “create account” dead ends.</li>
            <li>When invited, you onboard once and your learning data stays in the app after login.</li>
            <li>Billing and plan changes follow public launch; beta access remains invite-based until then.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-4 text-body-sm font-medium">
            <Link href="/pricing" className="text-primary-900 hover:text-primary-950">
              View pricing →
            </Link>
            <Link href="/features" className="text-primary-900 hover:text-primary-950">
              Explore features →
            </Link>
            <Link href="/exam-prep" className="text-primary-900 hover:text-primary-950">
              Exam prep →
            </Link>
            <Link href="/contact" className="text-primary-900 hover:text-primary-950">
              Contact support →
            </Link>
          </div>
        </Card>
      </div>
    </>
  )
}
