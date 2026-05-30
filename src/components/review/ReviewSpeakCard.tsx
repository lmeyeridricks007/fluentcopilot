'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { CheckCircle2, Loader2, Mic, RotateCcw, Square, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  getApiBaseUrl,
  isFeature1ChatBackendEnabled,
  isSpeechAudioAssessmentEnabled,
} from '@/lib/api/apiConfig'
import {
  startMediaRecordingSession,
  type ActiveMediaRecording,
} from '@/lib/speech/mediaRecorderCapture'
import { prepareAudioForAzurePronunciationAssessment } from '@/lib/speech/prepareAudioForAzurePronunciationAssessment'
import { requestPronunciationAssessment } from '@/lib/speech/speechClient'
import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import type { ReviewScore } from '@/lib/review-engine/types'

const MIC_SUPPORTED =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

export type ReviewSpeakSubmitArgs = {
  score: ReviewScore
  /** 0..1 — Azure overall score / 100, or self-grade default. */
  confidence: number
  /** Recognized text from Azure, or "(spoken)" when self-graded. */
  transcript: string
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'processing' }
  | { kind: 'result'; payload: PronunciationAssessmentApiResponse }
  | { kind: 'error'; message: string }

/** Map Azure overall pronunciation score (0–100) → SRS grade. */
function scoreToReviewGrade(overall: number): ReviewScore {
  if (overall >= 85) return 4
  if (overall >= 70) return 3
  if (overall >= 55) return 2
  return 1
}

function formatMmSs(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function backendAssessmentEnabled(): boolean {
  return (
    MIC_SUPPORTED &&
    Boolean(getApiBaseUrl()) &&
    isFeature1ChatBackendEnabled() &&
    isSpeechAudioAssessmentEnabled()
  )
}

export function ReviewSpeakCard({
  disabled,
  revealed,
  expectedText,
  onSubmit,
}: {
  disabled?: boolean
  revealed: boolean
  /** Canonical Dutch line — used as `assessmentMode: "reference"` target. */
  expectedText: string
  /** Called once the learner accepts the result (auto-graded) or self-grades. */
  onSubmit: (args: ReviewSpeakSubmitArgs) => void
}) {
  const autoGradeAvailable = backendAssessmentEnabled() && expectedText.trim().length > 0
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [seconds, setSeconds] = useState(0)
  const recordingRef = useRef<ActiveMediaRecording | null>(null)
  const assessmentAbortRef = useRef<AbortController | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const startTick = useCallback(() => {
    stopTick()
    setSeconds(0)
    tickRef.current = setInterval(() => setSeconds((x) => x + 1), 1000)
  }, [stopTick])

  const cleanup = useCallback(() => {
    stopTick()
    assessmentAbortRef.current?.abort()
    assessmentAbortRef.current = null
    if (recordingRef.current) {
      recordingRef.current.cancel()
      recordingRef.current = null
    }
  }, [stopTick])

  useEffect(() => () => cleanup(), [cleanup])

  const startRecording = useCallback(async () => {
    if (!autoGradeAvailable || disabled) return
    cleanup()
    setPhase({ kind: 'recording' })
    try {
      recordingRef.current = await startMediaRecordingSession({ requestDataBeforeStop: true })
      startTick()
    } catch (e) {
      stopTick()
      recordingRef.current = null
      const denied =
        e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')
      setPhase({
        kind: 'error',
        message: denied
          ? 'Microphone access was denied. Allow it in your browser to use voice grading.'
          : e instanceof Error
            ? e.message
            : 'Could not access the microphone.',
      })
    }
  }, [autoGradeAvailable, cleanup, disabled, startTick, stopTick])

  const stopAndAssess = useCallback(async () => {
    const rec = recordingRef.current
    if (!rec) return
    recordingRef.current = null
    stopTick()
    setPhase({ kind: 'processing' })
    try {
      const { blob, mimeType } = await rec.stop()
      const prepared = await prepareAudioForAzurePronunciationAssessment(blob, mimeType)
      assessmentAbortRef.current?.abort()
      assessmentAbortRef.current = new AbortController()
      const payload = await requestPronunciationAssessment(
        {
          audioBase64: prepared.audioBase64,
          mimeType: prepared.mimeType,
          // No client-side transcript — let Azure recognize against the reference line.
          transcript: expectedText.trim(),
          expectedText: expectedText.trim(),
          locale: 'nl-NL',
          assessmentMode: 'reference',
        },
        { signal: assessmentAbortRef.current.signal }
      )
      assessmentAbortRef.current = null
      setPhase({ kind: 'result', payload })
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setPhase({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Pronunciation scoring failed.',
      })
    }
  }, [expectedText, stopTick])

  const cancelRecording = useCallback(() => {
    cleanup()
    setPhase({ kind: 'idle' })
  }, [cleanup])

  const acceptAssessment = useCallback(
    (payload: PronunciationAssessmentApiResponse) => {
      const a = payload.assessment
      if (!a) return
      const overall = Math.round(a.overallScore)
      onSubmit({
        score: scoreToReviewGrade(overall),
        confidence: Math.max(0, Math.min(1, overall / 100)),
        transcript: a.recognizedText.trim() || '(spoken)',
      })
    },
    [onSubmit]
  )

  // -------- Fallback: self-grade buttons (no mic / no backend) --------
  if (!autoGradeAvailable) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-primary-50 border border-primary-100 px-4 py-6 text-center">
          <Mic className="w-10 h-10 mx-auto text-primary-600 mb-2" aria-hidden />
          <p className="text-body-sm text-ink-secondary">
            {MIC_SUPPORTED
              ? 'Voice grading is offline — say it out loud, then rate how it felt.'
              : 'This browser can’t open the mic — say it out loud, then rate how it felt.'}
          </p>
        </div>
        {!revealed ? (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={() => onSubmit({ score: 2, confidence: 0.45, transcript: '(spoken)' })}
            >
              Shaky
            </Button>
            <Button
              type="button"
              disabled={disabled}
              onClick={() => onSubmit({ score: 4, confidence: 0.9, transcript: '(spoken)' })}
            >
              Solid
            </Button>
          </div>
        ) : null}
      </div>
    )
  }

  // -------- Auto-graded recording flow --------
  return (
    <div className="space-y-4">
      {phase.kind === 'idle' ? (
        <div className="rounded-2xl bg-primary-50 border border-primary-100 px-4 py-6 text-center">
          <Mic className="w-10 h-10 mx-auto text-primary-600 mb-2" aria-hidden />
          <p className="text-body-sm text-ink-secondary">
            Tap below, say the Dutch line, then tap stop. Your pronunciation will be graded.
          </p>
        </div>
      ) : null}

      {phase.kind === 'recording' ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-5 text-center">
          <div className="inline-flex items-center gap-2 text-rose-900">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            </span>
            <span className="font-bold tabular-nums">{formatMmSs(seconds)}</span>
            <span className="text-body-sm">Recording…</span>
          </div>
        </div>
      ) : null}

      {phase.kind === 'processing' ? (
        <div className="rounded-2xl bg-primary-50 border border-primary-100 px-4 py-5 text-center">
          <Loader2 className="w-6 h-6 mx-auto text-primary-600 motion-safe:animate-spin" aria-hidden />
          <p className="mt-2 text-body-sm text-ink-secondary">Scoring your pronunciation…</p>
        </div>
      ) : null}

      {phase.kind === 'result' ? <ResultBlock payload={phase.payload} expectedText={expectedText} /> : null}

      {phase.kind === 'error' ? (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-body-sm text-rose-950">
          <p className="font-semibold flex items-center gap-1">
            <XCircle className="w-4 h-4" aria-hidden /> Voice grading failed
          </p>
          <p className="mt-1 leading-snug">{phase.message}</p>
        </div>
      ) : null}

      {!revealed ? (
        <div className="grid grid-cols-2 gap-2">
          {phase.kind === 'idle' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() => onSubmit({ score: 2, confidence: 0.45, transcript: '(spoken)' })}
              >
                Skip & self-grade
              </Button>
              <Button
                type="button"
                disabled={disabled}
                onClick={() => void startRecording()}
                className="inline-flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" aria-hidden />
                Record
              </Button>
            </>
          ) : null}

          {phase.kind === 'recording' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={cancelRecording}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={disabled}
                onClick={() => void stopAndAssess()}
                className="inline-flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" aria-hidden />
                Stop & score
              </Button>
            </>
          ) : null}

          {phase.kind === 'processing' ? (
            <>
              <Button type="button" variant="secondary" disabled>
                Cancel
              </Button>
              <Button type="button" disabled>
                Scoring…
              </Button>
            </>
          ) : null}

          {phase.kind === 'result' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() => void startRecording()}
                className="inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden />
                Re-record
              </Button>
              <Button
                type="button"
                disabled={disabled || !phase.payload.assessment}
                onClick={() => acceptAssessment(phase.payload)}
                className="inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" aria-hidden />
                Continue
              </Button>
            </>
          ) : null}

          {phase.kind === 'error' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={disabled}
                onClick={() => onSubmit({ score: 2, confidence: 0.45, transcript: '(spoken)' })}
              >
                Skip & self-grade
              </Button>
              <Button
                type="button"
                disabled={disabled}
                onClick={() => void startRecording()}
                className="inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" aria-hidden />
                Try again
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ResultBlock({
  payload,
  expectedText,
}: {
  payload: PronunciationAssessmentApiResponse
  expectedText: string
}) {
  const a = payload.assessment
  if (!a) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-950">
        <p className="font-semibold">No score returned</p>
        <p className="mt-1 leading-snug">
          {payload.caveats[0] ??
            'The speech service didn’t return a score for this clip. Try re-recording in a quieter spot.'}
        </p>
      </div>
    )
  }
  const overall = Math.round(a.overallScore)
  const grade = scoreToReviewGrade(overall)
  const tone =
    grade === 4
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
      : grade === 3
        ? 'border-primary-300 bg-primary-50 text-primary-950'
        : grade === 2
          ? 'border-amber-300 bg-amber-50 text-amber-950'
          : 'border-rose-300 bg-rose-50 text-rose-950'
  const label =
    grade === 4 ? 'Sounds great' : grade === 3 ? 'Solid attempt' : grade === 2 ? 'Getting there' : 'Try again'
  return (
    <div className={clsx('rounded-2xl border px-4 py-3 space-y-2', tone)}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">{label}</p>
        <p className="text-body font-bold tabular-nums" aria-label={`Overall pronunciation score ${overall} out of 100`}>
          {overall}/100
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-caption">
        <ScoreCell label="Accuracy" value={a.accuracyScore} />
        <ScoreCell label="Fluency" value={a.fluencyScore} />
        <ScoreCell label="Completeness" value={a.completenessScore} />
      </dl>
      {a.recognizedText && a.recognizedText.toLowerCase() !== expectedText.trim().toLowerCase() ? (
        <p className="text-caption leading-snug">
          <span className="font-semibold">Heard: </span>
          <span className="italic">“{a.recognizedText}”</span>
        </p>
      ) : null}
      {payload.recommendedNextStep ? (
        <p className="text-caption leading-snug">{payload.recommendedNextStep}</p>
      ) : null}
    </div>
  )
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-1.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-bold tabular-nums">{Math.round(value)}</p>
    </div>
  )
}
