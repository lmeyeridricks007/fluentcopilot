'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Square } from 'lucide-react'
import { clsx } from 'clsx'

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Best-effort duration in seconds. WebM / MediaRecorder often reports a **too-small** `duration`
 * while `buffered` / `seekable` already span the full blob — take the **max** of all signals.
 */
function readMediaDurationSeconds(el: HTMLMediaElement): number {
  const candidates: number[] = []
  const d = el.duration
  if (Number.isFinite(d) && d > 0 && d !== Number.POSITIVE_INFINITY) {
    candidates.push(d)
  }
  try {
    const { seekable } = el
    if (seekable && seekable.length > 0) {
      const end = seekable.end(seekable.length - 1)
      if (Number.isFinite(end) && end > 0) candidates.push(end)
    }
  } catch {
    /* ignore */
  }
  try {
    const b = el.buffered
    if (b && b.length > 0) {
      const end = b.end(b.length - 1)
      if (Number.isFinite(end) && end > 0) candidates.push(end)
    }
  } catch {
    /* ignore */
  }
  return candidates.length ? Math.max(...candidates) : 0
}

type Props = {
  /** Data URL or blob URL — anything valid for `<audio src>`. */
  src: string
  className?: string
  compact?: boolean
  /** Optional region label for assistive tech. */
  'aria-label'?: string
  /** Unique id suffix so multiple players on a page do not duplicate `id` / `htmlFor`. */
  scrubIdSuffix?: string
  /**
   * When both set and duration is known, playback and scrub stay inside this window
   * (approximate sentence timing from pronunciation scoring).
   */
  clipStartSec?: number | null
  clipEndSec?: number | null
}

/**
 * Full clip controls for read-aloud report: play / pause / stop + scrub bar.
 * Avoids `display:none` on `<audio>` (breaks metadata on some engines) and re-reads duration from seekable/buffered.
 * Optional `clipStartSec` / `clipEndSec` zoom the controls to that slice (this sentence in your recording).
 */
export function ReadAloudLearnerClipPlayer({
  src,
  className = '',
  compact = false,
  clipStartSec,
  clipEndSec,
  'aria-label': ariaLabel,
  scrubIdSuffix = 'default',
}: Props) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)

  const clip = useMemo(() => {
    const a = clipStartSec
    const b = clipEndSec
    if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return null
    if (b <= a + 0.08) return null
    return { start: Math.max(0, a), end: b }
  }, [clipStartSec, clipEndSec])

  const clipResolved = useMemo(() => {
    if (!clip) return null
    const d = duration > 0 ? duration : 0
    const end = d > 0 ? Math.min(clip.end, d - 0.02) : clip.end
    const start = Math.min(clip.start, Math.max(0, end - 0.2))
    if (end <= start + 0.05) return null
    return { start, end }
  }, [clip, duration])

  useEffect(() => {
    const a = ref.current
    if (!a) return

    const syncFromElement = () => {
      const d = readMediaDurationSeconds(a)
      if (d > 0) setDuration((prev) => Math.max(prev, d))
      setCurrent(a.currentTime)
    }

    /** Chrome/WebKit sometimes leave WebM as `duration === Infinity` until probed. */
    const probeInfinityDuration = () => {
      if (a.duration !== Number.POSITIVE_INFINITY) return
      const afterSeek = () => {
        try {
          a.currentTime = 0
        } catch {
          /* ignore */
        }
        syncFromElement()
      }
      a.addEventListener('seeked', afterSeek, { once: true })
      try {
        a.currentTime = 1e10
      } catch {
        /* seek unsupported — ignore */
      }
    }

    const onLoaded = () => {
      syncFromElement()
      probeInfinityDuration()
    }
    const onTime = () => {
      const el = ref.current
      if (!el) return
      const t = el.currentTime
      if (clipResolved) {
        if (t >= clipResolved.end - 0.04) {
          el.pause()
          el.currentTime = clipResolved.start
          setPlaying(false)
          setCurrent(clipResolved.start)
          return
        }
        if (t < clipResolved.start - 0.02) {
          el.currentTime = clipResolved.start
          setCurrent(clipResolved.start)
          return
        }
      }
      setCurrent(t)
    }
    const onPlay = () => {
      setPlaying(true)
    }
    const onPause = () => {
      setPlaying(false)
    }
    const onEnded = () => {
      setPlaying(false)
      const el = ref.current
      if (!el) return
      if (clipResolved) {
        el.currentTime = clipResolved.start
        setCurrent(clipResolved.start)
      } else {
        el.currentTime = 0
        setCurrent(0)
      }
      syncFromElement()
    }

    a.addEventListener('loadedmetadata', onLoaded)
    a.addEventListener('durationchange', onLoaded)
    a.addEventListener('loadeddata', onLoaded)
    a.addEventListener('canplay', onLoaded)
    a.addEventListener('canplaythrough', onLoaded)
    a.addEventListener('progress', onLoaded)
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)

    try {
      a.load()
    } catch {
      /* ignore */
    }
    syncFromElement()

    let n = 0
    const poll = window.setInterval(() => {
      n++
      const d = readMediaDurationSeconds(a)
      if (d > 0) setDuration((prev) => Math.max(prev, d))
      // WebM / data URLs: buffered end and duration can update for several seconds — keep polling.
      if (n >= 100) window.clearInterval(poll)
    }, 200)

    return () => {
      window.clearInterval(poll)
      a.removeEventListener('loadedmetadata', onLoaded)
      a.removeEventListener('durationchange', onLoaded)
      a.removeEventListener('loadeddata', onLoaded)
      a.removeEventListener('canplay', onLoaded)
      a.removeEventListener('canplaythrough', onLoaded)
      a.removeEventListener('progress', onLoaded)
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnded)
    }
  }, [src, scrubIdSuffix, clipResolved?.start, clipResolved?.end])

  useEffect(() => {
    const el = ref.current
    if (!el || !clipResolved) return
    if (el.currentTime < clipResolved.start || el.currentTime > clipResolved.end) {
      el.currentTime = clipResolved.start
      setCurrent(clipResolved.start)
    }
  }, [clipResolved])

  const play = useCallback(() => {
    const a = ref.current
    if (!a) return
    if (clipResolved) {
      if (a.currentTime < clipResolved.start || a.currentTime >= clipResolved.end - 0.02) {
        a.currentTime = clipResolved.start
        setCurrent(clipResolved.start)
      }
    }
    void a.play().catch(() => {})
  }, [clipResolved])

  const pause = useCallback(() => {
    ref.current?.pause()
  }, [])

  const stop = useCallback(() => {
    const a = ref.current
    if (!a) return
    a.pause()
    const reset = clipResolved ? clipResolved.start : 0
    a.currentTime = reset
    setCurrent(reset)
    setPlaying(false)
  }, [clipResolved])

  const onSeek = useCallback(
    (value: number) => {
      const a = ref.current
      if (!a) return
      const cap = Math.max(readMediaDurationSeconds(a), duration, 0.001)
      if (clipResolved) {
        const lo = clipResolved.start
        const hi = clipResolved.end
        const next = Math.max(lo, Math.min(value, hi))
        a.currentTime = next
        setCurrent(next)
        return
      }
      const next = Math.max(0, Math.min(value, cap))
      a.currentTime = next
      setCurrent(next)
    },
    [duration, clipResolved]
  )

  const el = ref.current
  const liveDur = el ? readMediaDurationSeconds(el) : 0
  const effectiveDur = Math.max(duration, liveDur)

  const barMin = clipResolved ? clipResolved.start : 0
  const barMax = clipResolved ? clipResolved.end : Math.max(effectiveDur, current, 0.01)
  const displayCurrent = Math.min(Math.max(current, barMin), barMax)

  const durationLabel = clipResolved
    ? formatClock(clipResolved.end - clipResolved.start)
    : effectiveDur > 0
      ? formatClock(effectiveDur)
      : '—:—'

  const positionLabel = clipResolved ? formatClock(Math.max(0, displayCurrent - clipResolved.start)) : formatClock(displayCurrent)

  return (
    <div className={clsx('space-y-2', className)} role="group" aria-label={ariaLabel}>
      <audio
        ref={ref}
        key={`${src}#${scrubIdSuffix}`}
        src={src}
        preload="auto"
        className="pointer-events-none absolute h-px w-px overflow-hidden border-0 p-0 opacity-0"
        aria-hidden
      />

      {clipResolved ? (
        <p className="text-[11px] font-medium leading-snug text-violet-900/90">
          {compact ? 'Playback stays inside this word.' : 'This line in your recording (approx.) — playback stays in this window.'}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={playing ? pause : play}
          className={clsx(
            compact
              ? 'inline-flex min-h-touch min-w-[5.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition-colors sm:flex-none'
              : 'inline-flex min-h-touch min-w-[6.5rem] flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-caption font-semibold transition-colors sm:flex-none',
            playing
              ? 'border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100'
              : 'border-slate-200 bg-white text-ink-primary hover:bg-slate-50'
          )}
          aria-label={playing ? 'Pause playback' : 'Play recording'}
        >
          {playing ? <Pause className="h-4 w-4 shrink-0" aria-hidden /> : <Play className="h-4 w-4 shrink-0" aria-hidden />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={stop}
          className={clsx(
            compact
              ? 'inline-flex min-h-touch min-w-[5.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-ink-primary hover:bg-slate-100 sm:flex-none'
              : 'inline-flex min-h-touch min-w-[6.5rem] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-caption font-semibold text-ink-primary hover:bg-slate-100 sm:flex-none'
          )}
          aria-label="Stop and reset to start"
        >
          <Square className="h-4 w-4 shrink-0" aria-hidden />
          Stop
        </button>
      </div>

      <div className="space-y-1">
        <label
          className="block text-[11px] font-medium text-ink-tertiary"
          htmlFor={`read-aloud-clip-scrub-${scrubIdSuffix}`}
        >
          {clipResolved ? (compact ? 'Position in this word' : 'Position in this line') : 'Playback position'}
        </label>
        <input
          id={`read-aloud-clip-scrub-${scrubIdSuffix}`}
          type="range"
          min={barMin}
          max={barMax}
          step={0.05}
          value={displayCurrent}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="h-2 w-full cursor-pointer accent-violet-600"
          aria-valuemin={Math.round(barMin)}
          aria-valuemax={Math.round(barMax)}
          aria-valuenow={Math.round(displayCurrent)}
        />
        <div className="flex justify-between text-[11px] tabular-nums text-ink-tertiary">
          <span>{positionLabel}</span>
          <span>{clipResolved ? `of ${durationLabel}` : durationLabel}</span>
        </div>
      </div>
    </div>
  )
}
