'use client'

import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { mockPronunciationScore } from '@/lib/lesson-engine/engine'
import { speakNl } from '@/lib/lesson-engine/speakNl'

type Props = {
  targetNl: string
  /** Reserved for future strict scoring */
  acceptable?: string[]
  mockTranscript?: string
  onResult: (pass: boolean, detail: string) => void
  disabled?: boolean
}

export function SpeakPrompt({ targetNl, mockTranscript, onResult, disabled }: Props) {
  const [recording, setRecording] = useState(false)
  const [done, setDone] = useState(false)
  const barsRef = useRef<number[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!recording) return
    const id = window.setInterval(() => {
      barsRef.current = Array.from({ length: 12 }, () => 0.3 + Math.random() * 0.7)
      setTick((t) => t + 1)
    }, 120)
    return () => window.clearInterval(id)
  }, [recording])

  const stop = () => {
    setRecording(false)
    setDone(true)
    const transcript = mockTranscript ?? targetNl
    const score = mockPronunciationScore(targetNl, transcript)
    /** Demo slice: any completed attempt passes; score still logged for analytics. */
    const pass = score >= 0
    onResult(pass, `score:${score.toFixed(2)}`)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-surface-muted border border-slate-200 p-4 text-center">
        <p className="text-body-lg font-semibold text-ink-primary">{targetNl}</p>
        <button
          type="button"
          className="mt-2 text-caption text-primary-600 underline"
          onClick={() => speakNl(targetNl)}
        >
          🔊 Hoor voorbeeld
        </button>
      </div>
      <div
        className="flex items-end justify-center gap-1 h-14"
        aria-hidden
      >
        {(recording ? barsRef.current : []).map((h, i) => (
          <div
            key={`${tick}-${i}`}
            className="w-1.5 rounded-full bg-primary-500 transition-all duration-100"
            style={{ height: `${h * 100}%` }}
          />
        ))}
        {!recording && !done && (
          <span className="text-caption text-ink-tertiary self-center">Tik op de microfoon</span>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={disabled || done}
          onClick={() => {
            if (recording) {
              stop()
            } else {
              setRecording(true)
              barsRef.current = Array.from({ length: 12 }, () => 0.5)
            }
          }}
          className={clsx(
            'flex-1 min-h-touch rounded-xl font-semibold text-white transition-colors',
            recording ? 'bg-error' : 'bg-primary-600'
          )}
        >
          {recording ? 'Stop & vergelijk' : '🎤 Spreek in'}
        </button>
      </div>
      {done && (
        <p className="text-body-sm text-center text-ink-secondary">
          {mockTranscript ? 'Demo-modus: we vergelijken met het model.' : 'Oefening voltooid.'}
        </p>
      )}
    </div>
  )
}
