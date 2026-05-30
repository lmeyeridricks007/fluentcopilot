'use client'

import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'

export function SaveToLibraryBlock(props: {
  blockId: string
  bodyEn: string
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { bodyEn, compact, disabled, onComplete } = props
  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <p className="text-body-sm text-ink-secondary leading-snug">{bodyEn}</p>
      <Button variant="primary" fullWidth disabled={disabled} onClick={() => onComplete({ outcome: 'self_reported' })}>
        Continue
      </Button>
    </BlockSurface>
  )
}
