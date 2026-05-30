'use client'

import { Card } from '@/components/ui/Card'

const FAQ_ITEMS = [
  {
    q: 'Is this an official exam course?',
    a: 'No. FluentCopilot is not an official exam provider, but the learning path is aligned with A2 and inburgering realities.',
  },
  {
    q: 'Does this guarantee I pass?',
    a: 'No product can guarantee exam success. We focus on structured prep, realistic practice, and clear feedback to improve readiness.',
  },
  {
    q: 'How is this different from Duolingo?',
    a: 'The app focuses on real Dutch scenarios, deeper speaking and writing feedback, and practical exam-oriented structure.',
  },
  {
    q: 'What happens during beta?',
    a: 'Access is invite-only, no billing is active, and features may evolve as we improve quality and reliability.',
  },
  {
    q: 'When will I pay?',
    a: 'Billing starts after public launch. During closed beta, pricing shown on marketing pages is indicative.',
  },
  {
    q: 'Can I use this without an exam goal?',
    a: 'Yes. The system is useful for practical Dutch in daily life, while still being designed around A2 outcomes.',
  },
  {
    q: 'Is FluentCopilot only for Dutch forever?',
    a: 'Dutch is our first language path. The product is designed as a guided learning platform that can expand to additional languages over time.',
  },
] as const

export function MarketingFaqPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-5 py-12 sm:py-16">
      <header>
        <p className="text-caption font-bold uppercase tracking-wide text-primary-800">FAQ</p>
        <h1 className="mt-3 text-display sm:text-4xl font-bold text-ink-primary">Frequently asked questions</h1>
      </header>

      <div className="mt-8 space-y-3">
        {FAQ_ITEMS.map((item) => (
          <Card key={item.q} variant="outlined" padding="none">
            <details className="group px-4 py-4 sm:px-5">
              <summary className="cursor-pointer list-none pr-7 text-body font-semibold text-ink-primary marker:content-none">
                {item.q}
                <span className="float-right text-ink-secondary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-body-sm text-ink-secondary leading-relaxed">{item.a}</p>
            </details>
          </Card>
        ))}
      </div>
    </div>
  )
}
