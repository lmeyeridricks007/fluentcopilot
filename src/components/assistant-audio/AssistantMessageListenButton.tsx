'use client'

import { Loader2, Pause, Play, Volume2 } from 'lucide-react'
import { clsx } from 'clsx'
import { chatAudioManager, shouldAttemptServerTts, useChatAudioPlaybackSnapshot } from '@/lib/audio/chatAudioManager'
import { isBrowserSpeechSupported } from '@/lib/audio/browserSpeechPlayback'

function canPlayMessage(text: string, audioUrl?: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (audioUrl?.trim()) return true
  if (shouldAttemptServerTts()) return true
  return isBrowserSpeechSupported()
}

function PlayingBars() {
  return (
    <span className="inline-flex items-end gap-0.5 h-3.5 px-0.5" aria-hidden>
      <span className="w-0.5 h-2 rounded-full bg-primary-600 motion-safe:animate-pulse" />
      <span className="w-0.5 h-3 rounded-full bg-primary-600 motion-safe:animate-pulse motion-safe:[animation-delay:120ms]" />
      <span className="w-0.5 h-2 rounded-full bg-primary-600 motion-safe:animate-pulse motion-safe:[animation-delay:240ms]" />
    </span>
  )
}

/**
 * Unified listen control for assistant Dutch lines — OpenAI TTS (server) when configured, else browser TTS.
 * Uses global {@link chatAudioManager} so only one message plays at a time across Talk / guided / practice.
 */
export function AssistantMessageListenButton({
  messageId,
  text,
  audioUrl,
  playbackThreadId,
  slow,
  compact,
}: {
  messageId: string
  text: string
  audioUrl?: string
  /** Optional conversation id forwarded to server TTS. */
  playbackThreadId?: string
  /** Slower playback (client playbackRate or browser utterance rate). */
  slow?: boolean
  /** Hide the text label on small screens (default false matches chat composer row). */
  compact?: boolean
}) {
  const snap = useChatAudioPlaybackSnapshot()
  const state = messageId === snap.activeMessageId ? snap.uiState : 'idle'
  const playable = canPlayMessage(text, audioUrl)

  const icon =
    state === 'loading' ? (
      <Loader2 className="w-4 h-4 shrink-0 motion-safe:animate-spin" aria-hidden />
    ) : state === 'playing' ? (
      <Pause className="w-4 h-4 shrink-0" aria-hidden />
    ) : state === 'paused' ? (
      <Play className="w-4 h-4 shrink-0" aria-hidden />
    ) : (
      <Volume2 className="w-4 h-4 shrink-0" aria-hidden />
    )

  const label =
    state === 'loading'
      ? 'Loading audio — tap to cancel'
      : state === 'playing'
        ? 'Pause'
        : state === 'paused'
          ? 'Resume'
          : slow
            ? 'Listen slowly'
            : 'Play in Dutch'

  return (
    <button
      type="button"
      disabled={!playable}
      onClick={() => void chatAudioManager.playOrToggle(messageId, text, audioUrl, { slow, threadId: playbackThreadId })}
      title={!playable ? 'Audio not available in this browser' : label}
      aria-label={label}
      aria-pressed={state === 'playing'}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 min-h-touch min-w-touch rounded-xl border px-2.5 text-caption font-semibold transition-colors',
        state === 'playing'
          ? 'border-primary-300 bg-primary-50 text-primary-900 shadow-sm'
          : state === 'paused'
            ? 'border-amber-200/90 bg-amber-50/80 text-amber-950'
            : 'border-slate-200/90 bg-white text-ink-secondary hover:bg-slate-50 hover:border-slate-300/90',
        !playable && 'opacity-40 pointer-events-none cursor-not-allowed',
        state === 'loading' && 'cursor-pointer'
      )}
    >
      <span className="inline-flex items-center gap-1 shrink-0">
        {state === 'playing' ? <PlayingBars /> : null}
        {icon}
      </span>
      {!compact ? (
        <span className="hidden sm:inline max-w-[5.5rem] truncate">
          {state === 'playing' ? 'Pause' : slow ? 'Slow' : 'Listen'}
        </span>
      ) : null}
    </button>
  )
}
