'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { BookOpen, Globe2, Lightbulb, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardTitle } from '@/components/ui/Card'
import { formatInlineBold, LessonStepContent } from './LessonStepContent'
import {
  extractAllNlUtterances,
  parseEnBulletLine,
  parseNlBulletLine,
} from './lessonNlListenUtils'
import { stripMarkdownForTts } from './speakTextUtils'
import { SpeakSnippetButton } from './SpeakSnippetButton'
import { useSpeechSynthesis } from './useSpeechSynthesis'

const LANGUAGE_FOCUS_SPLIT =
  /\n\n\*\*Language focus — patterns you can reuse\*\*\s*\n\n/i

export function shouldUseGrammarLanguageFocusLayout(text: string): boolean {
  return LANGUAGE_FOCUS_SPLIT.test(text) && extractAllNlUtterances(text).length > 0
}

function splitGrammarSections(text: string): {
  intro: string
  focusBody: string
  tryBlock: string
  cultureBlock: string
} {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lfParts = normalized.split(LANGUAGE_FOCUS_SPLIT)
  const intro = lfParts[0]?.trimEnd() ?? ''
  const afterLf = lfParts[1] ?? ''

  const tryIdx = afterLf.search(/\n\n(?=\*\*Try this)/i)
  const focusAndTail = tryIdx >= 0 ? afterLf.slice(0, tryIdx) : afterLf
  const tail = tryIdx >= 0 ? afterLf.slice(tryIdx + 2) : ''

  const culIdx = tail.search(/\n\n(?=\*\*Culture tip)/i)
  const focusBody = focusAndTail.trimEnd()
  let tryBlock = ''
  let cultureBlock = ''
  if (culIdx >= 0) {
    tryBlock = tail.slice(0, culIdx).trim()
    cultureBlock = tail.slice(culIdx + 2).trim()
  } else {
    tryBlock = tail.trim()
  }

  return { intro, focusBody, tryBlock, cultureBlock }
}

function stripBoldLead(s: string, re: RegExp): string {
  return s.replace(re, '').trim()
}

function parseTopicChunks(focusBody: string): { title: string; body: string }[] {
  const chunks = focusBody
    .split(/\n\n(?=\*\*[^*]+\*\*)/)
    .map((c) => c.trim())
    .filter(Boolean)
  return chunks.map((chunk) => {
    const m = chunk.match(/^\*\*([^*]+)\*\*\s*\n([\s\S]*)$/m)
    if (m) return { title: m[1].trim(), body: m[2].trim() }
    return { title: '', body: chunk }
  })
}

function FocusTopicCard({
  title,
  body,
  allowSpeech,
}: {
  title: string
  body: string
  allowSpeech: boolean
}) {
  const lines = body.split('\n')
  return (
    <Card variant="outlined" padding="md" className="bg-surface-elevated/80 border-slate-200 shadow-sm">
      {title ? (
        <CardTitle className="text-body font-semibold text-ink-primary mb-3 normal-case tracking-normal">
          {title}
        </CardTitle>
      ) : null}
      <div className="space-y-4">
        {lines.map((line, li) => {
          if (!line.trim()) {
            return <div key={li} className="h-1" aria-hidden />
          }
          const nlParts = parseNlBulletLine(line)
          if (nlParts?.length) {
            return (
              <div
                key={li}
                className="rounded-xl bg-primary-50/50 border border-primary-100/80 px-3 py-3 sm:px-4"
              >
                <p className="text-caption font-semibold uppercase tracking-wide text-primary-800 mb-2">
                  Dutch
                </p>
                <div className="flex flex-col gap-3">
                  {nlParts.map((fragment, fi) => (
                    <div key={fi} className="flex gap-3 items-start">
                      <SpeakSnippetButton
                        text={fragment}
                        disabled={!allowSpeech}
                        size="comfortable"
                        ariaLabel={`Listen: ${stripMarkdownForTts(fragment).slice(0, 80)}`}
                      />
                      <p className="flex-1 min-w-0 text-body text-ink-primary leading-relaxed pt-2">
                        {formatInlineBold(fragment)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          const enParts = parseEnBulletLine(line)
          if (enParts?.length) {
            return (
              <div
                key={li}
                className="rounded-xl border-l-4 border-slate-300 bg-slate-50/90 pl-4 pr-3 py-3"
              >
                <p className="text-caption font-semibold uppercase tracking-wide text-ink-tertiary mb-2">
                  English
                </p>
                <p className="text-body-sm text-ink-secondary leading-relaxed">
                  {enParts.map((frag, fi) => (
                    <Fragment key={fi}>
                      {fi > 0 ? <span className="text-ink-tertiary mx-1">·</span> : null}
                      {formatInlineBold(frag)}
                    </Fragment>
                  ))}
                </p>
              </div>
            )
          }
          return (
            <div key={li} className="whitespace-pre-line text-body text-ink-primary leading-relaxed">
              {formatInlineBold(line)}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export function GrammarLanguageFocusLayout({ text }: { text: string }) {
  const [allowSpeech, setAllowSpeech] = useState(false)
  const { speakSequence } = useSpeechSynthesis()

  useEffect(() => {
    setAllowSpeech(typeof window !== 'undefined' && !!window.speechSynthesis)
  }, [])

  const { intro, focusBody, tryBlock, cultureBlock } = useMemo(
    () => splitGrammarSections(text),
    [text]
  )
  const utterances = useMemo(() => extractAllNlUtterances(text), [text])
  const topics = useMemo(() => parseTopicChunks(focusBody), [focusBody])

  const tryInner = stripBoldLead(tryBlock, /^\*\*Try this:?\*\*:?\s*/i)
  const cultureInner = stripBoldLead(cultureBlock, /^\*\*Culture tip:?\*\*:?\s*/i)

  return (
    <div className="space-y-8 text-body text-ink-primary">
      {utterances.length > 0 ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between pb-2 border-b border-slate-200">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="inline-flex items-center gap-2 min-h-touch px-4"
            disabled={!allowSpeech}
            onClick={() => speakSequence(utterances)}
            aria-label="Listen to all Dutch snippets in order"
          >
            <Volume2 className="w-5 h-5 shrink-0" aria-hidden />
            Listen to all Dutch
          </Button>
          <span className="text-body-sm text-ink-tertiary">
            {allowSpeech
              ? "Uses your browser's Dutch voice when available."
              : 'Listening uses browser speech — not available here.'}
          </span>
        </div>
      ) : null}

      <section className="space-y-3" aria-label="Grammar introduction">
        <LessonStepContent text={intro} />
      </section>

      <section className="space-y-4" aria-label="Language focus patterns">
        <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50/40 px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-body font-bold text-ink-primary">Language focus — patterns you can reuse</h3>
            <p className="text-body-sm text-ink-secondary mt-1">
              Each card is one pattern: listen to Dutch, then read the English gloss.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {topics.map((t, i) => (
            <FocusTopicCard key={i} title={t.title} body={t.body} allowSpeech={allowSpeech} />
          ))}
        </div>
      </section>

      {tryInner ? (
        <div
          className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/90 to-orange-50/50 px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
          role="note"
          aria-label="Try this"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <Lightbulb className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-caption font-bold uppercase tracking-wide text-amber-900">Try this</p>
              <div className="text-body text-ink-primary leading-relaxed">
                <LessonStepContent text={tryInner} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {cultureInner ? (
        <div
          className="rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 px-4 py-4 sm:px-5 sm:py-5 shadow-sm"
          role="note"
          aria-label="Culture tip"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Globe2 className="h-6 w-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-caption font-bold uppercase tracking-wide text-emerald-900">Culture tip</p>
              <div className="text-body text-ink-primary leading-relaxed">
                <LessonStepContent text={cultureInner} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
