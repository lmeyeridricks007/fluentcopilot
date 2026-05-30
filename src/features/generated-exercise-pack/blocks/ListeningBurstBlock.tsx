'use client'

import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { speakNl } from '../blockPrimitives'
import { PackReferenceAudioControls } from '../PackReferenceAudioControls'
import { MultipleChoiceBlock } from './MultipleChoiceBlock'

export function ListeningBurstBlock(props: {
  blockId: string
  textNl: string
  playsRecommended?: number
  questionEn: string
  options: { id: string; label: string }[]
  correctOptionId: string
  correctExplanationEn?: string
  referenceAudioUrl?: string | null
  voice?: string
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const {
    blockId,
    textNl,
    playsRecommended = 2,
    questionEn,
    options,
    correctOptionId,
    correctExplanationEn,
    referenceAudioUrl,
    voice,
    compact,
    disabled,
    onComplete,
  } = props

  return (
    <div className="space-y-4" data-block-id={blockId}>
      <p className="text-caption text-ink-secondary leading-snug">
        Listen {playsRecommended}×, then pick an answer.
      </p>
      <PackReferenceAudioControls
        line={textNl}
        referenceAudioUrl={referenceAudioUrl}
        voice={voice}
        disabled={disabled}
        compact={compact}
        rowLabel="Passage"
      />
      <Button type="button" variant="secondary" className="gap-2 min-h-touch" onClick={() => speakNl(textNl)} disabled={disabled}>
Replay (device)
      </Button>
      <MultipleChoiceBlock
        blockId={`${blockId}-mc`}
        question={questionEn}
        options={options}
        correctOptionId={correctOptionId}
        correctExplanation={correctExplanationEn}
        incorrectFeedbackStyle="listening"
        compact={compact}
        disabled={disabled}
        onComplete={onComplete}
      />
    </div>
  )
}
