'use client'

import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import {
  Bug,
  Captions,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  MoreHorizontal,
  Pause,
  RotateCcw,
  Settings2,
  Volume2,
} from 'lucide-react'
import type { LiveSessionStatus } from './liveSpeakTypes'
import { SpeakLiveWaveform } from '../call/SpeakLiveWaveform'

export type LiveMicMode = 'hold' | 'toggle'

function formatTimer(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${r.toString().padStart(2, '0')}` : `0:${r.toString().padStart(2, '0')}`
}

export function LiveSessionControls({
  status,
  micMode,
  listenMs,
  muted,
  settingsOpen,
  micDisabled,
  micHint,
  stateHeadline,
  stateSubline,
  onMicPointerDown,
  onMicPointerUp,
  onMicClickToggle,
  onTogglePause,
  onToggleMute,
  onToggleSettings,
  onSetMicMode,
  onSwitchToText,
  canReplayAssistant,
  onReplayAssistant,
  replayDisabled,
  replayDisabledReason,
  captionsOn,
  onToggleCaptions,
  /** Phone-style assist: live transcript toggle — shown in utilities, not as primary chrome. */
  assistTranscriptAvailable = false,
  assistTranscriptOn = false,
  onToggleAssistTranscript,
  showDevDebugEntry,
  onOpenDevDebug,
}: {
  status: LiveSessionStatus
  micMode: LiveMicMode
  listenMs: number
  muted: boolean
  settingsOpen: boolean
  micDisabled: boolean
  micHint: string
  /** Short, human state label (conversation center). */
  stateHeadline: string
  /** Optional calm supporting line (errors, network, hints). */
  stateSubline?: string | null
  onMicPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void
  onMicPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void
  onMicClickToggle: (e: React.MouseEvent<HTMLButtonElement>) => void
  onTogglePause: () => void
  onToggleMute: () => void
  onToggleSettings: () => void
  onSetMicMode: (mode: LiveMicMode) => void
  onSwitchToText: () => void
  canReplayAssistant?: boolean
  onReplayAssistant?: () => void
  replayDisabled?: boolean
  replayDisabledReason?: string
  captionsOn: boolean
  onToggleCaptions: () => void
  assistTranscriptAvailable?: boolean
  assistTranscriptOn?: boolean
  onToggleAssistTranscript?: () => void
  showDevDebugEntry?: boolean
  onOpenDevDebug?: () => void
}) {
  const showListening = status === 'listening'
  const showTranscribing = status === 'transcribing'
  const processing =
    status === 'transcribing' || status === 'thinking' || status === 'got_it' || status === 'replying'
  const assistantActive = status === 'speaking'

  const [utilitiesOpen, setUtilitiesOpen] = useState(false)
  const utilitiesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!utilitiesOpen) return
    const onDoc = (e: MouseEvent) => {
      const el = utilitiesRef.current
      if (el && !el.contains(e.target as Node)) setUtilitiesOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [utilitiesOpen])

  const defaultSubline = showListening
    ? `${formatTimer(listenMs)} · Tap again when you're done`
    : showTranscribing
      ? 'Carrying your words across…'
      : null
  const displaySubline = stateSubline ?? defaultSubline

  const showProcessingVisual = processing && !showListening && !assistantActive

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1 px-2 text-center">
        <p className="text-[1.125rem] font-semibold leading-tight tracking-tight text-[#0F172A] sm:text-[1.28rem]">
          {stateHeadline}
        </p>
        {displaySubline ? (
          <p className="max-w-[20rem] text-[13px] leading-snug text-[#64748B]">{displaySubline}</p>
        ) : null}
      </div>

      <div className="flex w-full max-w-[15rem] flex-col items-center">
        <div className="relative flex h-[6.25rem] w-[6.25rem] shrink-0 items-center justify-center">
          {/* Idle: soft ready halo */}
          {status === 'idle' && !micDisabled ? (
            <span
              className="pointer-events-none absolute inset-[-6px] rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] motion-safe:animate-[pulse_3s_ease-in-out_infinite]"
              aria-hidden
            />
          ) : null}
          {/* Listening: confident live rings */}
          {showListening ? (
            <>
              <span
                className="pointer-events-none absolute inset-[-14px] rounded-full border-2 border-emerald-400/30 motion-safe:animate-ping motion-safe:[animation-duration:1.75s]"
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-[-8px] rounded-full bg-emerald-400/20 motion-safe:animate-pulse motion-safe:duration-[1.2s]"
                aria-hidden
              />
            </>
          ) : null}
          {/* Assistant: calm “floor” glow — slower than listening */}
          {assistantActive ? (
            <span
              className="pointer-events-none absolute inset-[-10px] rounded-full bg-violet-500/15 ring-2 ring-violet-400/30 motion-safe:animate-pulse motion-safe:duration-[2.2s]"
              aria-hidden
            />
          ) : null}
          {/* Processing: quiet rim only — no aggressive pulse */}
          {showProcessingVisual ? (
            <span
              className="pointer-events-none absolute inset-[-5px] rounded-full border border-slate-200/90 bg-white/80 shadow-inner"
              aria-hidden
            />
          ) : null}

          <button
            type="button"
            disabled={micDisabled}
            onPointerDown={onMicPointerDown}
            onPointerUp={onMicPointerUp}
            onPointerCancel={onMicPointerUp}
            onClick={onMicClickToggle}
            className={clsx(
              'relative z-10 flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full transition-all duration-300 ease-out touch-manipulation',
              micDisabled && 'pointer-events-none opacity-40',
              status === 'idle' &&
                'bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-[0_10px_36px_-12px_rgba(5,150,105,0.5)] ring-[3px] ring-white/25',
              showListening &&
                'scale-[1.06] bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 text-white shadow-[0_14px_40px_-10px_rgba(16,185,129,0.55)] ring-[3px] ring-emerald-100/50',
              showTranscribing &&
                'scale-[1.01] bg-gradient-to-br from-slate-100 to-slate-300 text-slate-600 shadow-sm ring-2 ring-slate-200/80',
              status === 'speaking' &&
                'bg-gradient-to-br from-violet-500 via-indigo-600 to-indigo-800 text-white shadow-[0_12px_32px_-10px_rgba(99,102,241,0.45)] ring-[3px] ring-violet-100/40',
              (status === 'thinking' || status === 'got_it' || status === 'replying') &&
                'bg-white text-[#64748B] shadow-sm ring-2 ring-[#E5E7EB]',
              status === 'paused' && 'bg-slate-200 text-slate-500 ring-2 ring-slate-300/40',
              status === 'error' && 'bg-rose-50 text-rose-800 ring-2 ring-rose-200/80'
            )}
            aria-label={micHint}
          >
            {showProcessingVisual ? (
              <Loader2 className="h-8 w-8 motion-safe:animate-spin text-[#64748B]" strokeWidth={2} aria-hidden />
            ) : assistantActive ? (
              <Mic className="h-9 w-9 opacity-95" strokeWidth={2} aria-hidden />
            ) : (
              <Mic className="h-9 w-9" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>

        {/* Activity strip: waveform when user or assistant has the floor; calm dots while processing */}
        <div className="mt-1 flex h-[3.25rem] w-full max-w-[13rem] items-end justify-center">
          {showListening ? <SpeakLiveWaveform active variant="user" /> : null}
          {assistantActive ? <SpeakLiveWaveform active variant="ai" /> : null}
          {showProcessingVisual ? (
            <div className="flex h-10 items-center gap-1.5 pb-0.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-slate-300 motion-safe:animate-pulse"
                  style={{ animationDelay: `${i * 180}ms` }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onTogglePause}
          title="Pause your side — the call waits for you"
          className="inline-flex min-h-touch items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-[13px] font-medium text-[#0F172A] shadow-sm hover:bg-slate-50"
        >
          <Pause className="h-4 w-4 text-[#64748B]" aria-hidden />
          {status === 'paused' ? 'Resume' : 'Pause'}
        </button>

        <div className="relative" ref={utilitiesRef}>
          <button
            type="button"
            onClick={() => {
              setUtilitiesOpen((v) => !v)
            }}
            className={clsx(
              'inline-flex min-h-touch items-center gap-1.5 rounded-2xl border px-3 py-2.5 text-[13px] font-medium shadow-sm',
              utilitiesOpen
                ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]'
                : 'border-[#E5E7EB] bg-white text-[#475569] hover:bg-slate-50',
            )}
            aria-expanded={utilitiesOpen}
            aria-haspopup="true"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            More
          </button>
          {utilitiesOpen ? (
            <div
              role="menu"
              className="absolute bottom-full right-0 z-[60] mb-2 w-[min(17.5rem,calc(100vw-2rem))] rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-lg"
            >
              {onReplayAssistant && (canReplayAssistant || replayDisabled) ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={
                    replayDisabled ||
                    !canReplayAssistant ||
                    status === 'speaking' ||
                    status === 'thinking' ||
                    status === 'replying' ||
                    status === 'transcribing'
                  }
                  title={replayDisabled ? replayDisabledReason : 'Hear that reply again'}
                  onClick={() => {
                    onReplayAssistant()
                    setUtilitiesOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#0F172A] hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                  Replay reply
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleMute()
                  setUtilitiesOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#0F172A] hover:bg-slate-50"
              >
                {muted ? <MicOff className="h-4 w-4 shrink-0" aria-hidden /> : <Volume2 className="h-4 w-4 shrink-0" aria-hidden />}
                {muted ? 'Unmute reply' : 'Mute reply'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleCaptions()
                  setUtilitiesOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#0F172A] hover:bg-slate-50"
              >
                <Captions className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                {captionsOn ? 'Hide dialogue' : 'Show dialogue'}
              </button>
              {assistTranscriptAvailable && onToggleAssistTranscript ? (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleAssistTranscript()
                    setUtilitiesOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#0F172A] hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                  {assistTranscriptOn ? 'Hide written thread' : 'Written thread'}
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onSwitchToText()
                  setUtilitiesOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#0F172A] hover:bg-slate-50"
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
                Open text chat
              </button>
              <div className="my-1 border-t border-[#E5E7EB]" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setUtilitiesOpen(false)
                  onToggleSettings()
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#475569] hover:bg-slate-50"
              >
                <Settings2 className="h-4 w-4 shrink-0" aria-hidden />
                Mic style
              </button>
              {showDevDebugEntry && onOpenDevDebug ? (
                <>
                  <div className="my-1 border-t border-[#E5E7EB]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onOpenDevDebug()
                      setUtilitiesOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[#64748B] hover:bg-slate-50"
                  >
                    <Bug className="h-4 w-4 shrink-0" aria-hidden />
                    Debug panel (dev)
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {settingsOpen ? (
            <div
              role="dialog"
              aria-label="How you use the microphone"
              className="absolute bottom-full right-0 z-[61] mb-2 w-56 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-lg"
            >
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Mic style</p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetMicMode('toggle')}
                  className={clsx(
                    'rounded-xl px-3 py-2 text-left text-[13px] font-medium',
                    micMode === 'toggle' ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80' : 'text-[#475569] hover:bg-slate-50',
                  )}
                >
                  Tap on, tap off
                </button>
                <button
                  type="button"
                  onClick={() => onSetMicMode('hold')}
                  className={clsx(
                    'rounded-xl px-3 py-2 text-left text-[13px] font-medium',
                    micMode === 'hold' ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80' : 'text-[#475569] hover:bg-slate-50',
                  )}
                >
                  Hold while you speak
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
