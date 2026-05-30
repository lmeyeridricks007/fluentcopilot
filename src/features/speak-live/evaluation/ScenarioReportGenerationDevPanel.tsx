'use client'

import React from 'react'

import type { ApiLiveSessionEvaluationResponse } from '@/lib/api/apiTypes'
import type { SessionEvaluationReport } from './reportTypes'
import { extractParallelScenarioReportDevSnapshot } from './scenarioReportGenerationState'

function fmtMs(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n)} ms`
}

export function ScenarioReportGenerationDevPanel(props: {
  payload: ApiLiveSessionEvaluationResponse | null | undefined
  report: SessionEvaluationReport | null | undefined
}) {
  const { payload, report } = props
  const snap = extractParallelScenarioReportDevSnapshot(report ?? null, payload ?? null)
  const runningFor = payload?.evaluationDiagnostics?.runningForMs
  const phase = payload?.evaluationPhase ?? '—'
  const progress = payload?.evaluationProgress as Record<string, unknown> | null | undefined

  return (
    <details className="mt-4 w-full max-w-lg rounded-xl border border-dashed border-slate-300 bg-slate-50/90 text-left">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-[12px] font-semibold text-slate-700">
        Scenario report diagnostics (dev)
      </summary>
      <div className="space-y-2 border-t border-slate-200/80 px-4 py-3 text-[11px] leading-snug text-slate-700">
        <p>
          <span className="font-semibold text-slate-600">Pipeline phase:</span> {String(phase)}
        </p>
        {runningFor != null ? (
          <p>
            <span className="font-semibold text-slate-600">Running (client wall):</span> {Math.round(runningFor)} ms
          </p>
        ) : null}
        {progress && typeof progress.updatedAt === 'string' ? (
          <p>
            <span className="font-semibold text-slate-600">Progress updated:</span> {progress.updatedAt}
          </p>
        ) : null}
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 pt-1">
          <dt className="text-slate-500">totalMs</dt>
          <dd className="font-mono text-right">{fmtMs(snap.totalMs)}</dd>
          <dt className="text-slate-500">structuredLlmMs</dt>
          <dd className="font-mono text-right">{fmtMs(snap.structuredLlmMs)}</dd>
          <dt className="text-slate-500">azureBatchMs</dt>
          <dd className="font-mono text-right">{fmtMs(snap.azureBatchMs)}</dd>
          <dt className="text-slate-500">referenceTtsMs</dt>
          <dd className="font-mono text-right">{fmtMs(snap.referenceTtsMs)}</dd>
          <dt className="text-slate-500">persistMs</dt>
          <dd className="font-mono text-right">{fmtMs(snap.persistMs)}</dd>
          <dt className="text-slate-500">modelName</dt>
          <dd className="text-right font-mono text-[10px]">{snap.modelName ?? '—'}</dd>
          <dt className="text-slate-500">tokens (in / out est.)</dt>
          <dd className="font-mono text-right">
            {snap.approximateInputTokens ?? '—'} / {snap.approximateOutputTokens ?? '—'}
          </dd>
          <dt className="text-slate-500">fallbackUsed</dt>
          <dd className="text-right">{snap.fallbackUsed === undefined ? '—' : snap.fallbackUsed ? 'yes' : 'no'}</dd>
        </dl>
        {snap.failedSubtasks.length > 0 ? (
          <div className="pt-2">
            <p className="font-semibold text-amber-900/90">failedSubtasks</p>
            <ul className="mt-1 list-disc pl-4 text-[10px] text-amber-950/90">
              {snap.failedSubtasks.map((f, i) => (
                <li key={`${f.task}-${i}`}>
                  <span className="font-mono">{f.task}</span>: {f.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {snap.warnings.length > 0 ? (
          <div className="pt-2">
            <p className="font-semibold text-slate-600">warnings</p>
            <ul className="mt-1 list-disc pl-4 text-[10px] text-slate-700">
              {snap.warnings.map((w, i) => (
                <li key={`${i}-${w.slice(0, 40)}`}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </details>
  )
}
