'use client'

import { nullableNum, num } from './evaluationUtils'

export type ScoreChipRowProps = {
  audioScores: Record<string, unknown>
  languageScores: Record<string, unknown>
  combinedScores: Record<string, unknown>
  goalAlignment?: number
  quickLabels?: Record<string, string> | null
  compact?: boolean
  /** When false, hide audio-derived pronunciation / rhythm chips. */
  audioMetricsAvailable?: boolean
}

function Chip({ label, value, tone }: { label: string; value: number | string; tone: 'sky' | 'violet' | 'emerald' | 'amber' }) {
  const tones = {
    sky: 'border-violet-200 bg-violet-50 text-sky-950',
    violet: 'border-violet-200 bg-violet-50 text-violet-950',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    amber: 'border-amber-200 bg-amber-50 text-amber-950',
  } as const
  return (
    <span className={`inline-flex flex-col rounded-lg border px-2.5 py-1.5 min-w-[3.25rem] ${tones[tone]}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-ink-tertiary">{label}</span>
      <span className="text-body-sm font-bold tabular-nums">{value}</span>
    </span>
  )
}

/**
 * Scan-friendly score row: audio lane (cool) vs language (warm) vs combined headline.
 */
export function ScoreChipRow({
  audioScores,
  languageScores,
  combinedScores,
  goalAlignment,
  quickLabels,
  compact,
  audioMetricsAvailable = true,
}: ScoreChipRowProps) {
  const p = nullableNum(audioScores.pronunciation)
  const fl = nullableNum(audioScores.fluency)
  const rh = nullableNum(audioScores.rhythm)
  const cmp = nullableNum(audioScores.completeness)
  const audioClarity = nullableNum(audioScores.clarity)
  const nt = num(languageScores.naturalness)
  const ctx = num(languageScores.contextualFit)
  const reg = num(languageScores.registerFit)
  const gr = num(languageScores.grammaticalStability)
  const overall = num(combinedScores.overallTurnScore)
  const clarity = num(combinedScores.clarityScore)
  const dutch = num(combinedScores.dutchLikenessScore)
  const ga = goalAlignment != null ? num(goalAlignment) : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Chip label="Turn" value={overall} tone="emerald" />
        <Chip label="Clear" value={clarity} tone="violet" />
        <Chip label="NL feel" value={dutch} tone="amber" />
        {ga != null ? <Chip label="Scene" value={ga} tone="sky" /> : null}
      </div>

      {!compact ? (
        <>
          {audioMetricsAvailable && p != null && fl != null ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800 mb-1.5">
                Focus on pronunciation (audio)
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="P" value={p} tone="sky" />
                <Chip label="Fl" value={fl} tone="sky" />
                {cmp != null ? <Chip label="Cmp" value={cmp} tone="sky" /> : null}
                {audioClarity != null && audioClarity > 0 ? <Chip label="Clr" value={audioClarity} tone="sky" /> : null}
              </div>
            </div>
          ) : null}
          {audioMetricsAvailable && rh != null ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800 mb-1.5">Focus on rhythm (audio)</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip label="Rh" value={rh} tone="violet" />
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-1.5">Language fit</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip label="Nt" value={nt} tone="amber" />
              <Chip label="Ctx" value={ctx} tone="amber" />
              <Chip label="Reg" value={reg} tone="amber" />
              <Chip label="Gr" value={gr} tone="amber" />
            </div>
          </div>
        </>
      ) : null}

      {quickLabels?.naturalness || (audioMetricsAvailable && (quickLabels?.pronunciation || quickLabels?.rhythm)) ? (
        <p className="text-[11px] text-ink-secondary leading-relaxed">
          {audioMetricsAvailable ? (
            <>
              <span className="text-violet-800 font-medium">Pronunciation:</span> {quickLabels?.pronunciation ?? '—'}
              <span className="text-ink-tertiary"> · </span>
              <span className="text-violet-800 font-medium">Rhythm:</span> {quickLabels?.rhythm ?? '—'}
              <span className="text-ink-tertiary"> · </span>
            </>
          ) : null}
          <span className="text-amber-800 font-medium">Naturalness:</span> {quickLabels?.naturalness ?? '—'}
        </p>
      ) : null}
    </div>
  )
}
