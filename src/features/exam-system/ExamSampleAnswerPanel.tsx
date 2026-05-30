'use client'

import { BookOpen } from 'lucide-react'
import {
  DutchWordGlossPicker,
  type ServerWordGlossMap,
} from '@/features/speak-live/evaluation/dutchWordGlossSupport'
import { PackReferenceAudioControls } from '@/features/generated-exercise-pack/PackReferenceAudioControls'

type Props = {
  text: string
  /** Shown in the card header (e.g. “Sample answer”). */
  title?: string
  /** When true, show the generic scaffold hint below the text. */
  isScaffold?: boolean
  /** When true, sample text was adapted from the learner’s answer (not a generic bank example). */
  personalizedFromYourAnswer?: boolean
  /** LLM glosses attached to the session when the report was built. */
  serverGlosses?: ServerWordGlossMap
}

/**
 * Sample answer on exam reports: same Dutch neural reference voice as inburgering speaking tasks
 * ({@link PackReferenceAudioControls} → `/api/speaking/reference-audio`, default `nl-NL-FennaNeural`).
 */
export function ExamSampleAnswerPanel({
  text,
  title,
  isScaffold,
  personalizedFromYourAnswer,
  serverGlosses,
}: Props) {
  const panelTitle =
    title ??
    (personalizedFromYourAnswer
      ? 'Ideal version (from your answer)'
      : isScaffold
        ? 'Sample structure (template)'
        : 'Sample answer')
  const sample = text.trim()

  if (!sample) {
    return (
      <p className="px-3 py-3 text-caption text-emerald-950/80 leading-relaxed">
        No reference answer available for this task type.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2 border-b border-emerald-200/60 bg-emerald-50/50 px-3 py-2">
        <BookOpen className="h-4 w-4 text-emerald-800/80 shrink-0" aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-950/90 flex-1 min-w-0">
          {panelTitle}
        </p>
      </div>
      <div className="border-b border-emerald-200/40 bg-emerald-50/30 px-3 py-2.5">
        <PackReferenceAudioControls
          line={sample}
          locale="nl-NL"
          variant="playOnly"
          compact
          playOnlyHint="Same Dutch voice as the speaking exam scenario audio."
        />
      </div>
      <div className="px-3 py-3">
        <DutchWordGlossPicker
          phrase={sample}
          corrections={[]}
          label="Tap a word — Dutch & English"
          serverGlosses={serverGlosses}
          enablePracticeSave
          practiceSaveLabel="Exam sample answer"
        />
      </div>
      {personalizedFromYourAnswer ? (
        <p className="border-t border-emerald-200/50 px-3 py-2 text-[11px] leading-snug text-emerald-950/85 bg-emerald-50/40">
          Based on your situation — same story with clearer A2 Dutch (grammar and two short sentences where asked).
        </p>
      ) : isScaffold ? (
        <p className="border-t border-emerald-200/50 px-3 py-2 text-[11px] leading-snug text-emerald-950/85 bg-emerald-50/40">
          Generic Dutch structure — adapt the wording to your own situation and details.
        </p>
      ) : null}
    </div>
  )
}
