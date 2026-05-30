'use client'

import { BookmarkPlus } from 'lucide-react'
import type { FeedbackItem } from '../types'
import { clsx } from 'clsx'

export function InlineCoachFeedback({
  item,
  onSavePhrase,
  savedKeys,
}: {
  item: FeedbackItem
  onSavePhrase: (text: string, source: 'chat_feedback') => void
  /** keys like `${text}::feedback` already saved — mock UX */
  savedKeys: Set<string>
}) {
  const saveKeyCorrect = `${item.id}|chat_feedback|correct`
  const savedCorrect = savedKeys.has(saveKeyCorrect)
  const sameSuggestion =
    item.original.trim().toLowerCase() === item.corrected.trim().toLowerCase()

  return (
    <div
      className="ml-10 mr-0 max-w-[min(100%,24rem)] rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 motion-safe:animate-fc-feedback-hero motion-safe:transition-opacity motion-safe:duration-200"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/80">Coach</p>
      <p className="text-caption font-semibold text-ink-primary mt-1">{item.category}</p>
      {sameSuggestion ? null : (
        <p className="text-body-sm text-ink-primary mt-1 leading-snug">
          <span className="text-ink-tertiary">More natural: </span>
          <span className="font-medium text-ink-primary">{item.corrected}</span>
        </p>
      )}
      <p className="text-caption text-ink-secondary mt-1.5 leading-snug">{item.explanation}</p>
      <div className="flex flex-wrap gap-2 mt-2">
        <button
          type="button"
          disabled={savedCorrect}
          onClick={() => onSavePhrase(item.corrected, 'chat_feedback')}
          className={clsx(
            'inline-flex items-center gap-1 rounded-lg px-2.5 py-2 min-h-touch text-caption font-semibold transition-colors',
            savedCorrect
              ? 'bg-slate-100 text-ink-tertiary'
              : 'bg-white border border-amber-200 text-amber-950 hover:bg-amber-100/80'
          )}
        >
          <BookmarkPlus className="w-3.5 h-3.5" aria-hidden />
          {savedCorrect ? 'Saved' : 'Save phrase'}
        </button>
        {item.saveCandidates.slice(0, 2).map((w) => {
          const k = `${item.id}|chat_feedback|${w}`
          const s = savedKeys.has(k)
          return (
            <button
              key={w}
              type="button"
              disabled={s}
              onClick={() => onSavePhrase(w, 'chat_feedback')}
              className={clsx(
                'rounded-lg px-2.5 py-2 min-h-touch text-caption font-medium border',
                s ? 'border-slate-100 text-ink-tertiary' : 'border-slate-200 bg-white hover:border-primary-200'
              )}
            >
              {s ? 'Saved' : `Save “${w.length > 14 ? `${w.slice(0, 12)}…` : w}”`}
            </button>
          )
        })}
      </div>
    </div>
  )
}
