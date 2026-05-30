'use client'

import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatInlineBold } from './LessonStepContent'
import { SpeakSnippetButton } from './SpeakSnippetButton'

type Props = {
  example: string
  stepKey: string
}

export function WarmUpExampleReveal({ example, stepKey }: Props) {
  const [open, setOpen] = useState(false)
  const [allowSpeech, setAllowSpeech] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [stepKey])

  useEffect(() => {
    setAllowSpeech(typeof window !== 'undefined' && !!window.speechSynthesis)
  }, [])

  const trimmed = example.trim()
  if (!trimmed) return null

  return (
    <div className="mt-4">
      {!open ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1.5"
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          <Lightbulb className="w-4 h-4 shrink-0" aria-hidden />
          Show example
        </Button>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 space-y-3">
          <p className="text-caption font-medium text-ink-tertiary uppercase tracking-wide">
            Example answer
          </p>
          <div className="flex gap-2 items-start">
            <SpeakSnippetButton
              text={trimmed}
              disabled={!allowSpeech}
              className="mt-0.5"
              ariaLabel="Listen to the example"
            />
            <p className="flex-1 min-w-0 text-body text-ink-primary leading-relaxed whitespace-pre-line">
              {formatInlineBold(trimmed)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            aria-expanded={true}
          >
            Hide example
          </Button>
        </div>
      )}
    </div>
  )
}
