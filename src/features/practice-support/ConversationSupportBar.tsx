'use client'

import type { LucideIcon } from 'lucide-react'
import {
  Feather,
  Languages,
  Lightbulb,
  ListMusic,
  Lock,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Turtle,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { SupportToolId, SupportToolRuntime } from '@/lib/practice-support/types'

const ICONS: Record<SupportToolId, LucideIcon> = {
  hint: Lightbulb,
  phrase_suggestions: ListMusic,
  slower_reply: Turtle,
  translate_key_phrase: Languages,
  say_naturally: Sparkles,
  what_means: Feather,
  restart_turn: RefreshCw,
  easier_mode: SlidersHorizontal,
}

export function ConversationSupportBar({
  tools,
  onTool,
  compact,
}: {
  tools: SupportToolRuntime[]
  onTool: (id: SupportToolId) => void
  /** When true, prefer short labels for narrow screens. */
  compact?: boolean
}) {
  const btn =
    'min-h-touch min-w-0 px-2.5 sm:px-3 rounded-xl text-caption font-medium border transition-colors inline-flex items-center justify-center gap-1 shrink-0'

  return (
    <div
      className="flex gap-2 pt-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
      role="toolbar"
      aria-label="Conversation support"
    >
      {tools.map((t) => {
        const Icon = ICONS[t.id]
        const label = compact ? t.shortLabel : t.label
        const disabled = !t.available && !t.premiumLocked
        return (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            title={t.disabledReason}
            onClick={() => onTool(t.id)}
            className={clsx(
              btn,
              disabled
                ? 'border-slate-100 bg-surface-muted/50 text-ink-tertiary opacity-60 cursor-not-allowed'
                : 'border-slate-200 bg-surface-elevated text-ink-secondary hover:border-primary-200',
              t.premiumLocked && 'border-amber-200/80 bg-amber-50/50'
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span className="truncate max-w-[7.5rem] sm:max-w-none">{label}</span>
            {t.premiumLocked ? <Lock className="w-3 h-3 shrink-0 text-amber-700" aria-hidden /> : null}
          </button>
        )
      })}
    </div>
  )
}
