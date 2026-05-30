import type { ReactNode } from 'react'
import { clsx } from 'clsx'

export function SpeakLiveScenarioSection({
  title,
  description,
  eyebrow,
  countLabel,
  premium = false,
  tone = 'default',
  id,
  quiet = false,
  children,
}: {
  title: string
  description: string
  eyebrow?: string
  countLabel?: string
  premium?: boolean
  tone?: 'default' | 'live' | 'soon' | 'coach'
  /** Optional anchor for in-page navigation (e.g. Speak launcher “jump to scenarios”). */
  id?: string
  /** Softer container for lower-priority sections (e.g. coming soon). */
  quiet?: boolean
  children: ReactNode
}) {
  const isLive = tone === 'live'
  const isSoon = tone === 'soon'
  const isCoach = tone === 'coach' || premium

  return (
    <section
      id={id}
      className={clsx(
        'rounded-3xl border px-4 py-4 sm:px-5 sm:py-5',
        quiet
          ? 'border-[#E5E7EB] bg-[#fafaf7]/70 shadow-none'
          : isCoach
            ? 'border-[#E5E7EB] bg-white shadow-[0_6px_28px_-18px_rgba(124,58,237,0.06)]'
            : isLive
              ? 'border-[#BBF7D0]/90 bg-[#F0FDF4]/35 shadow-[0_6px_28px_-18px_rgba(22,101,52,0.06)]'
              : isSoon
                ? 'border-[#E5E7EB] bg-white shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)]'
                : 'border-[#E5E7EB] bg-white shadow-[0_6px_28px_-18px_rgba(15,23,42,0.08)]'
      )}
    >
      <div className={clsx('flex items-start justify-between gap-3', quiet ? 'mb-3' : 'mb-4')}>
        <div className={clsx('space-y-1', quiet && 'space-y-0.5')}>
          {eyebrow ? (
            <p
              className={clsx(
                'text-xs font-medium tracking-wide',
                quiet
                  ? 'text-[#64748B]'
                  : isCoach
                    ? 'text-[#7C3AED]'
                    : isLive
                      ? 'text-[#166534]'
                      : 'text-[#64748B]'
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={clsx(
              'font-semibold tracking-tight text-[#0F172A]',
              quiet ? 'text-body-sm' : 'text-[1.05rem]'
            )}
          >
            {title}
          </h2>
          <p
            className={clsx(
              'max-w-[38rem] leading-snug',
              quiet ? 'text-[13px] text-[#475569]' : 'text-body-sm text-[#475569]'
            )}
          >
            {description}
          </p>
        </div>

        {countLabel ? (
          <span
            className={clsx(
              'shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium',
              quiet
                ? 'border-[#E5E7EB] bg-white text-[#475569]'
                : isCoach
                  ? 'border-violet-200/70 bg-[#F3E8FF] text-[#6D28D9]'
                  : isLive
                    ? 'border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]'
                    : 'border-[#E5E7EB] bg-slate-50 text-[#475569]'
            )}
          >
            {countLabel}
          </span>
        ) : null}
      </div>
      <div className={clsx(quiet ? 'space-y-2' : 'space-y-3')}>{children}</div>
    </section>
  )
}
