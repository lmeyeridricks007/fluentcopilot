import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { ContinuePracticeItem } from '../types'

function modeLabel(mode: ContinuePracticeItem['mode']): string {
  switch (mode) {
    case 'guided':
      return 'Guided'
    case 'semi_guided':
      return 'Semi-guided'
    case 'free':
      return 'Free conversation'
    case 'speaking_focus':
      return 'Speaking focus'
    case 'listening_focus':
      return 'Listening focus'
    default:
      return 'Practice'
  }
}

export function ContinuePracticeCard({
  item,
  variant = 'continue',
}: {
  item: ContinuePracticeItem
  variant?: 'continue' | 'next'
}) {
  const kicker = variant === 'continue' ? 'Continue the conversation' : 'Best next live practice'
  const cta = variant === 'continue' ? 'Continue thread' : 'Practice now'
  return (
    <Card
      variant="elevated"
      padding="md"
      className="border border-primary-100 bg-gradient-to-br from-primary-50/90 via-surface-elevated to-surface-elevated shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary-600" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-caption font-semibold text-primary-700 uppercase tracking-wide">{kicker}</p>
          <p className="text-body-lg font-semibold text-ink-primary mt-0.5 truncate">{item.title}</p>
          <p className="text-body-sm text-ink-secondary mt-1 line-clamp-2">{item.summary}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-caption font-medium text-ink-secondary bg-surface-muted px-2 py-0.5 rounded-md">
              {modeLabel(item.mode)}
            </span>
            <span className="text-caption text-ink-tertiary">~{item.estimatedMinutes} min</span>
            {item.lastActiveLabel ? (
              <span className="text-caption text-ink-tertiary">· {item.lastActiveLabel}</span>
            ) : null}
            {item.premiumDepth ? (
              <span className="text-caption font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                Premium depth
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <Link
        href={item.href}
        className="mt-4 flex w-full min-h-touch items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-body font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        {cta}
        <ChevronRight className="w-4 h-4 ml-1" aria-hidden />
      </Link>
    </Card>
  )
}
