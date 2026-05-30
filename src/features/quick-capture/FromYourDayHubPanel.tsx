'use client'

import { useMemo, useState } from 'react'
import { CalendarClock, Sparkles, Timer } from 'lucide-react'
import type { QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import { Button } from '@/components/ui/Button'
import {
  estimatedMinutesForMode,
  previewPackForHub,
  themeSummaryFromCaptures,
} from '@/features/quick-capture/fromYourDayHubUtils'
import type { PracticePackMode } from '@/features/quick-capture/dayPackFromCaptures'
import { friendlyPackStepPreview } from '@/features/quick-capture/fromYourDayStepLabels'

const MODES: { id: PracticePackMode; label: string; hint: string }[] = [
  { id: 'quick_rep', label: 'Quick', hint: '2–3 min' },
  { id: 'standard', label: 'Standard', hint: '4–6 min' },
  { id: 'deeper_debrief', label: 'Deeper', hint: '8–10 min' },
]

export function FromYourDayHubPanel(props: {
  dateYmd: string
  captures: QuickCaptureItem[]
  loading: boolean
  loadError: string | null
  generating: boolean
  actionError: string | null
  onStart: (mode: PracticePackMode) => void
}) {
  const [mode, setMode] = useState<PracticePackMode>('standard')
  const preview = useMemo(
    () =>
      props.captures.length
        ? previewPackForHub({ localDate: props.dateYmd, captures: props.captures, mode })
        : null,
    [props.captures, props.dateYmd, mode],
  )
  const themeSummary = useMemo(() => themeSummaryFromCaptures(props.captures), [props.captures])
  const repSteps = useMemo(
    () => (preview?.steps ?? []).filter((s) => !['short_recap', 'theme_anchor', 'strongest_next'].includes(s.kind)),
    [preview],
  )
  const est = estimatedMinutesForMode(mode)

  if (props.loading) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-2xl bg-slate-100/90" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100/80" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-violet-50/40 p-5 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.15)] ring-1 ring-slate-900/[0.04]">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F172A] text-white shadow-md">
            <Sparkles className="h-6 w-6" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">From your day</p>
            <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight text-[#0F172A]">
              {preview?.title ?? 'Practice what happened today'}
            </h1>
            <p className="text-[14px] leading-snug text-slate-600">{themeSummary}</p>
            <p className="text-[13px] leading-snug text-slate-500">
              Opens as a guided session — listening, choices, short writing, and optional links into Read aloud, Talk, or
              Coach when you want more depth.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[13px] font-semibold text-slate-800">
              <span className="inline-flex items-center gap-1.5 tabular-nums text-[#7c3aed]">
                <Timer className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                ~{est} min
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                {props.dateYmd}
              </span>
            </div>
          </div>
        </div>
      </div>

      {props.loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-caption text-amber-950">{props.loadError}</div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Length</p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => {
            const selected = mode === m.id
            return (
              <button
                key={m.id}
                type="button"
                disabled={props.generating}
                onClick={() => setMode(m.id)}
                className={`min-h-touch rounded-2xl border px-4 py-2.5 text-left transition ${
                  selected
                    ? 'border-[#7c3aed] bg-violet-50/80 text-[#0F172A] shadow-sm ring-1 ring-violet-200/60'
                    : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <span className="block text-[14px] font-bold">{m.label}</span>
                <span className="block text-[11px] font-medium text-slate-500">{m.hint}</span>
              </button>
            )
          })}
        </div>
      </div>

      {props.captures.length > 0 && preview ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">How it will feel</p>
          <p className="mt-2 text-[13px] leading-snug text-slate-600">
            {repSteps.length} short beats — a warm-up, a thread through your day, then a strong finish.
          </p>
          <ol className="mt-3 space-y-1.5 list-decimal pl-4 text-[13px] text-slate-800">
            {(preview.steps ?? []).slice(0, 8).map((s) => (
              <li key={s.id} className="pl-0.5">
                <span className="font-medium">{friendlyPackStepPreview(s)}</span>
              </li>
            ))}
            {(preview.steps ?? []).length > 8 ? <li className="text-slate-500">…</li> : null}
          </ol>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
          <p className="text-body-sm font-semibold text-ink-primary">Nothing ready for this day yet</p>
          <p className="mt-1 text-caption text-ink-secondary leading-relaxed">
            Save something small from real life in Library. When it is ready to practice, you can turn the day into a short pack here.
          </p>
        </div>
      )}

      {props.actionError ? <p className="text-caption text-red-600">{props.actionError}</p> : null}

      <Button
        variant="primary"
        fullWidth
        disabled={props.captures.length < 1 || props.generating}
        onClick={() => props.onStart(mode)}
      >
        {props.generating ? 'Building your pack…' : 'Turn this into practice'}
      </Button>
    </div>
  )
}
