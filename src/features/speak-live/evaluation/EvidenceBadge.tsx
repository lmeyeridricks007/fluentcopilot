'use client'

import type { EvidenceType, ConfidenceLevel } from './reportTypes'

const EVIDENCE_CONFIG: Record<EvidenceType, { label: string; className: string }> = {
  transcript: { label: 'From text', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  audio: { label: 'From recording', className: 'bg-violet-50 text-violet-800 border-violet-200' },
  scenario: { label: 'From conversation', className: 'bg-violet-50 text-violet-800 border-violet-200' },
  mixed: { label: 'Text + recording', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; dot: string }> = {
  high: { label: 'Reliable', dot: 'bg-emerald-500' },
  medium: { label: 'Estimated', dot: 'bg-amber-500' },
  low: { label: 'Rough estimate', dot: 'bg-slate-400' },
}

export function EvidenceBadge({ type, confidence }: { type: EvidenceType; confidence?: ConfidenceLevel }) {
  const ev = EVIDENCE_CONFIG[type]
  const conf = confidence ? CONFIDENCE_CONFIG[confidence] : null
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide ${ev.className}`}>
        {ev.label}
      </span>
      {conf ? (
        <span className="inline-flex items-center gap-1 text-[9px] text-ink-tertiary font-medium">
          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
          {conf.label}
        </span>
      ) : null}
    </span>
  )
}

export function EvidenceStatusIndicator({ status }: { status: 'available' | 'partial' | 'unavailable' }) {
  const config = {
    available: { label: 'Yes', dot: 'bg-emerald-500', text: 'text-emerald-700' },
    partial: { label: 'Some turns', dot: 'bg-amber-500', text: 'text-amber-700' },
    unavailable: { label: 'No', dot: 'bg-slate-300', text: 'text-slate-500' },
  }[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${config.text}`}>
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
