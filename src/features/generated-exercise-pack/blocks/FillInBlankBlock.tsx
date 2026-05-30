'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface, normText } from '../blockPrimitives'

export function FillInBlankBlock(props: {
  blockId: string
  promptEn: string
  sentenceNl: string
  acceptableAnswers: string[]
  caseInsensitive?: boolean
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const { promptEn, sentenceNl, acceptableAnswers, caseInsensitive = true, compact, disabled, onComplete } = props
  const [val, setVal] = useState('')
  const [bad, setBad] = useState(false)
  const [solved, setSolved] = useState(false)

  const check = () => {
    if (disabled || solved) return
    const v = normText(val)
    const ok = acceptableAnswers.some((a) => {
      const t = caseInsensitive ? normText(a) : a.trim()
      return v.length >= 4 && (v === t || t.includes(v) || v.includes(t))
    })
    if (ok) {
      setBad(false)
      setSolved(true)
      onComplete({
        correctness: 1,
        outcome: 'correct',
        userAnswer: { text: val.trim() },
      })
    } else {
      setBad(true)
    }
  }

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <p className="text-caption text-ink-secondary leading-snug">{promptEn}</p>
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Line</p>
      <p className="rounded-xl border border-slate-100 bg-slate-50/90 px-3 py-2 text-body-sm text-ink-primary whitespace-pre-wrap">
        {sentenceNl}
      </p>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        disabled={disabled || solved}
        className="w-full min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-body-sm"
        placeholder="Your line…"
      />
      {bad ? <p className="text-caption text-red-600">Tweak a word and try again.</p> : null}
      {solved ? <p className="text-caption font-medium text-emerald-800">Good next step.</p> : null}
      {!solved ? (
        <Button variant="primary" fullWidth onClick={check} disabled={disabled}>
          Check
        </Button>
      ) : null}
    </BlockSurface>
  )
}
