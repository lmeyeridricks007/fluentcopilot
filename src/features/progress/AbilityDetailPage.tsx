'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  ABILITY_MAP_GROUP_LABEL,
  buildAbilityDetailViewModel,
} from '@/lib/mastery/masteryPresenterModel'
import { useMasteryBuildInput } from '@/features/progress/useMasteryBuildInput'
import { useMemo } from 'react'

export function AbilityDetailPage({ abilityId }: { abilityId: string }) {
  const input = useMasteryBuildInput()
  const vm = useMemo(() => buildAbilityDetailViewModel(abilityId, input), [abilityId, input])

  if (!vm) {
    return (
      <div className="px-4 py-10 max-w-lg mx-auto text-center text-body-sm text-ink-secondary">
        Unknown ability.{' '}
        <Link href="/app/progress#mastery-map" className="text-primary-600 font-medium">
          Back to map
        </Link>
      </div>
    )
  }

  const { def, card, scenarios, skillTracks } = vm

  return (
    <div className="px-4 py-6 pb-28 max-w-lg mx-auto space-y-5">
      <header>
        <Link
          href="/app/progress#mastery-map"
          className="inline-flex items-center gap-1 text-caption font-medium text-primary-600 mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Ability map
        </Link>
        <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide">
          {ABILITY_MAP_GROUP_LABEL[def.mapGroup]}
        </p>
        <h1 className="text-title font-bold text-ink-primary mt-1">{def.title}</h1>
        <p className="text-body-sm text-ink-secondary mt-2 leading-relaxed">{def.description}</p>
      </header>

      <Card variant="flat" padding="md" className="border border-slate-200 space-y-2">
        <div className="flex flex-wrap gap-2">
          <span className="text-caption font-semibold px-2 py-0.5 rounded-md border bg-surface-muted">
            {card.bandLabel}
          </span>
          <span className="text-caption text-ink-tertiary py-0.5">{card.trendLabel}</span>
        </div>
        {card.lastPracticedLabel ? (
          <p className="text-caption text-ink-secondary">{card.lastPracticedLabel}</p>
        ) : null}
        {card.weaknessNote ? <p className="text-caption text-primary-800">{card.weaknessNote}</p> : null}
        <p className="text-body-sm text-ink-primary mt-2">
          <span className="font-medium">Suggested next: </span>
          {card.nextPractice.detail}
        </p>
        <Link
          href={card.nextPractice.href}
          className="inline-flex mt-2 min-h-touch items-center px-4 py-2.5 rounded-xl bg-primary-600 text-white text-body-sm font-medium hover:bg-primary-700"
        >
          {card.nextPractice.label}
        </Link>
        {card.secondaryPractice ? (
          <Link
            href={card.secondaryPractice.href}
            className="block text-center text-caption font-medium text-primary-600 mt-2"
          >
            {card.secondaryPractice.label} →
          </Link>
        ) : null}
      </Card>

      <section aria-label="Scenarios">
        <h2 className="text-body-sm font-semibold text-ink-primary mb-2">Scenarios that train this</h2>
        <ul className="space-y-2">
          {scenarios.map((s) => (
            <li key={s.id}>
              <Link
                href={s.href}
                className="block rounded-xl border border-slate-200 px-3 py-2.5 text-body-sm font-medium text-ink-primary hover:bg-surface-muted"
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Skill tracks">
        <h2 className="text-body-sm font-semibold text-ink-primary mb-2">Related skill tracks</h2>
        <ul className="space-y-2">
          {skillTracks.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                className="block rounded-xl border border-slate-200 px-3 py-2.5 text-body-sm font-medium text-ink-primary hover:bg-surface-muted"
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Link href="/app/practice" className="block text-center text-caption text-ink-tertiary">
        Open Practice hub
      </Link>
    </div>
  )
}
