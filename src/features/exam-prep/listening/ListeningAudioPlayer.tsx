'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { clsx } from 'clsx'
import { stopSpeak } from '@/lib/lesson-engine/speakNl'
import type { ListeningTrainingItem } from '@/lib/schemas/exam/listeningTrainingItem.schema'

type Props = {
  item: ListeningTrainingItem
  speechRate: number
  /** Return false if no audio starts left (budget). */
  onBeforePlay: () => boolean
  onPlaybackComplete: () => void
}

/**
 * Exam-style controls: not a full media chrome.
 * Uses HTMLAudioElement when `audioUrl` is set; otherwise Dutch TTS as mock clip.
 */
export function ListeningAudioPlayer({ item, speechRate, onBeforePlay, onPlaybackComplete }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsGen = useRef(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const hasAudioFile = Boolean(item.audioUrl)

  const lines = item.scriptLines ?? (item.scriptNl ? [item.scriptNl] : [])

  const stopTts = useCallback(() => {
    ttsGen.current += 1
    stopSpeak()
    setIsPlaying(false)
    setProgress(0)
  }, [])

  const runTtsSequence = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis || lines.length === 0) return
    stopSpeak()
    const runId = ++ttsGen.current
    setIsPlaying(true)
    setProgress(0.04)
    let index = 0
    const pauseMs = 420
    const total = lines.length

    const speakNext = () => {
      if (runId !== ttsGen.current) return
      if (index >= lines.length) {
        setIsPlaying(false)
        setProgress(1)
        onPlaybackComplete()
        return
      }
      const u = new SpeechSynthesisUtterance(lines[index])
      index += 1
      u.lang = 'nl-NL'
      u.rate = speechRate
      const lineIndex = index
      u.onstart = () => {
        if (runId !== ttsGen.current) return
        setProgress(Math.min(0.92, (lineIndex - 0.45) / total))
      }
      u.onend = () => {
        if (runId !== ttsGen.current) return
        setProgress(Math.min(1, lineIndex / total))
        window.setTimeout(speakNext, pauseMs)
      }
      u.onerror = () => {
        if (runId !== ttsGen.current) return
        window.setTimeout(speakNext, pauseMs)
      }
      window.speechSynthesis.speak(u)
    }

    speakNext()
  }, [lines, onPlaybackComplete, speechRate])

  const handlePlayPress = useCallback(() => {
    if (hasAudioFile && audioRef.current) {
      const el = audioRef.current
      if (!el.paused) return
      const needsBudget = el.currentTime === 0 || el.ended
      if (needsBudget && !onBeforePlay()) return
      void el.play().catch(() => setIsPlaying(false))
      return
    }

    if (!onBeforePlay()) return
    runTtsSequence()
  }, [hasAudioFile, onBeforePlay, runTtsSequence])

  const handlePausePress = useCallback(() => {
    if (hasAudioFile && audioRef.current) {
      audioRef.current.pause()
      return
    }
    stopTts()
  }, [hasAudioFile, stopTts])

  const handleReplayPress = useCallback(() => {
    if (!onBeforePlay()) return
    if (hasAudioFile && audioRef.current) {
      const el = audioRef.current
      el.pause()
      el.currentTime = 0
      void el.play().catch(() => setIsPlaying(false))
      return
    }
    stopTts()
    runTtsSequence()
  }, [hasAudioFile, onBeforePlay, runTtsSequence, stopTts])

  useEffect(() => {
    return () => {
      stopTts()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [item.id, stopTts])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !hasAudioFile) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      setProgress(1)
      onPlaybackComplete()
    }
    const onTime = () => {
      if (el.duration && Number.isFinite(el.duration)) {
        setProgress(el.currentTime / el.duration)
      }
    }

    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    el.addEventListener('timeupdate', onTime)

    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('timeupdate', onTime)
    }
  }, [hasAudioFile, item.id, onPlaybackComplete])

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 space-y-3">
      {hasAudioFile ? (
        <audio ref={audioRef} src={item.audioUrl} preload="metadata" className="hidden" />
      ) : (
        <p className="text-caption text-ink-tertiary leading-snug">
          Oefenmodus: audio wordt voorgelezen door uw apparaat (Nederlands). Later vervangen we dit door echte
          examenfragmenten.
        </p>
      )}

      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden" aria-hidden>
        <div
          className={clsx('h-full rounded-full transition-[width] duration-150', isPlaying ? 'bg-primary-600' : 'bg-slate-400')}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
        <button
          type="button"
          onClick={isPlaying ? handlePausePress : handlePlayPress}
          className={clsx(
            'inline-flex min-h-touch w-full sm:w-auto sm:min-w-[3.5rem] flex-1 sm:flex-initial items-center justify-center rounded-xl px-4 font-semibold text-body shadow-sm transition-colors',
            isPlaying ? 'bg-slate-700 text-white' : 'bg-primary-600 text-white active:scale-[0.98]'
          )}
          aria-label={isPlaying ? (hasAudioFile ? 'Pauze' : 'Stop') : 'Afspelen'}
        >
          {isPlaying ? <Pause className="w-6 h-6" aria-hidden /> : <Play className="w-6 h-6 pl-0.5" aria-hidden />}
        </button>

        <button
          type="button"
          onClick={handleReplayPress}
          className="inline-flex min-h-touch w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-body-sm font-semibold text-ink-primary"
          aria-label="Opnieuw vanaf het begin afspelen"
        >
          <RotateCcw className="w-4 h-4 shrink-0" aria-hidden />
          Opnieuw vanaf start
        </button>
      </div>
    </div>
  )
}
