'use client'

import { clsx } from 'clsx'
import type { LiveAssistantMediaPhase, LiveSessionStatus } from './liveSpeakTypes'

const LABELS: Record<LiveSessionStatus, string> = {
  idle: 'Your turn',
  listening: 'Listening',
  transcribing: 'Taking that in…',
  got_it: 'Almost there…',
  thinking: 'Shaping a reply',
  replying: 'Preparing voice',
  speaking: 'Partner speaking',
  paused: 'Paused',
  ended: 'Ended',
  error: 'Something slipped',
}

const MEDIA_LABEL: Record<LiveAssistantMediaPhase, string | null> = {
  idle: null,
  assistant_text_ready: 'Reply ready',
  assistant_audio_loading: 'Voice almost ready',
  assistant_audio_ready: 'Ready to play',
}

export function LiveStatusBadge({
  status,
  assistantMediaPhase = 'idle',
  className,
}: {
  status: LiveSessionStatus
  /** When not idle, overrides the replying/thinking line for clearer text-vs-audio UX. */
  assistantMediaPhase?: LiveAssistantMediaPhase
  className?: string
}) {
  const mediaOverride =
    status === 'replying' && assistantMediaPhase !== 'idle' && MEDIA_LABEL[assistantMediaPhase]
      ? MEDIA_LABEL[assistantMediaPhase]
      : null
  const label = mediaOverride ?? LABELS[status] ?? 'Live session'
  const tone =
    status === 'listening' || status === 'transcribing'
      ? 'live'
      : status === 'got_it'
        ? 'live'
        : status === 'thinking' || status === 'replying' || status === 'speaking'
        ? 'warn'
        : status === 'error'
          ? 'danger'
          : status === 'paused'
            ? 'neutral'
            : 'neutral'

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        tone === 'live' &&
          (status === 'transcribing' || status === 'got_it'
            ? 'bg-violet-100 text-violet-900 ring-1 ring-violet-200'
            : 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200'),
        tone === 'warn' && 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
        tone === 'danger' && 'bg-rose-100 text-rose-900 ring-1 ring-rose-200',
        tone === 'neutral' && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
        className
      )}
    >
      <span
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          tone === 'live' &&
            (status === 'transcribing' || status === 'got_it' ? 'bg-violet-400 motion-safe:animate-pulse' : 'bg-emerald-400 motion-safe:animate-pulse'),
          tone === 'warn' && 'bg-amber-300 motion-safe:animate-pulse',
          tone === 'danger' && 'bg-rose-400',
          tone === 'neutral' && 'bg-slate-400'
        )}
        aria-hidden
      />
      {label}
    </span>
  )
}
