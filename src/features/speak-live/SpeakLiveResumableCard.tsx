'use client'

import Link from 'next/link'
import { Mic, X } from 'lucide-react'
import { speakLiveRunHref } from '@/lib/routing/appRoutes'
import { clearResumableLiveSession, type ResumableLiveSession } from '@/lib/speak-live/resumableLiveSessionStorage'

export function SpeakLiveResumableCard({
  session,
  onDismiss,
}: {
  session: ResumableLiveSession
  onDismiss: () => void
}) {
  const href = speakLiveRunHref({
    scenarioId: session.scenarioId,
    level: session.level,
    threadId: session.threadId,
  })

  return (
    <div className="mb-4 rounded-2xl border border-violet-200/90 bg-violet-50/95 px-3 py-3 flex gap-3 items-start shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
        <Mic className="w-5 h-5 text-violet-800" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-bold text-violet-950">Speak Live — paused</p>
        <p className="text-caption text-violet-900/90 mt-1 leading-snug">
          Continue <span className="font-semibold">{session.scenarioTitle}</span> where you left off (same session,
          same thread).
        </p>
        <div className="flex flex-wrap gap-2 mt-2 items-center">
          <Link
            href={href}
            className="min-h-touch inline-flex items-center justify-center rounded-xl bg-violet-600 text-white text-caption font-bold px-4 py-2.5 hover:bg-violet-700"
          >
            Resume Speak Live
          </Link>
          <button
            type="button"
            onClick={() => {
              clearResumableLiveSession()
              onDismiss()
            }}
            className="min-h-touch inline-flex items-center gap-1.5 text-caption font-semibold text-violet-800/80 hover:text-violet-950 px-2"
          >
            <X className="w-4 h-4" aria-hidden />
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
