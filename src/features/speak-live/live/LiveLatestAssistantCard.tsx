'use client'

import { clsx } from 'clsx'
import { Loader2, Volume2 } from 'lucide-react'
import type { LiveSessionStatus } from './liveSpeakTypes'

/**
 * When captions are off, the transcript thread is hidden — this card still surfaces
 * the latest assistant line as soon as text exists, independently of TTS readiness.
 */
export function LiveLatestAssistantCard({
  captionsOn,
  assistantStreamDraft,
  assistantThinking,
  status,
  latestAssistantText,
  voiceLoading,
  voicePlaying,
  ttsFailed,
}: {
  captionsOn: boolean
  assistantStreamDraft: string
  assistantThinking: boolean
  status: LiveSessionStatus
  /** Final text from the committed last assistant turn (not the streaming draft). */
  latestAssistantText: string
  /** True while server TTS is in flight for the latest reply. */
  voiceLoading: boolean
  voicePlaying: boolean
  /** Latest turn had text but TTS did not return audio. */
  ttsFailed: boolean
}) {
  if (captionsOn) return null

  const draft = assistantStreamDraft.trim()
  const finalText = latestAssistantText.trim()
  const visible = draft || finalText || assistantThinking

  if (!visible) {
    return (
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Their line</p>
        <p className="text-caption text-ink-secondary mt-1">Their last reply shows here while the voice catches up.</p>
      </div>
    )
  }

  const bodyText = draft || finalText

  return (
    <div
      className={clsx(
        'shrink-0 rounded-2xl border px-3 py-2.5',
        draft ? 'border-violet-200 bg-violet-50' : 'border-emerald-200 bg-emerald-50'
      )}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Their line</p>
        <div className="flex flex-wrap justify-end gap-1">
          {assistantThinking && !draft ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
              <Loader2 className="w-3 h-3 shrink-0 motion-safe:animate-spin" aria-hidden />
              Writing
            </span>
          ) : null}
          {draft ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200">
              Live draft
            </span>
          ) : null}
          {!draft && voiceLoading ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200">
              <Loader2 className="w-3 h-3 shrink-0 motion-safe:animate-spin" aria-hidden />
              Voice almost ready
            </span>
          ) : null}
          {!draft && voicePlaying ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 ring-1 ring-violet-200">
              <Volume2 className="w-3 h-3 shrink-0" aria-hidden />
              Now playing
            </span>
          ) : null}
          {!draft && ttsFailed && status !== 'thinking' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900 ring-1 ring-amber-200">
              Text only
            </span>
          ) : null}
        </div>
      </div>
      <p
        className={clsx(
          'mt-1.5 whitespace-pre-wrap leading-snug',
          draft ? 'text-body-sm text-violet-950' : 'text-body-sm text-emerald-950 font-medium'
        )}
      >
        {bodyText}
      </p>
    </div>
  )
}
