'use client'

import { CheckCircle2, CircleAlert, Repeat2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { ApiLiveCoachTurnFeedback } from '@/lib/api/apiTypes'

export function LanguageCoachTurnFeedbackCard({
  feedback,
}: {
  feedback: ApiLiveCoachTurnFeedback | null
}) {
  if (!feedback) return null

  const needsWork = feedback.verdict === 'needs_work'
  const explicitCorrection = Boolean(feedback.explicitCorrectionInReply)

  return (
    <div
      className={clsx(
        'shrink-0 rounded-2xl border px-3 py-2.5',
        needsWork ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">Live coach check</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1',
                needsWork
                  ? 'bg-amber-100 text-amber-950 ring-amber-200'
                  : 'bg-emerald-100 text-emerald-950 ring-emerald-200'
              )}
            >
              {needsWork ? <CircleAlert className="h-3 w-3 shrink-0" aria-hidden /> : <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden />}
              {needsWork ? 'Needs work' : 'Good'}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200">
              {explicitCorrection
                ? 'Correction in reply'
                : feedback.pickedUpByCoach
                  ? 'Coach nudge (no template)'
                  : 'Not yet surfaced by coach'}
            </span>
            {feedback.correctionLoopActive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-950 ring-1 ring-violet-200">
                <Repeat2 className="h-3 w-3 shrink-0" aria-hidden />
                Repeat requested{typeof feedback.repeatCount === 'number' ? ` (${feedback.repeatCount}/3)` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-slate-800">{feedback.summary}</p>

      {feedback.reasons.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {feedback.reasons.map((reason) => (
            <span
              key={reason}
              className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700"
            >
              {reason}
            </span>
          ))}
        </div>
      ) : null}

      {feedback.targetLine ? (
        <p className="mt-2 rounded-xl bg-white/75 px-2.5 py-2 text-[12px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-900">Target repeat:</span> {feedback.targetLine}
        </p>
      ) : null}
    </div>
  )
}
