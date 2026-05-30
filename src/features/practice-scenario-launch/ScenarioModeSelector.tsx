'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'
import { Check, ChevronRight, Lock, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ScenarioCatalogEntry } from '@/lib/schemas/practice/scenarioCatalogEntry.schema'
import type { PracticeConversationMode } from '@/lib/schemas/practice/practiceShared.schema'
import { hasGuidedScenario } from '@/lib/practice/guided/guidedScenarioRegistry'
import { getPracticeModeAccess, type ModeAccessResult } from '@/lib/practice/scenarioModeAccess'
import {
  hasCompletedGuidedScenario,
  hasPracticeUnlockedFreeMode,
} from '@/lib/practice/scenarioProgressStorage'
import type { Tier } from '@/features/entitlements/EntitlementContext'

const MODE_ORDER: PracticeConversationMode[] = ['guided', 'semi_guided', 'free']

const SHORT: Record<PracticeConversationMode, { title: string; tag: string; href: (id: string) => string }> = {
  guided: {
    title: 'Guided',
    tag: 'Full coaching',
    href: (id) => `/app/practice/guided/${id}`,
  },
  semi_guided: {
    title: 'Semi-guided',
    tag: 'You type',
    href: (id) => `/app/practice/semi/${id}`,
  },
  free: {
    title: 'Free',
    tag: 'You lead',
    href: (id) => `/app/practice/free/${id}`,
  },
}

export function ScenarioModeSelector({
  entry,
  tier,
}: {
  entry: ScenarioCatalogEntry
  tier: Tier
}) {
  const modes = MODE_ORDER.filter((m) => entry.supportedModes.includes(m))
  const guidedDone = hasCompletedGuidedScenario(entry.id)
  const freeUnlocked = hasPracticeUnlockedFreeMode(entry.id)
  const guidedExists = hasGuidedScenario(entry.id)

  const ladderStep = useMemo(() => {
    if (!guidedExists) return 0
    if (!guidedDone) return 0
    if (tier !== 'premium' && tier !== 'trial') return 1
    if (!freeUnlocked) return 1
    return 2
  }, [freeUnlocked, guidedDone, guidedExists, tier])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-1 sm:gap-2 px-1">
        {modes.map((mode, i) => {
          const done =
            (mode === 'guided' && guidedDone) ||
            (mode === 'free' && freeUnlocked && (tier === 'premium' || tier === 'trial'))
          const active = i === ladderStep
          return (
            <div key={mode} className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
              <div
                className={clsx(
                  'flex flex-col items-center flex-1 min-w-0 rounded-xl border px-2 py-2 transition-colors',
                  done && 'border-emerald-200 bg-emerald-50/50',
                  active && !done && 'border-primary-200 bg-primary-50/40',
                  !done && !active && 'border-slate-200/90 bg-surface-muted/30'
                )}
              >
                <span
                  className={clsx(
                    'w-7 h-7 rounded-full flex items-center justify-center text-caption font-bold shrink-0',
                    done ? 'bg-emerald-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-slate-200 text-ink-secondary'
                  )}
                >
                  {done ? <Check className="w-4 h-4" aria-hidden /> : i + 1}
                </span>
                <span className="text-caption font-semibold text-ink-primary mt-1.5 truncate w-full text-center">
                  {SHORT[mode].title}
                </span>
                <span className="text-[10px] sm:text-caption text-ink-tertiary text-center leading-tight line-clamp-2">
                  {SHORT[mode].tag}
                </span>
              </div>
              {i < modes.length - 1 ? (
                <ChevronRight className="w-4 h-4 text-ink-tertiary shrink-0 hidden sm:block" aria-hidden />
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="text-caption text-ink-secondary text-center leading-snug">
        {guidedExists
          ? guidedDone
            ? 'Guided complete — unlock deeper modes as you go.'
            : 'Start with Guided once — Semi-guided opens next for this scene.'
          : 'Pick a mode — same situation, different support.'}
      </p>
      <div className="space-y-3">
        {modes.map((mode) => {
          const access = getPracticeModeAccess(entry, mode, tier)
          const meta = SHORT[mode]
          const href = meta.href(entry.id)
          const isGuidedWithoutAsset = mode === 'guided' && !guidedExists

          let progressHint: string | undefined
          if (mode === 'semi_guided' && guidedExists && !guidedDone) {
            progressHint = 'Complete Guided · 0/1'
          }
          if (mode === 'free' && (tier === 'premium' || tier === 'trial') && !freeUnlocked && !guidedDone) {
            progressHint = 'Finish Guided or a solid Semi run to unlock'
          }

          return (
            <ModeRow
              key={mode}
              mode={mode}
              title={meta.title}
              progressHint={progressHint}
              href={href}
              access={access}
              showClassicFallback={isGuidedWithoutAsset}
              scenarioId={entry.id}
            />
          )
        })}
      </div>
    </div>
  )
}

function ModeRow({
  mode,
  title,
  progressHint,
  href,
  access,
  showClassicFallback,
  scenarioId,
}: {
  mode: PracticeConversationMode
  title: string
  progressHint?: string
  href: string
  access: ModeAccessResult
  showClassicFallback: boolean
  scenarioId: string
}) {
  if (showClassicFallback) {
    return (
      <Card variant="outlined" padding="sm" className="border-dashed border-slate-300">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-body-sm font-semibold text-ink-primary">{title}</p>
            <p className="text-caption text-ink-secondary mt-1 leading-snug">
              Guided isn’t ready for this topic yet. Use Semi-guided or classic chat.
            </p>
          </div>
        </div>
        <Link
          href={`/app/practice/simulation/${scenarioId}`}
          className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-primary-600"
        >
          Open classic chat <ChevronRight className="w-4 h-4" aria-hidden />
        </Link>
      </Card>
    )
  }

  if (!access.allowed) {
    return (
      <Card variant="outlined" padding="sm" className="opacity-95 border-slate-200">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-ink-tertiary shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-ink-primary">{title}</p>
            {progressHint ? (
              <p className="text-caption font-medium text-primary-700 mt-1">{progressHint}</p>
            ) : null}
            <p className="text-caption text-ink-secondary mt-1 leading-snug">{access.hint}</p>
            {access.reason === 'needs_premium' ? (
              <Link
                href="/app/premium"
                className="inline-flex items-center gap-1 text-caption font-medium text-primary-600 mt-2"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
                View Premium
              </Link>
            ) : null}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Link href={href} className="block min-h-touch">
      <Card
        variant="outlined"
        padding="sm"
        className={clsx(
          'h-full border-slate-200/90 hover:border-primary-200/90 hover:shadow-sm transition-all active:scale-[0.99]',
          mode === 'free' && 'border-slate-300 bg-slate-50/50'
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-ink-primary">{title}</p>
            {progressHint ? (
              <p className="text-caption font-medium text-primary-700 mt-1">{progressHint}</p>
            ) : null}
            <p className="text-caption text-ink-secondary mt-1 leading-snug">
              {mode === 'guided'
                ? 'Structured turns — best when the situation is new.'
                : mode === 'semi_guided'
                  ? 'Your words, help on demand — same scene.'
                  : 'Premium — lead the dialogue when it feels familiar.'}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-tertiary shrink-0" aria-hidden />
        </div>
      </Card>
    </Link>
  )
}
