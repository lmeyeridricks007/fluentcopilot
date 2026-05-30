'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'

export function ReflectionCheckBlock(props: {
  blockId: string
  promptEn: string
  yesLabel?: string
  notYetLabel?: string
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { promptEn, yesLabel = 'Yes', notYetLabel = 'Not yet', compact, disabled, onComplete } = props
  const [picked, setPicked] = useState<'yes' | 'not_yet' | null>(null)

  const pick = (choice: 'yes' | 'not_yet') => {
    if (disabled || picked) return
    setPicked(choice)
    onComplete({
      outcome: 'self_reported',
      userAnswer: { reflection: choice },
    })
  }

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <p className="text-body-sm font-semibold text-ink-primary leading-snug">{promptEn}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || Boolean(picked)}
          onClick={() => pick('yes')}
          className={clsx(
            'min-h-touch rounded-2xl border px-3 py-3 text-body-sm font-semibold transition-colors',
            picked === 'yes' ? 'border-emerald-400 bg-emerald-50 text-emerald-950' : 'border-slate-200 bg-white text-ink-primary',
          )}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          disabled={disabled || Boolean(picked)}
          onClick={() => pick('not_yet')}
          className={clsx(
            'min-h-touch rounded-2xl border px-3 py-3 text-body-sm font-semibold transition-colors',
            picked === 'not_yet' ? 'border-slate-400 bg-slate-100 text-ink-primary' : 'border-slate-200 bg-white text-ink-primary',
          )}
        >
          {notYetLabel}
        </button>
      </div>
    </BlockSurface>
  )
}
