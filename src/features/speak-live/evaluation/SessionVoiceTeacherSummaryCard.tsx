'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { Loader2, Pause, Play, Volume2 } from 'lucide-react'
import { conversationClient } from '@/lib/api/conversationClient'
import {
  buildSessionTeacherVoiceSummary,
  type SessionTeacherSummaryInput,
  type TeacherSummaryLocale,
} from './sessionTeacherVoiceSummary'

type CachedAudio = { audioUrl: string }

export function SessionVoiceTeacherSummaryCard(props: {
  sessionId: string
  summaryInput: SessionTeacherSummaryInput
  /** Override script builder (e.g. Language Coach debrief). */
  buildScript?: (locale: TeacherSummaryLocale) => string
  className?: string
}) {
  const { sessionId, summaryInput, buildScript, className } = props
  const [locale, setLocale] = useState<TeacherSummaryLocale>('nl')
  const [phase, setPhase] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cacheRef = useRef<Map<string, CachedAudio>>(new Map())

  const script = useMemo(() => {
    if (buildScript) return buildScript(locale)
    return buildSessionTeacherVoiceSummary(locale, summaryInput)
  }, [buildScript, locale, summaryInput])

  const stopPlayback = useCallback(() => {
    const el = audioRef.current
    if (el) {
      el.pause()
      el.onended = null
      el.onerror = null
      audioRef.current = null
    }
    setPhase((p) => (p === 'playing' || p === 'loading' ? 'idle' : p))
  }, [])

  useEffect(() => () => stopPlayback(), [stopPlayback])

  const fetchAudio = useCallback(
    async (text: string, lang: TeacherSummaryLocale): Promise<string> => {
      const key = `${lang}:${text}`
      const hit = cacheRef.current.get(key)
      if (hit) return hit.audioUrl
      const res = await conversationClient.speakLiveTtsChunk({
        text,
        threadId: sessionId || undefined,
        chunkIndex: 0,
        language: lang === 'nl' ? 'nl' : 'en',
      })
      cacheRef.current.set(key, { audioUrl: res.audioUrl })
      return res.audioUrl
    },
    [sessionId],
  )

  const play = useCallback(async () => {
    if (!script.trim()) return
    stopPlayback()
    setPhase('loading')
    setError(null)
    try {
      const url = await fetchAudio(script, locale)
      const el = new Audio(url)
      audioRef.current = el
      el.onended = () => {
        audioRef.current = null
        setPhase('idle')
      }
      el.onerror = () => {
        audioRef.current = null
        setPhase('error')
        setError(locale === 'nl' ? 'Audio kon niet worden afgespeeld.' : 'Could not play the summary audio.')
      }
      await el.play()
      setPhase('playing')
    } catch (e) {
      setPhase('error')
      setError(
        e instanceof Error
          ? e.message
          : locale === 'nl'
            ? 'Samenvatting kon niet worden geladen.'
            : 'Could not load the summary.',
      )
    }
  }, [fetchAudio, locale, script, stopPlayback])

  const togglePlay = () => {
    if (phase === 'playing') {
      stopPlayback()
      return
    }
    void play()
  }

  return (
    <section
      className={clsx(
        'rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/40 px-4 py-4 shadow-sm ring-1 ring-violet-100/60 sm:px-5 sm:py-5',
        className,
      )}
      aria-labelledby="session-voice-summary-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md"
            aria-hidden
          >
            <Volume2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 id="session-voice-summary-heading" className="text-[15px] font-semibold text-ink-primary">
              {locale === 'nl' ? 'Luister naar je samenvatting' : 'Listen to your summary'}
            </h2>
            <p className="text-[13px] leading-snug text-slate-600">
              {locale === 'nl'
                ? 'Een korte terugblik in gewone taal — wat ging goed en waar je aan kunt werken.'
                : 'A short teacher-style recap — what went well and what to improve next.'}
            </p>
          </div>
        </div>

        <div
          className="inline-flex rounded-full border border-violet-200 bg-white p-0.5 text-[12px] font-semibold shadow-sm"
          role="group"
          aria-label={locale === 'nl' ? 'Taal van de samenvatting' : 'Summary language'}
        >
          {(['nl', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                if (locale === code) return
                stopPlayback()
                setLocale(code)
                setError(null)
              }}
              className={clsx(
                'rounded-full px-3 py-1.5 transition-colors',
                locale === code ? 'bg-violet-600 text-white' : 'text-violet-800 hover:bg-violet-50',
              )}
              aria-pressed={locale === code}
            >
              {code === 'nl' ? 'Nederlands' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          disabled={phase === 'loading' || !script.trim()}
          className="inline-flex min-h-touch items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === 'loading' ? (
            <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
          ) : phase === 'playing' ? (
            <Pause className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <Play className="h-4 w-4 shrink-0" aria-hidden />
          )}
          {phase === 'loading'
            ? locale === 'nl'
              ? 'Laden…'
              : 'Loading…'
            : phase === 'playing'
              ? locale === 'nl'
                ? 'Stop'
                : 'Stop'
              : locale === 'nl'
                ? 'Speel samenvatting'
                : 'Play summary'}
        </button>
      </div>

      <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
        {script.replace(/ \.\.\. /g, '\n\n')}
      </p>

      {error ? <p className="mt-2 text-[12px] text-rose-700">{error}</p> : null}
    </section>
  )
}
