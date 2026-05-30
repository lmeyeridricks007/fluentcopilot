'use client'

import { Card } from '@/components/ui/Card'

export function MarketingAboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16">
      <header>
        <p className="text-caption font-bold uppercase tracking-wide text-primary-800">About</p>
        <h1 className="mt-3 text-display sm:text-4xl font-bold text-ink-primary">Built for real Dutch life</h1>
        <p className="mt-4 max-w-3xl text-body-lg text-ink-secondary leading-relaxed">
          FluentCopilot is a guided language-learning system built first for expats and newcomers learning Dutch in the
          Netherlands.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <Card variant="outlined" padding="md">
          <h2 className="text-title font-bold text-ink-primary">Why FluentCopilot exists</h2>
          <p className="mt-3 text-body text-ink-secondary leading-relaxed">
            This product started with a common expat frustration: most language apps felt disconnected from real Dutch
            situations. People needed clearer guidance for both everyday conversations and inburgering goals.
          </p>
        </Card>

        <Card variant="outlined" padding="md">
          <h2 className="text-title font-bold text-ink-primary">Dutch first, future-ready</h2>
          <ul className="mt-3 space-y-2 list-disc pl-5 text-body text-ink-secondary">
            <li>Built first for Dutch conversations you actually face in the Netherlands.</li>
            <li>Aligned with A2 and inburgering readiness from day one.</li>
            <li>Designed as a scalable guided-learning platform for future language paths.</li>
          </ul>
        </Card>

        <Card variant="outlined" padding="md">
          <h2 className="text-title font-bold text-ink-primary">Philosophy</h2>
          <ul className="mt-3 space-y-2 list-disc pl-5 text-body text-ink-secondary">
            <li>Not a phrasebook.</li>
            <li>Not endless vocabulary without context.</li>
            <li>Outcome-driven learning with practical feedback and progress visibility.</li>
          </ul>
        </Card>

        <Card variant="flat" padding="md" className="border border-slate-200 bg-surface-muted/70">
          <p className="text-body text-ink-secondary leading-relaxed">
            Built for people navigating real life in the Netherlands, one useful step at a time.
          </p>
        </Card>
      </div>
    </div>
  )
}
