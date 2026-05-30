'use client'

import type { LanguageCoachDebriefReport } from './reportTypes'

type NudgeRow = NonNullable<LanguageCoachDebriefReport['nudgeSessionLog']>[number]

function nudgeTypeLabel(nudgeType: string): string {
  switch (nudgeType) {
    case 'RECAST':
      return 'Recast'
    case 'CLARIFY':
      return 'Clarification'
    case 'EXPAND':
      return 'Expansion'
    case 'MODEL':
      return 'Model line'
    default:
      return nudgeType || 'Support'
  }
}

/**
 * Kept exported for back-compat with `LanguageCoachDedicatedReport.tsx`, which still uses it
 * for the older "guided moments useful" recap list. The current slim card does NOT use it —
 * we rely on `row.coachCorrectionLine` produced backend-side for a clean isolated correction.
 */
export function coachSnippetForDisplay(snippet: string): string {
  const lines = snippet.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const first = lines[0] ?? snippet.trim()
  return first.replace(/…+$/u, '').trim()
}

function CoachNudgeEvidenceCard(props: { row: NudgeRow }) {
  const { row } = props
  const learner = row.learnerOriginal.trim()
  /**
   * `coachCorrectionLine` is the producer-isolated correction (see
   * `pickBetterLineFromCoachReply` in `languageCoachSessionEvaluation.ts`). May be null when
   * the coach reply was purely conversational; in that case we omit the correction block
   * entirely rather than dumping prose into the card.
   */
  const correction = row.coachCorrectionLine?.trim() ?? ''
  const hasCorrection = correction.length >= 2
  /**
   * Prefer humanized labels (e.g. "asking follow-up questions") over raw debug taxonomy
   * (e.g. `follow_up_gap`). Backend always populates `humanizedSignals` when there are any
   * detected issue types; falling back to the raw list keeps older persisted reports readable.
   */
  const signals = (row.humanizedSignals?.length ? row.humanizedSignals : row.detectedIssueTypes ?? []).slice(0, 4)

  return (
    <div className="rounded-[1.25rem] border border-violet-200/90 bg-white/95 p-4 shadow-sm ring-1 ring-violet-100/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-100/90 px-2.5 py-0.5 text-[11px] font-semibold text-violet-950">
          {nudgeTypeLabel(row.nudgeType)}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{row.severity}</span>
        {row.learnerRecoveredLater === true ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">You recovered</span>
        ) : row.learnerRecoveredLater === false ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Still tricky</span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Your line (transcript)</p>
          <p className="mt-1 text-[15px] font-medium leading-relaxed text-ink-primary">“{learner}”</p>
        </div>

        {hasCorrection ? (
          <div className="rounded-xl border border-indigo-100/90 bg-indigo-50/40 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-900/85">Coach correction</p>
            <p className="mt-1 text-[15px] font-semibold leading-relaxed text-indigo-950">“{correction}”</p>
            <p className="mt-2 text-[11px] leading-relaxed text-indigo-900/70">
              Hear it, save it, and tap words in the <span className="font-semibold">Phrases to refine</span> card above.
            </p>
          </div>
        ) : null}

        {signals.length ? (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">What this moment was about</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {signals.map((label, i) => (
                <span
                  key={`sig-${i}-${label}`}
                  className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200/80"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function CoachGuidanceEvidenceList(props: {
  rows: NudgeRow[]
  /**
   * Kept in the prop type so callers don't have to be refactored. The slim card no longer
   * uses session/scenario/level or any of the action callbacks — phrasing actions (hear,
   * save, tap-a-word) live in the "Phrases to refine" card above this section.
   */
  sessionId?: string
  scenarioId?: string
  level?: string
  onPlayDutchReference?: (turnId: string, text: string) => Promise<void>
  onSave?: (input: Record<string, unknown>) => void
  saving?: string | null
  savedKeys?: Set<string>
}) {
  const { rows } = props
  const ordered = [...rows].reverse()

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-100/90 bg-violet-50/30 px-3 py-2.5">
        <p className="text-[12px] leading-relaxed text-violet-950/95">
          Each card is one guided moment from this session — the coach style (recast, expansion, clarification, or
          model), how serious it was, and whether you stayed cleaner after. For audio, saves, and tap-a-word help,
          use the <span className="font-semibold">Phrases to refine</span> card above.
        </p>
      </div>
      {ordered.map((row, i) => {
        const stable = `${row.nudgeType}-${row.severity}-${row.learnerOriginal.slice(0, 24)}-${i}`
        return <CoachNudgeEvidenceCard key={`lc-ev-${stable}`} row={row} />
      })}
    </div>
  )
}
