'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Headphones,
  Lightbulb,
  ListMusic,
  Mic,
  MoreHorizontal,
  SendHorizontal,
  Square,
  Type,
} from 'lucide-react'
import type { GuidedSuggestedReply } from '@/lib/schemas/practice/guidedScenarioDefinition.schema'
import { clsx } from 'clsx'
import { surfacePrimaryCta } from '@/lib/design/cardTiers'
import { useNlSpeechRecognition } from '@/hooks/useNlSpeechRecognition'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { playAppSound } from '@/lib/interaction/appSounds'

type ReplyMode = 'type' | 'speak'

export function GuidedStickyComposer({
  scenarioId,
  composer,
  onComposerChange,
  allowCustom,
  placeholder,
  canSend,
  sending,
  onSend,
  starters,
  maxStarters,
  selectedStarterId,
  onPickStarter,
  assistantLineNl,
  onListenNormal,
  onListenSlow,
  listenPlaying,
  hintActive,
  onToggleHint,
  onOpenPhrases,
  onOpenMoreHelp,
  helperText,
}: {
  scenarioId: string
  composer: string
  onComposerChange: (v: string) => void
  allowCustom: boolean
  placeholder: string
  canSend: boolean
  /** Brief “verzenden” state after tap */
  sending?: boolean
  /** Optional `speakTextOverride` sends that text as the reply (Speak mode) without requiring Insert first. */
  onSend: (modality: 'typing' | 'voice', speakTextOverride?: string) => void
  starters: GuidedSuggestedReply[]
  maxStarters: number
  selectedStarterId: string | null
  onPickStarter: (r: GuidedSuggestedReply) => void
  assistantLineNl: string | null
  onListenNormal: () => void
  onListenSlow: () => void
  listenPlaying: boolean
  hintActive: boolean
  onToggleHint: () => void
  onOpenPhrases: () => void
  onOpenMoreHelp: () => void
  helperText?: string
}) {
  const {
    supported: voiceSupported,
    listening,
    interim,
    transcript,
    error: voiceError,
    start: startVoice,
    stop: stopVoice,
    reset: resetVoice,
  } = useNlSpeechRecognition()

  const [replyMode, setReplyMode] = useStickyReplyMode(allowCustom)

  const voiceDraft = [transcript, interim].filter(Boolean).join(' ').trim()

  const applyVoiceToComposer = useCallback(() => {
    const chunk = [transcript, interim].filter(Boolean).join(' ').trim()
    if (!chunk) return
    onComposerChange(composer.trim() ? `${composer.trim()} ${chunk}` : chunk)
    resetVoice()
    track(ANALYTICS_EVENTS.typing_mode_used, { scenarioId, surface: 'guided_voice_apply' })
  }, [composer, interim, onComposerChange, resetVoice, transcript, scenarioId])

  const speakTextForSend =
    replyMode === 'speak' && voiceDraft
      ? composer.trim()
        ? `${composer.trim()} ${voiceDraft}`
        : voiceDraft
      : undefined

  const canSendIncludingSpeakDraft =
    canSend || (replyMode === 'speak' && allowCustom && voiceDraft.length > 0)

  const visibleStarters = starters.slice(0, maxStarters)

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 max-w-lg mx-auto w-full pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
    >
      <div
        className={clsx(
          'pointer-events-auto mx-3 mb-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-slate-200/90',
          'bg-surface-elevated/95 backdrop-blur-md shadow-[0_-10px_40px_-12px_rgba(15,23,42,0.18)]'
        )}
      >
        {visibleStarters.length > 0 ? (
          <div className="px-2.5 pt-2.5 pb-1 border-b border-slate-200/60">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary px-1 mb-1.5">
              Suggestions — tap to load
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
              {visibleStarters.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onPickStarter(r)}
                  className={clsx(
                    'shrink-0 max-w-[85vw] text-left rounded-xl border px-3 py-2 text-caption font-medium leading-snug',
                    selectedStarterId === r.id
                      ? 'border-primary-400 bg-primary-50 text-ink-primary'
                      : 'border-slate-200 bg-white text-ink-primary hover:border-primary-200'
                  )}
                >
                  {r.nl.length > 72 ? `${r.nl.slice(0, 70)}…` : r.nl}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {allowCustom ? (
          <div className="flex p-1.5 gap-1 border-b border-slate-200/60">
            <button
              type="button"
              onClick={() => setReplyMode('type')}
              className={clsx(
                'flex-1 min-h-[40px] rounded-xl text-caption font-bold flex items-center justify-center gap-1.5 transition-colors',
                replyMode === 'type' ? 'bg-primary-100 text-primary-900' : 'text-ink-secondary hover:bg-slate-50'
              )}
            >
              <Type className="w-4 h-4" aria-hidden />
              Type
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyMode('speak')
                stopVoice()
              }}
              className={clsx(
                'flex-1 min-h-[40px] rounded-xl text-caption font-bold flex items-center justify-center gap-1.5 transition-colors',
                replyMode === 'speak' ? 'bg-primary-100 text-primary-900' : 'text-ink-secondary hover:bg-slate-50',
                !voiceSupported && 'opacity-40 pointer-events-none'
              )}
            >
              <Mic className="w-4 h-4" aria-hidden />
              Speak
            </button>
          </div>
        ) : null}

        <div className="p-2.5 space-y-2">
          {replyMode === 'type' || !allowCustom ? (
            allowCustom ? (
              <label className="block min-w-0">
                <span className="sr-only">Your reply in Dutch</span>
                <textarea
                  rows={2}
                  value={composer}
                  onChange={(e) => onComposerChange(e.target.value)}
                  placeholder={placeholder}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm text-ink-primary placeholder:text-ink-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 min-h-[52px] max-h-28"
                />
              </label>
            ) : (
              <p className="text-caption text-ink-secondary px-1">Pick a suggestion above to continue.</p>
            )
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 space-y-2">
              {!voiceSupported ? (
                <p className="text-caption text-ink-secondary">Speech recognition isn’t available in this browser.</p>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (listening) {
                          playAppSound('recording_stop')
                          stopVoice()
                        } else {
                          playAppSound('recording_start')
                          startVoice()
                        }
                      }}
                      className={clsx(
                        'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200',
                        listening
                          ? 'bg-red-500 text-white shadow-lg scale-105 ring-4 ring-red-200/60 animate-pulse'
                          : 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                      )}
                      aria-label={listening ? 'Stop recording' : 'Start recording'}
                    >
                      {listening ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7" />}
                    </button>
                  </div>
                  <p className="text-center text-caption font-medium text-ink-secondary">
                    {listening ? 'Listening… speak now.' : 'Tap the mic and say your answer.'}
                  </p>
                  {(transcript || interim) ? (
                    <p className="text-body-sm text-ink-primary bg-white rounded-lg border border-slate-200/80 px-2 py-1.5 min-h-[2.5rem]">
                      {transcript}
                      {interim ? <span className="text-ink-tertiary"> {interim}</span> : null}
                    </p>
                  ) : null}
                  {voiceError ? <p className="text-caption text-amber-800">{voiceError}</p> : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!transcript.trim() && !interim.trim()}
                      onClick={applyVoiceToComposer}
                      className="flex-1 min-h-touch rounded-xl border border-primary-200 bg-primary-50 text-caption font-bold text-primary-900 py-2"
                    >
                      Insert into text field
                    </button>
                    <button
                      type="button"
                      onClick={() => resetVoice()}
                      className="min-h-touch px-3 rounded-xl border border-slate-200 text-caption font-semibold text-ink-secondary"
                    >
                      Clear
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {helperText && replyMode === 'type' && allowCustom ? (
            <p className="text-[11px] text-ink-tertiary px-0.5 leading-snug">{helperText}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {assistantLineNl ? (
              <>
                <button
                  type="button"
                  onClick={onListenNormal}
                  disabled={!assistantLineNl}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 min-h-touch text-caption font-semibold',
                    listenPlaying
                      ? 'border-primary-300 bg-primary-50 text-primary-900'
                      : 'border-slate-200 bg-white text-ink-secondary hover:border-primary-200'
                  )}
                >
                  <Headphones className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {listenPlaying ? 'Playing…' : 'Listen'}
                </button>
                <button
                  type="button"
                  onClick={onListenSlow}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 min-h-touch text-caption font-semibold text-ink-secondary hover:border-primary-200"
                >
                  Slower
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onToggleHint}
              className={clsx(
                'inline-flex items-center gap-1 rounded-xl border px-2.5 py-2 min-h-touch text-caption font-semibold',
                hintActive ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-slate-200 bg-white text-ink-secondary'
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" aria-hidden />
              Hint
            </button>
            <button
              type="button"
              onClick={onOpenPhrases}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 min-h-touch text-caption font-semibold text-ink-secondary"
            >
              <ListMusic className="w-3.5 h-3.5" aria-hidden />
              Phrases
            </button>
            <button
              type="button"
              onClick={onOpenMoreHelp}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 min-h-touch text-caption font-semibold text-ink-secondary"
            >
              <MoreHorizontal className="w-3.5 h-3.5" aria-hidden />
              More
            </button>
          </div>

          <button
            type="button"
            disabled={!canSendIncludingSpeakDraft || sending}
            onClick={() => {
              stopVoice()
              const modality = replyMode === 'speak' ? 'voice' : 'typing'
              if (speakTextForSend) resetVoice()
              onSend(modality, speakTextForSend)
            }}
            className={clsx(
              surfacePrimaryCta,
              'w-full min-h-[52px] px-4 py-3 text-body font-bold text-white gap-2',
              'transition-[transform,box-shadow,opacity] duration-200 ease-out',
              'active:scale-[0.98] active:shadow-inner',
              (!canSendIncludingSpeakDraft || sending) && 'opacity-40 pointer-events-none',
              sending && 'motion-safe:animate-pulse'
            )}
          >
            {sending ? 'Sending…' : 'Send'}
            <SendHorizontal className="w-5 h-5 opacity-95" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

function useStickyReplyMode(allowCustom: boolean): [ReplyMode, (m: ReplyMode) => void] {
  const [mode, setMode] = useState<ReplyMode>('type')
  useEffect(() => {
    if (!allowCustom) setMode('type')
  }, [allowCustom])
  return [mode, setMode]
}
