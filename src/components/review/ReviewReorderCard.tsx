'use client'

import { useState } from 'react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { GripVertical } from 'lucide-react'

export function ReviewReorderCard({
  tokens,
  disabled,
  revealed,
  correctAnswer,
  onSubmit,
}: {
  tokens: string[]
  disabled?: boolean
  revealed: boolean
  correctAnswer: string
  onSubmit: (ordered: string[]) => void
}) {
  const [order, setOrder] = useState<string[]>(() => [...tokens])

  function move(i: number, dir: -1 | 1) {
    setOrder((prev) => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const correct = revealed && order.join(' ').trim().toLowerCase() === correctAnswer.trim().toLowerCase()

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {order.map((tok, i) => (
          <li
            key={`${i}-${tok}`}
            className={clsx(
              'flex items-center gap-2 rounded-xl border px-3 py-2 bg-surface-elevated',
              revealed && correct && 'border-emerald-300',
              revealed && !correct && 'border-rose-300 animate-review-shake'
            )}
          >
            <GripVertical className="w-4 h-4 text-ink-tertiary shrink-0" aria-hidden />
            <span className="flex-1 text-body font-medium">{tok}</span>
            {!disabled && !revealed ? (
              <div className="flex gap-1 shrink-0">
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">
                  ↑
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">
                  ↓
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {!revealed ? (
        <Button type="button" fullWidth onClick={() => onSubmit(order)} disabled={disabled}>
          Check order
        </Button>
      ) : null}
    </div>
  )
}
