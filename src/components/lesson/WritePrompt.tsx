'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { normalizeAnswer } from '@/lib/lesson-engine/stepHandler'
import { speakNl } from '@/lib/lesson-engine/speakNl'

type Props = {
  /** Short instruction shown above the field */
  prompt: string
  /** Normalised variants that count as correct */
  acceptable: string[]
  /** Optional model line learners can reveal */
  modelNl?: string
  minChars?: number
  placeholder?: string
  onResult: (pass: boolean, detail: string) => void
  disabled?: boolean
}

function matchesAny(user: string, acceptable: string[]): boolean {
  const u = normalizeAnswer(user)
  if (u.length < 1) return false
  return acceptable.some((a) => normalizeAnswer(a) === u || u.includes(normalizeAnswer(a)))
}

export function WritePrompt({
  prompt,
  acceptable,
  modelNl,
  minChars = 4,
  placeholder = 'Typ je zin…',
  onResult,
  disabled,
}: Props) {
  const [text, setText] = useState('')
  const [showModel, setShowModel] = useState(false)
  const [checked, setChecked] = useState(false)
  const [shake, setShake] = useState(false)

  const check = () => {
    if (disabled || checked) return
    const t = text.trim()
    if (t.length < minChars) {
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
      onResult(false, 'too_short')
      return
    }
    const ok = matchesAny(t, acceptable)
    if (ok) {
      setChecked(true)
      onResult(true, t)
    } else {
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
      onResult(false, t)
    }
  }

  return (
    <div className={clsx('space-y-4', shake && 'animate-lesson-shake')}>
      <p className="text-body font-medium text-ink-primary">{prompt}</p>
      {modelNl && (
        <button
          type="button"
          className="text-body-sm text-primary-600 underline w-full text-left"
          onClick={() => setShowModel((v) => !v)}
        >
          {showModel ? 'Verberg voorbeeld' : 'Toon voorbeeldzin'}
        </button>
      )}
      {showModel && modelNl && (
        <div className="rounded-xl border border-slate-200 bg-surface-muted p-3 text-body-sm space-y-2">
          <p className="text-ink-primary font-medium">{modelNl}</p>
          <button
            type="button"
            className="text-caption text-primary-600 underline"
            onClick={() => speakNl(modelNl)}
          >
            🔊 Luister
          </button>
        </div>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled || checked}
        rows={3}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-body-sm min-h-[5.5rem] shadow-card focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-60"
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        disabled={disabled || checked}
        onClick={check}
        className="w-full min-h-touch rounded-xl bg-primary-600 text-white font-semibold text-body shadow-elevated active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        Check
      </button>
      <p className="text-caption text-ink-tertiary text-center">
        Korte zin is genoeg — let op spelling en woordvolgorde.
      </p>
    </div>
  )
}
