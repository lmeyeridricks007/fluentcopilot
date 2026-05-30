'use client'

import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LessonStepContent } from './LessonStepContent'
import { looksLikeDutch, stripMarkdownForTts } from './speakTextUtils'
import { useSpeechSynthesis } from './useSpeechSynthesis'

/** One “listen to step” control when copy is mostly Dutch but not structured as NL: bullets or dialogue. */
export function PlainDutchStepListen({ text }: { text: string }) {
  const [allowSpeech, setAllowSpeech] = useState(false)
  const { speak } = useSpeechSynthesis()
  const plain = stripMarkdownForTts(text.replace(/\n\n+/g, '. '))

  useEffect(() => {
    setAllowSpeech(typeof window !== 'undefined' && !!window.speechSynthesis)
  }, [])

  if (!plain || !looksLikeDutch(text)) {
    return <LessonStepContent text={text} />
  }

  return (
    <div className="space-y-3 text-body text-ink-primary">
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-200">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="inline-flex items-center gap-1.5"
          disabled={!allowSpeech}
          onClick={() => speak(plain)}
          aria-label="Listen to this step in Dutch"
        >
          <Volume2 className="w-4 h-4 shrink-0" aria-hidden />
          Listen to Dutch on this screen
        </Button>
        <span className="text-body-sm text-ink-tertiary">
          {allowSpeech
            ? "Uses your browser's Dutch voice when available."
            : 'Listening uses browser speech — not available here.'}
        </span>
      </div>
      <LessonStepContent text={text} />
    </div>
  )
}
