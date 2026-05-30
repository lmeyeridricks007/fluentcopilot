'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TranscriptCoachingSection as TranscriptCoachingData } from './speechEvaluationBridge'

function ScorePill({ score, bandLabel }: { score: number | null; bandLabel: string | null }) {
  if (score == null) return null
  const color =
    score >= 75
      ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
      : score >= 60
        ? 'bg-amber-100 text-amber-900 border-amber-200'
        : 'bg-rose-100 text-rose-900 border-rose-200'
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 border ${color}`}>
      {bandLabel ?? Math.round(score)}
    </span>
  )
}

function DimensionBlock({
  title,
  data,
}: {
  title: string
  data: NonNullable<TranscriptCoachingData['wording']>
}) {
  const [expanded, setExpanded] = useState(data.feedbackItems.length > 0 && (data.score ?? 100) < 75)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2.5 min-h-touch hover:bg-slate-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[11px] font-semibold text-ink-primary truncate">{title}</p>
          <ScorePill score={data.score} bandLabel={data.bandLabel} />
        </div>
        {expanded
          ? <ChevronUp className="h-3.5 w-3.5 text-ink-tertiary shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary shrink-0" />}
      </button>

      {expanded ? (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100">
          <p className="text-[10px] text-ink-tertiary mt-2">{data.evidenceSummary}</p>
          {data.feedbackItems.length > 0 ? (
            <ul className="space-y-2">
              {data.feedbackItems.map((fb, idx) => (
                <li key={idx} className="text-[11px] leading-relaxed">
                  <p className="text-rose-900">
                    <span className="font-semibold">Issue:</span> {fb.issue}
                  </p>
                  <p className="text-emerald-900 mt-0.5">
                    <span className="font-semibold">Fix:</span> {fb.fix}
                  </p>
                  {fb.whyItMatters ? (
                    <p className="text-ink-tertiary mt-0.5 text-[10px]">{fb.whyItMatters}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-ink-secondary">No specific issues flagged for this dimension.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

export type TranscriptCoachingSectionProps = {
  coaching: TranscriptCoachingData
  hasAudio: boolean
}

export function TranscriptCoachingSection({ coaching, hasAudio }: TranscriptCoachingSectionProps) {
  const { wording, grammar, scenarioFit } = coaching
  const hasAnything = wording != null || grammar != null || scenarioFit != null
  if (!hasAnything) return null

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-tertiary">
        {hasAudio ? 'Wording & grammar' : 'Language tips'}
      </p>
      {!hasAudio ? (
        <p className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          No recording was stored for this turn, so pronunciation and rhythm feedback are not included.
          The tips below are based on what you wrote.
        </p>
      ) : null}
      {wording ? <DimensionBlock title="Natural wording" data={wording} /> : null}
      {grammar ? <DimensionBlock title="Grammar & sentence construction" data={grammar} /> : null}
      {scenarioFit ? <DimensionBlock title="Did it fit the situation?" data={scenarioFit} /> : null}
    </div>
  )
}
