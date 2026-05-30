'use client'

import { useCallback } from 'react'
import { Mic2, X } from 'lucide-react'
import type { PronunciationAssessmentApiResponse } from '@/lib/speech/audioPronunciationTypes'
import { SpeakingCoachFeedbackExperience } from './speaking-coach/SpeakingCoachFeedbackExperience'

export function VoiceQualityFeedbackCard({
  payload,
  spokenTranscript,
  userRecordingUrl,
  compareCoachingText,
  onDismiss,
  /** After “Retry” loads text into the composer — hides coach so the field is visible. */
  onAfterPhraseApplied,
  onApplyPhraseToComposer,
  onSavePhrase,
  onQueuePhraseAssessment,
  onBeginShadowPractice,
  layout = 'composer',
}: {
  payload: PronunciationAssessmentApiResponse
  spokenTranscript: string
  userRecordingUrl: string | null
  compareCoachingText?: string
  onDismiss: () => void
  onAfterPhraseApplied?: () => void
  /** Load composer with phrase for retry practice */
  onApplyPhraseToComposer?: (phrase: string) => void
  /** Save a word/phrase to learner library */
  onSavePhrase?: (phrase: string) => void | Promise<void>
  /** Next recording assessed against this reference; `null` = full-line / open scoring. */
  onQueuePhraseAssessment?: (phrase: string | null) => void
  /** Shadow V1: reference audio then record chunk (sticky composer). */
  onBeginShadowPractice?: (chunk: string) => void
  /** `composer`: sticky primary CTA (sticky bar). `thread`: inline in message — no nested sticky. */
  layout?: 'composer' | 'thread'
}) {
  const dismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  if (!payload.assessment) {
    return (
      <div className="mb-2 rounded-2xl border border-red-300/90 bg-red-50/90 px-4 py-3 text-caption text-red-950">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-red-950 flex items-center gap-1">
            <Mic2 className="w-4 h-4 shrink-0" aria-hidden />
            Voice check — no score
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 min-h-touch min-w-touch rounded-xl flex items-center justify-center text-ink-tertiary hover:bg-white/80"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-2 leading-relaxed">{payload.caveats[0] ?? 'Voice scoring is not available for this clip.'}</p>
      </div>
    )
  }

  return (
    <SpeakingCoachFeedbackExperience
      layout={layout}
      payload={payload}
      spokenTranscript={spokenTranscript}
      userRecordingUrl={userRecordingUrl}
      compareCoachingText={compareCoachingText}
      onDismiss={dismiss}
      onAfterPhraseApplied={onAfterPhraseApplied}
      onApplyPhraseToComposer={onApplyPhraseToComposer}
      onSavePhrase={onSavePhrase}
      onQueuePhraseAssessment={layout === 'composer' ? onQueuePhraseAssessment : undefined}
      onBeginShadowPractice={layout === 'composer' ? onBeginShadowPractice : undefined}
    />
  )
}
