'use client'

import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { Loader2, Volume2 } from 'lucide-react'
import type { LiveSessionStatus, LiveTurn } from './liveSpeakTypes'

function formatTurnTime(ts: number): string {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function LiveTranscriptThread({
  turns,
  partialUserText,
  assistantDraft,
  assistantThinking,
  status,
  latestAssistantId,
  className,
}: {
  turns: LiveTurn[]
  partialUserText: string
  /** Optional streaming / placeholder assistant text while waiting on the server. */
  assistantDraft?: string
  /** Pulse row while LLM is running. */
  assistantThinking?: boolean
  /** Drives footer line + latest-bubble playback hint. */
  status: LiveSessionStatus
  /** Last assistant bubble id (for “now playing” accent). */
  latestAssistantId?: string | null
  className?: string
}) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const assistantSpeaking = status === 'speaking'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, partialUserText, assistantDraft, assistantThinking, status])

  const phaseLine =
    status === 'listening'
      ? 'We are listening — let go of the mic when you are finished.'
      : status === 'transcribing'
        ? 'Saving what you said…'
        : status === 'thinking'
          ? 'They are finding the right words…'
          : status === 'replying'
            ? 'Reply is here — Dutch voice on the way…'
            : status === 'speaking'
              ? 'Listen along — mute or replay from the menu when you like.'
              : status === 'paused'
                ? 'Paused. Tap resume when you are ready.'
                : status === 'error'
                  ? 'That did not land — try once more.'
                  : 'Tap the mic when you are ready. They answer in Dutch, out loud.'

  return (
    <div className={clsx('flex flex-col min-h-0 flex-1 overflow-hidden', className)}>
      <div className="shrink-0 space-y-1.5 mb-2 px-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">Thread</p>
          <span
            className={clsx(
              'text-[10px] font-bold uppercase tracking-wide tabular-nums',
              status === 'listening' && 'text-emerald-700',
              status === 'transcribing' && 'text-violet-700',
              status === 'thinking' && 'text-amber-800',
              status === 'replying' && 'text-violet-800',
              status === 'speaking' && 'text-violet-800',
              status === 'idle' && 'text-ink-tertiary',
              status === 'paused' && 'text-ink-tertiary',
              status === 'error' && 'text-rose-700'
            )}
          >
            {status === 'idle'
              ? 'Your turn'
              : status === 'listening'
                ? 'Listening'
                : status === 'transcribing'
                  ? 'Saving'
                  : status === 'thinking'
                    ? 'Replying'
                    : status === 'replying'
                      ? 'Voice'
                      : status === 'speaking'
                        ? 'Speaking'
                        : status === 'paused'
                          ? 'Paused'
                          : status === 'error'
                            ? 'Issue'
                            : '—'}
          </span>
        </div>
        <p className="text-[11px] text-ink-secondary leading-snug">{phaseLine}</p>
        {partialUserText.trim() && status === 'listening' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-900 mb-0.5">So far</p>
            <p className="text-body-sm text-ink-primary leading-snug">{partialUserText.trim()}</p>
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-[11rem] overflow-y-auto rounded-2xl border border-slate-200 bg-white px-3 py-3 space-y-3 shadow-inner shadow-slate-200/60">
        {turns.length === 0 && !partialUserText && !assistantDraft && !assistantThinking ? (
          <div className="py-7 px-2 text-center space-y-1.5">
            <p className="text-body-sm font-semibold text-ink-primary">Out loud, in Dutch</p>
            <p className="text-caption text-ink-secondary leading-relaxed max-w-[280px] mx-auto">
              They speak Dutch; your side shows up here as you go. Mic is below.
            </p>
          </div>
        ) : null}
        <ul className="space-y-3">
          {turns.map((ex) => {
            const isLatestAssistant = ex.role === 'assistant' && ex.id === latestAssistantId
            return (
              <li
                key={ex.id}
                className={clsx(
                  'rounded-2xl px-3.5 py-3 leading-snug border',
                  ex.role === 'user'
                    ? 'bg-primary-50 text-ink-primary ml-1 max-w-[92%] border-primary-100 text-body-sm'
                    : clsx(
                        'bg-emerald-50 text-emerald-950 mr-1 max-w-[95%] border-emerald-200',
                        isLatestAssistant ? 'text-body-sm' : 'text-caption'
                      )
                )}
              >
                <span className="text-[10px] font-bold text-ink-tertiary block mb-1.5 flex justify-between gap-2 items-center">
                  <span className="inline-flex items-center gap-2">
                    {ex.role === 'user' ? 'You' : 'Them'}
                    {ex.partial ? <span className="text-amber-800 font-normal">· …</span> : null}
                    {ex.role === 'assistant' && isLatestAssistant && status === 'replying' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200">
                        <Loader2 className="w-3 h-3 shrink-0 motion-safe:animate-spin" aria-hidden />
                        Loading voice
                      </span>
                    ) : null}
                    {ex.role === 'assistant' && isLatestAssistant && assistantSpeaking ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200">
                        <Volume2 className="w-3 h-3 shrink-0" aria-hidden />
                        Now playing
                      </span>
                    ) : null}
                  </span>
                  {ex.createdAt ? (
                    <span className="font-normal text-ink-tertiary tabular-nums">{formatTurnTime(ex.createdAt)}</span>
                  ) : null}
                </span>
                <p className={clsx('whitespace-pre-wrap', ex.role === 'assistant' && 'font-medium')}>{ex.text}</p>
              </li>
            )
          })}
          {partialUserText.trim() && status !== 'listening' ? (
            <li className="rounded-2xl px-3.5 py-3 text-body-sm leading-snug bg-amber-50 text-amber-950 ml-1 max-w-[92%] border border-amber-200">
              <span className="text-[10px] font-bold text-amber-900 block mb-1">You · finishing up</span>
              {partialUserText}
            </li>
          ) : null}
          {assistantThinking ? (
            <li className="rounded-2xl px-3.5 py-3 text-caption leading-snug bg-amber-50 text-amber-950 mr-1 border border-amber-200 max-w-[95%]">
              <span className="text-[10px] font-bold text-amber-900 block mb-1">Them · thinking</span>
              <span className="inline-flex gap-1.5 items-center text-ink-secondary">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 motion-safe:animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 motion-safe:animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 motion-safe:animate-bounce [animation-delay:240ms]" />
              </span>
            </li>
          ) : null}
          {assistantDraft?.trim() && !assistantThinking ? (
            <li className="rounded-2xl px-3.5 py-3 text-caption leading-snug bg-violet-50 text-violet-950 mr-1 border border-violet-200 max-w-[95%]">
              <span className="text-[10px] font-bold text-violet-900 block mb-1">Them · drafting</span>
              {assistantDraft}
            </li>
          ) : null}
        </ul>
        <div ref={bottomRef} className="h-1" aria-hidden />
      </div>
    </div>
  )
}
