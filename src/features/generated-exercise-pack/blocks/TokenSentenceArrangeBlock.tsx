'use client'

import { useCallback, useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface, normText } from '../blockPrimitives'

export type SentenceArrangeIntent = 'reorder' | 'build'

export function TokenSentenceArrangeBlock(props: {
  blockId: string
  tokens: string[]
  correctSentenceNl: string
  intent: SentenceArrangeIntent
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { tokens, correctSentenceNl, intent, compact, disabled, onComplete } = props
  const [pool, setPool] = useState<string[]>(() => [...tokens])
  const [built, setBuilt] = useState<string[]>([])
  const [solved, setSolved] = useState(false)

  const tokenKey = tokens.join('\u0001')
  useEffect(() => {
    setPool([...tokens])
    setBuilt([])
    setSolved(false)
  }, [tokenKey, tokens])

  const reset = useCallback(() => {
    setPool([...tokens])
    setBuilt([])
  }, [tokens])

  const tapPool = (w: string, i: number) => {
    if (disabled || solved) return
    setPool((p) => p.filter((_, idx) => idx !== i))
    setBuilt((b) => [...b, w])
  }
  const tapBuilt = (w: string, i: number) => {
    if (disabled || solved) return
    setBuilt((b) => b.filter((_, idx) => idx !== i))
    setPool((p) => [...p, w])
  }

  const check = () => {
    if (disabled || solved) return
    const got = built.join(' ').trim()
    if (normText(got) === normText(correctSentenceNl)) {
      setSolved(true)
      onComplete({
        correctness: 1,
        outcome: 'correct',
        userAnswer: { sentence: got },
      })
    }
  }

  const hint =
    intent === 'build' ? 'Tap chips to build one natural line.' : 'Tap words in order to rebuild the phrase.'

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <p className="text-caption text-ink-secondary leading-snug">{hint}</p>
      <p className="text-[10px] font-bold uppercase text-slate-500">Your line</p>
      <div className="min-h-[48px] flex flex-wrap gap-1.5 rounded-xl border border-dashed border-slate-200 bg-white p-2">
        {built.length === 0 ? (
          <span className="text-caption text-ink-tertiary">Tap below…</span>
        ) : (
          built.map((w, i) => (
            <button
              key={`${w}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => tapBuilt(w, i)}
              className="rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-caption font-semibold text-primary-900 min-h-touch"
            >
              {w}
            </button>
          ))
        )}
      </div>
      <p className="text-[10px] font-bold uppercase text-slate-500">Words</p>
      <div className="flex flex-wrap gap-1.5">
        {pool.map((w, i) => (
          <button
            key={`${w}-p-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => tapPool(w, i)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-caption font-medium text-ink-primary min-h-touch"
          >
            {w}
          </button>
        ))}
      </div>
      {solved ? <p className="text-caption font-medium text-emerald-800">Good next step.</p> : null}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="gap-1 min-h-touch" onClick={reset} disabled={disabled || solved}>
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reset
        </Button>
        <Button variant="primary" className="flex-1 min-h-touch" onClick={check} disabled={disabled || solved}>
          Check
        </Button>
      </div>
    </BlockSurface>
  )
}
