'use client'

import { useEffect, useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatInlineBold } from './LessonStepContent'
import { textHasNlBulletLines } from './lessonNlListenUtils'
import { NlBulletListenLessonContent } from './NlBulletListenLessonContent'
import { PlainDutchStepListen } from './PlainDutchStepListen'
import { textForGapTaskTts } from './speakTextUtils'
import { useSpeechSynthesis } from './useSpeechSynthesis'
import {
  countGaps,
  evaluateGapAnswers,
  inferExpectedAnswersForGaps,
  splitTextWithGaps,
  textHasFillableGaps,
} from './guidedPracticeGapUtils'
type Props = {
  text: string
  taskId: string
}

export function GuidedPracticeTaskContent({ text, taskId }: Props) {
  const hasGaps = useMemo(() => textHasFillableGaps(text), [text])
  const segments = useMemo(() => (hasGaps ? splitTextWithGaps(text) : null), [text, hasGaps])
  const gapCount = useMemo(() => countGaps(text), [text])
  const expected = useMemo(() => inferExpectedAnswersForGaps(text), [text])

  const [values, setValues] = useState<string[]>(() => Array(gapCount).fill(''))
  const [feedback, setFeedback] = useState<{ label: string; messages: string[] } | null>(null)
  const [allowSpeech, setAllowSpeech] = useState(false)
  const { speak } = useSpeechSynthesis()

  useEffect(() => {
    setValues(Array(countGaps(text)).fill(''))
    setFeedback(null)
  }, [taskId, text])

  useEffect(() => {
    setAllowSpeech(typeof window !== 'undefined' && !!window.speechSynthesis)
  }, [])

  if (!hasGaps || !segments) {
    if (textHasNlBulletLines(text)) {
      return <NlBulletListenLessonContent text={text} />
    }
    return <PlainDutchStepListen text={text} />
  }

  let gapOrdinal = 0

  return (
    <div className="space-y-4 text-body text-ink-primary">
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1.5"
          disabled={!allowSpeech}
          onClick={() => speak(textForGapTaskTts(text))}
          aria-label="Listen to this task"
        >
          <Volume2 className="w-4 h-4 shrink-0" aria-hidden />
          Listen to task
        </Button>
        <span className="text-body-sm text-ink-tertiary">
          {allowSpeech
            ? "Gaps are read as a short pause. Uses your browser's Dutch voice when available."
            : 'Listening uses browser speech — not available here.'}
        </span>
      </div>
      <div className="leading-relaxed whitespace-pre-wrap">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return (
              <span key={i} className="whitespace-pre-wrap">
                {formatInlineBold(seg.value)}
              </span>
            )
          }
          const gi = gapOrdinal
          gapOrdinal += 1
          return (
            <span key={i} className="inline-block align-baseline mx-0.5 my-0.5">
              <label className="sr-only" htmlFor={`gap-${taskId}-${gi}`}>
                Fill gap {gi + 1}
              </label>
              <input
                id={`gap-${taskId}-${gi}`}
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={values[gi] ?? ''}
                onChange={(e) => {
                  const next = [...values]
                  next[gi] = e.target.value
                  setValues(next)
                  setFeedback(null)
                }}
                className="inline-block w-[6.5rem] sm:w-[7.5rem] px-2 py-1 text-center text-body font-medium border-b-2 border-primary-500 bg-primary-50/40 focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-t"
              />
            </span>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            const ev = evaluateGapAnswers(values, expected)
            const label =
              ev.scoreLabel === 'ok'
                ? 'Nice — matches the model answer(s).'
                : ev.scoreLabel === 'unknown'
                  ? 'Noted'
                  : 'Keep trying'
            setFeedback({ label, messages: ev.messages })
          }}
        >
          Check gaps
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setValues(Array(gapCount).fill(''))
            setFeedback(null)
          }}
        >
          Clear
        </Button>
      </div>

      {feedback ? (
        <div
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-body-sm text-ink-primary space-y-2"
          role="status"
        >
          <p className="font-medium text-ink-primary">{feedback.label}</p>
          <ul className="list-disc pl-5 space-y-1">
            {feedback.messages.map((m, j) => (
              <li key={j}>{formatInlineBold(m)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
