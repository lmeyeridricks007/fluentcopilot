'use client'

import { useState } from 'react'
import { Play, Square } from 'lucide-react'
import { getApiBaseUrl } from '@/lib/api/apiConfig'
import { Button } from '@/components/ui/Button'
import { ListenAndComparePanel } from '@/features/feature1-chat/components/ListenAndComparePanel'
import { readAloudEvaluate, readAloudEvaluateErrorMessage } from '@/features/read-aloud/readAloudApi'
import { blobToBase64 } from '@/lib/speech/speechClient'
import type { ExerciseBlockResultPayload } from '../exerciseBlockResult'
import { BlockSurface, useMicRecorder } from '../blockPrimitives'

export function RecordAndCompareBlock(props: {
  blockId: string
  instructionEn: string
  targetNl: string
  /** Hydrated pack clip for the target line — native controls only, does not change server TTS. */
  referenceAudioUrl?: string | null
  voice?: string
  maxRecordingSeconds?: number
  compact?: boolean
  disabled?: boolean
  onComplete: (result: ExerciseBlockResultPayload) => void
}) {
  const {
    instructionEn,
    targetNl,
    referenceAudioUrl,
    voice,
    maxRecordingSeconds = 22,
    compact,
    disabled,
    onComplete,
  } = props
  const maxMs = Math.min(120_000, Math.max(5000, Math.round(maxRecordingSeconds * 1000)))
  const { recState, url, start, stop, reset } = useMicRecorder(maxMs)
  const [scoreBusy, setScoreBusy] = useState(false)
  const [scoreLine, setScoreLine] = useState<string | null>(null)
  const [scoreErr, setScoreErr] = useState<string | null>(null)
  const canScore = Boolean(getApiBaseUrl() && url)

  const finish = (hasClip: boolean, extra?: Record<string, unknown>) => {
    onComplete({
      outcome: hasClip ? 'self_reported' : 'skipped',
      userAnswer: { hasRecording: hasClip, ...extra },
    })
  }

  const runQuickScore = async () => {
    if (!url || scoreBusy) return
    setScoreBusy(true)
    setScoreErr(null)
    setScoreLine(null)
    try {
      const blob = await fetch(url).then((r) => r.blob())
      const mimeType = blob.type || 'audio/webm'
      const audioBase64 = await blobToBase64(blob)
      const res = await readAloudEvaluate({
        targetText: targetNl,
        audioBase64,
        mimeType,
        cefrLevel: 'A2',
        genre: null,
      })
      const overall = res.pronunciationAssessment?.overallScore
      if (typeof overall === 'number') {
        setScoreLine(`Pronunciation: ${Math.round(overall)}/100`)
      } else {
        setScoreLine('Heard you — no numeric score for this clip.')
      }
    } catch (e) {
      setScoreErr(readAloudEvaluateErrorMessage(e))
    } finally {
      setScoreBusy(false)
    }
  }

  return (
    <BlockSurface compact={compact} data-block-id={props.blockId}>
      <p className="text-caption text-ink-secondary leading-snug">{instructionEn}</p>
      <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-body-sm font-medium text-ink-primary whitespace-pre-wrap">
        {targetNl}
      </p>
      {referenceAudioUrl?.trim() ? (
        <audio src={referenceAudioUrl.trim()} controls className="w-full h-9" preload="metadata" />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {recState === 'recording' ? (
          <Button type="button" variant="primary" className="gap-2 min-h-touch" onClick={stop} disabled={disabled}>
            <Square className="h-4 w-4 shrink-0" aria-hidden />
            Stop
          </Button>
        ) : (
          <Button type="button" variant="secondary" className="gap-2 min-h-touch" onClick={() => void start()} disabled={disabled}>
            <Play className="h-4 w-4 shrink-0" aria-hidden />
            Record
          </Button>
        )}
        <Button type="button" variant="secondary" className="min-h-touch" onClick={reset} disabled={disabled}>
          Reset
        </Button>
      </div>
      {url ? <audio src={url} controls className="w-full h-10" /> : null}
      <ListenAndComparePanel
        compareText={targetNl}
        userRecordingUrl={url}
        voice={voice}
        visualStyle="premium"
        className="mt-0"
      />
      {canScore ? (
        <div className="space-y-1.5">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="min-h-touch"
            disabled={disabled || !url || scoreBusy}
            onClick={() => void runQuickScore()}
          >
            {scoreBusy ? 'Scoring…' : 'Quick pronunciation check (optional)'}
          </Button>
          {scoreLine ? <p className="text-caption font-medium text-emerald-900">{scoreLine}</p> : null}
          {scoreErr ? <p className="text-caption text-red-700">{scoreErr}</p> : null}
        </div>
      ) : null}
      <Button variant="primary" fullWidth disabled={disabled} onClick={() => finish(Boolean(url), { scored: Boolean(scoreLine) })}>
        {url ? 'Continue' : 'Skip — practiced aloud'}
      </Button>
    </BlockSurface>
  )
}
