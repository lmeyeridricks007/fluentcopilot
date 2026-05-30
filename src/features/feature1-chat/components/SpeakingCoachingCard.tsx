'use client'

import { useState } from 'react'
import { BookmarkPlus, ChevronDown, ChevronUp, Mic } from 'lucide-react'
import { clsx } from 'clsx'
import type { SpeakingCoachingResult } from '@/lib/speech/speakingCoachingTypes'

export type SpeakingCoachingCardState =
  | { status: 'loading' }
  | { status: 'ready'; coaching: SpeakingCoachingResult }
  | { status: 'error'; message: string }

function supportiveLabel(coaching: SpeakingCoachingResult): string {
  const { intentMatch, naturalness, levelFit } = coaching
  const weak = [intentMatch, naturalness, levelFit].filter((x) => x === 'needs_work').length
  if (weak === 0) return 'On track'
  if (weak === 1) return 'Small tweak'
  return 'Coach tip'
}

const SPEAKING_SAVE_PART = 'speaking-coach'

export function SpeakingCoachingCard({
  userMessageId,
  state,
  onSavePhrase,
  savedKeys,
}: {
  userMessageId: string
  state: SpeakingCoachingCardState
  onSavePhrase: (text: string) => void
  savedKeys: Set<string>
}) {
  const [expanded, setExpanded] = useState(false)

  if (state.status === 'loading') {
    return (
      <div className="ml-10 mr-0 max-w-[min(100%,24rem)] rounded-xl border border-primary-200/60 bg-primary-50/40 px-3 py-2.5 animate-pulse">
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary-900/70 flex items-center gap-1">
          <Mic className="w-3 h-3" aria-hidden />
          Speaking coach
        </p>
        <div className="mt-2 h-3 rounded bg-primary-100/80 w-3/4" />
        <div className="mt-2 h-3 rounded bg-primary-100/60 w-1/2" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="ml-10 mr-0 max-w-[min(100%,24rem)] rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-caption text-ink-secondary">
        <p className="font-medium text-ink-primary">Speaking coach</p>
        <p className="mt-1">{state.message}</p>
      </div>
    )
  }

  const c = state.coaching
  const label = supportiveLabel(c)
  const better =
    c.correctedAlternative?.trim() ||
    c.savePhraseCandidates.find((x) => x.phrase.trim())?.phrase.trim() ||
    null
  const saved = savedKeys.has(`${userMessageId}|chat_feedback|${SPEAKING_SAVE_PART}`)

  return (
    <div className="ml-10 mr-0 max-w-[min(100%,24rem)] rounded-xl border border-primary-200/70 bg-primary-50/35 px-3 py-2.5 motion-safe:animate-fc-feedback-hero">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary-900/75 flex items-center gap-1">
            <Mic className="w-3 h-3 shrink-0" aria-hidden />
            Speaking coach
          </p>
          <p className="text-caption font-semibold text-primary-950 mt-0.5">{label}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 rounded-lg p-1 text-primary-900/70 hover:bg-primary-100/80 min-h-touch min-w-touch flex items-center justify-center"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-body-sm text-ink-primary mt-1 leading-snug">{c.shortVerdict}</p>

      {better && better.toLowerCase() !== c.shortVerdict.toLowerCase() ? (
        <p className="text-body-sm text-ink-primary mt-1.5 leading-snug">
          <span className="text-ink-tertiary">More natural: </span>
          <span className="font-medium">{better}</span>
        </p>
      ) : null}

      {c.whyItMatters?.trim() ? (
        <p className="text-caption text-ink-secondary mt-1.5 leading-snug">{c.whyItMatters}</p>
      ) : c.naturalnessSuggestion?.trim() ? (
        <p className="text-caption text-ink-secondary mt-1.5 leading-snug">{c.naturalnessSuggestion}</p>
      ) : null}

      <p className="text-[10px] text-ink-tertiary mt-2 leading-snug">
        Based on your transcript — pronunciation is scored separately when audio assessment runs.
      </p>

      {expanded ? (
        <div className="mt-2 pt-2 border-t border-primary-100/80 space-y-1.5 text-caption text-ink-secondary">
          <p>
            <span className="font-semibold text-ink-primary">Tip: </span>
            {c.coachNote}
          </p>
          <p className="text-ink-tertiary italic">{c.encouragement}</p>
          {c.coachingSignals.length > 0 ? (
            <p className="text-[10px] uppercase tracking-wide text-ink-tertiary break-words">
              Signals: {c.coachingSignals.slice(0, 8).join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}

      {better ? (
        <div className="mt-2">
          <button
            type="button"
            disabled={saved}
            onClick={() => onSavePhrase(better)}
            className={clsx(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 min-h-touch text-caption font-semibold transition-colors',
              saved
                ? 'bg-slate-100 text-ink-tertiary'
                : 'bg-white border border-primary-200 text-primary-950 hover:bg-primary-100/60'
            )}
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden />
            {saved ? 'Saved' : 'Save phrase'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
