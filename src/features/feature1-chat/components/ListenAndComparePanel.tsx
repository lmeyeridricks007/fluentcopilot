'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Headphones, LayoutList, Loader2, Mic, Snail } from 'lucide-react'
import { clsx } from 'clsx'
import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { getSpeakingReferenceAudio } from '@/lib/speaking/speakingAssessmentClient'
import { chunkReferenceTextForListen } from '@/lib/speaking/chunkReferenceTextForListen'

type SpeedKey = 'normal' | 'slow' | 'chunked'

type ActiveKind = 'idle' | SpeedKey | 'user' | 'browser-normal' | 'browser-slow' | 'browser-chunked'

export type ListenAndCompareHandlers = {
  playReference: () => void | Promise<void>
  playSlow: () => void | Promise<void>
  playChunked: () => void | Promise<void>
  playUser: () => void | Promise<void>
  stop: () => void
}

function activeLabel(active: ActiveKind): string | null {
  if (active === 'idle') return null
  if (active === 'normal' || active === 'browser-normal') return 'Playing: reference'
  if (active === 'slow' || active === 'browser-slow') return 'Playing: slower'
  if (active === 'chunked' || active === 'browser-chunked') return 'Playing: chunks'
  if (active === 'user') return 'Playing: your clip'
  return null
}

function pickNlVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith('nl-nl')) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('nl')) ||
    null
  )
}

export function ListenAndComparePanel({
  compareText,
  locale = 'nl-NL',
  userRecordingUrl,
  voice,
  visualStyle = 'default',
  className,
  onRegisterHandlers,
}: {
  compareText: string
  locale?: string
  userRecordingUrl: string | null
  /** Optional Azure/OpenAI voice id; server defaults when omitted. */
  voice?: string
  visualStyle?: 'default' | 'premium'
  /** Merged onto the root wrapper (e.g. margin when a parent handles section spacing). */
  className?: string
  onRegisterHandlers?: (handlers: ListenAndCompareHandlers | null) => void
}) {
  const [active, setActive] = useState<ActiveKind>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<SpeedKey | null>(null)
  const [urlBySpeed, setUrlBySpeed] = useState<Partial<Record<SpeedKey, string>>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunkIndexRef = useRef(0)

  const stopAll = useCallback(() => {
    window.speechSynthesis?.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    setActive('idle')
  }, [])

  useEffect(() => {
    return () => stopAll()
  }, [stopAll])

  const playDataUrl = useCallback(
    (url: string, kind: ActiveKind) => {
      stopAll()
      const el = new Audio(url)
      audioRef.current = el
      setActive(kind)
      el.onended = () => setActive('idle')
      el.onerror = () => {
        setError('Playback failed for this clip.')
        setActive('idle')
      }
      void el.play().catch(() => {
        setError('Playback was blocked or failed.')
        setActive('idle')
      })
    },
    [stopAll]
  )

  const speakBrowser = useCallback(
    (chunks: string[], rate: number, kind: ActiveKind) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Browser speech is not available here.')
        return
      }
      stopAll()
      window.speechSynthesis.cancel()
      const v = pickNlVoice()
      chunkIndexRef.current = 0
      const speakNext = () => {
        const i = chunkIndexRef.current
        if (i >= chunks.length) {
          setActive('idle')
          return
        }
        const u = new SpeechSynthesisUtterance(chunks[i]!)
        u.lang = locale
        if (v) u.voice = v
        u.rate = rate
        u.onend = () => {
          chunkIndexRef.current += 1
          speakNext()
        }
        u.onerror = () => {
          setError('Browser speech failed.')
          setActive('idle')
        }
        window.speechSynthesis.speak(u)
      }
      setActive(kind)
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null
          chunkIndexRef.current = 0
          speakNext()
        }
      } else {
        speakNext()
      }
    },
    [locale, stopAll]
  )

  const resolveSpeed = useCallback(
    async (speed: SpeedKey) => {
      const t = compareText.trim()
      if (!t) {
        setError('No reference line to play.')
        return
      }
      const cached = urlBySpeed[speed]
      if (cached) {
        playDataUrl(cached, speed)
        return
      }
      if (!getApiBaseUrl()) {
        const chunks = speed === 'chunked' ? chunkReferenceTextForListen(t) : [t]
        const rate = speed === 'slow' ? 0.78 : speed === 'chunked' ? 0.82 : 0.92
        const browserKind: ActiveKind =
          speed === 'slow' ? 'browser-slow' : speed === 'chunked' ? 'browser-chunked' : 'browser-normal'
        speakBrowser(chunks.length ? chunks : [t], rate, browserKind)
        return
      }
      setLoading(speed)
      setError(null)
      try {
        const res = await getSpeakingReferenceAudio({ text: t, speed, locale, voice })
        if (res.url) {
          setUrlBySpeed((m) => ({ ...m, [speed]: res.url }))
          playDataUrl(res.url, speed)
        } else if (res.useBrowserTts) {
          const chunks = speed === 'chunked' ? chunkReferenceTextForListen(t) : [t]
          const rate = speed === 'slow' ? 0.78 : speed === 'chunked' ? 0.82 : 0.92
          const browserKind: ActiveKind =
            speed === 'slow' ? 'browser-slow' : speed === 'chunked' ? 'browser-chunked' : 'browser-normal'
          speakBrowser(chunks.length ? chunks : [t], rate, browserKind)
        } else {
          setError('Reference audio is not available yet. Try again in a moment.')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load reference audio.')
      } finally {
        setLoading(null)
      }
    },
    [compareText, locale, voice, urlBySpeed, playDataUrl, speakBrowser]
  )

  const playUserClip = useCallback(() => {
    if (!userRecordingUrl) {
      setError('No learner recording to play.')
      return
    }
    stopAll()
    const el = new Audio(userRecordingUrl)
    audioRef.current = el
    setActive('user')
    el.onended = () => setActive('idle')
    el.onerror = () => {
      setError('Could not play your recording.')
      setActive('idle')
    }
    void el.play().catch(() => {
      setError('Playback was blocked or failed.')
      setActive('idle')
    })
  }, [userRecordingUrl, stopAll])

  useEffect(() => {
    if (!onRegisterHandlers) return
    const h: ListenAndCompareHandlers = {
      playReference: () => void resolveSpeed('normal'),
      playSlow: () => void resolveSpeed('slow'),
      playChunked: () => void resolveSpeed('chunked'),
      playUser: () => void playUserClip(),
      stop: () => stopAll(),
    }
    onRegisterHandlers(h)
    return () => onRegisterHandlers(null)
  }, [onRegisterHandlers, resolveSpeed, playUserClip, stopAll])

  const busy = loading !== null
  const textOk = compareText.trim().length > 0
  const playing = activeLabel(active)
  const premium = visualStyle === 'premium'

  return (
    <div
      className={clsx(
        premium ? 'mt-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-3 py-3' : 'mt-3 rounded-lg border border-emerald-200/80 bg-emerald-50/35 px-2.5 py-2.5',
        className
      )}
    >
      <p
        className={clsx(
          'font-bold uppercase tracking-wide flex items-center gap-1',
          premium ? 'text-[11px] text-primary-800' : 'text-[10px] text-emerald-900/80'
        )}
      >
        <Headphones className="w-3.5 h-3.5" aria-hidden />
        Listen and compare
      </p>
      <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
        Compare reference Dutch to your clip. Only one audio at a time.
      </p>

      {playing ? (
        <p className="mt-2 text-caption font-semibold text-primary-800 flex items-center gap-2" role="status" aria-live="polite">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary-500 motion-safe:animate-pulse" aria-hidden />
          {playing}
        </p>
      ) : null}

      <div className={clsx('flex flex-wrap gap-2', premium ? 'mt-3' : 'mt-2')}>
        <PlaybackChip
          label="Reference"
          icon={<Headphones className="w-3.5 h-3.5" aria-hidden />}
          active={active === 'normal' || active === 'browser-normal'}
          disabled={!textOk || busy}
          onClick={() => void resolveSpeed('normal')}
          premium={premium}
        />
        <PlaybackChip
          label="Slower"
          icon={<Snail className="w-3.5 h-3.5" aria-hidden />}
          active={active === 'slow' || active === 'browser-slow'}
          disabled={!textOk || busy}
          onClick={() => void resolveSpeed('slow')}
          premium={premium}
        />
        <PlaybackChip
          label="In chunks"
          icon={<LayoutList className="w-3.5 h-3.5" aria-hidden />}
          active={active === 'chunked' || active === 'browser-chunked'}
          disabled={!textOk || busy}
          onClick={() => void resolveSpeed('chunked')}
          premium={premium}
        />
        <PlaybackChip
          label="Your clip"
          icon={<Mic className="w-3.5 h-3.5" aria-hidden />}
          active={active === 'user'}
          disabled={!userRecordingUrl || busy}
          onClick={playUserClip}
          premium={premium}
        />
        {busy ? (
          <span className="inline-flex items-center gap-1 text-caption text-ink-secondary">
            <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden />
            Loading…
          </span>
        ) : null}
      </div>

      {active !== 'idle' ? (
        <button
          type="button"
          onClick={stopAll}
          className={clsx(
            'mt-2 text-caption font-semibold underline-offset-2 hover:underline',
            premium ? 'text-primary-900' : 'text-emerald-900/90'
          )}
        >
          Stop playback
        </button>
      ) : null}

      {error ? <p className="mt-1.5 text-caption text-red-800">{error}</p> : null}
    </div>
  )
}

function PlaybackChip({
  label,
  icon,
  active,
  disabled,
  onClick,
  premium,
}: {
  label: string
  icon: ReactNode
  active: boolean
  disabled: boolean
  onClick: () => void
  premium?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-2 rounded-2xl border min-h-touch px-3.5 py-2.5 text-body-sm font-bold transition-colors',
        premium
          ? active
            ? 'border-primary-600 bg-primary-600 text-white shadow-md'
            : 'border-slate-200/90 bg-white text-ink-primary hover:bg-slate-50'
          : active
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-emerald-300/90 bg-white/90 text-emerald-950 hover:bg-emerald-50',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      {icon}
      {label}
    </button>
  )
}
