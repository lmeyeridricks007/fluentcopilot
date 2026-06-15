'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { Loader2, Play, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ListenAndComparePanel } from '@/features/feature1-chat/components/ListenAndComparePanel'
import { PackReferenceAudioControls } from '@/features/generated-exercise-pack/PackReferenceAudioControls'
import { useMicRecorder } from '@/features/generated-exercise-pack/blockPrimitives'
import {
  getApiBaseUrl,
  isFeature1ChatBackendEnabled,
  isSpeechAudioAssessmentEnabled,
} from '@/lib/api/apiConfig'
import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import { prepareAudioForAzurePronunciationAssessment } from '@/lib/speech/prepareAudioForAzurePronunciationAssessment'
import { requestPronunciationAssessment } from '@/lib/speech/speechClient'

const MIC_SUPPORTED =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

function isPlayableUrl(url: string | null | undefined): url is string {
  const u = url?.trim()
  if (!u) return false
  return u.startsWith('http://') || u.startsWith('https://') || u.startsWith('blob:') || u.startsWith('data:')
}

function backendAssessmentEnabled(): boolean {
  return (
    MIC_SUPPORTED &&
    Boolean(getApiBaseUrl()) &&
    isFeature1ChatBackendEnabled() &&
    isSpeechAudioAssessmentEnabled()
  )
}

function scoreLabel(overall: number): { text: string; tone: string } {
  if (overall >= 85) return { text: 'Sounds great', tone: 'border-emerald-300 bg-emerald-50 text-emerald-950' }
  if (overall >= 70) return { text: 'Solid attempt', tone: 'border-primary-300 bg-primary-50 text-primary-950' }
  if (overall >= 55) return { text: 'Getting there', tone: 'border-amber-300 bg-amber-50 text-amber-950' }
  return { text: 'Try again', tone: 'border-rose-300 bg-rose-50 text-rose-950' }
}

function PronunciationScoreCard({
  payload,
  expectedText,
}: {
  payload: PronunciationAssessmentApiResponse
  expectedText: string
}) {
  const a = payload.assessment
  if (!a) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-950">
        <p className="font-semibold">No score returned</p>
        <p className="mt-1 leading-snug">
          {payload.caveats[0] ?? 'Try re-recording in a quieter spot.'}
        </p>
      </div>
    )
  }
  const overall = Math.round(a.overallScore)
  const { text: label, tone } = scoreLabel(overall)
  const weakWords = a.words.filter((w) => w.accuracyScore < 70 && w.word.trim()).slice(0, 4)

  return (
    <div className={clsx('rounded-xl border px-3 py-2.5 space-y-2', tone)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[14px] font-bold">{label}</p>
        <p className="text-[14px] font-bold tabular-nums" aria-label={`Overall pronunciation score ${overall} out of 100`}>
          {overall}/100
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-1.5 text-[11px]">
        <ScoreCell label="Accuracy" value={a.accuracyScore} />
        <ScoreCell label="Fluency" value={a.fluencyScore} />
        <ScoreCell label="Complete" value={a.completenessScore} />
      </dl>
      {a.recognizedText && a.recognizedText.toLowerCase() !== expectedText.trim().toLowerCase() ? (
        <p className="text-[12px] leading-snug">
          <span className="font-semibold">Heard: </span>
          <span className="italic">“{a.recognizedText}”</span>
        </p>
      ) : null}
      {weakWords.length > 0 ? (
        <p className="text-[12px] leading-snug">
          <span className="font-semibold">Watch: </span>
          {weakWords.map((w) => `${w.word} (${Math.round(w.accuracyScore)})`).join(' · ')}
        </p>
      ) : null}
      {payload.recommendedNextStep ? (
        <p className="text-[12px] leading-snug opacity-90">{payload.recommendedNextStep}</p>
      ) : null}
    </div>
  )
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-1 text-center">
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="font-bold tabular-nums">{Math.round(value)}</p>
    </div>
  )
}

/**
 * One Dutch line/word with neural reference playback, mic capture, A/B compare, and Azure pronunciation scoring.
 */
export function TrainingLoopSpeakLine(props: {
  targetNl: string
  referenceAudioUrl?: string | null
  /** Optional clip from the learner's last session (retry_sentence). */
  sessionCompareAudioUrl?: string | null
  /** e.g. You said “kortje” — practice “kaartje”. */
  practiceHint?: string | null
  rowLabel?: string
  maxRecordingSeconds?: number
  disabled?: boolean
}) {
  const {
    targetNl,
    referenceAudioUrl,
    sessionCompareAudioUrl,
    practiceHint,
    rowLabel,
    maxRecordingSeconds = 18,
    disabled,
  } = props
  const maxMs = Math.min(90_000, Math.max(4000, Math.round(maxRecordingSeconds * 1000)))
  const { recState, url, start, stop, reset } = useMicRecorder(maxMs)
  const bundledRef = isPlayableUrl(referenceAudioUrl) ? referenceAudioUrl : null
  const sessionClip = isPlayableUrl(sessionCompareAudioUrl) ? sessionCompareAudioUrl : null
  const text = targetNl.trim()
  const canScore = backendAssessmentEnabled() && text.length > 0

  const [assessPhase, setAssessPhase] = useState<'idle' | 'loading' | 'result' | 'error'>('idle')
  const [assessPayload, setAssessPayload] = useState<PronunciationAssessmentApiResponse | null>(null)
  const [assessError, setAssessError] = useState<string | null>(null)
  const lastScoredUrlRef = useRef<string | null>(null)
  const assessAbortRef = useRef<AbortController | null>(null)

  const clearAssessment = useCallback(() => {
    assessAbortRef.current?.abort()
    assessAbortRef.current = null
    lastScoredUrlRef.current = null
    setAssessPhase('idle')
    setAssessPayload(null)
    setAssessError(null)
  }, [])

  const runAssessment = useCallback(
    async (recordingUrl: string) => {
      if (!canScore) return
      setAssessPhase('loading')
      setAssessError(null)
      try {
        const blob = await fetch(recordingUrl).then((r) => r.blob())
        const prepared = await prepareAudioForAzurePronunciationAssessment(blob, blob.type || 'audio/webm')
        assessAbortRef.current?.abort()
        assessAbortRef.current = new AbortController()
        const payload = await requestPronunciationAssessment(
          {
            audioBase64: prepared.audioBase64,
            mimeType: prepared.mimeType,
            transcript: text,
            expectedText: text,
            locale: 'nl-NL',
            assessmentMode: 'reference',
          },
          { signal: assessAbortRef.current.signal },
        )
        assessAbortRef.current = null
        setAssessPayload(payload)
        setAssessPhase('result')
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return
        setAssessError(e instanceof Error ? e.message : 'Pronunciation scoring failed.')
        setAssessPhase('error')
      }
    },
    [canScore, text],
  )

  useEffect(() => {
    if (!canScore || recState !== 'stopped' || !url) return
    if (lastScoredUrlRef.current === url) return
    lastScoredUrlRef.current = url
    void runAssessment(url)
  }, [canScore, recState, url, runAssessment])

  useEffect(() => () => assessAbortRef.current?.abort(), [])

  const handleReset = () => {
    clearAssessment()
    reset()
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 space-y-3">
      {rowLabel ? (
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{rowLabel}</p>
      ) : null}
      <p className="text-[16px] font-semibold text-slate-900 whitespace-pre-wrap">{text}</p>
      {practiceHint ? (
        <p className="text-[13px] leading-snug text-violet-900/90">{practiceHint}</p>
      ) : null}

      <PackReferenceAudioControls
        line={text}
        referenceAudioUrl={bundledRef}
        variant="playOnly"
        playOnlyHint="Hear the Dutch reference, then record yourself below."
        disabled={disabled || !text}
        compact
        rowLabel="Reference"
      />

      {sessionClip ? (
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">From your last session</p>
          <audio src={sessionClip} controls className="w-full h-9" preload="metadata" />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {recState === 'recording' ? (
          <Button type="button" variant="primary" className="gap-2 min-h-touch" onClick={stop} disabled={disabled}>
            <Square className="h-4 w-4 shrink-0" aria-hidden />
            Stop & score
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            className="gap-2 min-h-touch"
            onClick={() => void start()}
            disabled={disabled || !text}
          >
            <Play className="h-4 w-4 shrink-0" aria-hidden />
            Record
          </Button>
        )}
        <Button type="button" variant="secondary" className="min-h-touch" onClick={handleReset} disabled={disabled}>
          Reset
        </Button>
        {canScore && url && assessPhase === 'error' ? (
          <Button
            type="button"
            variant="secondary"
            className="min-h-touch"
            disabled={disabled}
            onClick={() => void runAssessment(url)}
          >
            Retry score
          </Button>
        ) : null}
      </div>

      {canScore && recState === 'recording' ? (
        <p className="text-[12px] text-slate-500">Recording… tap Stop & score when you are done.</p>
      ) : null}

      {url ? <audio src={url} controls className="w-full h-10" /> : null}

      {canScore && assessPhase === 'loading' ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary-100 bg-primary-50/80 px-3 py-2.5 text-[13px] text-primary-950">
          <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden />
          Scoring your pronunciation…
        </div>
      ) : null}

      {canScore && assessPhase === 'result' && assessPayload ? (
        <PronunciationScoreCard payload={assessPayload} expectedText={text} />
      ) : null}

      {canScore && assessPhase === 'error' && assessError ? (
        <p className="text-[12px] text-rose-700">{assessError}</p>
      ) : null}

      {!canScore && url ? (
        <p className="text-[12px] text-slate-500">
          {MIC_SUPPORTED
            ? 'Voice scoring is unavailable — use Listen and compare below.'
            : 'This browser cannot record — use Listen and compare below.'}
        </p>
      ) : null}

      <ListenAndComparePanel
        compareText={text}
        userRecordingUrl={url}
        visualStyle="premium"
        className="mt-0"
      />
    </div>
  )
}
