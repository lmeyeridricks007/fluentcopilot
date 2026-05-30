'use client'

import Link from 'next/link'
import { Layers } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ScenarioStreakVm } from '../types'

export function ScenarioStreakCard({ streak }: { streak: ScenarioStreakVm }) {
  return (
    <Card variant="flat" padding="sm" className="border border-slate-200/80 bg-surface-elevated">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <Layers className="w-5 h-5 text-primary-600" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption font-semibold text-ink-secondary uppercase tracking-wide">{streak.title}</p>
          <p className="text-body-sm font-semibold text-ink-primary mt-0.5">
            {streak.consecutiveDays > 0
              ? `${streak.consecutiveDays} day${streak.consecutiveDays === 1 ? '' : 's'} in a row`
              : 'Start today'}
            <span className="text-caption font-normal text-ink-secondary">
              {' '}
              · {streak.scenariosThisWeek} scenario{streak.scenariosThisWeek === 1 ? '' : 's'} this week
            </span>
          </p>
          <p className="text-caption text-ink-secondary mt-1 leading-snug">{streak.description}</p>
          <Link
            href={streak.href}
            className="inline-flex mt-2 text-body-sm font-medium text-primary-700 hover:underline"
          >
            {streak.ctaLabel} →
          </Link>
        </div>
      </div>
    </Card>
  )
}
