'use client'

import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'
import { PackReferenceAudioControls } from '../PackReferenceAudioControls'

export function HearAndRepeatBlock(props: {
  blockId: string
  textNl: string
  helperEn?: string
  /** Extra Dutch lines from the saved word / capture (each gets reference playback). */
  exampleLinesNl?: string[]
  referenceAudioUrl?: string | null
  voice?: string
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { textNl, helperEn, exampleLinesNl, referenceAudioUrl, voice, compact, disabled, onComplete } = props
  const extras = (exampleLinesNl ?? []).filter((x) => x.trim() && x.trim() !== textNl.trim()).slice(0, 5)

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      {helperEn ? <p className="text-caption text-ink-secondary leading-snug">{helperEn}</p> : null}
      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5">
        <p className="text-body font-semibold text-ink-primary whitespace-pre-wrap leading-relaxed">{textNl}</p>
      </div>
      <PackReferenceAudioControls
        line={textNl}
        referenceAudioUrl={referenceAudioUrl}
        voice={voice}
        disabled={disabled}
        compact={compact}
        rowLabel="Listen"
      />
      {extras.length ? (
        <div className={compact ? 'space-y-2 pt-1' : 'space-y-3 pt-1'}>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Also hear</p>
          {extras.map((ex, i) => (
            <div key={`${i}-${ex.slice(0, 24)}`} className="rounded-xl border border-slate-100 bg-white/90 p-2.5">
              <p className="text-body-sm font-medium text-ink-primary whitespace-pre-wrap leading-snug">{ex}</p>
              <PackReferenceAudioControls line={ex} voice={voice} disabled={disabled} compact rowLabel={`Example ${i + 1}`} className="mt-2" />
            </div>
          ))}
        </div>
      ) : null}
      <Button
        variant="primary"
        fullWidth
        disabled={disabled}
        onClick={() => onComplete({ outcome: 'self_reported' })}
      >
        Listen and repeat — done
      </Button>
    </BlockSurface>
  )
}
