'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatInlineBold } from './LessonStepContent'
import { extractAllNlUtterances, parseNlBulletLine } from './lessonNlListenUtils'
import { GrammarLanguageFocusLayout, shouldUseGrammarLanguageFocusLayout } from './GrammarLanguageFocusLayout'
import { stripMarkdownForTts } from './speakTextUtils'
import { SpeakSnippetButton } from './SpeakSnippetButton'
import { useSpeechSynthesis } from './useSpeechSynthesis'

export function NlBulletListenLessonContent({ text }: { text: string }) {
  const [allowSpeech, setAllowSpeech] = useState(false)
  const { speakSequence } = useSpeechSynthesis()

  useEffect(() => {
    setAllowSpeech(typeof window !== 'undefined' && !!window.speechSynthesis)
  }, [])

  const utterances = useMemo(() => extractAllNlUtterances(text), [text])
  const paragraphs = useMemo(() => text.split(/\n\n+/), [text])

  if (shouldUseGrammarLanguageFocusLayout(text)) {
    return <GrammarLanguageFocusLayout text={text} />
  }

  return (
    <div className="space-y-4 text-body text-ink-primary">
      {utterances.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between pb-2 border-b border-slate-200">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="inline-flex items-center gap-1.5"
            disabled={!allowSpeech}
            onClick={() => speakSequence(utterances)}
            aria-label="Listen to all Dutch snippets in order"
          >
            <Volume2 className="w-4 h-4 shrink-0" aria-hidden />
            Listen to all Dutch
          </Button>
          <span className="text-body-sm text-ink-tertiary">
            {allowSpeech
              ? "Uses your browser's Dutch voice when available."
              : 'Listening uses browser speech — not available here.'}
          </span>
        </div>
      ) : null}

      {paragraphs.map((para, pi) => (
        <ParagraphWithNlLines
          key={pi}
          para={para}
          allowSpeech={allowSpeech}
        />
      ))}
    </div>
  )
}

function ParagraphWithNlLines({ para, allowSpeech }: { para: string; allowSpeech: boolean }) {
  const lines = para.split('\n')
  return (
    <div className="space-y-2 leading-relaxed">
      {lines.map((line, li) => {
        if (!line.trim()) {
          return <div key={li} className="h-2" aria-hidden />
        }
        const parts = parseNlBulletLine(line)
        if (parts && parts.length > 0) {
          return (
            <div key={li} className="flex flex-wrap items-baseline gap-x-2 gap-y-2">
              <span className="text-ink-secondary shrink-0 font-medium">• NL:</span>
              {parts.map((fragment, fi) => (
                <Fragment key={fi}>
                  <span className="inline-flex flex-wrap items-baseline gap-1.5 max-w-full">
                    <SpeakSnippetButton
                      text={fragment}
                      disabled={!allowSpeech}
                      size="comfortable"
                      ariaLabel={`Listen: ${stripMarkdownForTts(fragment).slice(0, 80)}`}
                    />
                    <span className="text-body text-ink-primary">{formatInlineBold(fragment)}</span>
                  </span>
                  {fi < parts.length - 1 ? (
                    <span className="text-ink-tertiary select-none" aria-hidden>
                      /
                    </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
          )
        }
        return (
          <div key={li} className="whitespace-pre-line text-body text-ink-primary">
            {formatInlineBold(line)}
          </div>
        )
      })}
    </div>
  )
}
