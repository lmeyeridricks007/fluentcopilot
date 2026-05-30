'use client'

import type { ReactNode } from 'react'

type ExamShellProps = {
  children: ReactNode
  /** Sticky bottom bar (e.g. primary CTA on setup). */
  footer?: ReactNode
  /** Extra bottom padding when no footer (reports use default). */
  contentClassName?: string
}

/**
 * Premium exam area frame: readable width, breathing room, optional sticky CTA.
 *
 * When `footer` is set, the bar sits **above** the app `BottomNav` (main uses `pb-28` for the same
 * inset). A plain `bottom-0 z-30` bar would render behind the nav (`z-50`) and be untappable.
 */
export function ExamShell({ children, footer, contentClassName }: ExamShellProps) {
  return (
    <div
      className={
        footer
          ? 'min-h-[100dvh] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'
          : 'min-h-[100dvh] pb-[calc(2rem+env(safe-area-inset-bottom,0px))]'
      }
    >
      <div className={`max-w-lg mx-auto w-full px-4 sm:px-5 pt-6 sm:pt-8 ${contentClassName ?? ''}`}>{children}</div>
      {footer ? (
        <div className="fixed bottom-28 inset-x-0 z-40 border-t border-slate-200/70 bg-white/95 backdrop-blur-md shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
          <div className="max-w-lg mx-auto w-full px-4 sm:px-5">{footer}</div>
        </div>
      ) : null}
    </div>
  )
}
