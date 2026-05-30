'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { MarketingPageTracker } from '../components/MarketingPageTracker'
import { MarketingSection } from '../components/MarketingSection'
import {
  BetaNoticeBanner,
  PricingPlanCard,
  PlanComparisonTable,
  PricingCTASection,
  SignupComingSoonPanel,
  PRICING_COMPARISON_ROWS,
  FREE_PLAN_FEATURES,
  CORE_PLAN_FEATURES,
  PREMIUM_PLAN_FEATURES,
} from '../components/pricing'
import { JoinWaitlistAnchor } from '../components/JoinWaitlistAnchor'
import { ANALYTICS_EVENTS } from '@/lib/analytics'

const btnPrimary =
  'block w-full text-center min-h-touch px-4 py-3.5 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 shadow-md border border-primary-700/20 transition-colors'

const faqItems = [
  {
    q: 'Is this just another AI chatbot?',
    a: 'No. FluentCopilot is built as a Dutch coach: scenarios, messaging and speaking modes, read-aloud analysis, saved vocabulary, recaps, and optional exam prep — not a blank chat thread.',
  },
  {
    q: 'Can I use it without preparing for an exam?',
    a: 'Yes. Most learners start with everyday Dutch — work, care, admin, social life. Exam mode is there when your timeline needs structure and timed practice.',
  },
  {
    q: 'Is exam prep included?',
    a: 'Light exam exposure is part of the broader product. Full simulations and practice exams are a Premium-depth surface for many learners; exact entitlements follow your plan during beta.',
  },
  {
    q: 'What’s different between Core and Premium?',
    a: 'Core is the main tier for practical daily progress, strong feedback, and core personalization. Premium adds deeper speaking and read-aloud surfaces, richer personalization and recaps, and full exam performance tools.',
  },
  {
    q: 'Do I need Premium to benefit from speaking practice?',
    a: 'No. Core includes solid speaking coaching. Premium adds depth, higher limits for intensive periods, and the full exam-and-voice stack when you need it.',
  },
  {
    q: 'Can I start free?',
    a: 'Yes. Free is for exploring fit with meaningful but limited access. No charges during the closed beta — your invite determines current access.',
  },
] as const

export function MarketingPricingPage() {
  return (
    <>
      <MarketingPageTracker event={ANALYTICS_EVENTS.pricing_viewed} />

      <div className="mx-auto max-w-7xl px-4 sm:px-5 pt-10 pb-8 sm:pt-14">
        <BetaNoticeBanner />
      </div>

      <section className="mx-auto max-w-7xl px-4 sm:px-5 pb-10 text-center sm:text-left">
        <p className="text-caption font-bold uppercase tracking-wide text-primary-800">Pricing</p>
        <h1 className="mt-3 text-display sm:text-4xl font-bold text-ink-primary max-w-3xl mx-auto sm:mx-0 leading-tight">
          Invest in Dutch you will actually use
        </h1>
        <p className="mt-5 text-body-lg text-ink-secondary max-w-3xl mx-auto sm:mx-0 leading-relaxed">
          FluentCopilot is priced like a coaching product: Free to validate fit, Core for daily practical momentum, Premium
          when you need maximum voice, personalization, and exam performance depth.
        </p>
        <p className="mt-4 text-body text-ink-secondary max-w-3xl mx-auto sm:mx-0 leading-relaxed">
          You are paying for connected practice — messaging, speaking, read-aloud review, your own words, and structured
          exam mode — not for a generic content library or isolated streak mechanics.
        </p>
        <div className="mt-8 rounded-xl border border-slate-200 bg-surface-elevated px-5 py-5 shadow-card max-w-3xl mx-auto sm:mx-0">
          <p className="text-body-sm text-ink-primary font-bold">At public launch (subject to change)</p>
          <p className="mt-2 text-body text-ink-secondary leading-relaxed">
            Core is planned as the main paid tier in the mid-teens EUR per month range. Premium is planned at a higher
            monthly rate for full depth. <span className="font-medium text-ink-primary">No charges during the closed beta</span> — access follows your invite.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-4 text-body-sm font-semibold justify-center sm:justify-start">
          <Link href="/features" className="text-primary-900 hover:text-primary-950">
            Why these tiers exist →
          </Link>
          <Link href="/exam-prep" className="text-primary-900 hover:text-primary-950">
            Exam prep →
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-5 pb-14 grid gap-8 md:gap-6 lg:grid-cols-3 lg:gap-8 lg:items-stretch">
        <PricingPlanCard
          planId="free"
          tagline="Explore fit"
          badge="Free"
          title="Free"
          subtitle="See the system"
          description="Enough access to feel how messaging, feedback, and scenarios work together — before you commit."
          features={FREE_PLAN_FEATURES}
          limitsHint="Best when you are validating fit or testing the loop on lighter days."
          footerNote="Daily limits apply during beta."
          whoFor="New learners who want to experience the coach before choosing a tier."
          plannedPriceLabel="Price"
          plannedPriceAmount="FREE"
        >
          <JoinWaitlistAnchor surface="pricing_free_card" className={btnPrimary}>
            Request Free access
          </JoinWaitlistAnchor>
        </PricingPlanCard>

        <PricingPlanCard
          planId="core"
          tagline="MOST POPULAR"
          badge="Core"
          title="Core"
          subtitle="Daily practical progress"
          description="The main paid tier for learners who want real momentum: scenarios, messaging, speaking, saved words, recaps, and follow-up — without paying for maximum exam-and-voice depth yet."
          features={CORE_PLAN_FEATURES}
          footerNote="Where most people build steady Dutch for life in the Netherlands."
          whoFor="Residents and newcomers who want strong coaching and consistency week to week."
          plannedPriceLabel="Expected at launch"
          plannedPriceAmount="€12"
          plannedPriceCadence="/ month"
          mostPopular
        >
          <JoinWaitlistAnchor surface="pricing_core_card" className={btnPrimary}>
            Request Core access
          </JoinWaitlistAnchor>
        </PricingPlanCard>

        <PricingPlanCard
          planId="premium"
          tagline="MAXIMUM DEPTH"
          badge="Premium"
          title="Premium"
          subtitle="Serious progress & performance"
          description="Full speaking and read-aloud depth, advanced personalization, and the complete exam stack — simulations, mocks, and high-intensity coaching when your timeline demands it."
          features={PREMIUM_PLAN_FEATURES}
          footerNote="Typical when exam dates are real or you want the full voice-and-exam surface."
          whoFor="Learners with urgent exam timelines or those who want every performance surface."
          plannedPriceLabel="Expected at launch"
          plannedPriceAmount="€29"
          plannedPriceCadence="/ month"
        >
          <JoinWaitlistAnchor surface="pricing_premium_card" ctaVariant="premium_card" className={btnPrimary}>
            Request Premium access
          </JoinWaitlistAnchor>
        </PricingPlanCard>
      </div>

      <MarketingSection
        eyebrow="Progression"
        title="What changes as you upgrade"
        description="Simple progression in user terms — not a feature spreadsheet."
        className="pt-0 bg-surface-muted border-y border-slate-200"
      >
        <div className="grid gap-6 md:grid-cols-3">
          <Card variant="elevated" padding="md" className="border border-slate-200 shadow-card h-full">
            <h3 className="font-bold text-ink-primary">Free → Core</h3>
            <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
              More conversations, stronger feedback, full personalization core, and practical exam orientation — the
              system stops feeling like a preview.
            </p>
          </Card>
          <Card variant="elevated" padding="md" className="border-2 border-primary-300 bg-primary-50/50 shadow-md h-full">
            <h3 className="font-bold text-ink-primary">Core → Premium</h3>
            <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
              Deeper speaking and read-aloud analysis, richer recaps and follow-up, and full exam simulations and practice
              exams — built for performance under pressure.
            </p>
          </Card>
          <Card variant="elevated" padding="md" className="border border-slate-200 shadow-card h-full">
            <h3 className="font-bold text-ink-primary">Why it is worth paying</h3>
            <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
              You replace scattered tools with one coach that remembers your words, your weak spots, and your last
              conversation — and tells you what to do next.
            </p>
          </Card>
        </div>
      </MarketingSection>

      <MarketingSection
        eyebrow="Premium"
        title="Why Premium costs more"
        description="Premium is not “more lessons.” It is more performance surfaces and depth."
        className="pt-0"
      >
        <Card variant="outlined" padding="lg" className="border-slate-200 bg-surface-elevated max-w-3xl">
          <p className="text-body text-ink-secondary leading-relaxed">
            Voice-heavy modes, read-aloud analysis, full exam simulations and mock exams, and the most intensive
            personalization require more compute, tighter product design, and ongoing calibration. Core already delivers
            strong practical Dutch; Premium is for when you need the full stack at once — honestly priced for that depth.
          </p>
        </Card>
      </MarketingSection>

      <MarketingSection
        eyebrow="Compare"
        title="Plans at a glance"
        description="High-level differences — details follow your account and launch terms."
        className="pt-0 bg-surface-muted/50 border-y border-slate-200/90"
      >
        <PlanComparisonTable rows={PRICING_COMPARISON_ROWS} />
        <p className="mt-6 text-body-sm text-ink-secondary text-center sm:text-left">
          Unsure which tier? Read the{' '}
          <Link href="/features" className="font-semibold text-primary-900 hover:text-primary-950">
            feature tour
          </Link>{' '}
          or start with Core and move up when your exam date or intensity spikes.
        </p>
      </MarketingSection>

      <MarketingSection eyebrow="FAQ" title="Common questions" className="pt-0">
        <ul className="grid gap-4 max-w-3xl">
          {faqItems.map(({ q, a }) => (
            <li key={q}>
              <Card variant="outlined" padding="md" className="border-slate-200 bg-surface-elevated">
                <h3 className="font-semibold text-ink-primary">{q}</h3>
                <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{a}</p>
              </Card>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <div className="mx-auto max-w-7xl px-4 sm:px-5 py-16 sm:py-20 space-y-12">
        <SignupComingSoonPanel surface="pricing_page" />
        <PricingCTASection />
        <p className="text-center text-body-sm text-ink-secondary">
          Questions? We read every access request during beta.{' '}
          <Link href="/contact" className="font-semibold text-primary-900 hover:text-primary-950">
            Contact
          </Link>
        </p>
      </div>
    </>
  )
}
