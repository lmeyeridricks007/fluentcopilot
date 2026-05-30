'use client'

import Link from 'next/link'
import { clsx } from 'clsx'
import type { SessionHistoryStatus, SessionModality } from './types'

const MODALITY_LABEL: Record<SessionModality, string> = {
  speak: 'Speak',
  chat: 'Chat',
  read_aloud: 'Read aloud',
  listening: 'Listening',
  personalized_practice: 'Your day',
  exam_simulation: 'Exam sim',
  exam_training: 'Exam train',
}

const MODALITY_STYLES: Record<SessionModality, string> = {
  speak: 'bg-violet-500/[0.08] text-violet-900 ring-1 ring-violet-500/15',
  chat: 'bg-emerald-500/[0.08] text-emerald-900 ring-1 ring-emerald-500/15',
  read_aloud: 'bg-fuchsia-500/[0.08] text-fuchsia-900 ring-1 ring-fuchsia-500/15',
  listening: 'bg-teal-500/[0.09] text-teal-950 ring-1 ring-teal-500/18',
  personalized_practice: 'bg-indigo-500/[0.09] text-indigo-950 ring-1 ring-indigo-500/18',
  exam_simulation: 'bg-amber-500/[0.1] text-amber-950 ring-1 ring-amber-600/20',
  exam_training: 'bg-violet-500/[0.1] text-sky-950 ring-1 ring-violet-600/20',
}

const STATUS_STYLES: Record<SessionHistoryStatus, string> = {
  paused: 'bg-slate-500/[0.07] text-slate-700 ring-1 ring-slate-400/20',
  active: 'bg-emerald-500/[0.09] text-emerald-900 ring-1 ring-emerald-500/18',
  ended: 'bg-slate-500/[0.05] text-slate-600 ring-1 ring-slate-400/15',
  saved: 'bg-violet-500/[0.07] text-violet-900 ring-1 ring-violet-500/15',
}

const STATUS_LABEL: Record<SessionHistoryStatus, string> = {
  paused: 'Paused',
  active: 'In progress',
  ended: 'Finished',
  saved: 'Saved',
}

export function SessionHistoryCard({
  modality,
  title,
  titleHint,
  subtitle,
  dateLabel,
  status,
  primaryAction,
  secondaryAction,
  variant = 'session',
  reportBadge,
  footNote,
}: {
  modality: SessionModality
  title: string
  /** Small disambiguator (e.g. thread tail) — not a second headline. */
  titleHint?: string | null
  subtitle?: string | null
  dateLabel: string
  status?: SessionHistoryStatus | null
  primaryAction: { label: string; href: string }
  secondaryAction?: { label: string; href: string } | null
  variant?: 'session' | 'report'
  /** Report cards: what kind of artifact this is (overview, debrief, …). */
  reportBadge?: string | null
  /** One line under subtitle (e.g. XP + completion). */
  footNote?: string | null
}) {
  const isReport = variant === 'report'

  return (
    <div
      className={clsx(
        'rounded-2xl border bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.1)] transition-[border-color,box-shadow] hover:border-slate-300/90 hover:shadow-[0_12px_32px_-14px_rgba(15,23,42,0.12)]',
        isReport
          ? 'border-slate-200/90 pl-[14px] ring-1 ring-slate-900/[0.03] [border-left-width:3px] [border-left-color:#7c3aed]'
          : 'border-slate-200/80 ring-1 ring-slate-900/[0.02]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={clsx(
              'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              MODALITY_STYLES[modality],
            )}
          >
            {MODALITY_LABEL[modality]}
          </span>
          {isReport && reportBadge ? (
            <span className="inline-flex max-w-[11rem] items-center truncate rounded-full bg-violet-500/[0.09] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900 ring-1 ring-violet-500/15">
              {reportBadge}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {!isReport && status ? (
            <span
              className={clsx(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-800',
                STATUS_STYLES[status],
              )}
            >
              {STATUS_LABEL[status]}
            </span>
          ) : null}
          <span className="text-[11px] font-medium leading-none text-slate-500 tabular-nums">{dateLabel}</span>
        </div>
      </div>

      <h3 className="mt-2.5 text-[15px] font-semibold leading-snug tracking-tight text-slate-900">
        <span>{title}</span>
        {titleHint ? (
          <span className="ml-1.5 text-[13px] font-medium tabular-nums text-slate-400">{titleHint}</span>
        ) : null}
      </h3>
      {subtitle ? (
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 line-clamp-2">{subtitle}</p>
      ) : null}
      {footNote ? (
        <p className="mt-1 text-[12px] font-semibold tabular-nums text-[#7c3aed]">{footNote}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={primaryAction.href}
          className="inline-flex min-h-touch items-center justify-center rounded-xl bg-[#7c3aed] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#0d5eb0]"
        >
          {primaryAction.label}
        </Link>
        {secondaryAction ? (
          <Link
            href={secondaryAction.href}
            className="inline-flex min-h-touch items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-[14px] font-semibold text-slate-800 hover:bg-slate-50/90"
          >
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>
    </div>
  )
}
