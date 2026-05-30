'use client'

import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  BookMarked,
  GraduationCap,
  MapPin,
  MessageCircle,
  Mic,
  Sparkles,
  Target,
  Volume2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MarketingSection } from '../components/MarketingSection'
import { MarketingPageTracker } from '../components/MarketingPageTracker'
import { JoinWaitlistAnchor } from '../components/JoinWaitlistAnchor'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { trackPublicHeroCtaClicked } from '@/lib/analytics/waitlistAnalytics'
import {
  CoachingLoopHeroVisual,
  ExamPrepModulesVisual,
  ReadingAloudVisual,
  WritingFeedbackVisual,
} from '../components/product-visuals/MarketingProductVisuals'

const ctaLg =
  'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 min-h-touch px-6 py-3.5 text-body w-full sm:w-auto shadow-md'
const ctaPrimary =
  'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 border border-primary-700/20'
const ctaSecondary =
  'bg-surface-elevated text-ink-primary hover:bg-slate-50 border border-slate-300 text-body font-semibold shadow-sm'

const whyDifferent = [
  {
    title: 'Message like real life',
    body: 'Natural back-and-forth in scenarios — choose feedback after each sentence or at the end, not tap-the-tile drills.',
    href: '/features#messaging',
    icon: MessageCircle,
  },
  {
    title: 'Speak and get usable feedback',
    body: 'Spoken Dutch in context. Coaching focuses on what to fix next, not generic praise.',
    href: '/features#speaking',
    icon: Mic,
  },
  {
    title: 'Read aloud and improve delivery',
    body: 'Articles, signs, textbook lines, even photos of text — pronunciation, stress, pacing, and clarity vs. a model.',
    href: '/features#reading-aloud',
    icon: Volume2,
  },
  {
    title: 'Learn from your own words and mistakes',
    body: 'Save what you hear in daily life, get recaps, and let follow-up practice reflect what you actually did yesterday.',
    href: '/features#personalization',
    icon: BookMarked,
  },
  {
    title: 'Real-life Dutch + exam structure in one system',
    body: 'Confidence for tomorrow first; structured exam mode when you need fixed prompts, timing, and task types.',
    href: '/exam-prep',
    icon: GraduationCap,
  },
] as const

const modes = [
  {
    title: 'Messaging practice',
    outcome: 'Chat through realistic situations with an AI Dutch partner. Feedback when you want it — like messaging, not a quiz.',
    icon: MessageCircle,
  },
  {
    title: 'Speaking practice',
    outcome: 'Voice-first scenarios with coaching on your next improvement, grounded in the situation you chose.',
    icon: Mic,
  },
  {
    title: 'Read aloud + voice analysis',
    outcome: 'More than transcription: stress, tone, pacing, and clarity — with an optional model comparison.',
    icon: Volume2,
  },
  {
    title: 'Recap & review',
    outcome: 'Daily and weekly summaries of slips, wins, weak spots, and new vocabulary — plus clear next steps.',
    icon: Target,
  },
  {
    title: 'Exam prep mode',
    outcome: 'A structured lane inside the same coach: training, simulations, and practice exams when your timeline demands it.',
    icon: GraduationCap,
  },
] as const

const scenarios = [
  'Train station & travel',
  'Doctor & pharmacy',
  'Municipality (gemeente)',
  'Work & colleagues',
  'Café & shops',
  'School & childcare',
  'Housing & neighbours',
] as const

export function MarketingHomePage() {
  const pathname = '/'

  return (
    <>
      <MarketingPageTracker event={ANALYTICS_EVENTS.public_page_viewed} page="home" />

      <section className="relative mx-auto max-w-6xl px-4 sm:px-5 pt-14 pb-16 sm:pt-20 sm:pb-20 overflow-hidden">
        <div className="pointer-events-none absolute -top-10 -right-16 h-40 w-40 rounded-full bg-primary-100 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-12 -left-20 h-40 w-40 rounded-full bg-violet-100 blur-2xl" aria-hidden />
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-center">
          <div className="text-center lg:text-left">
            <p className="text-caption font-semibold uppercase tracking-wide text-primary-800 mb-3 inline-flex items-center gap-2 justify-center lg:justify-start">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              Dutch coach · Netherlands
            </p>
            <h1 className="text-display sm:text-4xl sm:leading-[1.12] font-bold text-ink-primary max-w-xl mx-auto lg:mx-0">
              Practical Dutch for real life — with feedback you can use
            </h1>
            <p className="mt-5 text-body-lg text-ink-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Message and speak in realistic scenarios. Get coaching on what to improve next. Revisit what slipped. Built
              for people living in the Netherlands — including A2, inburgering, and integration goals when you need
              them.
            </p>
            <p className="mt-4 text-body-sm text-ink-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Not another vocabulary loop. More than a generic chatbot. Real-life practice first — exam structure when you
              need it.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-stretch sm:items-center">
              <JoinWaitlistAnchor
                surface="home_hero"
                ctaVariant="primary"
                className={`${ctaLg} ${ctaPrimary} gap-2`}
                onClick={() => trackPublicHeroCtaClicked({ cta_role: 'primary', route: pathname })}
              >
                Request early access
              </JoinWaitlistAnchor>
              <Link
                href="/features"
                className={`${ctaLg} ${ctaSecondary} gap-2 text-center`}
                onClick={() => trackPublicHeroCtaClicked({ cta_role: 'secondary', route: pathname })}
              >
                Explore features
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            </div>
            <p className="mt-6 text-body-sm text-ink-secondary max-w-xl mx-auto lg:mx-0">
              For expats, newcomers, and learners targeting everyday Dutch — including A2 and inburgering paths.
            </p>
            <div className="mt-6 flex justify-center lg:justify-start">
              <Link
                href="/login"
                className="text-body-sm font-semibold text-ink-secondary hover:text-ink-primary transition-colors"
              >
                Already invited? Sign in
              </Link>
            </div>
          </div>

          <div className="mt-12 lg:mt-0 max-w-md mx-auto lg:max-w-none lg:mx-0">
            <div className="rounded-card border border-slate-200 bg-surface-elevated/90 p-3 shadow-card">
              <CoachingLoopHeroVisual />
              <p className="mt-3 text-caption text-ink-secondary text-center lg:text-left">
                Illustrative UI — messaging, speaking, and recap in one coaching loop.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-y border-slate-200 bg-surface-muted">
        <div className="mx-auto max-w-6xl px-4 sm:px-5 py-6 flex flex-wrap justify-center gap-x-8 gap-y-3 text-body-sm text-ink-secondary">
          <span className="font-medium text-ink-primary">Practice messages, speaking, read-aloud, and review together</span>
          <span className="hidden sm:inline text-slate-300" aria-hidden>
            ·
          </span>
          <span>Invite-only early access — waves by email</span>
        </div>
      </div>

      <MarketingSection
        eyebrow="Why this is different"
        title="Built for Dutch you actually need tomorrow"
        description="FluentCopilot is a coaching system — not a phrase app, not a passive course, not a disconnected chat."
      >
        <ul className="grid gap-4 lg:grid-cols-2">
          {whyDifferent.map(({ title, body, href, icon: Icon }) => (
            <li key={title}>
              <Link href={href} className="group block h-full">
                <Card
                  variant="elevated"
                  padding="md"
                  className="h-full transition-shadow group-hover:shadow-lg border border-slate-200/90"
                >
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-800 ring-1 ring-primary-200/80">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-ink-primary group-hover:text-primary-900 flex items-center gap-1">
                        {title}
                        <ArrowRight
                          className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                          aria-hidden
                        />
                      </h3>
                      <p className="mt-1 text-body-sm text-ink-secondary leading-relaxed">{body}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        eyebrow="How FluentCopilot works"
        title="A coaching loop — not a course catalog"
        description="Repeatable rhythm: practice, get direction, revisit what slipped, build confidence for the next real conversation."
        className="bg-surface-muted/60 border-y border-slate-200/80"
      >
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '1',
              title: 'Practice',
              text: 'Message or speak in a scenario that matches your life — train station, work, care, admin.',
            },
            {
              step: '2',
              title: 'Get feedback',
              text: 'Corrections and coaching name what to fix next — tuned to your level and the situation.',
            },
            {
              step: '3',
              title: 'Revisit what slipped',
              text: 'Recaps, saved words, and follow-up content loop back to your weak spots and recent topics.',
            },
            {
              step: '4',
              title: 'Build confidence',
              text: 'Show up clearer next time — in the shop, at the desk, or in exam mode when the date is real.',
            },
          ].map((item) => (
            <li key={item.step}>
              <Card variant="elevated" padding="md" className="h-full border border-slate-200/90 shadow-card">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-body-sm">
                  {item.step}
                </span>
                <h3 className="mt-3 font-semibold text-ink-primary">{item.title}</h3>
                <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{item.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </MarketingSection>

      <MarketingSection
        id="modes"
        eyebrow="The actual product"
        title="The modes that make up your coach"
        description="One system ties messaging, voice, reading aloud, review, and exam prep — so progress stays connected."
      >
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map(({ title, outcome, icon: Icon }) => (
            <li key={title}>
              <Card variant="elevated" padding="md" className="h-full border border-slate-200/90 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-900 ring-1 ring-primary-200/60">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold text-ink-primary">{title}</h3>
                <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{outcome}</p>
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
          <ReadingAloudVisual />
          <div className="space-y-4 lg:pt-4">
            <h3 className="text-title font-bold text-ink-primary">Feedback that ties to real tasks</h3>
            <p className="text-body text-ink-secondary leading-relaxed">
              Writing and speaking corrections connect to what you were trying to do — exam-style constraints when
              relevant, natural phrasing when you are preparing for daily life.
            </p>
            <WritingFeedbackVisual />
            <p className="text-caption text-ink-secondary">Illustrative writing revision — example Dutch.</p>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-4 justify-center lg:justify-start">
          <Link
            href="/features"
            className="inline-flex items-center justify-center min-h-touch px-6 py-3.5 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-md"
          >
            Full feature tour
          </Link>
          <Link
            href="/features#reminders"
            className="inline-flex items-center justify-center min-h-touch px-6 py-3.5 rounded-lg font-semibold border border-slate-300 text-ink-primary bg-surface-elevated hover:bg-surface-muted transition-colors"
          >
            Reminders &amp; follow-up
          </Link>
        </div>
      </MarketingSection>

      <MarketingSection
        eyebrow="Built for life in the Netherlands"
        title="Scenarios that match where you actually go"
        description="Location-aware or self-selected context — so you rehearse the Dutch you need for the appointment, the counter, or the meeting."
        className="bg-surface-muted/40 border-y border-slate-200/80"
      >
        <ul className="flex flex-wrap gap-2 justify-center lg:justify-start">
          {scenarios.map((s) => (
            <li
              key={s}
              className="rounded-full border border-slate-200 bg-surface-elevated px-4 py-2 text-body-sm font-medium text-ink-primary shadow-sm"
            >
              {s}
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        eyebrow="Your Dutch, not just our curriculum"
        title="Personal word library, follow-up, and rhythm"
        description="Save words and phrases from real life. The system weaves them into chat, speaking, listening, and drills — and nudges you when it matters."
      >
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <Card variant="elevated" padding="lg" className="border border-slate-200 shadow-card">
            <div className="flex gap-3">
              <BookMarked className="h-8 w-8 text-primary-700 shrink-0" aria-hidden />
              <div>
                <h3 className="font-semibold text-ink-primary">Your vocabulary, in the loop</h3>
                <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
                  Hear something at the market? Add it. The coach can bring it back in practice, tense variations, and
                  short reviews — so it stops being a list and starts being your Dutch.
                </p>
              </div>
            </div>
            <ul className="mt-6 space-y-3 text-body-sm text-ink-secondary border-t border-slate-100 pt-6">
              <li className="flex gap-2">
                <Bell className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" aria-hidden />
                <span>
                  <strong className="text-ink-primary">Reminders &amp; accountability:</strong> e.g. ping tomorrow at
                  6pm to continue, resume yesterday&apos;s thread, or keep a speaking habit on schedule.
                </span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" aria-hidden />
                <span>
                  <strong className="text-ink-primary">Follow-up content:</strong> talked about recipes yesterday —
                  today a short related read or mini exercise, not random homework.
                </span>
              </li>
            </ul>
          </Card>
          <Card variant="outlined" padding="lg" className="border-slate-200 bg-primary-50/30">
            <h3 className="font-semibold text-ink-primary">Daily &amp; weekly recaps</h3>
            <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">
              Mistakes, wins, weak spots, new words, and suggested next steps — so you always know what to repeat before
              the week runs away from you.
            </p>
          </Card>
        </div>
      </MarketingSection>

      <MarketingSection
        eyebrow="Real life + exam"
        title="Connected — not two different products"
        description="Everyday practice builds flexibility and confidence. Exam mode adds fixed prompts, pacing, and task types so performance under pressure improves — without abandoning practical Dutch."
        className="bg-gradient-to-b from-primary-50 via-surface to-surface border-y border-slate-200"
      >
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-14 items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <ul className="space-y-4 text-body text-ink-secondary">
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600 shrink-0" aria-hidden />
                <span>
                  <strong className="text-ink-primary">Real life</strong> — message, speak, read aloud; adapt when the
                  conversation shifts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-primary-600 shrink-0" aria-hidden />
                <span>
                  <strong className="text-ink-primary">Exam mode</strong> — training, simulation, practice exams,
                  structure, and rubric-style guidance when your timeline is concrete.
                </span>
              </li>
            </ul>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Link
                href="/exam-prep"
                className="inline-flex items-center justify-center min-h-touch w-full sm:w-auto px-6 py-3.5 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-md"
              >
                Exam prep overview
              </Link>
              <Link
                href="/pricing"
                onClick={() => track(ANALYTICS_EVENTS.pricing_cta_clicked, { surface: 'home_exam_section' })}
                className="inline-flex items-center justify-center min-h-touch w-full sm:w-auto px-6 py-3.5 rounded-lg font-semibold border border-slate-300 text-ink-primary bg-surface-elevated hover:bg-surface-muted transition-colors"
              >
                Compare plans
              </Link>
            </div>
          </div>
          <div className="order-1 lg:order-2 rounded-card border border-slate-200 shadow-elevated bg-surface-elevated p-2 sm:p-3">
            <ExamPrepModulesVisual />
          </div>
        </div>
      </MarketingSection>

      <section className="mx-auto max-w-6xl px-4 sm:px-5 py-16 sm:py-20">
        <Card
          variant="elevated"
          padding="lg"
          className="bg-gradient-to-br from-primary-700 to-primary-800 text-white border-0 shadow-lg relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" aria-hidden />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            <div>
              <p className="text-caption font-bold uppercase tracking-wide text-primary-100">Pricing</p>
              <h2 className="mt-2 text-title sm:text-2xl font-bold text-white">Free to explore. Core for daily progress. Premium for depth.</h2>
              <p className="mt-4 text-body text-gray-100 max-w-xl leading-relaxed">
                Start free to feel the loop. Core is the main paid tier for practical momentum. Premium adds deeper
                speaking, voice analysis, personalization, and full exam performance tools.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full sm:w-auto">
              <Link
                href="/pricing"
                onClick={() => track(ANALYTICS_EVENTS.pricing_cta_clicked, { surface: 'home_teaser' })}
                className="inline-flex items-center justify-center min-h-touch px-6 py-3.5 rounded-lg font-semibold bg-white text-primary-900 hover:bg-gray-50 shadow-md transition-colors w-full sm:w-auto"
              >
                View pricing
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-5 pb-20 sm:pb-24">
        <Card variant="elevated" padding="lg" className="border border-primary-200/80 bg-primary-50/50 shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            <div>
              <p className="text-caption font-semibold uppercase tracking-wide text-primary-800">Early access</p>
              <h2 className="mt-2 text-title font-bold text-ink-primary">Closed beta — intentional invites</h2>
              <p className="mt-3 text-body text-ink-secondary max-w-xl leading-relaxed">
                We onboard in small waves so feedback quality stays high. Request access with your email — no payment
                during the closed beta.
              </p>
              <Link href="/beta" className="mt-4 inline-flex text-body-sm font-semibold text-primary-900 hover:text-primary-950">
                How early access works →
              </Link>
            </div>
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <JoinWaitlistAnchor surface="home_beta_card" className={`${ctaLg} ${ctaPrimary} gap-2 justify-center w-full`}>
                Request early access
              </JoinWaitlistAnchor>
              <Link href="/login" className={`${ctaLg} ${ctaSecondary} text-center w-full`}>
                Already invited? Sign in
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </>
  )
}
