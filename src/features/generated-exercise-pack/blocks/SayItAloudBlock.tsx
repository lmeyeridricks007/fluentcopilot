'use client'

import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'
import { PackReferenceAudioControls } from '../PackReferenceAudioControls'

export function SayItAloudBlock(props: {
  blockId: string
  instructionEn: string
  targetNl: string
  exampleLinesNl?: string[]
  referenceAudioUrl?: string | null
  voice?: string
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { instructionEn, targetNl, exampleLinesNl, referenceAudioUrl, voice, compact, disabled, onComplete } = props
  const extras = (exampleLinesNl ?? []).filter((x) => x.trim() && x.trim() !== targetNl.trim()).slice(0, 4)

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <p className="text-caption text-ink-secondary leading-snug">{instructionEn}</p>
      <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-3.5">
        <p className="text-body font-semibold text-ink-primary whitespace-pre-wrap">{targetNl}</p>
      </div>
      <PackReferenceAudioControls
        line={targetNl}
        referenceAudioUrl={referenceAudioUrl}
        voice={voice}
        disabled={disabled}
        compact={compact}
        rowLabel="Listen"
      />
      {extras.length ? (
        <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
          {extras.map((ex, i) => (
            <div key={`${i}-${ex.slice(0, 20)}`} className="rounded-xl border border-teal-100/80 bg-white/80 p-2.5">
              <p className="text-body-sm font-medium text-ink-primary whitespace-pre-wrap">{ex}</p>
              <PackReferenceAudioControls line={ex} voice={voice} disabled={disabled} compact className="mt-2" rowLabel="Listen" />
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
        Said it aloud — done
      </Button>
    </BlockSurface>
  )
}
