'use client'

import { useCallback, useEffect } from 'react'
import { X, Copy, Timer } from 'lucide-react'
import type { ApiLiveSessionEvaluationResponse } from '@/lib/api/apiTypes'
import type { SessionEvaluationReport } from './reportTypes'

function fmtMs(ms: number | undefined | null): string {
  if (ms == null || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function pct(part: number | undefined, total: number | undefined): string {
  if (part == null || total == null || !Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return ''
  return `${Math.round((100 * part) / total)}%`
}

type GenDiag = SessionEvaluationReport['generationDiagnostics']

function sanitizeParallelDiagForDev(d: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(d)) as Record<string, unknown>
}

function TimingRow({ label, ms, total }: { label: string; ms: number | undefined; total?: number }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 pr-3 text-[13px] text-ink-primary">{label}</td>
      <td className="py-2 text-right font-mono text-[13px] text-slate-800">{fmtMs(ms)}</td>
      <td className="py-2 pl-2 text-right text-[12px] text-slate-500">{total != null && ms != null ? pct(ms, total) : ''}</td>
    </tr>
  )
}

export type EvaluationTimingBreakdownProps = {
  open: boolean
  onClose: () => void
  /** Completed report — full orchestrator + per-turn breakdown */
  generationDiagnostics?: GenDiag | null
  /** API wrapper (phases while running, flattened timings when dev server flag is on) */
  evaluationDiagnostics?: ApiLiveSessionEvaluationResponse['evaluationDiagnostics']
  /** Human hint when the report is still building */
  buildStatus?: 'complete' | 'pending' | 'running' | 'failed'
}

export function EvaluationTimingBreakdown({
  open,
  onClose,
  generationDiagnostics: gen,
  evaluationDiagnostics: api,
  buildStatus,
}: EvaluationTimingBreakdownProps) {
  const copyJson = useCallback(() => {
    const payload = {
      generationDiagnostics: gen ?? null,
      evaluationDiagnostics: api ?? null,
      buildStatus: buildStatus ?? null,
    }
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
  }, [gen, api, buildStatus])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const orch = gen?.orchestrator
  const app = gen?.app
  const qa = gen?.qa
  const orchTotal = orch?.totalMs
  const apiTimings = api?.timings

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Close timing breakdown"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="eval-timing-title"
        className="relative z-[81] flex max-h-[min(92dvh,880px)] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Timer className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
            <h2 id="eval-timing-title" className="truncate text-[15px] font-semibold text-ink-primary">
              Report build timing
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => copyJson()}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy JSON
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {buildStatus && buildStatus !== 'complete' ? (
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              Status: <span className="font-semibold text-ink-primary">{buildStatus}</span>
              {buildStatus === 'running' || buildStatus === 'pending'
                ? ' — detailed step timings are available after the report finishes.'
                : null}
            </p>
          ) : null}

          {api?.runningForMs != null ? (
            <p className="text-[12px] text-slate-600">
              Current run wall time (client view): <span className="font-mono font-semibold">{fmtMs(api.runningForMs)}</span>
            </p>
          ) : null}

          {api && (api.audioScoring || api.languageCoaching) ? (
            <section>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Pipeline phases</p>
              <ul className="mt-2 space-y-1 text-[13px] text-slate-700">
                <li>Audio scoring: {api.audioScoring}</li>
                <li>Language coaching: {api.languageCoaching}</li>
                <li>Final assembly: {api.finalAssembly}</li>
                <li>QA review: {api.qaReview}</li>
              </ul>
            </section>
          ) : null}

          {apiTimings && Object.keys(apiTimings).length > 0 ? (
            <section>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Server summary (API)</p>
              <table className="mt-2 w-full border-collapse">
                <tbody>
                  {apiTimings.totalMs != null ? (
                    <TimingRow label="Total (end-to-end)" ms={apiTimings.totalMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.inputLoadMs != null ? (
                    <TimingRow label="Input load" ms={apiTimings.inputLoadMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.reportBuildMs != null ? (
                    <TimingRow label="Report build" ms={apiTimings.reportBuildMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.orchestratorTotalMs != null ? (
                    <TimingRow label="Orchestrator (inside report build)" ms={apiTimings.orchestratorTotalMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.assessTurnsMs != null ? (
                    <TimingRow label="  Assess turns" ms={apiTimings.assessTurnsMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.llmMs != null ? <TimingRow label="  Session LLM" ms={apiTimings.llmMs} total={apiTimings.totalMs} /> : null}
                  {apiTimings.recommendationVerifyMs != null && apiTimings.recommendationVerifyMs > 0 ? (
                    <TimingRow label="  Recommendation verify (LLM)" ms={apiTimings.recommendationVerifyMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.coachMergeMs != null ? (
                    <TimingRow label="  Coach merge" ms={apiTimings.coachMergeMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.referenceTtsMs != null ? (
                    <TimingRow label="  Reference TTS" ms={apiTimings.referenceTtsMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.feedbackBuildMs != null ? (
                    <TimingRow label="  Feedback build" ms={apiTimings.feedbackBuildMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.reportAuditMs != null && apiTimings.reportAuditMs > 0 ? (
                    <TimingRow label="  Report audit (LLM)" ms={apiTimings.reportAuditMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.enrichTurnsMs != null ? (
                    <TimingRow label="  Enrich turns (+ post-audit work)" ms={apiTimings.enrichTurnsMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.premiumScoringMs != null ? (
                    <TimingRow label="  Premium scoring" ms={apiTimings.premiumScoringMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.sessionAssemblyMs != null ? (
                    <TimingRow label="  Session assembly" ms={apiTimings.sessionAssemblyMs} total={apiTimings.totalMs} />
                  ) : null}
                  {apiTimings.qaMs != null ? <TimingRow label="Report QA pass" ms={apiTimings.qaMs} total={apiTimings.totalMs} /> : null}
                  {apiTimings.persistMs != null ? <TimingRow label="Persist to DB" ms={apiTimings.persistMs} total={apiTimings.totalMs} /> : null}
                  {apiTimings.turnCount != null ? (
                    <tr className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-3 text-[13px] text-ink-primary">Learner turns scored</td>
                      <td className="py-2 text-right font-mono text-[13px] text-slate-800" colSpan={2}>
                        {apiTimings.turnCount}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          ) : null}

          {gen ? (
            <section>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Stored report</p>
              <p className="mt-1 text-[12px] text-slate-500">
                {gen.startedAt} → {gen.completedAt}
              </p>
              <table className="mt-2 w-full border-collapse">
                <tbody>
                  <TimingRow label="Full evaluation run (server wall)" ms={gen.totalMs} />
                  {app ? (
                    <>
                      <TimingRow label="App: load inputs" ms={app.inputLoadMs} total={app.totalMs} />
                      <TimingRow label="App: build report body" ms={app.reportBuildMs} total={app.totalMs} />
                      <TimingRow label="App: report QA" ms={app.qaMs} total={app.totalMs} />
                      <TimingRow label="App: persist to database" ms={app.persistMs} total={app.totalMs} />
                      <TimingRow label="App: total (excl. outer HTTP)" ms={app.totalMs} total={gen.totalMs} />
                    </>
                  ) : null}
                </tbody>
              </table>

              {orch ? (
                <>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Inside report build (orchestrator)
                  </p>
                  <table className="mt-2 w-full border-collapse">
                    <tbody>
                      <TimingRow label="Orchestrator total" ms={orch.totalMs} />
                      <TimingRow label="Assess turns (per-turn audio + language)" ms={orch.assessTurnsMs} total={orchTotal} />
                      <TimingRow label="Session LLM" ms={orch.llmMs} total={orchTotal} />
                      {orch.recommendationVerifyMs != null && orch.recommendationVerifyMs > 0 ? (
                        <TimingRow label="Recommendation verify (LLM)" ms={orch.recommendationVerifyMs} total={orchTotal} />
                      ) : null}
                      <TimingRow label="Coach merge" ms={orch.coachMergeMs} total={orchTotal} />
                      <TimingRow label="Reference TTS" ms={orch.referenceTtsMs} total={orchTotal} />
                      <TimingRow label="Feedback build" ms={orch.feedbackBuildMs} total={orchTotal} />
                      {orch.reportAuditMs != null && orch.reportAuditMs > 0 ? (
                        <TimingRow label="Report audit (LLM)" ms={orch.reportAuditMs} total={orchTotal} />
                      ) : null}
                      <TimingRow label="Enrich turns (+ post-audit work)" ms={orch.enrichTurnsMs} total={orchTotal} />
                      <TimingRow label="Premium scoring" ms={orch.premiumScoringMs} total={orchTotal} />
                      <TimingRow label="Session assembly" ms={orch.sessionAssemblyMs} total={orchTotal} />
                    </tbody>
                  </table>
                </>
              ) : null}

              {qa ? (
                <>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Report QA</p>
                  <table className="mt-2 w-full border-collapse">
                    <tbody>
                      <TimingRow label="QA total" ms={qa.totalMs} />
                      <tr className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-3 text-[13px] text-ink-primary">Flagged / fixed / unresolved</td>
                        <td className="py-2 text-right font-mono text-[13px] text-slate-800" colSpan={2}>
                          {qa.flaggedIssueCount} / {qa.fixedIssueCount} / {qa.unresolvedIssueCount}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </>
              ) : null}

              {process.env.NODE_ENV === 'development' &&
              gen &&
              gen.parallelOrchestrationV1 &&
              typeof gen.parallelOrchestrationV1 === 'object' ? (
                <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2">
                  <summary className="cursor-pointer text-[12px] font-semibold text-amber-950">
                    Parallel orchestration diagnostics (dev)
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto rounded-lg bg-white p-2 text-[11px] leading-snug text-slate-800">
                    {JSON.stringify(sanitizeParallelDiagForDev(gen.parallelOrchestrationV1 as Record<string, unknown>), null, 2)}
                  </pre>
                </details>
              ) : null}

              {orch?.turnTimings && orch.turnTimings.length > 0 ? (
                <>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Per-turn (slowest first)
                  </p>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[520px] border-collapse text-left text-[12px]">
                      <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                        <tr>
                          <th className="px-2 py-2">#</th>
                          <th className="px-2 py-2">Total</th>
                          <th className="px-2 py-2">Blob ↓</th>
                          <th className="px-2 py-2">Audio</th>
                          <th className="px-2 py-2">Timing</th>
                          <th className="px-2 py-2">OK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...orch.turnTimings]
                          .sort((a, b) => b.totalMs - a.totalMs)
                          .map((t) => (
                            <tr key={t.turnId} className="border-t border-slate-100">
                              <td className="px-2 py-1.5 font-mono">{t.turnIndex}</td>
                              <td className="px-2 py-1.5 font-mono">{fmtMs(t.totalMs)}</td>
                              <td className="px-2 py-1.5 font-mono">{fmtMs(t.blobDownloadMs)}</td>
                              <td className="px-2 py-1.5 font-mono">{fmtMs(t.audioAssessmentMs)}</td>
                              <td className="px-2 py-1.5 font-mono">{fmtMs(t.timingAnalysisMs)}</td>
                              <td className="px-2 py-1.5">{t.assessmentOk ? 'yes' : 'no'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </section>
          ) : !gen && !apiTimings && !api?.audioScoring ? (
            <p className="text-[13px] text-slate-600 leading-relaxed">
              No timing snapshot yet. Add <span className="font-mono text-slate-800">?evalTiming=1</span> to this page URL for
              debug controls while the report builds, or set{' '}
              <span className="font-mono text-slate-800">SPEAK_LIVE_EVALUATION_DEV_DIAGNOSTICS=1</span> on the API for live
              phase hints. Completed reports store a full breakdown in{' '}
              <span className="font-mono text-slate-800">generationDiagnostics</span>.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
