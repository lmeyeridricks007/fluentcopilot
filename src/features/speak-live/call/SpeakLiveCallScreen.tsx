'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  FileText,
  MessageSquareText,
  Mic,
  MicOff,
  Pause,
  PhoneOff,
  RotateCcw,
  Save,
  Settings2,
  Volume2,
  Wifi,
} from 'lucide-react'
import { clsx } from 'clsx'
import { playAppSound } from '@/lib/interaction/appSounds'
import { useSpeakLiveCallMachine } from './useSpeakLiveCallMachine'
import type { SpeakLiveCallError } from './speakLiveCallTypes'
import { SpeakLiveWaveform } from './SpeakLiveWaveform'
import { pickAiLine } from './speakLiveAiLines'
import {
  cancelAiSpeech,
  ensureMicStream,
  micErrorKind,
  speakAiLine,
  stopMediaStream,
} from './speakLiveSpeech'

function formatTimer(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `0:${r.toString().padStart(2, '0')}`
}

function scenarioEmoji(scenarioId: string): string {
  const id = scenarioId.toLowerCase()
  if (id.includes('ordering')) return '🍽️'
  if (id.includes('cafe')) return '☕'
  if (id.includes('train')) return '🚆'
  return '🎧'
}

function connectionCopy(params: {
  phase: string
  error: SpeakLiveCallError | null
  networkSlow: boolean
}): { line: string; tone: 'neutral' | 'live' | 'warn' | 'danger' } {
  if (params.error === 'mic_denied') return { line: 'Microphone blocked', tone: 'danger' }
  if (params.error === 'audio_failed') return { line: 'Audio failed', tone: 'danger' }
  if (params.networkSlow && params.phase === 'processing') {
    return { line: 'Still working…', tone: 'warn' }
  }
  switch (params.phase) {
    case 'listening':
      return { line: 'Listening…', tone: 'live' }
    case 'processing':
      return { line: 'Processing…', tone: 'warn' }
    case 'ai_speaking':
      return { line: 'Assistant speaking', tone: 'live' }
    case 'paused':
      return { line: 'Paused', tone: 'neutral' }
    default:
      return { line: 'Ready', tone: 'neutral' }
  }
}

export function SpeakLiveCallScreen({
  scenarioTitle,
  scenarioId,
  modeLabel,
  levelLabel,
  onExit,
  onSaveSession,
  summaryHref,
  onEndCall,
  isEndingCall = false,
}: {
  scenarioTitle: string
  scenarioId: string
  modeLabel: string
  levelLabel: string
  onExit: () => void
  onSaveSession: () => void
  summaryHref: string
  /** When set, End calls this (e.g. backend recap) instead of exiting immediately. */
  onEndCall?: () => Promise<void>
  isEndingCall?: boolean
}) {
  const { state, dispatch } = useSpeakLiveCallMachine()
  const streamRef = useRef<MediaStream | null>(null)
  const aiTurnRef = useRef(0)
  const processingGenRef = useRef(0)
  const holdingRef = useRef(false)
  const phaseRef = useRef(state.phase)
  const listenMsRef = useRef(state.listenMs)
  phaseRef.current = state.phase
  listenMsRef.current = state.listenMs

  const tryOpenMic = useCallback(async () => {
    try {
      await ensureMicStream(streamRef)
      dispatch({ type: 'RESET_ERROR' })
      return true
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: micErrorKind(e) })
      return false
    }
  }, [dispatch])

  const beginListening = useCallback(async () => {
    if (state.phase === 'paused' || state.phase === 'processing') return
    if (state.phase === 'listening') return
    if (state.phase === 'ai_speaking') {
      cancelAiSpeech()
      dispatch({ type: 'INTERRUPT_AI_TO_LISTENING', at: Date.now() })
      const ok = await tryOpenMic()
      if (!ok) dispatch({ type: 'ENTER_IDLE' })
      return
    }
    const ok = await tryOpenMic()
    if (!ok) return
    dispatch({ type: 'START_LISTENING', at: Date.now() })
  }, [dispatch, state.phase, tryOpenMic])

  const commitListeningTurn = useCallback(() => {
    if (phaseRef.current !== 'listening') return
    const ms = listenMsRef.current
    if (ms < 280) {
      dispatch({ type: 'ENTER_IDLE' })
      return
    }
    dispatch({
      type: 'APPEND_EXCHANGE',
      exchange: {
        id: `u-${Date.now()}`,
        role: 'user',
        text: `You · ${formatTimer(ms)}`,
        at: Date.now(),
      },
    })
    dispatch({ type: 'ENTER_PROCESSING' })
    processingGenRef.current += 1
  }, [dispatch])

  useEffect(() => {
    if (state.phase !== 'processing') return undefined
    const gen = processingGenRef.current
    const duration = state.listenMs
    const slowTimer = window.setTimeout(() => {
      if (processingGenRef.current === gen) dispatch({ type: 'SET_NETWORK_SLOW', value: true })
    }, 2200)
    const doneTimer = window.setTimeout(() => {
      if (processingGenRef.current !== gen) return
      dispatch({ type: 'SET_NETWORK_SLOW', value: false })
      dispatch({ type: 'ENTER_AI_SPEAKING' })
    }, 820 + Math.min(780, duration / 2.5))
    return () => {
      window.clearTimeout(slowTimer)
      window.clearTimeout(doneTimer)
    }
  }, [state.phase, state.listenMs, dispatch])

  useEffect(() => {
    if (state.phase !== 'ai_speaking') return undefined
    const line = pickAiLine(scenarioId, aiTurnRef.current)
    aiTurnRef.current += 1
    let finished = false
    speakAiLine({
      text: line,
      muted: state.muted,
      onEnd: () => {
        if (finished) return
        finished = true
        dispatch({
          type: 'APPEND_EXCHANGE',
          exchange: { id: `a-${Date.now()}`, role: 'ai', text: line, at: Date.now() },
        })
        dispatch({ type: 'ENTER_IDLE' })
      },
      onError: () => {
        if (finished) return
        finished = true
        dispatch({ type: 'SET_ERROR', error: 'audio_failed' })
      },
    })
    return () => {
      finished = true
      cancelAiSpeech()
    }
  }, [state.phase, state.muted, scenarioId, dispatch])

  useEffect(() => {
    return () => {
      cancelAiSpeech()
      stopMediaStream(streamRef)
    }
  }, [])

  const conn = connectionCopy({
    phase: state.phase,
    error: state.error,
    networkSlow: state.networkSlow,
  })

  const waveformUser = state.phase === 'listening'
  const waveformAi = state.phase === 'ai_speaking'

  const micPrimaryDisabled =
    state.phase === 'paused' ||
    state.phase === 'processing' ||
    state.error === 'mic_denied' ||
    state.error === 'audio_failed'

  const micHint =
    state.micMode === 'hold'
      ? state.phase === 'ai_speaking'
        ? 'Hold to jump in'
        : 'Hold to talk'
      : state.phase === 'listening'
        ? 'Tap when you are done'
        : state.phase === 'ai_speaking'
          ? 'Tap to jump in'
          : 'Tap to talk'

  const onMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (state.micMode !== 'hold') return
    if (micPrimaryDisabled) return
    e.preventDefault()
    holdingRef.current = true
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    void beginListening()
  }

  const onMicPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (state.micMode !== 'hold') return
    if (!holdingRef.current) return
    holdingRef.current = false
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (phaseRef.current === 'listening') {
      commitListeningTurn()
    }
  }

  const onMicClickToggle = () => {
    if (state.micMode !== 'toggle') return
    if (state.phase === 'paused' || state.phase === 'processing') return
    if (state.error === 'mic_denied' || state.error === 'audio_failed') return
    playAppSound('tap')
    if (state.phase === 'ai_speaking') {
      cancelAiSpeech()
      void beginListening()
      return
    }
    if (state.phase === 'idle') {
      void beginListening()
      return
    }
    if (state.phase === 'listening') {
      commitListeningTurn()
    }
  }

  const recentExchanges = useMemo(() => state.exchanges.slice(-4).reverse(), [state.exchanges])

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface text-ink-primary">
      {/* Top */}
      <header className="shrink-0 z-30 px-4 pt-[max(0.6rem,env(safe-area-inset-top))] pb-3 border-b border-slate-200/90 bg-surface-elevated/95 backdrop-blur-md shadow-card">
        <div className="flex items-start gap-2 max-w-lg mx-auto w-full">
          <button
            type="button"
            onClick={() => {
              playAppSound('tap')
              cancelAiSpeech()
              onExit()
            }}
            className="min-h-touch min-w-touch inline-flex items-center justify-center rounded-xl text-ink-secondary hover:bg-slate-100"
            aria-label="Leave call"
          >
            <ChevronLeft className="w-6 h-6" aria-hidden />
          </button>
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-body-sm font-bold leading-tight truncate">{scenarioTitle}</h1>
            <p className="text-[11px] text-ink-tertiary mt-0.5 truncate">
              {levelLabel} · {modeLabel}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
                  conn.tone === 'live' && 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',
                  conn.tone === 'warn' && 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
                  conn.tone === 'danger' && 'bg-rose-100 text-rose-900 ring-1 ring-rose-200',
                  conn.tone === 'neutral' && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                )}
              >
                <span
                  className={clsx(
                    'h-1.5 w-1.5 rounded-full',
                    conn.tone === 'live' && 'bg-emerald-500 motion-safe:animate-pulse',
                    conn.tone === 'warn' && 'bg-amber-500 motion-safe:animate-pulse',
                    conn.tone === 'danger' && 'bg-rose-500',
                    conn.tone === 'neutral' && 'bg-slate-400'
                  )}
                  aria-hidden
                />
                {conn.line}
              </span>
              {state.networkSlow && state.phase === 'processing' ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-800">
                  <Wifi className="w-3.5 h-3.5 opacity-80" aria-hidden />
                  Slow network
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playAppSound('tap')
              dispatch({ type: 'TOGGLE_TRANSCRIPT' })
            }}
            className={clsx(
              'min-h-touch min-w-touch inline-flex items-center justify-center rounded-xl border transition-colors',
              state.transcriptOpen
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : 'border-slate-200 bg-white text-ink-secondary hover:bg-slate-50 shadow-card'
            )}
            aria-pressed={state.transcriptOpen}
            aria-label="Toggle transcript"
          >
            <MessageSquareText className="w-5 h-5" aria-hidden />
          </button>
        </div>
      </header>

      {/* Optional transcript */}
      <div
        className={clsx(
          'overflow-hidden border-b border-slate-200 bg-white transition-[max-height,opacity] duration-300 ease-out',
          state.transcriptOpen ? 'max-h-[38vh] opacity-100' : 'max-h-0 opacity-0 border-transparent'
        )}
      >
        <div className="max-w-lg mx-auto w-full px-4 py-3 space-y-2 overflow-y-auto max-h-[38vh]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">Recent</p>
          {recentExchanges.length === 0 ? (
            <p className="text-caption text-ink-secondary py-2">No exchanges yet — speak to populate.</p>
          ) : (
            <ul className="space-y-2">
              {recentExchanges.map((ex) => (
                <li
                  key={ex.id}
                  className={clsx(
                    'rounded-xl px-3 py-2 text-caption leading-snug',
                    ex.role === 'user' ? 'bg-primary-50 text-ink-primary ml-4 border border-primary-100' : 'bg-emerald-50 text-emerald-950 mr-4 border border-emerald-200'
                  )}
                >
                  <span className="text-[10px] font-bold text-ink-tertiary block mb-0.5">
                    {ex.role === 'user' ? 'You' : 'Assistant'}
                  </span>
                  {ex.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Center */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-6 min-h-0">
        <div
          className={clsx(
            'relative flex flex-col items-center justify-center w-full max-w-sm transition-transform duration-500',
            state.phase === 'listening' && 'scale-[1.02]',
            state.phase === 'processing' && 'scale-[0.98] opacity-90',
            state.phase === 'paused' && 'opacity-50 grayscale'
          )}
        >
          <div
            className={clsx(
              'relative flex h-36 w-36 items-center justify-center rounded-full border-2 transition-[box-shadow,background-color,border-color] duration-500',
              state.phase === 'idle' && 'border-slate-200 bg-slate-50 shadow-[0_0_0_0_rgba(255,255,255,0)]',
              state.phase === 'listening' &&
                'border-emerald-400 bg-emerald-50 shadow-[0_0_40px_-10px_rgba(52,211,153,0.45)] motion-safe:animate-pulse',
              state.phase === 'processing' &&
                'border-amber-300 bg-amber-50 shadow-[0_0_32px_-10px_rgba(251,191,36,0.3)]',
              state.phase === 'ai_speaking' &&
                'border-violet-400 bg-violet-50 shadow-[0_0_40px_-10px_rgba(167,139,250,0.35)]',
              state.phase === 'paused' && 'border-slate-200 bg-slate-100'
            )}
            aria-hidden
          >
            <span className="text-6xl select-none">{scenarioEmoji(scenarioId)}</span>
            {state.phase === 'processing' ? (
              <span className="absolute inset-0 rounded-full border-2 border-amber-300/30 border-t-amber-200 motion-safe:animate-spin" />
            ) : null}
          </div>

          <div className="mt-8 w-full max-w-xs">
            <SpeakLiveWaveform active={waveformUser || waveformAi} variant={waveformAi ? 'ai' : 'user'} />
          </div>
        </div>
      </main>

      {/* Bottom */}
      <footer className="shrink-0 z-30 border-t border-slate-200 bg-surface-elevated/98 backdrop-blur-md px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_14px_-6px_rgb(0_0_0/0.06)]">
        <div className="max-w-lg mx-auto w-full flex flex-col items-center gap-4">
          {state.phase === 'listening' ? (
            <div className="flex items-center gap-2 text-caption font-semibold text-rose-800">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-400" />
              </span>
              Recording · {formatTimer(state.listenMs)}
            </div>
          ) : (
            <p className="text-caption text-ink-tertiary text-center min-h-[1.25rem]">{micHint}</p>
          )}

          <button
            type="button"
            disabled={micPrimaryDisabled}
            onPointerDown={onMicPointerDown}
            onPointerUp={onMicPointerUp}
            onPointerCancel={onMicPointerUp}
            onClick={(e) => {
              if (state.micMode === 'hold') {
                e.preventDefault()
                return
              }
              onMicClickToggle()
            }}
            className={clsx(
              'relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full transition-all duration-300 shadow-xl',
              state.micMode === 'hold' ? 'cursor-pointer touch-manipulation' : 'cursor-pointer touch-manipulation',
              micPrimaryDisabled && 'opacity-40 pointer-events-none',
              state.phase === 'idle' &&
                'bg-gradient-to-br from-emerald-400 to-emerald-700 text-white ring-4 ring-emerald-500/25',
              state.phase === 'listening' &&
                'bg-gradient-to-br from-rose-500 to-rose-700 text-white ring-4 ring-rose-400/35 scale-105',
              state.phase === 'ai_speaking' &&
                'bg-gradient-to-br from-violet-500 to-fuchsia-700 text-white ring-4 ring-violet-400/30',
              state.phase === 'processing' && 'bg-slate-200 text-slate-500',
              state.phase === 'paused' && 'bg-slate-200 text-slate-500'
            )}
            aria-label={micHint}
          >
            <Mic className="w-9 h-9" strokeWidth={2} aria-hidden />
          </button>

          <div className="flex w-full items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                playAppSound('tap')
                processingGenRef.current += 1
                cancelAiSpeech()
                dispatch({ type: 'TOGGLE_PAUSE' })
              }}
              className="min-h-touch min-w-touch rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-caption font-bold text-ink-primary hover:bg-slate-50 inline-flex items-center gap-2 shadow-card"
            >
              <Pause className="w-4 h-4" aria-hidden />
              {state.phase === 'paused' ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              onClick={() => {
                playAppSound('tap')
                dispatch({ type: 'TOGGLE_MUTE' })
              }}
              className="min-h-touch min-w-touch rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-caption font-bold text-ink-primary hover:bg-slate-50 inline-flex items-center gap-2 shadow-card"
              aria-pressed={state.muted}
            >
              {state.muted ? <MicOff className="w-4 h-4" aria-hidden /> : <Volume2 className="w-4 h-4" aria-hidden />}
              {state.muted ? 'Unmute' : 'Mute'}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  playAppSound('tap')
                  dispatch({ type: 'TOGGLE_SETTINGS' })
                }}
                className="min-h-touch min-w-touch rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-caption font-bold text-ink-primary hover:bg-slate-50 inline-flex items-center gap-2 shadow-card"
                aria-expanded={state.settingsOpen}
                aria-label="Input settings"
              >
                <Settings2 className="w-4 h-4" aria-hidden />
              </button>
              {state.settingsOpen ? (
                <div
                  role="dialog"
                  aria-label="Speak input mode"
                  className="absolute bottom-full right-0 mb-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-elevated z-50"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary mb-2">Mic mode</p>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'SET_MIC_MODE', mode: 'toggle' })
                        dispatch({ type: 'TOGGLE_SETTINGS' })
                      }}
                      className={clsx(
                        'rounded-xl px-3 py-2 text-left text-caption font-semibold',
                        state.micMode === 'toggle' ? 'bg-emerald-100 text-emerald-900' : 'text-ink-secondary hover:bg-slate-50'
                      )}
                    >
                      Tap to speak
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'SET_MIC_MODE', mode: 'hold' })
                        dispatch({ type: 'TOGGLE_SETTINGS' })
                      }}
                      className={clsx(
                        'rounded-xl px-3 py-2 text-left text-caption font-semibold',
                        state.micMode === 'hold' ? 'bg-emerald-100 text-emerald-900' : 'text-ink-secondary hover:bg-slate-50'
                      )}
                    >
                      Press &amp; hold
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              disabled={isEndingCall}
              onClick={() => {
                playAppSound('tap')
                cancelAiSpeech()
                void (async () => {
                  if (onEndCall) {
                    await onEndCall()
                  } else {
                    onExit()
                  }
                })()
              }}
              className="min-h-touch min-w-touch rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-caption font-bold text-rose-800 hover:bg-rose-100 inline-flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              <PhoneOff className="w-4 h-4" aria-hidden />
              {isEndingCall ? 'Ending…' : 'End'}
            </button>
          </div>

          {(state.error === 'mic_denied' || state.error === 'audio_failed') && (
            <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-center">
              <p className="text-caption text-rose-900">
                {state.error === 'mic_denied'
                  ? 'Allow the microphone in the browser to practice speaking here.'
                  : 'Playback failed. Try again or check device audio.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'RESET_ERROR' })
                  processingGenRef.current += 1
                }}
                className="mt-2 inline-flex items-center gap-1.5 text-caption font-bold text-primary-700 underline-offset-2 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden />
                Try again
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 w-full pt-2">
            <button
              type="button"
              onClick={() => {
                playAppSound('tap')
                onSaveSession()
              }}
              className="min-h-touch rounded-xl border border-slate-200 bg-white text-caption font-bold text-ink-primary inline-flex items-center justify-center gap-2 hover:bg-slate-50 shadow-card"
            >
              <Save className="w-4 h-4" aria-hidden />
              Save
            </button>
            <Link
              href={summaryHref}
              onClick={() => playAppSound('tap')}
              aria-disabled={isEndingCall}
              className={clsx(
                'min-h-touch rounded-xl border border-slate-200 bg-white text-caption font-bold text-ink-primary inline-flex items-center justify-center gap-2 hover:bg-slate-50 shadow-card',
                isEndingCall && 'pointer-events-none opacity-40'
              )}
            >
              <FileText className="w-4 h-4" aria-hidden />
              Recap
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
