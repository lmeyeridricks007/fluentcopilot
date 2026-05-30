'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Headphones, LayoutList, Loader2, Pause, Play, Snail, Volume2 } from 'lucide-react'
import { clsx } from 'clsx'
import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { getSpeakingReferenceAudio } from '@/lib/speaking/speakingAssessmentClient'
import { chunkReferenceTextForListen } from '@/lib/speaking/chunkReferenceTextForListen'
import {
  LISTENING_DIALOGUE_VOICE_A_NL,
  LISTENING_DIALOGUE_VOICE_B_NL,
  splitListeningDialogueForTts,
  type ListeningDialogueTurn,
} from '@/lib/speaking/listeningDialogueTts'
import { speakNl } from './blockPrimitives'

type SpeedKey = 'normal' | 'slow' | 'chunked'

type ActiveKind = 'idle' | SpeedKey | 'browser-normal' | 'browser-slow' | 'browser-chunked'

function pickNlVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith('nl-nl')) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('nl')) ||
    null
  )
}

/** Two different Dutch voices when available (A/B dialogue in browser TTS). */
function pickTwoDistinctNlVoices(): [SpeechSynthesisVoice | null, SpeechSynthesisVoice | null] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [null, null]
  const nl = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang?.toLowerCase().startsWith('nl-nl') || v.lang?.toLowerCase().startsWith('nl'))
  if (nl.length >= 2) {
    const second = nl.find((v) => v.voiceURI !== nl[0]!.voiceURI && v.name !== nl[0]!.name) ?? nl[1]!
    return [nl[0]!, second]
  }
  if (nl.length === 1) return [nl[0]!, null]
  return [null, null]
}

function neuralVoiceForDialogueTurn(
  turn: ListeningDialogueTurn,
  narratorVoice: string,
  dialogueVoiceA: string,
  dialogueVoiceB: string,
): string {
  if (turn.role === 'A') return dialogueVoiceA
  if (turn.role === 'B') return dialogueVoiceB
  return narratorVoice
}

function browserVoiceForDialogueTurn(
  turn: ListeningDialogueTurn,
  primary: SpeechSynthesisVoice | null,
  secondary: SpeechSynthesisVoice | null,
): SpeechSynthesisVoice | null {
  if (turn.role === 'B') return secondary ?? primary
  return primary
}

/**
 * FluentCopilot-style reference playback for pack blocks: prefers `/api/speaking/reference-audio`,
 * falls back to the same browser Dutch path as {@link ListenAndComparePanel}.
 * Does not alter the speaking API client — only consumes it.
 */
export function PackReferenceAudioControls(props: {
  line: string
  /** When the pack already includes a static reference clip URL (e.g. hydrated saved-word packs). */
  referenceAudioUrl?: string | null
  voice?: string
  /** With {@link alternatingAbDialogue}, used for narrator-only segments (e.g. weerbericht). */
  narratorVoice?: string
  /** Parse `A:` / `B:` lines and play with alternating voices (Neural: Maarten/Fenna by default). */
  alternatingAbDialogue?: boolean
  /** Azure Neural voice id for `A:` lines when {@link alternatingAbDialogue} is on. */
  dialogueVoiceA?: string
  /** Azure Neural voice id for `B:` lines when {@link alternatingAbDialogue} is on. */
  dialogueVoiceB?: string
  locale?: string
  disabled?: boolean
  compact?: boolean
  /**
   * Single round play/pause — same audio path as “Neural ref” (server clip or browser Dutch).
   * Use in exam prep and anywhere the four-button row is too busy.
   */
  variant?: 'default' | 'playOnly'
  /** Short label above controls (e.g. "Main line", "Example 2"). */
  rowLabel?: string
  /** Replaces the default English hint next to the play button (e.g. Dutch exam copy). */
  playOnlyHint?: string
  className?: string
}) {
  const {
    line,
    referenceAudioUrl,
    voice,
    narratorVoice,
    alternatingAbDialogue = false,
    dialogueVoiceA,
    dialogueVoiceB,
    locale = 'nl-NL',
    disabled,
    compact,
    variant = 'default',
    rowLabel,
    playOnlyHint,
    className,
  } = props
  const [active, setActive] = useState<ActiveKind>('idle')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<SpeedKey | null>(null)
  const [urlBySpeed, setUrlBySpeed] = useState<Partial<Record<SpeedKey, string>>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const chunkIndexRef = useRef(0)
  const playAbortRef = useRef<AbortController | null>(null)

  const silenceMediaAndSpeechOnly = useCallback(() => {
    window.speechSynthesis?.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
    }
    setActive('idle')
  }, [])

  const stopAll = useCallback(() => {
    playAbortRef.current?.abort()
    playAbortRef.current = null
    silenceMediaAndSpeechOnly()
  }, [silenceMediaAndSpeechOnly])

  useEffect(() => {
    return () => stopAll()
  }, [stopAll])

  /** New stem / bundled clip — drop cached Neural URLs so the next play matches {@link line}. */
  useEffect(() => {
    setUrlBySpeed({})
    stopAll()
  }, [line, referenceAudioUrl, stopAll])

  const playDataUrl = useCallback(
    (url: string, kind: ActiveKind) => {
      stopAll()
      const el = new Audio(url)
      audioRef.current = el
      setActive(kind)
      const finish = () => {
        if (audioRef.current !== el) return
        setActive('idle')
      }
      // `ended` is sometimes missed (Safari / short clips / blob URLs); `pause` with `ended` true covers natural completion.
      el.addEventListener('ended', finish)
      el.addEventListener('pause', () => {
        if (el.ended) finish()
      })
      el.addEventListener('error', () => {
        setError('Playback failed.')
        finish()
      })
      void el.play().catch(() => {
        setError('Playback was blocked or failed.')
        finish()
      })
    },
    [stopAll],
  )

  const speakBrowser = useCallback(
    (chunks: string[], rate: number, kind: ActiveKind) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Browser speech is not available.')
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
    [locale, stopAll],
  )

  const speakBrowserDialogueTurns = useCallback(
    (turns: ListeningDialogueTurn[], speed: SpeedKey) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setError('Browser speech is not available.')
        return
      }
      stopAll()
      window.speechSynthesis.cancel()
      const rate = speed === 'slow' ? 0.78 : speed === 'chunked' ? 0.82 : 0.92
      const kind: ActiveKind =
        speed === 'slow' ? 'browser-slow' : speed === 'chunked' ? 'browser-chunked' : 'browser-normal'
      const [v0, v1] = pickTwoDistinctNlVoices()
      let idx = 0
      const speakNext = () => {
        if (idx >= turns.length) {
          setActive('idle')
          return
        }
        const turn = turns[idx]!
        const text = turn.text.trim()
        if (!text) {
          idx += 1
          speakNext()
          return
        }
        const u = new SpeechSynthesisUtterance(text)
        u.lang = locale
        const bv = browserVoiceForDialogueTurn(turn, v0, v1)
        if (bv) u.voice = bv
        u.rate = rate
        u.onend = () => {
          idx += 1
          window.setTimeout(speakNext, 360)
        }
        u.onerror = () => {
          setError('Browser speech failed.')
          setActive('idle')
        }
        setActive(kind)
        window.speechSynthesis.speak(u)
      }
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null
          idx = 0
          speakNext()
        }
      } else {
        speakNext()
      }
    },
    [locale, stopAll],
  )

  const resolveSpeed = useCallback(
    async (speed: SpeedKey) => {
      const t = line.trim()
      if (!t) {
        setError('Nothing to play.')
        return
      }
      const ac = new AbortController()
      playAbortRef.current = ac

      const bundled = Boolean(referenceAudioUrl?.trim())
      if (variant === 'playOnly' && alternatingAbDialogue && !bundled) {
        const turns = splitListeningDialogueForTts(line)
        if (turns.length > 0) {
          const vA = dialogueVoiceA ?? LISTENING_DIALOGUE_VOICE_A_NL
          const vB = dialogueVoiceB ?? LISTENING_DIALOGUE_VOICE_B_NL
          const vN = narratorVoice?.trim() || voice?.trim() || LISTENING_DIALOGUE_VOICE_B_NL
          const firstTurn = turns.find((u) => u.text.trim())
          if (!firstTurn) {
            setError('Nothing to play.')
            return
          }

          if (!getApiBaseUrl()) {
            speakBrowserDialogueTurns(turns, speed)
            return
          }

          setLoading(speed)
          setError(null)
          try {
            const probeVoice = neuralVoiceForDialogueTurn(firstTurn, vN, vA, vB)
            const probe = await getSpeakingReferenceAudio(
              { text: firstTurn.text.trim(), speed, locale, voice: probeVoice },
              { signal: ac.signal },
            )
            if (ac.signal.aborted) return
            if (!probe.url && probe.useBrowserTts) {
              stopAll()
              speakBrowserDialogueTurns(turns, speed)
              return
            }

            silenceMediaAndSpeechOnly()
            for (const turn of turns) {
              if (ac.signal.aborted) break
              const text = turn.text.trim()
              if (!text) continue
              const vn = neuralVoiceForDialogueTurn(turn, vN, vA, vB)
              const res = await getSpeakingReferenceAudio(
                { text, speed, locale, voice: vn },
                { signal: ac.signal },
              )
              if (ac.signal.aborted) break
              if (!res.url && res.useBrowserTts) {
                stopAll()
                speakBrowserDialogueTurns(turns, speed)
                return
              }
              if (res.url) {
                /** Capture the narrowed URL so TS sees `string` (not `string | null`) inside the Promise callback. */
                const audioUrl = res.url
                await new Promise<void>((resolve, reject) => {
                  if (audioRef.current) {
                    audioRef.current.pause()
                    audioRef.current.removeAttribute('src')
                    audioRef.current.load()
                  }
                  const el = new Audio(audioUrl)
                  audioRef.current = el
                  setActive(speed)
                  const finish = () => {
                    if (audioRef.current === el) audioRef.current = null
                    resolve()
                  }
                  el.addEventListener('ended', finish, { once: true })
                  el.addEventListener('pause', () => {
                    if (el.ended) finish()
                  })
                  el.addEventListener(
                    'error',
                    () => {
                      setError('Playback failed.')
                      reject(new Error('audio'))
                    },
                    { once: true },
                  )
                  void el.play().catch(() => {
                    setError('Playback was blocked or failed.')
                    reject(new Error('play'))
                  })
                }).catch(() => {})
              }
            }
          } catch (e) {
            if (!ac.signal.aborted) {
              setError(e instanceof Error ? e.message : 'Could not load reference audio.')
            }
          } finally {
            setLoading(null)
            setActive('idle')
          }
          return
        }
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
        const res = await getSpeakingReferenceAudio(
          { text: t, speed, locale, voice },
          { signal: ac.signal },
        )
        if (ac.signal.aborted) return
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
          setError('Reference audio is not available yet.')
        }
      } catch (e) {
        if (!ac.signal.aborted) {
          setError(e instanceof Error ? e.message : 'Could not load reference audio.')
        }
      } finally {
        // Always clear loading so the play button never stays on the spinner after abort, unmount, or completion.
        setLoading(null)
      }
    },
    [
      line,
      locale,
      voice,
      narratorVoice,
      dialogueVoiceA,
      dialogueVoiceB,
      urlBySpeed,
      playDataUrl,
      speakBrowser,
      speakBrowserDialogueTurns,
      variant,
      alternatingAbDialogue,
      referenceAudioUrl,
      stopAll,
    ],
  )

  const textOk = line.trim().length > 0
  const busy = loading !== null
  const hasBundled = Boolean(referenceAudioUrl?.trim())
  const playingNormal = active === 'normal' || active === 'browser-normal'

  if (variant === 'playOnly') {
    return (
      <div className={clsx(compact ? 'space-y-1.5' : 'space-y-2', className)}>
        {rowLabel ? <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{rowLabel}</p> : null}
        {hasBundled ? (
          <audio
            key={referenceAudioUrl!}
            src={referenceAudioUrl!}
            controls
            className="w-full h-9"
            preload="metadata"
          />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={disabled || !textOk || busy}
              onClick={() => {
                if (playingNormal) stopAll()
                else void resolveSpeed('normal')
              }}
              className={clsx(
                'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-colors',
                playingNormal
                  ? 'border-primary-700 bg-primary-700 text-white hover:bg-primary-800'
                  : 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700',
                (disabled || !textOk || busy) && 'opacity-40 cursor-not-allowed',
              )}
              aria-label={playingNormal ? 'Stop playback' : busy ? 'Loading audio' : 'Play audio'}
            >
              {busy && loading === 'normal' ? (
                <Loader2 className="h-6 w-6 motion-safe:animate-spin" aria-hidden />
              ) : playingNormal ? (
                <Pause className="h-6 w-6" fill="currentColor" aria-hidden />
              ) : (
                <Play className="h-6 w-6 pl-0.5" fill="currentColor" aria-hidden />
              )}
            </button>
            <span className="text-caption text-slate-600">
              {playOnlyHint ?? 'Tap play to hear the Dutch. Tap again to stop.'}
            </span>
          </div>
        )}
        {error ? <p className="text-caption text-red-700">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className={clsx(compact ? 'space-y-1.5' : 'space-y-2', className)}>
      {rowLabel ? <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{rowLabel}</p> : null}
      {hasBundled ? (
        <audio
          key={referenceAudioUrl!}
          src={referenceAudioUrl!}
          controls
          className="w-full h-9"
          preload="metadata"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || !textOk || busy}
          onClick={() => void resolveSpeed('normal')}
          className={clsx(
            'inline-flex min-h-touch items-center gap-1.5 rounded-xl border px-3 py-2 text-caption font-semibold transition-colors',
            active === 'normal'
              ? 'border-primary-400 bg-primary-50 text-primary-950'
              : 'border-slate-200 bg-white text-ink-primary hover:border-slate-300',
          )}
        >
          {busy && loading === 'normal' ? (
            <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
          ) : (
            <Headphones className="h-4 w-4 shrink-0" aria-hidden />
          )}
          Neural ref
        </button>
        <button
          type="button"
          disabled={disabled || !textOk || busy}
          onClick={() => void resolveSpeed('slow')}
          className={clsx(
            'inline-flex min-h-touch items-center gap-1.5 rounded-xl border px-3 py-2 text-caption font-semibold transition-colors',
            active === 'slow' || active === 'browser-slow'
              ? 'border-primary-400 bg-primary-50 text-primary-950'
              : 'border-slate-200 bg-white text-ink-primary hover:border-slate-300',
          )}
        >
          {busy && loading === 'slow' ? (
            <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
          ) : (
            <Snail className="h-4 w-4 shrink-0" aria-hidden />
          )}
          Slower
        </button>
        <button
          type="button"
          disabled={disabled || !textOk || busy}
          onClick={() => void resolveSpeed('chunked')}
          className={clsx(
            'inline-flex min-h-touch items-center gap-1.5 rounded-xl border px-3 py-2 text-caption font-semibold transition-colors',
            active === 'chunked' || active === 'browser-chunked'
              ? 'border-primary-400 bg-primary-50 text-primary-950'
              : 'border-slate-200 bg-white text-ink-primary hover:border-slate-300',
          )}
        >
          {busy && loading === 'chunked' ? (
            <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
          ) : (
            <LayoutList className="h-4 w-4 shrink-0" aria-hidden />
          )}
          Chunks
        </button>
        <button
          type="button"
          disabled={disabled || !textOk || busy}
          onClick={() => speakNl(line)}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-caption font-semibold text-ink-primary hover:border-slate-300"
        >
          <Volume2 className="h-4 w-4 shrink-0" aria-hidden />
          Device
        </button>
      </div>
      {active !== 'idle' ? (
        <button type="button" onClick={stopAll} className="text-caption font-semibold text-primary-800 underline-offset-2 hover:underline">
          Stop
        </button>
      ) : null}
      {error ? <p className="text-caption text-red-700">{error}</p> : null}
    </div>
  )
}
