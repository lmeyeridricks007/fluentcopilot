'use client'

import { BookmarkPlus, User } from 'lucide-react'
import { clsx } from 'clsx'
import type { ChatMessage } from '../types'
import { useChatAudioPlaybackSnapshot } from '@/lib/audio/chatAudioManager'
import { AssistantMessageListenButton } from '@/components/assistant-audio/AssistantMessageListenButton'

export function ChatMessageBubble({
  message,
  personaEmoji,
  onSaveText,
  savedKeys,
  saveWordsPending,
  animateEnter,
  playbackThreadId,
}: {
  message: ChatMessage
  personaEmoji: string
  onSaveText?: (text: string, source: 'chat_ai') => void
  savedKeys: Set<string>
  /** Enrichment still attaching save-word chips to this assistant message. */
  saveWordsPending?: boolean
  animateEnter?: boolean
  /** Forwarded to server TTS for logging / cache scoping. */
  playbackThreadId?: string
}) {
  const isUser = message.sender === 'user'
  const isAi = message.sender === 'ai'
  const audioSnap = useChatAudioPlaybackSnapshot()
  const audioActiveRow = isAi && message.id === audioSnap.activeMessageId
  const audioHighlight =
    audioActiveRow && (audioSnap.uiState === 'playing' || audioSnap.uiState === 'loading')
  const audioPausedHighlight = audioActiveRow && audioSnap.uiState === 'paused'

  const snippet =
    isAi && message.content.trim()
      ? message.content.trim().split(/\s+/).slice(0, 5).join(' ')
      : ''
  const saveKey = `${message.id}|chat_ai|${snippet}`
  const canSave = isAi && onSaveText && message.content.trim().length > 0
  const saved = savedKeys.has(saveKey)

  return (
    <div
      className={clsx(
        'flex gap-2',
        isUser ? 'flex-row-reverse' : 'flex-row',
        animateEnter && 'motion-safe:opacity-0 motion-safe:animate-fc-message-in'
      )}
    >
      <div
        className={clsx(
          'w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-caption',
          isUser ? 'bg-primary-100 text-primary-700' : 'bg-slate-200 text-ink-secondary'
        )}
        aria-hidden
      >
        {isUser ? <User className="w-4 h-4" /> : <span>{personaEmoji}</span>}
      </div>
      <div
        className={clsx(
          'max-w-[min(100%,20rem)] rounded-2xl px-3.5 py-2.5 shadow-sm border transition-[box-shadow,border-color] duration-200',
          isUser
            ? 'rounded-br-md bg-primary-600 text-white border-primary-500/30'
            : 'rounded-bl-md bg-white border-slate-200/90 text-ink-primary',
          audioHighlight && 'ring-2 ring-primary-200/90 border-primary-200/80 shadow-md',
          audioPausedHighlight && 'ring-1 ring-amber-200/90 border-amber-100/80'
        )}
      >
        <p className="text-body-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        {isAi && message.content.trim() ? (
          <div className="mt-2 flex flex-row flex-wrap items-center justify-end gap-2">
            <AssistantMessageListenButton
              messageId={message.id}
              text={message.content}
              audioUrl={message.metadata?.audioUrl}
              playbackThreadId={playbackThreadId}
            />
          </div>
        ) : null}
        {isAi && message.metadata?.translationHint ? (
          <p className="text-[11px] text-ink-tertiary mt-1.5 pt-1.5 border-t border-slate-200/70 leading-snug">
            {message.metadata.translationHint}
          </p>
        ) : null}
        {canSave ? (
          <button
            type="button"
            disabled={saved}
            onClick={() => onSaveText!(snippet, 'chat_ai')}
            className={clsx(
              'mt-2 inline-flex items-center gap-1 text-caption font-semibold min-h-touch px-0 py-1',
              saved ? 'text-ink-tertiary' : 'text-primary-700 hover:underline'
            )}
          >
            <BookmarkPlus className="w-3.5 h-3.5" aria-hidden />
            {saved ? 'Saved to Library' : 'Save phrase'}
          </button>
        ) : null}
        {isAi && onSaveText && message.metadata?.saveWordCandidates?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5 motion-safe:animate-fc-message-in">
            {message.metadata.saveWordCandidates.map((w) => {
              const key = `${message.id}|chat_ai|${w}`
              const done = savedKeys.has(key)
              return (
                <button
                  key={w}
                  type="button"
                  disabled={done}
                  onClick={() => onSaveText(w, 'chat_ai')}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold min-h-touch',
                    done
                      ? 'border-slate-100 text-ink-tertiary bg-slate-50'
                      : 'border-primary-200 text-primary-800 bg-primary-50/60 hover:bg-primary-50'
                  )}
                >
                  <BookmarkPlus className="w-3 h-3 shrink-0" aria-hidden />
                  {done ? 'Saved' : `Save “${w}”`}
                </button>
              )
            })}
          </div>
        ) : null}
        {isAi && onSaveText && saveWordsPending && !(message.metadata?.saveWordCandidates?.length) ? (
          <div
            className="mt-2 flex flex-wrap gap-1.5 items-center"
            role="status"
            aria-label="Save suggestions loading"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">Save words</span>
            <div className="h-8 w-[4.5rem] rounded-lg bg-slate-100/90 border border-slate-200/60 motion-safe:animate-pulse" />
            <div className="h-8 w-[5rem] rounded-lg bg-slate-100/90 border border-slate-200/60 motion-safe:animate-pulse" />
          </div>
        ) : null}
      </div>
    </div>
  )
}
