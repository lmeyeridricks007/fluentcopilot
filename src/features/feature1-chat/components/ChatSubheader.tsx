'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, MoreVertical, Pause, SquarePen } from 'lucide-react'
import { clsx } from 'clsx'
import type { ConversationMode } from '../types'
import type { ThreadStatus } from '../types'

export function ChatSubheader({
  backHref,
  scenarioTitle,
  personaLabel,
  mode,
  threadStatus = 'active',
  onNewConversation,
  onPauseConversation,
  pauseDisabled,
  newDisabled,
}: {
  backHref: string
  scenarioTitle: string
  personaLabel: string
  mode: ConversationMode
  /** Current thread lifecycle — drives subtle header badge. */
  threadStatus?: ThreadStatus
  onNewConversation: () => void
  onPauseConversation?: () => void
  pauseDisabled?: boolean
  newDisabled?: boolean
}) {
  const [overflowOpen, setOverflowOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOverflowOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const statusLabel =
    threadStatus === 'paused' ? 'Paused' : threadStatus === 'completed' ? 'Completed' : 'Active'

  return (
    <div className="sticky top-0 z-30 -mx-4 px-2 py-2 border-b border-slate-200/70 bg-surface/95 backdrop-blur-md">
      <div className="flex items-center gap-1.5 min-h-touch">
        <Link
          href={backHref}
          className="shrink-0 min-h-touch min-w-touch inline-flex items-center justify-center rounded-xl text-ink-primary hover:bg-surface-muted"
          aria-label="Back to Talk"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden />
        </Link>
        <div className="flex-1 min-w-0 pl-0.5">
          <p className="text-body-sm font-bold text-ink-primary truncate">{scenarioTitle}</p>
          <p className="text-caption text-ink-secondary truncate flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{personaLabel}</span>
            <span
              className={clsx(
                'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                mode === 'guided' ? 'bg-primary-100 text-primary-900' : 'bg-slate-100 text-ink-secondary'
              )}
            >
              {mode === 'guided' ? 'Guided' : 'Free'}
            </span>
            <span
              className={clsx(
                'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                threadStatus === 'active'
                  ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80'
                  : threadStatus === 'paused'
                    ? 'bg-amber-50 text-amber-950 ring-1 ring-amber-200/80'
                    : 'bg-slate-100 text-ink-secondary'
              )}
            >
              {statusLabel}
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={newDisabled}
          onClick={onNewConversation}
          className="shrink-0 min-h-touch px-2.5 rounded-xl border border-primary-200 bg-primary-50/90 text-primary-900 text-caption font-bold inline-flex items-center gap-1 hover:bg-primary-50 disabled:opacity-40"
          aria-label="Start new conversation"
        >
          <SquarePen className="w-4 h-4 shrink-0" aria-hidden />
          <span className="hidden min-[380px]:inline">New</span>
        </button>
        {onPauseConversation ? (
          <div className="relative shrink-0" ref={ref}>
            <button
              type="button"
              onClick={() => setOverflowOpen((o) => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-surface-muted text-ink-primary"
              aria-expanded={overflowOpen}
              aria-haspopup="menu"
              aria-label="More conversation actions"
            >
              <MoreVertical className="w-5 h-5" aria-hidden />
            </button>
            {overflowOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 min-w-[12rem] rounded-xl border border-slate-200 bg-white shadow-lg py-1 z-50"
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={pauseDisabled || threadStatus !== 'active'}
                  onClick={() => {
                    setOverflowOpen(false)
                    onPauseConversation()
                  }}
                  className="w-full text-left px-3 py-2.5 text-body-sm font-medium text-ink-primary hover:bg-surface-muted disabled:opacity-40 min-h-touch inline-flex items-center gap-2"
                >
                  <Pause className="w-4 h-4 shrink-0 text-ink-secondary" aria-hidden />
                  Pause conversation
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
