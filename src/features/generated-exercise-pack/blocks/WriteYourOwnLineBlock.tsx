'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface } from '../blockPrimitives'

export function WriteYourOwnLineBlock(props: {
  blockId: string
  promptEn: string
  promptNl?: string
  minChars?: number
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { promptEn, promptNl, minChars = 6, compact, disabled, onComplete } = props
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const ok = text.trim().length >= minChars

  const submit = () => {
    if (!ok || disabled || submitted) return
    setSubmitted(true)
    onComplete({
      outcome: 'self_reported',
      userAnswer: { text: text.trim() },
    })
  }

  const retry = () => {
    setSubmitted(false)
    setText('')
  }

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <p className="text-body-sm text-ink-secondary leading-snug">{promptEn}</p>
      {promptNl ? <p className="text-caption text-ink-tertiary italic whitespace-pre-wrap">{promptNl}</p> : null}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || submitted}
        className="w-full min-h-[120px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm"
        placeholder="Schrijf in het Nederlands…"
      />
      <p className="text-caption text-ink-tertiary">
        {submitted
          ? 'Saved for this beat — you can polish it later in Library.'
          : ok
            ? 'Ready to submit.'
            : `At least ${minChars} characters.`}
      </p>
      {!submitted ? (
        <Button variant="primary" fullWidth disabled={!ok || disabled} onClick={submit}>
          Submit
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={retry} disabled={disabled}>
            Retry
          </Button>
        </div>
      )}
    </BlockSurface>
  )
}
