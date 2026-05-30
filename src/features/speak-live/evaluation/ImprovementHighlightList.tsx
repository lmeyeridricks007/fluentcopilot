'use client'

import { Headphones } from 'lucide-react'

export type ImprovementHighlightListProps = {
  keyStrengths: string[]
  keyProblems: string[]
  audioFindings: string[]
  chunkingRhythmSuggestion: string
  focusWords: string[]
  /** When false, hide audio-specific “listen for” copy and rhythm chunking. */
  audioMetricsAvailable?: boolean
  /** Combined “what to listen for” guidance */
  listenForNotes?: string[]
  referenceSentenceReason?: string
}

/**
 * Structured feedback blocks + explicit listening guidance for A/B comparison.
 */
export function ImprovementHighlightList({
  keyStrengths,
  keyProblems,
  audioFindings,
  chunkingRhythmSuggestion,
  focusWords,
  audioMetricsAvailable = true,
  listenForNotes,
  referenceSentenceReason,
}: ImprovementHighlightListProps) {
  const listenBullets = audioMetricsAvailable
    ? [
        ...(listenForNotes ?? []),
        ...(referenceSentenceReason?.trim() ? [`Reference: ${referenceSentenceReason.trim()}`] : []),
        ...audioFindings.slice(0, 4),
      ].filter(Boolean)
    : []

  return (
    <div className="space-y-4">
      {listenBullets.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Headphones className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden />
            <p className="text-caption font-bold text-ink-primary">What to listen for</p>
          </div>
          <p className="text-[11px] text-ink-secondary mb-2 leading-relaxed">
            Compare your recording with the reference: notice endings, stress, and pauses — not only words.
          </p>
          <ul className="space-y-1.5 text-caption text-ink-secondary list-disc pl-4">
            {listenBullets.slice(0, 8).map((line, i) => (
              <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-caption font-bold text-emerald-900 mb-2">What sounded good</p>
          <ul className="space-y-1.5 text-caption text-ink-secondary list-disc pl-4">
            {keyStrengths.length ? keyStrengths.map((x) => <li key={x}>{x}</li>) : <li className="text-ink-tertiary">—</li>}
          </ul>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-caption font-bold text-amber-900 mb-2">What to improve</p>
          <ul className="space-y-1.5 text-caption text-ink-secondary list-disc pl-4">
            {keyProblems.length ? keyProblems.map((x) => <li key={x}>{x}</li>) : <li className="text-ink-tertiary">—</li>}
          </ul>
        </div>
      </div>

      {audioMetricsAvailable && audioFindings.length > 0 && listenBullets.length === 0 ? (
        <div>
          <p className="text-caption font-semibold text-violet-800 mb-1">From your audio</p>
          <ul className="text-caption text-ink-secondary space-y-1 list-disc pl-4">
            {audioFindings.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {audioMetricsAvailable && chunkingRhythmSuggestion.trim() ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <p className="text-caption font-bold text-violet-900 mb-1">Try this instead (rhythm / chunking)</p>
          <p className="text-caption text-ink-secondary leading-relaxed">{chunkingRhythmSuggestion.trim()}</p>
          {focusWords.length > 0 ? (
            <p className="mt-2 text-[11px] text-ink-secondary">
              <span className="font-semibold text-violet-800">Focus words:</span> {focusWords.join(' · ')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
