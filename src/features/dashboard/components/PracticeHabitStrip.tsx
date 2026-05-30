'use client'

import Link from 'next/link'
import { Flame, Layers, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ScenarioStreakVm } from '@/features/practice-hub/types'

export function PracticeHabitStrip({
  retentionStreak,
  retentionCaption,
  totalXp,
  scenarioStreak,
}: {
  retentionStreak: number
  retentionCaption: string
  totalXp: number
  scenarioStreak: ScenarioStreakVm
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <Link href="/app/learn" className="block min-h-touch">
        <Card variant="flat" padding="sm" className="border border-slate-200/80 h-full hover:bg-surface-muted/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5 text-warning" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink-primary tabular-nums">
                {retentionStreak > 0 ? `${retentionStreak}d habit` : 'Start your streak today'}
              </p>
              <p className="text-caption text-ink-secondary line-clamp-2">{retentionCaption}</p>
            </div>
          </div>
        </Card>
      </Link>
      <Link href={scenarioStreak.href} className="block min-h-touch">
        <Card variant="flat" padding="sm" className="border border-slate-200/80 h-full hover:bg-surface-muted/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink-primary">
                {scenarioStreak.consecutiveDays > 0
                  ? `${scenarioStreak.consecutiveDays}d practice streak`
                  : 'Practice streak'}
              </p>
              <p className="text-caption text-ink-secondary line-clamp-2">
                {scenarioStreak.consecutiveDays === 0
                  ? 'One scenario starts your practice rhythm — short counts.'
                  : `${scenarioStreak.scenariosThisWeek} scenario${scenarioStreak.scenariosThisWeek === 1 ? '' : 's'} this week`}
              </p>
            </div>
          </div>
        </Card>
      </Link>
      <Link href="/app/progress" className="block min-h-touch">
        <Card variant="flat" padding="sm" className="border border-slate-200/80 h-full hover:bg-surface-muted/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-600" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-body font-semibold text-ink-primary tabular-nums">{totalXp} XP</p>
              <p className="text-caption text-ink-secondary">Lessons, review & practice</p>
            </div>
          </div>
        </Card>
      </Link>
    </div>
  )
}
