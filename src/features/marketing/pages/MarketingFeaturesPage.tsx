'use client'

import Link from 'next/link'
import {
  Bell,
  BookMarked,
  GraduationCap,
  MapPin,
  MessageCircle,
  Mic,
  RefreshCw,
  Sparkles,
  Volume2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MarketingSection } from '../components/MarketingSection'
import { MarketingPageTracker } from '../components/MarketingPageTracker'
import { JoinWaitlistAnchor } from '../components/JoinWaitlistAnchor'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import {
  ExamPrepModulesVisual,
  HeroProductVisual,
  MessagingPracticeVisual,
  ReadingAloudVisual,
  WritingFeedbackVisual,
} from '../components/product-visuals/MarketingProductVisuals'

type FeatureBlock = {
  id: string
  icon: typeof MessageCircle
  title: string
  headline: string
  body: string
  why: string
  bestFor?: string
  visual?: 'messaging' | 'speaking' | 'writing' | 'reading' | 'exam'
  reverse?: boolean
}

const featureBlocks: FeatureBlock[] = [
  {
    id: 'messaging',
    icon: MessageCircle,
    title: 'Messaging practice',
    headline: 'Natural back-and-forth — not a tap-the-answer quiz',
    body: 'Message an AI Dutch partner in realistic scenarios. Choose feedback after every sentence or at the end of the conversation, so practice feels like real messaging.',
    why: 'You rehearse the Dutch you need for shops, admin, and social situations — with coaching that respects your pace.',
    bestFor: 'Learners who want low-friction daily practice that still pushes accuracy.',
    visual: 'messaging',
  },
  {
    id: 'speaking',
    icon: Mic,
    title: 'Speaking practice',
    headline: 'Spoken Dutch with a clear next step',
    body: 'Work through voice-first scenarios. Feedback highlights what to improve next — pronunciation, word order, or task completion — instead of empty encouragement.',
    why: 'Speaking anxiety drops when you know exactly what to fix before the next attempt.',
    bestFor: 'Anyone building confidence before real-world conversations.',
    visual: 'speaking',
    reverse: true,
  },
  {
    id: 'reading-aloud',
    icon: Volume2,
    title: 'Read aloud + voice analysis',
    headline: 'Beyond speech-to-text',
    body: 'Read textbook pages, articles, signs, messages, or text from a photo. The system looks at pronunciation, stress, pacing, tone, and clarity — and you can compare to a model delivery.',
    why: 'You improve how you sound in real situations, not just whether a word was recognized.',
    bestFor: 'Learners who want measurable feedback on how they come across.',
    visual: 'reading',
  },
  {
    id: 'word-library',
    icon: BookMarked,
    title: 'Personal word library',
    headline: 'Your Dutch vocabulary — not a generic deck',
    body: 'Save words and phrases you heard or saw in daily life. They feed into chat, speaking, listening, and sentence drills — including tense variations — so practice stays tied to your world.',
    why: 'You stop learning “the app’s list” and start reinforcing what you actually need.',
    bestFor: 'People who encounter Dutch outside the classroom every day.',
  },
  {
    id: 'recaps',
    icon: RefreshCw,
    title: 'Smart recaps and review',
    headline: 'Daily and weekly summaries that drive retention',
    body: 'See mistakes, wins, weak spots, new vocabulary, and suggested next steps. Recaps connect to your recent conversations and saved words — not random review queues.',
    why: 'Premium retention comes from knowing what to repeat — without guessing.',
    visual: 'writing',
  },
  {
    id: 'scenarios',
    icon: MapPin,
    title: 'Real-life scenarios',
    headline: 'Context that matches the Netherlands',
    body: 'Train station, doctor, municipality, café, work, childcare, housing — scenarios reflect everyday life here. Use location or pick context manually so practice matches your week.',
    why: 'Phrases stick when they map to the conversations you will actually have.',
    bestFor: 'Residents and newcomers navigating real appointments and errands.',
    visual: 'messaging',
    reverse: true,
  },
  {
    id: 'exam-prep',
    icon: GraduationCap,
    title: 'Exam prep mode',
    headline: 'Structured performance when your date is real',
    body: 'Speaking, writing, listening, reading, and KNM — with training lanes, timed simulations, and practice exams. It lives inside the same coach as everyday Dutch, so skills stay connected.',
    why: 'You get exam-shaped discipline without abandoning practical communication.',
    bestFor: 'A2, inburgering, and integration timelines — alongside everyday confidence.',
    visual: 'exam',
  },
  {
    id: 'reminders',
    icon: Bell,
    title: 'Coach-like reminders & follow-up',
    headline: 'Rhythm and accountability',
    body: 'Ask to be nudged at a specific time, resume yesterday’s conversation, or keep a recurring speaking habit. The app can also surface short follow-up content tied to what you did last — e.g. a related article after you talked about recipes.',
    why: 'Consistency comes from a coach that remembers — not from guilt about streaks alone.',
    reverse: true,
  },
]

function FeatureVisual({ kind }: { kind: NonNullable<FeatureBlock['visual']> }) {
  if (kind === 'messaging') return <MessagingPracticeVisual />
  if (kind === 'speaking') return <HeroProductVisual />
  if (kind === 'reading') return <ReadingAloudVisual />
  if (kind === 'exam') return <ExamPrepModulesVisual />
  return <WritingFeedbackVisual />
}

export function MarketingFeaturesPage() {
  return (
    <>
      <MarketingPageTracker event={ANALYTICS_EVENTS.public_page_viewed} page="features" />

      <section className="mx-auto max-w-6xl px-4 sm:px-5 pt-14 pb-10 sm:pt-20">
        <p className="text-caption font-bold uppercase tracking-wide text-primary-800">Features</p>
        <h1 className="mt-3 text-display sm:text-3xl font-bold text-ink-primary max-w-3xl leading-tight">
          Communication, feedback, and review — not a vocabulary-first app
        </h1>
        <p className="mt-5 text-body-lg text-ink-secondary max-w-2xl leading-relaxed">
          FluentCopilot is built around <strong className="text-ink-primary">practical Dutch</strong> for people in the
          Netherlands: message and speak in context, read aloud with voice coaching, save your own words, and get
          recaps that reflect what you actually did — with{' '}
          <strong className="text-ink-primary">exam prep as a structured mode</strong> when you need it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-body-sm">
          <Link
            href="/pricing"
            onClick={() => track(ANALYTICS_EVENTS.pricing_cta_clicked, { surface: 'features_intro' })}
            className="font-semibold text-primary-900 hover:text-primary-950"
          >
            Pricing →
          </Link>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <Link href="/exam-prep" className="font-semibold text-primary-900 hover:text-primary-950">
            Exam prep →
          </Link>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <Link href="/beta" className="font-semibold text-primary-900 hover:text-primary-950">
            Early access →
          </Link>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-5 pb-14 scroll-mt-24">
        <div className="rounded-card border border-slate-200 bg-surface-muted/50 p-6 sm:p-8">
          <h2 className="text-title font-bold text-ink-primary">Why this isn&apos;t “just another tutor app”</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 text-body text-ink-secondary leading-relaxed">
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold">·</span>
              <span>
                <strong className="text-ink-primary">Vs. vocabulary apps:</strong> you practice full messages and
                speech — not endless isolated words.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold">·</span>
              <span>
                <strong className="text-ink-primary">Vs. generic AI chat:</strong> scenarios, feedback modes, recaps,
                and your saved vocabulary are woven into one coaching loop.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold">·</span>
              <span>
                <strong className="text-ink-primary">Vs. exam-only tools:</strong> exam mode sits inside everyday Dutch
                — so flexibility and structure reinforce each other.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary-600 font-bold">·</span>
              <span>
                <strong className="text-ink-primary">Vs. ChatGPT alone:</strong> purpose-built flows for Dutch levels,
                scenarios, voice, reading aloud, and review — not a blank thread.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <div className="space-y-0">
        {featureBlocks.map((block) => {
          const Icon = block.icon
          return (
            <section
              key={block.id}
              id={block.id}
              className="mx-auto max-w-6xl px-4 sm:px-5 py-14 sm:py-16 scroll-mt-24 border-t border-slate-200 first:border-t-0 first:pt-0"
            >
              {block.visual ? (
                <div className="grid gap-10 lg:grid-cols-2 lg:gap-14 lg:items-center">
                  <div className={block.reverse ? 'lg:order-2' : undefined}>
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-900 ring-1 ring-primary-200/60">
                        <Icon className="h-6 w-6" aria-hidden />
                      </span>
                      <p className="text-caption font-bold uppercase tracking-wide text-primary-800">{block.title}</p>
                    </div>
                    <h2 className="mt-4 text-title sm:text-2xl font-bold text-ink-primary">{block.headline}</h2>
                    <p className="mt-3 text-body text-ink-secondary leading-relaxed">{block.body}</p>
                    <p className="mt-4 text-body-sm text-ink-primary">
                      <span className="font-semibold">Why it matters:</span> {block.why}
                    </p>
                    {block.bestFor && (
                      <p className="mt-2 text-body-sm text-ink-secondary">
                        <span className="font-semibold text-ink-primary">Best for:</span> {block.bestFor}
                      </p>
                    )}
                  </div>
                  <div className={`max-w-lg mx-auto w-full ${block.reverse ? 'lg:order-1' : ''}`}>
                    <FeatureVisual kind={block.visual} />
                    <p className="mt-2 text-caption text-ink-secondary">Illustrative UI mock.</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-900 ring-1 ring-primary-200/60">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="text-caption font-bold uppercase tracking-wide text-primary-800">{block.title}</p>
                  </div>
                  <h2 className="mt-4 text-title sm:text-2xl font-bold text-ink-primary">{block.headline}</h2>
                  <p className="mt-3 text-body text-ink-secondary leading-relaxed">{block.body}</p>
                  <p className="mt-4 text-body-sm text-ink-primary">
                    <span className="font-semibold">Why it matters:</span> {block.why}
                  </p>
                  {block.bestFor && (
                    <p className="mt-2 text-body-sm text-ink-secondary">
                      <span className="font-semibold text-ink-primary">Best for:</span> {block.bestFor}
                    </p>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <MarketingSection
        id="personalization"
        eyebrow="Personalized learning"
        title="Saved words, weak spots, and follow-up loops"
        description="The product adapts to what you save, where you slip, and what you talked about recently — so review feels relevant instead of random."
        className="bg-surface-muted/55 border-y border-slate-200/90"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              title: 'Your library drives practice',
              body: 'Saved items show up across modes — chat, speaking, listening, drills — so repetition matches your life.',
              icon: BookMarked,
            },
            {
              title: 'Weak spots surface in recaps',
              body: 'Mistakes and trends roll into daily and weekly summaries with suggested next steps.',
              icon: Sparkles,
            },
            {
              title: 'Follow-up from yesterday',
              body: 'Short reads or mini exercises can reflect yesterday’s topic — reinforcement without a generic curriculum.',
              icon: RefreshCw,
            },
          ].map(({ title, body, icon: Icon }) => (
            <Card key={title} variant="elevated" padding="md" className="border border-slate-200/90 shadow-card h-full">
              <Icon className="h-8 w-8 text-primary-700 mb-3" aria-hidden />
              <h3 className="font-semibold text-ink-primary">{title}</h3>
              <p className="mt-2 text-body-sm text-ink-secondary leading-relaxed">{body}</p>
            </Card>
          ))}
        </div>
      </MarketingSection>

      <section className="mx-auto max-w-6xl px-4 sm:px-5 pb-20 sm:pb-24">
        <Card variant="elevated" padding="lg" className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-700 text-white border-0 shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <h2 className="text-title font-bold text-white">Ready to see it in the app?</h2>
              <p className="mt-3 text-body text-white/90 max-w-xl leading-relaxed">
                Explore pricing, exam prep detail, or request early access — the same story runs through every page.
              </p>
            </div>
            <div className="flex flex-col w-full lg:w-auto gap-4 shrink-0">
              <JoinWaitlistAnchor
                surface="features_page"
                className="inline-flex justify-center items-center min-h-touch px-6 py-3.5 rounded-lg font-semibold bg-primary-500 text-white hover:bg-primary-400 transition-colors shadow-md w-full sm:w-auto"
              >
                Request early access
              </JoinWaitlistAnchor>
              <Link
                href="/pricing"
                onClick={() => track(ANALYTICS_EVENTS.pricing_cta_clicked, { surface: 'features_page' })}
                className="inline-flex justify-center items-center min-h-touch px-6 py-3.5 rounded-lg font-semibold border-2 border-white/90 text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
              >
                View pricing
              </Link>
              <Link
                href="/exam-prep"
                className="inline-flex justify-center items-center min-h-touch px-6 py-3.5 rounded-lg font-semibold text-white/90 hover:text-white transition-colors w-full sm:w-auto text-body-sm"
              >
                Exam prep overview →
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </>
  )
}
