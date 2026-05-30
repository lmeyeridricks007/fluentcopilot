'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { LessonStepContent } from './LessonStepContent'
import { SpeakSnippetButton } from './SpeakSnippetButton'
import { looksLikeDutch } from './speakTextUtils'

export type SelfCheckMcOption = { id: string; label: string }

export type SelfCheckItem =
  | {
      id: string
      type: 'multiple_choice'
      prompt: string
      options: SelfCheckMcOption[]
      correctOptionId: string
      feedbackCorrect?: string
      feedbackIncorrect?: string
      common_error_tags?: string[]
    }
  | {
      id: string
      type: 'gap_fill'
      prompt: string
      hint?: string
      acceptableAnswers: string[]
      answerDisplay: string
      feedbackCorrect?: string
      feedbackIncorrect?: string
      common_error_tags?: string[]
    }
  | {
      id: string
      type: 'true_false'
      prompt: string
      correct: boolean
      feedbackCorrect?: string
      feedbackIncorrect?: string
      common_error_tags?: string[]
    }
  | {
      id: string
      type: 'reflect'
      prompt: string
      exampleAnswer?: string
      common_error_tags?: string[]
    }

export interface SelfCheckQuizInteraction {
  kind: 'self_check_quiz'
  items: SelfCheckItem[]
}

function normalizeGapAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')
}

function SelfCheckItemBlock({
  item,
  index,
  allowSpeech,
  onGraded,
}: {
  item: SelfCheckItem
  index: number
  allowSpeech: boolean
  onGraded?: (detail: { correct: boolean; common_error_tags?: string[] }) => void
}) {
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState<boolean | null>(null)

  const [mcPick, setMcPick] = useState<string | null>(null)
  const [gap, setGap] = useState('')
  const [tfPick, setTfPick] = useState<boolean | null>(null)
  const [reflectOpen, setReflectOpen] = useState(false)

  const resetLocal = () => {
    setSubmitted(false)
    setCorrect(null)
    setMcPick(null)
    setGap('')
    setTfPick(null)
    setReflectOpen(false)
  }

  if (item.type === 'reflect') {
    return (
      <div className="rounded-xl border border-slate-200 bg-surface-elevated p-4 space-y-3">
        <p className="text-caption font-semibold text-ink-tertiary">Q{index}</p>
        <div className="flex gap-2 items-start">
          <SpeakSnippetButton
            text={item.prompt}
            disabled={!allowSpeech}
            className="mt-0.5"
            ariaLabel="Listen to the question"
          />
          <div className="flex-1 min-w-0">
            <LessonStepContent text={item.prompt} />
          </div>
        </div>
        {!reflectOpen ? (
          <Button size="sm" variant="secondary" onClick={() => setReflectOpen(true)}>
            I’ve tried — show an example
          </Button>
        ) : (
          <div className="rounded-lg bg-primary-50/80 border border-primary-100 px-3 py-3">
            <p className="text-caption font-medium text-primary-800 mb-1">Example you could adapt</p>
            {item.exampleAnswer ? (
              <div className="flex gap-2 items-start">
                <SpeakSnippetButton
                  text={item.exampleAnswer}
                  disabled={!allowSpeech}
                  className="mt-0.5"
                  ariaLabel="Listen to the example answer"
                />
                <div className="flex-1 min-w-0">
                  <LessonStepContent text={item.exampleAnswer} />
                </div>
              </div>
            ) : (
              <p className="text-body-sm text-ink-secondary">Keep your sentence short and true for you.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  const runCheck = () => {
    if (item.type === 'multiple_choice') {
      if (!mcPick) return
      const ok = mcPick === item.correctOptionId
      setCorrect(ok)
      setSubmitted(true)
      onGraded?.({ correct: ok, common_error_tags: item.common_error_tags })
      return
    }
    if (item.type === 'gap_fill') {
      const n = normalizeGapAnswer(gap)
      if (!n) return
      const ok = item.acceptableAnswers.some((a) => normalizeGapAnswer(a) === n)
      setCorrect(ok)
      setSubmitted(true)
      onGraded?.({ correct: ok, common_error_tags: item.common_error_tags })
      return
    }
    if (item.type === 'true_false') {
      if (tfPick === null) return
      const ok = tfPick === item.correct
      setCorrect(ok)
      setSubmitted(true)
      onGraded?.({ correct: ok, common_error_tags: item.common_error_tags })
    }
  }

  const canSubmit =
    item.type === 'multiple_choice'
      ? mcPick !== null
      : item.type === 'gap_fill'
        ? normalizeGapAnswer(gap).length > 0
        : tfPick !== null

  const fb =
    submitted && correct === true
      ? item.feedbackCorrect
      : submitted && correct === false
        ? item.feedbackIncorrect
        : null

  return (
    <div className="rounded-xl border border-slate-200 bg-surface-elevated p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-caption font-semibold text-ink-tertiary">Q{index}</p>
        {submitted ? (
          <Button size="sm" variant="ghost" className="shrink-0 -mt-1" onClick={resetLocal}>
            Try again
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2 items-start">
        <SpeakSnippetButton
          text={item.prompt}
          disabled={!allowSpeech}
          className="mt-0.5"
          ariaLabel="Listen to the question"
        />
        <div className="flex-1 min-w-0">
          <LessonStepContent text={item.prompt} />
        </div>
      </div>

      {item.type === 'multiple_choice' && (
        <div className="space-y-2" role="group" aria-label={`Question ${index} options`}>
          {item.options.map((opt) => {
            const selected = mcPick === opt.id
            const showSolution = submitted && opt.id === item.correctOptionId
            const wrongPick = submitted && selected && opt.id !== item.correctOptionId
            return (
              <div key={opt.id} className="flex gap-2 items-stretch">
                <SpeakSnippetButton
                  text={opt.label}
                  disabled={!allowSpeech}
                  className="self-start mt-1.5"
                  ariaLabel="Listen to this option"
                />
                <button
                  type="button"
                  disabled={submitted}
                  onClick={() => setMcPick(opt.id)}
                  className={`flex-1 min-w-0 text-left min-h-touch px-3 py-2.5 rounded-lg border text-body-sm font-medium transition-colors ${
                    showSolution
                      ? 'border-success bg-success/10 text-ink-primary'
                      : wrongPick
                        ? 'border-error bg-error/10 text-ink-primary'
                        : selected
                          ? 'border-primary-500 bg-primary-50 text-primary-800'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-ink-primary'
                  }`}
                >
                  {opt.label}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {item.type === 'gap_fill' && (
        <div className="space-y-2">
          {item.hint ? <p className="text-body-sm text-ink-secondary">{item.hint}</p> : null}
          <Input
            value={gap}
            onChange={(e) => setGap(e.target.value)}
            disabled={submitted}
            placeholder="Type one word"
            autoComplete="off"
            className="w-full"
          />
        </div>
      )}

      {item.type === 'true_false' && (
        <div className="flex gap-2">
          {([true, false] as const).map((v) => {
            const selected = tfPick === v
            const showCorrect = submitted && v === item.correct
            const wrong = submitted && selected && v !== item.correct
            return (
              <button
                key={String(v)}
                type="button"
                disabled={submitted}
                onClick={() => setTfPick(v)}
                className={`flex-1 min-h-touch rounded-lg border font-medium text-body-sm ${
                  showCorrect
                    ? 'border-success bg-success/10'
                    : wrong
                      ? 'border-error bg-error/10'
                      : selected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                {v ? 'True' : 'False'}
              </button>
            )
          })}
        </div>
      )}

      {!submitted ? (
        <Button size="sm" onClick={runCheck} disabled={!canSubmit}>
          Check answer
        </Button>
      ) : (
        <div
          className={`rounded-lg px-3 py-2.5 text-body-sm font-medium ${
            correct ? 'bg-success/15 text-ink-primary border border-success/30' : 'bg-error/10 text-ink-primary border border-error/25'
          }`}
          role="status"
        >
          {correct ? 'Correct!' : 'Not quite — see below.'}
        </div>
      )}

      {submitted && item.type === 'gap_fill' && !correct ? (
        <p className="text-body-sm text-ink-secondary">
          Expected: <strong>{item.answerDisplay}</strong>
        </p>
      ) : null}

      {submitted && fb ? (
        <div className="text-body-sm text-ink-secondary border-t border-slate-100 pt-3">
          {looksLikeDutch(fb) ? (
            <div className="flex gap-2 items-start">
              <SpeakSnippetButton
                text={fb}
                disabled={!allowSpeech}
                className="mt-0.5"
                ariaLabel="Listen to the feedback"
              />
              <div className="flex-1 min-w-0">
                <LessonStepContent text={fb} />
              </div>
            </div>
          ) : (
            <LessonStepContent text={fb} />
          )}
        </div>
      ) : null}
    </div>
  )
}

export function InteractiveSelfCheck({
  interaction,
  onGraded,
}: {
  interaction: SelfCheckQuizInteraction
  onGraded?: (detail: { correct: boolean; common_error_tags?: string[] }) => void
}) {
  const total = interaction.items.length
  const [qIndex, setQIndex] = useState(0)
  const [allowSpeech, setAllowSpeech] = useState(false)
  const safeIndex = Math.min(qIndex, Math.max(0, total - 1))
  const progress = total > 0 ? ((safeIndex + 1) / total) * 100 : 0

  useEffect(() => {
    setAllowSpeech(typeof window !== 'undefined' && !!window.speechSynthesis)
  }, [])

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm font-medium text-ink-secondary">
          Question {safeIndex + 1} of {total}
        </p>
        <ProgressBar value={progress} max={100} variant="success" className="sm:w-48 h-2" />
      </div>

      {interaction.items.map((item, i) => (
        <div key={item.id} className={i === safeIndex ? 'block' : 'hidden'} aria-hidden={i !== safeIndex}>
          <SelfCheckItemBlock item={item} index={i + 1} allowSpeech={allowSpeech} onGraded={onGraded} />
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1"
          disabled={safeIndex <= 0}
          onClick={() => setQIndex((j) => Math.max(0, j - 1))}
          aria-label="Previous question"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" aria-hidden />
          Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1"
          disabled={safeIndex >= total - 1}
          onClick={() => setQIndex((j) => Math.min(total - 1, j + 1))}
          aria-label="Next question"
        >
          Next
          <ChevronRight className="w-4 h-4 shrink-0" aria-hidden />
        </Button>
        {safeIndex >= total - 1 ? (
          <span className="text-body-sm text-ink-tertiary">
            Last question — use <strong className="font-medium text-ink-secondary">Continue</strong> below when you are
            done.
          </span>
        ) : null}
      </div>
    </div>
  )
}
