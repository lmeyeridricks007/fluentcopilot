'use client'

import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { TokenSentenceArrangeBlock } from './TokenSentenceArrangeBlock'

export function ReorderSentenceBlock(props: {
  blockId: string
  tokens: string[]
  correctSentenceNl: string
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  return <TokenSentenceArrangeBlock {...props} intent="reorder" />
}
