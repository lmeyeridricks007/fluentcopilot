'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Ear, Eye, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatInlineBold } from './LessonStepContent'
import {
  extractSpeakableLines,
  isListenFocusedStep,
  segmentActivityBlocks,
  type ActivityBlock,
  type SpeakableLine,
} from './lessonListenUtils'
import { textHasNlBulletLines } from './lessonNlListenUtils'
import { NlBulletListenLessonContent } from './NlBulletListenLessonContent'
import { PlainDutchStepListen } from './PlainDutchStepListen'
import { useSpeechSynthesis } from './useSpeechSynthesis'

type Props = {
  title: string
  text: string
}

function SpeakRow({
  line,
  onListen,
  disabled,
  fullListenMode,
  lineNumber,
  lineCount,
}: {
  line: SpeakableLine
  onListen: () => void
  disabled: boolean
  fullListenMode: boolean
  lineNumber: number
  lineCount: number
}) {
  if (fullListenMode) {
    return (
      <div className="flex gap-3 items-center">
        <span
          className="w-7 shrink-0 text-center text-body-sm font-medium text-ink-tertiary tabular-nums"
          aria-hidden
        >
          {lineNumber}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 min-h-touch h-11 w-11 sm:h-12 sm:w-12 p-0 rounded-xl border border-slate-200 bg-surface-elevated hover:bg-slate-100"
          onClick={onListen}
          disabled={disabled}
          aria-label={`Play line ${lineNumber} of ${lineCount}`}
          title="Play this line"
        >
          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 items-start">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 mt-0.5 min-h-touch h-11 w-11 sm:h-12 sm:w-12 p-0 rounded-xl border border-slate-200 bg-surface-elevated hover:bg-slate-100"
        onClick={onListen}
        disabled={disabled}
        aria-label={`Listen: ${line.speaker}`}
        title="Listen to this line"
      >
        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" aria-hidden />
      </Button>
      <p className="flex-1 min-w-0 text-body text-ink-primary leading-relaxed pt-1">
        <strong className="font-semibold text-ink-primary">{line.speaker}:</strong>{' '}
        {formatInlineBold(line.utterance)}
      </p>
    </div>
  )
}

function renderBlock(
  block: ActivityBlock,
  bi: number,
  speak: (t: string) => void,
  allowSpeech: boolean,
  fullListenMode: boolean,
  dialogueLineOffset: number,
  totalDialogueLines: number
): ReactNode {
  if (block.kind === 'prose') {
    return (
      <p
        key={`p-${bi}`}
        className="whitespace-pre-line leading-relaxed text-body text-ink-primary"
      >
        {formatInlineBold(block.text)}
      </p>
    )
  }

  const { lines } = block
  return (
    <div
      key={`d-${bi}`}
      className={
        fullListenMode
          ? 'rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-3 py-3 space-y-2'
          : 'space-y-2'
      }
    >
      {fullListenMode ? (
        <p className="text-body-sm text-ink-secondary pb-1">
          Dialogue audio only — {lines.length} line{lines.length === 1 ? '' : 's'}. Use the numbers,
          then answer the questions below.
        </p>
      ) : null}
      {lines.map((line, i) => {
        const n = dialogueLineOffset + i + 1
        return (
          <SpeakRow
            key={i}
            line={line}
            onListen={() => speak(line.utterance)}
            disabled={!allowSpeech}
            fullListenMode={fullListenMode}
            lineNumber={n}
            lineCount={totalDialogueLines}
          />
        )
      })}
    </div>
  )
}

export function ListenableLessonStepContent({ title, text }: Props) {
  const [allowSpeech, setAllowSpeech] = useState(false)
  const [fullListenMode, setFullListenMode] = useState(false)

  useEffect(() => {
    setAllowSpeech(typeof window !== 'undefined' && !!window.speechSynthesis)
  }, [])

  useEffect(() => {
    setFullListenMode(false)
  }, [text])

  const normalizedText = useMemo(
    () => text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'),
    [text]
  )

  const { speak, speakSequence } = useSpeechSynthesis()
  const speakable = extractSpeakableLines(normalizedText)
  const listenMode = isListenFocusedStep(title, normalizedText) && speakable.length > 0

  const blocks = useMemo(() => segmentActivityBlocks(normalizedText), [normalizedText])

  const totalDialogueLines = speakable.length

  const nlBulletMode = !listenMode && textHasNlBulletLines(normalizedText)
  if (nlBulletMode) {
    return <NlBulletListenLessonContent text={normalizedText} />
  }

  if (!listenMode) {
    return <PlainDutchStepListen text={normalizedText} />
  }

  const playAll = () => {
    if (!allowSpeech) return
    speakSequence(speakable.map((l) => l.utterance))
  }

  let dialogueOffset = 0
  const rendered = blocks.map((block, bi) => {
    const node = renderBlock(block, bi, speak, allowSpeech, fullListenMode, dialogueOffset, totalDialogueLines)
    if (block.kind === 'dialogue') {
      dialogueOffset += block.lines.length
    }
    return node
  })

  return (
    <div className="space-y-4 text-body text-ink-primary">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between pb-1 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={playAll}
            disabled={!allowSpeech}
            className="inline-flex items-center gap-1.5"
            aria-label="Listen to the full section in order"
          >
            <Volume2 className="w-4 h-4 shrink-0" aria-hidden />
            Listen to all
          </Button>
          <Button
            type="button"
            variant={fullListenMode ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setFullListenMode((v) => !v)}
            className="inline-flex items-center gap-1.5"
            aria-pressed={fullListenMode}
            aria-label={
              fullListenMode ? 'Show Dutch text alongside audio' : 'Hide Dutch text for listening only'
            }
          >
            {fullListenMode ? (
              <>
                <Eye className="w-4 h-4 shrink-0" aria-hidden />
                Show text
              </>
            ) : (
              <>
                <Ear className="w-4 h-4 shrink-0" aria-hidden />
                Full listen mode
              </>
            )}
          </Button>
        </div>
        <span className="text-body-sm text-ink-tertiary">
          {allowSpeech
            ? fullListenMode
              ? 'Listen first, then try the gist and detail prompts below without peeking.'
              : "Uses your browser's Dutch voice when available."
            : 'Listening uses browser speech — not available here.'}
        </span>
      </div>
      {fullListenMode ? (
        <p className="text-body-sm text-ink-secondary -mt-2">
          Comprehension check: Dutch lines are hidden so you can test what you understood from sound
          alone. Instructions and questions stay visible.
        </p>
      ) : null}
      <div className="space-y-4">{rendered}</div>
    </div>
  )
}
