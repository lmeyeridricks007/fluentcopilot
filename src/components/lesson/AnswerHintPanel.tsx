'use client'

type Props = {
  correctAnswer: string
  explanation?: string
  /** e.g. Dutch greeting with punctuation */
  subtitle?: string
}

export function AnswerHintPanel({ correctAnswer, explanation, subtitle }: Props) {
  return (
    <div
      role="region"
      aria-label="Oplossing"
      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-950 shadow-sm"
    >
      <p className="font-semibold text-amber-900">Zo hoort het</p>
      {subtitle && <p className="text-caption text-amber-800 mt-0.5">{subtitle}</p>}
      <p className="mt-2 text-body font-medium text-ink-primary">{correctAnswer}</p>
      {explanation ? <p className="mt-1.5 text-caption text-ink-secondary">{explanation}</p> : null}
    </div>
  )
}
