'use client'

import { formatExamClock } from '@/lib/exam-system/examTimerModel'

export type ExamTimerDockProps = {
  isSimulation: boolean
  phaseLabel: string
  /** null = untimed (soft training prep). */
  phaseRemainingSec: number | null
  phaseDurationSec: number
  sectionTitle: string
  /** Informational: remaining task-time in this section. */
  sectionPaceRemainingSec: number
  /** Hard section budget countdown (simulation / strict modes). */
  sectionWallRemainingSec: number | null
  sessionRemainingSec: number
  /** Wall-clock countdown for the whole simulation budget; null when unknown. */
  fullExamRemainingSec: number | null
  sumSessionTasksSec: number
}

export function ExamTimerDock(props: ExamTimerDockProps) {
  const {
    isSimulation,
    phaseLabel,
    phaseRemainingSec,
    phaseDurationSec,
    sectionTitle,
    sectionPaceRemainingSec,
    sectionWallRemainingSec,
    sessionRemainingSec,
    fullExamRemainingSec,
    sumSessionTasksSec,
  } = props

  const phaseTimed = phaseRemainingSec != null
  const barPct = phaseTimed && phaseDurationSec > 0 ? Math.min(100, Math.max(0, (phaseRemainingSec / phaseDurationSec) * 100)) : 100

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm px-3.5 py-3 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Timer</p>
          <p className="text-body-sm font-semibold text-slate-900 tabular-nums leading-tight">
            {phaseLabel}
            {phaseTimed ? (
              <span className="text-slate-600 font-medium"> · {formatExamClock(phaseRemainingSec)}</span>
            ) : phaseLabel.toLowerCase().includes('answer') ? (
              <span className="text-slate-500 font-medium text-caption"> · no task deadline</span>
            ) : (
              <span className="text-slate-500 font-medium text-caption"> · open preparation</span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {isSimulation ? 'Simulation' : 'Training'}
          </p>
          <p className="text-caption text-slate-600 tabular-nums">Session {formatExamClock(sessionRemainingSec)}</p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${
            phaseLabel.toLowerCase().includes('answer') ? 'bg-slate-900' : 'bg-slate-500'
          }`}
          style={{ width: `${barPct}%` }}
        />
      </div>

      <div className="grid gap-1.5 text-caption text-slate-600 tabular-nums">
        <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
          <span className="text-slate-500 shrink-0">Section pace</span>
          <span className="text-right text-slate-800 font-medium">
            {sectionTitle} · ~{formatExamClock(sectionPaceRemainingSec)}
          </span>
        </div>
        {sectionWallRemainingSec != null ? (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 shrink-0">Section limit</span>
            <span className="text-right font-semibold text-amber-950">{formatExamClock(sectionWallRemainingSec)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-2 border-t border-slate-100 pt-1.5">
          <span className="text-slate-500 shrink-0">This session (tasks)</span>
          <span className="text-slate-700">{formatExamClock(sumSessionTasksSec)}</span>
        </div>
        {fullExamRemainingSec != null ? (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500 shrink-0">Full exam time left</span>
            <span className="text-slate-800 font-semibold tabular-nums">{formatExamClock(fullExamRemainingSec)}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
