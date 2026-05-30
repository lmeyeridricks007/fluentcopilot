'use client'

import Link from 'next/link'
import { CheckCircle2, Sliders, Timer } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { MarketingSection } from '../components/MarketingSection'
import { MarketingPageTracker } from '../components/MarketingPageTracker'
import { JoinWaitlistAnchor } from '../components/JoinWaitlistAnchor'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { ExamPrepModulesVisual, HeroProductVisual, WritingFeedbackVisual } from '../components/product-visuals/MarketingProductVisuals'

const skills = [
  {
    name: 'Speaking',
    train: 'Short prompts, role-play structure, and pronunciation habits for timed tasks.',
    simulation: 'Fixed preparation windows and response length closer to exam conditions.',
    feedback: 'Actionable notes on task completion, clarity, and common A2-style slips — not generic praise.',
  },
  {
    name: 'Writing',
    train: 'Guided tasks with constraints (length, register, connectors) that match exam expectations.',
    simulation: 'Timed writing with fewer hints — closer to the real desk experience.',
    feedback: 'Revision coaching tied to grammar, clarity, and exam-shaped phrasing.',
  },
  {
    name: 'Listening',
    train: 'Audio sets with exam-like question styles and vocabulary in context.',
    simulation: 'Fewer replays and stricter pacing to mirror test pressure.',
    feedback: 'Review of missed details and strategy for similar task types.',
  },
  {
    name: 'Reading',
    train: 'Short texts with multiple-choice and skimming practice at A2 pace.',
    simulation: 'Time-boxed passages to build speed without sacrificing accuracy.',
    feedback: 'Patterns in wrong answers and what to reread next time.',
  },
  {
    name: 'KNM',
    train: 'Society knowledge with quizzes and scenario-linked review.',
    simulation: 'Mixed-item sets that feel closer to formal assessment rhythm.',
    feedback: 'Links back to themes to restudy — not isolated trivia.',
  },
] as const

export function MarketingExamPrepPage() {
  return (
    <>
      <MarketingPageTracker event={ANALYTICS_EVENTS.exam_prep_page_viewed} page="exam_prep_public" />

      <section className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:pt-16">
        <p className="text-caption font-semibold uppercase tracking-wide text-primary-800">Exam preparation</p>
        <h1 className="mt-2 text-display sm:text-3xl font-bold text-ink-primary max-w-3xl leading-tight">
          Exam prep as a structured mode — inside your Dutch coach
        </h1>
        <p className="mt-4 text-body-lg text-ink-secondary max-w-3xl leading-relaxed">
          FluentCopilot is first a <strong className="text-ink-primary">practical Dutch coach</strong> for life in the
          Netherlands. When you are working toward <strong className="text-ink-primary">A2</strong>,{' '}
          <strong className="text-ink-primary">inburgering</strong>, or other integration exams,{' '}
          <strong className="text-ink-primary">exam mode</strong> adds training lanes, simulations, practice exams, and
          readiness guidance — without splitting “life Dutch” and “exam Dutch” into two unrelated products.
        </p>
        <p className="mt-4 text-body text-ink-secondary max-w-3xl leading-relaxed">
          You get training (build the skill), simulation (time and structure), and practice exams (full sets) — plus
          vocabulary and grammar relevance tied to task types, not disconnected lists.
        </p>
        <div className="mt-8 flex flex-wrap gap-4 text-body-sm font-semibold">
          <Link href="/features" className="text-primary-900 hover:text-primary-950">
            All product features →
          </Link>
          <span className="text-slate-300" aria-hidden>
            ·
          </span>
          <Link
            href="/pricing"
            onClick={() => track(ANALYTICS_EVENTS.pricing_cta_clicked, { surface: 'exam_prep_intro' })}
            className="text-primary-900 hover:text-primary-950"
          >
            Pricing →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <ExamPrepModulesVisual />
          <div>
            <h2 className="text-title font-bold text-ink-primary">One hub — five skill areas</h2>
            <p className="mt-3 text-body text-ink-secondary leading-relaxed">
              Exam prep stays connected to the same account, saved words, and recaps as the rest of the product — so
              weaknesses you see in mock exams can feed back into everyday practice.
            </p>
            <div className="mt-8 rounded-xl border border-slate-200 overflow-hidden shadow-card">
              <HeroProductVisual className="border-0 shadow-none rounded-none" />
            </div>
            <p className="mt-3 text-caption text-ink-secondary">
              Illustrative speaking drill — example Dutch prompt shown as in-app practice.
            </p>
          </div>
        </div>
      </section>

      <MarketingSection
        title="Skill by skill"
        description="Each area combines training, simulation-style runs, and feedback you can act on."
        className="pt-0 bg-surface-muted/55 border-y border-slate-200/90"
      >
        <ul className="grid gap-5 lg:grid-cols-2">
          {skills.map((s) => (
            <li key={s.name}>
              <Card variant="elevated" padding="md" className="h-full border border-slate-200/90 shadow-card">
                <h3 className="font-semibold text-ink-primary text-title">{s.name}</h3>
                <dl className="mt-4 space-y-3 text-body-sm text-ink-secondary leading-relaxed">
                  <div>
                    <dt className="font-semibold text-ink-primary">Training</dt>
                    <dd className="mt-1">{s.train}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-primary">Simulation</dt>
                    <dd className="mt-1">{s.simulation}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-ink-primary">Feedback</dt>
                    <dd className="mt-1">{s.feedback}</dd>
                  </div>
                </dl>
              </Card>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection
        title="How exam mode differs from real-life practice"
        description="Both live in one system — they optimize for different outcomes."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Card variant="elevated" padding="lg" className="border border-slate-200 shadow-card">
            <div className="flex items-center gap-2 text-primary-800 font-semibold">
              <Sliders className="h-5 w-5" aria-hidden />
              Real-life practice
            </div>
            <p className="mt-3 text-body text-ink-secondary leading-relaxed">
              Flexibility, natural messaging and speaking, scenarios that shift — build confidence and listening for what
              actually happens at the counter or in the meeting.
            </p>
          </Card>
          <Card variant="elevated" padding="lg" className="border-2 border-primary-300 bg-primary-50/40 shadow-card">
            <div className="flex items-center gap-2 text-primary-900 font-semibold">
              <Timer className="h-5 w-5" aria-hidden />
              Exam mode
            </div>
            <p className="mt-3 text-body text-ink-secondary leading-relaxed">
              Fixed prompts, pacing, structure, and scoring-like guidance — so you get used to performing under
              constraints and know what to fix before the official date.
            </p>
          </Card>
        </div>
      </MarketingSection>

      <MarketingSection
        title="What you actually get"
        description="Concrete outputs — not vague “AI scores.”"
        className="bg-surface-muted/40 border-y border-slate-200/90"
      >
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            'Rubrics and task-type familiarity',
            'Realistic prompts and timing',
            'Recaps of weak areas after mocks',
            'Next-step recommendations',
            'Practice exams to benchmark progress',
            'Vocabulary and grammar tied to what you missed',
          ].map((t) => (
            <li key={t} className="flex gap-2 text-body text-ink-secondary">
              <CheckCircle2 className="h-5 w-5 text-primary-700 shrink-0 mt-0.5" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10 max-w-lg">
          <WritingFeedbackVisual />
          <p className="mt-2 text-caption text-ink-secondary">Example revision snapshot — illustrative Dutch.</p>
        </div>
      </MarketingSection>

      <MarketingSection
        title="Who exam mode is for"
        description="Learners who want structure and a timeline — not instead of real life, but alongside it."
      >
        <ul className="grid gap-3 sm:grid-cols-2 max-w-4xl">
          {[
            'Inburgering and A2-oriented exam timelines',
            'Learners who want timed simulations and mock exams, not only open conversation',
            'People who prefer clear task types and pacing before test day',
            'Anyone combining everyday Dutch with a concrete exam date',
          ].map((t) => (
            <li key={t} className="flex gap-2 text-body text-ink-secondary leading-relaxed">
              <CheckCircle2 className="h-5 w-5 text-primary-700 shrink-0 mt-0.5" aria-hidden />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <Card variant="elevated" padding="lg" className="border border-primary-200/80 bg-primary-50/40 shadow-md">
          <h2 className="text-title font-bold text-ink-primary">Get exam depth where your plan allows</h2>
          <p className="mt-3 text-body text-ink-secondary max-w-2xl leading-relaxed">
            Full exam simulations and mock exams are a <strong className="text-ink-primary">Premium</strong> depth
            surface for many learners. <strong className="text-ink-primary">Core</strong> still supports practical progress
            and lighter exam exposure; <strong className="text-ink-primary">Free</strong> lets you explore fit. Compare
            tiers, then request access or sign in if you are already invited.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-4">
            <JoinWaitlistAnchor
              surface="exam_prep_page"
              className="inline-flex justify-center items-center min-h-touch px-6 py-3.5 rounded-lg font-semibold bg-primary-600 text-white hover:bg-primary-700 shadow-md border border-primary-700/15 transition-colors w-full sm:w-auto"
            >
              Request early access
            </JoinWaitlistAnchor>
            <Link
              href="/pricing"
              onClick={() => track(ANALYTICS_EVENTS.pricing_cta_clicked, { surface: 'exam_prep_page' })}
              className="inline-flex justify-center items-center min-h-touch px-6 py-3.5 rounded-lg font-semibold bg-surface-elevated text-ink-primary hover:bg-slate-50 border border-slate-300 transition-colors w-full sm:w-auto"
            >
              Compare plans
            </Link>
            <Link
              href="/login"
              onClick={() => track(ANALYTICS_EVENTS.sign_in_clicked, { surface: 'exam_prep_page' })}
              className="inline-flex justify-center items-center min-h-touch px-2 py-2 rounded-lg font-semibold text-ink-secondary hover:text-ink-primary transition-colors w-full sm:w-auto"
            >
              Sign in
            </Link>
          </div>
        </Card>
      </section>
    </>
  )
}
