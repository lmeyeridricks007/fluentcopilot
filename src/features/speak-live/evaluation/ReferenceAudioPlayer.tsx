'use client'

import { useCallback, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import type { AudioLoadStatus } from './evaluationUtils'

export type ReferenceAudioPlayerProps = {
  src: string | null
  status: AudioLoadStatus
  variant: 'reference_pronunciation' | 'more_natural_dutch'
  sentenceText: string
  reasonText?: string
  className?: string
}

/**
 * “Reference” lane — warm emerald strip, clearly not the learner lane.
 */
export function ReferenceAudioPlayer({
  src,
  status,
  variant,
  sentenceText,
  reasonText,
  className = '',
}: ReferenceAudioPlayerProps) {
  const ref = useRef<HTMLAudioElement>(null)
  const headline =
    variant === 'more_natural_dutch' ? 'More natural Dutch version' : 'Native-style reference'
  const sub =
    variant === 'more_natural_dutch'
      ? 'Improved phrasing for this situation — compare tone and word order.'
      : 'Same idea, model delivery — focus on pronunciation and rhythm.'

  const replay = useCallback(() => {
    const el = ref.current
    if (!el || !src) return
    el.pause()
    el.currentTime = 0
    void el.play().catch(() => {})
  }, [src])

  return (
    <div className={`rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-card ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-caption font-bold text-emerald-950 tracking-wide">{headline}</p>
          <p className="text-[10px] text-ink-secondary">{sub}</p>
        </div>
      </div>

      {sentenceText.trim() ? (
        <p className="text-body-sm text-ink-primary leading-snug font-medium mb-2 border-l-2 border-emerald-400 pl-3">
          {sentenceText.trim()}
        </p>
      ) : null}

      {reasonText?.trim() ? <p className="text-caption text-ink-secondary leading-relaxed mb-3">{reasonText.trim()}</p> : null}

      {status === 'loading' ? (
        <div className="flex items-center gap-3 py-3">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 motion-safe:animate-spin shrink-0" />
          <p className="text-caption text-ink-secondary">Preparing reference audio…</p>
        </div>
      ) : null}

      {status === 'empty' ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-caption text-amber-950 font-semibold">Native audio not available</p>
          <p className="text-[11px] text-amber-900 mt-1">
            You can still read the improved sentence above and practise saying it out loud.
          </p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
          <p className="text-caption text-rose-900 font-semibold">Could not load reference audio</p>
          <p className="text-[11px] text-rose-800 mt-1">You can still read the reference sentence and reason.</p>
        </div>
      ) : null}

      {status === 'ready' && src ? (
        <div className="space-y-2">
          <audio ref={ref} key={src} controls className="w-full h-10 accent-emerald-600" src={src} preload="metadata" />
          <button
            type="button"
            onClick={replay}
            className="w-full min-h-touch rounded-lg border border-emerald-300 bg-white py-2.5 text-caption font-semibold text-emerald-900 hover:bg-emerald-100 active:scale-[0.99]"
          >
            Replay reference
          </button>
        </div>
      ) : null}
    </div>
  )
}
