'use client'

import { useCallback, useRef } from 'react'
import { Mic } from 'lucide-react'
import type { AudioLoadStatus } from './evaluationUtils'

export type LearnerAudioPlayerProps = {
  /** Resolved playback URL (blob:, data:, or https) */
  src: string | null
  status: AudioLoadStatus
  /** When status is empty */
  emptyMessage?: string
  className?: string
}

/**
 * Distinct “your take” lane — slate / cool border so it never reads like the reference strip.
 */
export function LearnerAudioPlayer({
  src,
  status,
  emptyMessage = 'No recording was stored for this turn. Next time, keep the mic through the full clip.',
  className = '',
}: LearnerAudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null)

  const replay = useCallback(() => {
    const el = ref.current
    if (!el || !src) return
    el.pause()
    el.currentTime = 0
    void el.play().catch(() => {})
  }, [src])

  return (
    <div className={`rounded-xl border border-violet-200 bg-violet-50 p-3 shadow-card ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
          <Mic className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-caption font-bold text-sky-950 tracking-wide">Your recording</p>
          <p className="text-[10px] text-ink-secondary">What the coach heard from you</p>
        </div>
      </div>

      {status === 'loading' ? (
        <div className="flex items-center gap-3 py-3">
          <div className="h-8 w-8 rounded-full border-2 border-violet-200 border-t-violet-600 motion-safe:animate-spin shrink-0" />
          <p className="text-caption text-ink-secondary">Loading your clip…</p>
        </div>
      ) : null}

      {status === 'empty' ? <p className="text-caption text-amber-900 leading-relaxed py-1">{emptyMessage}</p> : null}

      {status === 'error' ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
          <p className="text-caption text-rose-900 font-semibold">Could not load your audio</p>
          <p className="text-[11px] text-rose-800 mt-1">Check connection or try refreshing the report.</p>
        </div>
      ) : null}

      {status === 'ready' && src ? (
        <div className="space-y-2">
          <audio ref={ref} key={src} controls className="w-full h-10 accent-violet-600" src={src} preload="metadata" />
          <button
            type="button"
            onClick={replay}
            className="w-full min-h-touch rounded-lg border border-violet-300 bg-white py-2.5 text-caption font-semibold text-sky-950 hover:bg-violet-100 active:scale-[0.99]"
          >
            Replay from start
          </button>
        </div>
      ) : null}
    </div>
  )
}
