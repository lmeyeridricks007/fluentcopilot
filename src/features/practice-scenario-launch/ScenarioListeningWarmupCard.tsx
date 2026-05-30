'use client'

import Link from 'next/link'
import { Headphones } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ScenarioListeningWarmupSuggestion } from '@/lib/listening-mode/scenarioListeningWarmup'

type Props = {
  suggestion: ScenarioListeningWarmupSuggestion
}

export function ScenarioListeningWarmupCard({ suggestion }: Props) {
  return (
    <Card
      variant="outlined"
      padding="md"
      className="border-teal-200/80 bg-gradient-to-br from-teal-50/40 via-surface-elevated to-white"
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-900 ring-1 ring-teal-200/70">
          <Headphones className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption font-bold uppercase tracking-[0.12em] text-teal-900/80">Same life area</p>
          <h2 className="mt-1 text-body font-semibold text-ink-primary">{suggestion.title}</h2>
          <p className="mt-1.5 text-body-sm leading-relaxed text-ink-secondary">{suggestion.body}</p>
          <Link
            href={suggestion.href}
            className="mt-3 inline-flex min-h-touch items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-body-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            {suggestion.ctaLabel}
          </Link>
        </div>
      </div>
    </Card>
  )
}
