'use client'

import React from 'react'

import { clsx } from 'clsx'
import type { ScenarioReportStageChipId } from './scenarioReportGenerationState'

const CHIPS: Array<{ id: ScenarioReportStageChipId; label: string }> = [
  { id: 'queued', label: 'Queued' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'speech', label: 'Speech' },
  { id: 'report', label: 'Report' },
  { id: 'qa', label: 'Verify' },
]

export function ScenarioReportStageChips(props: { active: ScenarioReportStageChipId }) {
  const order: ScenarioReportStageChipId[] = ['queued', 'dialogue', 'speech', 'report', 'qa']
  const activeIdx = order.indexOf(props.active)
  return (
    <div
      className="mt-4 flex w-full max-w-md flex-wrap justify-center gap-1.5"
      aria-label="Report generation stages"
    >
      {CHIPS.map((c, i) => {
        const done = i < activeIdx
        const active = i === activeIdx
        return (
          <span
            key={c.id}
            className={clsx(
              'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
              done && 'border-emerald-200 bg-emerald-50 text-emerald-900',
              active && 'border-violet-300 bg-violet-50 text-violet-900 shadow-sm',
              !done && !active && 'border-slate-200/80 bg-white/70 text-slate-400',
            )}
          >
            {c.label}
          </span>
        )
      })}
    </div>
  )
}
