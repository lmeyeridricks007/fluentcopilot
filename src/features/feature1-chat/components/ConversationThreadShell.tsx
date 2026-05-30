'use client'

import { TypingIndicator } from './TypingIndicator'

/**
 * Full thread chrome while the conversation payload is loading — avoids blank screens on cold navigation.
 */
export function ConversationThreadShell({
  statusLine = 'Opening your conversation…',
}: {
  statusLine?: string
}) {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-7rem)] max-w-lg mx-auto w-full px-4 pb-4">
      <div className="sticky top-0 z-30 -mx-4 px-2 py-2 border-b border-slate-200/70 bg-surface/95 backdrop-blur-md">
        <div className="flex items-center gap-2 min-h-touch">
          <div className="h-11 w-11 rounded-xl bg-slate-200/70 motion-safe:animate-pulse shrink-0" aria-hidden />
          <div className="flex-1 min-w-0 space-y-2 py-0.5">
            <div className="h-3.5 w-[55%] max-w-[14rem] rounded-md bg-slate-200/80 motion-safe:animate-pulse" />
            <div className="h-2.5 w-[40%] max-w-[10rem] rounded-md bg-slate-100 motion-safe:animate-pulse" />
          </div>
          <div className="h-9 w-16 rounded-xl bg-primary-100/80 motion-safe:animate-pulse shrink-0" aria-hidden />
        </div>
      </div>

      <p className="text-caption text-ink-secondary text-center pt-3 px-2 leading-snug">{statusLine}</p>

      <div className="flex-1 space-y-4 pt-4 pb-44">
        <div className="flex gap-2 motion-safe:animate-fc-message-in">
          <div className="w-8 h-8 rounded-full shrink-0 bg-slate-200/80 motion-safe:animate-pulse" />
          <div className="max-w-[min(100%,20rem)] rounded-2xl rounded-bl-md border border-slate-200/80 bg-white px-3.5 py-3 space-y-2 shadow-sm">
            <div className="h-2.5 w-[92%] rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-2.5 w-[72%] rounded bg-slate-100 motion-safe:animate-pulse" />
            <div className="h-2.5 w-[48%] rounded bg-slate-100 motion-safe:animate-pulse" />
          </div>
        </div>
        <TypingIndicator label="Assistant is getting ready" />
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-40 max-w-lg mx-auto w-full pointer-events-none"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
      >
        <div className="pointer-events-none mx-3 mb-[calc(3.5rem+env(safe-area-inset-bottom))] rounded-2xl border border-slate-200/90 bg-surface-elevated/90 backdrop-blur-md h-[5.25rem] shadow-[0_-10px_40px_-12px_rgba(15,23,42,0.12)] flex items-center justify-center">
          <div className="h-10 w-[88%] rounded-xl bg-slate-100/90 motion-safe:animate-pulse" aria-hidden />
        </div>
      </div>
    </div>
  )
}

export function RecapContentShell() {
  return (
    <div className="px-4 py-8 pb-28 max-w-lg mx-auto w-full space-y-4 motion-safe:animate-fc-message-in">
      <div className="h-3 w-20 rounded bg-slate-200/80 motion-safe:animate-pulse" />
      <div className="h-8 w-[70%] rounded-lg bg-slate-200/70 motion-safe:animate-pulse" />
      <div className="h-16 w-full rounded-2xl bg-slate-100/90 motion-safe:animate-pulse" />
      <div className="h-24 w-full rounded-2xl bg-slate-100/90 motion-safe:animate-pulse" />
      <p className="text-caption text-ink-secondary text-center pt-4">Preparing your recap…</p>
    </div>
  )
}
