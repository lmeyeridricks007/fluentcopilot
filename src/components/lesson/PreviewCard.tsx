'use client'

import { useCallback, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { speakNl } from '@/lib/lesson-engine/speakNl'

export type PreviewItem = {
  id: string
  word: string
  lemma: string
  translationEn: string
  emoji?: string
}

type Props = {
  items: PreviewItem[]
  onEngaged: () => void
  /** Optional: track per-card audio for “hear every word” lessons. */
  onItemPlayed?: (id: string) => void
}

export function PreviewCard({ items, onEngaged, onItemPlayed }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [pulse, setPulse] = useState(false)

  const play = useCallback(
    (word: string, itemId: string) => {
      setPulse(true)
      speakNl(word)
      onEngaged()
      onItemPlayed?.(itemId)
      window.setTimeout(() => setPulse(false), 900)
    },
    [onEngaged, onItemPlayed]
  )

  return (
    <div className="w-full">
      <p className="text-body-sm text-ink-secondary mb-3 text-center">Swipe — tap 🔊</p>
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-thin"
        onScroll={() => {
          const el = scrollerRef.current
          if (!el) return
          const w = el.offsetWidth || 1
          const i = Math.round(el.scrollLeft / (w * 0.72))
          setActive(Math.min(Math.max(i, 0), items.length - 1))
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            className={clsx(
              'min-w-[72%] snap-center rounded-card border border-slate-200 bg-surface-elevated p-4 shadow-card transition-transform duration-300',
              active === i && 'scale-[1.02]'
            )}
          >
            <div className="text-center text-4xl mb-2">{item.emoji ?? '📝'}</div>
            <p className="text-title text-center text-ink-primary font-semibold">{item.word}</p>
            <p className="text-caption text-center text-ink-secondary mt-1">{item.translationEn}</p>
            <button
              type="button"
              onClick={() => play(item.word, item.id)}
              className={clsx(
                'mt-4 w-full min-h-touch rounded-lg bg-primary-50 text-primary-700 font-medium text-body-sm transition-transform active:scale-95',
                pulse && active === i && 'animate-lesson-pulse-ring rounded-full'
              )}
            >
              🔊 Luister
            </button>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {items.map((_, i) => (
          <span
            key={i}
            className={clsx(
              'h-1.5 w-1.5 rounded-full transition-colors',
              i === active ? 'bg-primary-600' : 'bg-slate-300'
            )}
          />
        ))}
      </div>
    </div>
  )
}
