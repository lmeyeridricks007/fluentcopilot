'use client'

import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'

export function ExplanationCardBlock(props: {
  blockId: string
  eyebrow?: string
  title?: string
  paragraphs: string[]
  bullets?: string[]
  continueLabel?: string
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { eyebrow, title, paragraphs, bullets, continueLabel, compact, disabled, onComplete } = props
  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      {eyebrow ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
      ) : null}
      {title ? <h2 className="text-title font-bold text-ink-primary tracking-tight">{title}</h2> : null}
      <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {paragraphs.map((p, i) => (
          <p key={i} className="text-body-sm text-ink-secondary leading-snug whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
      {bullets?.length ? (
        <ul className="list-disc pl-5 space-y-1 text-body-sm text-ink-primary">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
      <Button
        variant="primary"
        fullWidth
        disabled={disabled}
        onClick={() => onComplete({ outcome: 'self_reported' })}
      >
        {continueLabel ?? 'Continue'}
      </Button>
    </BlockSurface>
  )
}
