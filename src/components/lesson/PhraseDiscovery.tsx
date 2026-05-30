'use client'

import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { speakNl } from '@/lib/lesson-engine/speakNl'

export type PhraseItem = { nl: string; en: string; focus?: string }

type Props = {
  phrases: PhraseItem[]
  onAllTapped: () => void
}

export function PhraseDiscovery({ phrases, onAllTapped }: Props) {
  const [tapped, setTapped] = useState<Record<number, boolean>>({})
  const [open, setOpen] = useState<number | null>(null)
  const onAllTappedRef = useRef(onAllTapped)
  onAllTappedRef.current = onAllTapped

  /** Fires after render — never call `onAllTapped` inside a setState updater (updates parent during child update). */
  const completionSentRef = useRef(false)
  useEffect(() => {
    if (phrases.length === 0) return
    const allDone = phrases.every((_, j) => tapped[j])
    if (!allDone || completionSentRef.current) return
    completionSentRef.current = true
    onAllTappedRef.current()
  }, [phrases.length, tapped])

  const toggle = (i: number) => {
    setOpen((o) => (o === i ? null : i))
    speakNl(phrases[i].nl)
    setTapped((prev) => ({ ...prev, [i]: true }))
  }

  return (
    <div className="space-y-3">
      {phrases.map((p, i) => (
        <div key={i} className="relative">
          <button
            type="button"
            onClick={() => toggle(i)}
            className={clsx(
              'w-full text-left rounded-xl border px-4 py-3 transition-all active:scale-[0.99]',
              tapped[i]
                ? 'border-primary-400 bg-primary-50/60'
                : 'border-slate-200 bg-surface-elevated shadow-card'
            )}
          >
            <span className="text-body-lg text-ink-primary font-medium">{p.nl}</span>
            {p.focus && (
              <span className="ml-2 text-body-sm text-primary-600 underline decoration-dotted">
                ({p.focus})
              </span>
            )}
          </button>
          {open === i && (
            <div className="mt-2 rounded-lg bg-slate-900 text-white text-body-sm px-3 py-2 opacity-95 transition-opacity duration-200">
              {p.en}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
