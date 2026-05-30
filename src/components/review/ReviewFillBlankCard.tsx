'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'

export function ReviewFillBlankCard({
  disabled,
  revealed,
  correctAnswer,
  onSubmit,
}: {
  disabled?: boolean
  revealed: boolean
  correctAnswer: string
  onSubmit: (text: string) => void
}) {
  const [value, setValue] = useState('')
  const ok = revealed && value.trim().toLowerCase() === correctAnswer.trim().toLowerCase()

  return (
    <div className="space-y-3">
      <input
        type="text"
        autoComplete="off"
        autoCapitalize="off"
        disabled={disabled || revealed}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer"
        className={clsx(
          'w-full rounded-xl border-2 px-4 py-3 text-body outline-none transition-colors',
          !revealed && 'border-slate-200 focus:border-primary-400',
          revealed && ok && 'border-emerald-400 bg-emerald-50',
          revealed && !ok && 'border-rose-400 bg-rose-50 animate-review-shake'
        )}
      />
      {!revealed ? (
        <Button type="button" fullWidth disabled={disabled || !value.trim()} onClick={() => onSubmit(value)}>
          Check
        </Button>
      ) : null}
    </div>
  )
}
