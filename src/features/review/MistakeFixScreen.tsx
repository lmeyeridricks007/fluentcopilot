'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ReviewSessionView } from '@/features/review/ReviewSessionView'
import { ReviewCompletionScreen } from '@/features/review/ReviewCompletionScreen'
import { useReviewSession } from '@/features/review/useReviewSession'
import type { TalkTrainingLoopCard } from '@/lib/api/apiTypes'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import { appTalkTrainingLoopHref } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'

function BackendMistakeLoops({
  loops,
  loading,
  error,
}: {
  loops: TalkTrainingLoopCard[]
  loading: boolean
  error: string | null
}) {
  if (loading) {
    return (
      <p className="text-caption text-ink-tertiary text-center py-8">
        Checking your recent Speak Live fixes…
      </p>
    )
  }
  if (loops.length === 0) return null
  return (
    <section className="px-4 py-4 pb-28 max-w-lg mx-auto space-y-4">
      <div className="space-y-1">
        <p className="text-caption font-semibold text-primary-800 uppercase tracking-wide">From your recent sessions</p>
        <h2 className="text-body-lg font-semibold text-ink-primary">Fix your real slips</h2>
        <p className="text-body-sm text-ink-secondary leading-snug">
          These reps come from Speak Live feedback and stay in Azure, so they are not limited to local lesson cards.
        </p>
      </div>
      {error ? <p className="text-caption text-amber-700">{error}</p> : null}
      <ul className="space-y-2.5">
        {loops.map((loop) => (
          <li key={loop.id}>
            <Link
              href={appTalkTrainingLoopHref(loop.id)}
              onClick={() => playAppSound('tap')}
              className="flex min-h-touch items-center justify-between gap-3 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50/90 to-white px-4 py-3.5 shadow-sm"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-800">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold text-[#0F172A]">{loop.title}</span>
                  <span className="mt-0.5 block line-clamp-2 text-[12px] leading-snug text-[#64748B]">{loop.reason}</span>
                </span>
              </span>
              <span className="shrink-0 text-[13px] font-bold text-violet-800">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function MistakeFixScreen({ onBack }: { onBack?: () => void }) {
  const s = useReviewSession({ mode: 'mistake_fix', targetSize: 10 })
  const [backendLoops, setBackendLoops] = useState<TalkTrainingLoopCard[]>([])
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFeature1ChatBackendEnabled()) return
    let cancelled = false
    setBackendLoading(true)
    setBackendError(null)
    void conversationClient
      .getTalkSkillProfile()
      .then((res) => {
        if (cancelled) return
        setBackendLoops((res.activeTrainingLoops ?? []).slice(0, 8))
      })
      .catch(() => {
        if (cancelled) return
        setBackendError('Could not load recent Speak Live fixes.')
      })
      .finally(() => {
        if (!cancelled) setBackendLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!s.loading && s.done && s.total > 0) {
    return (
      <ReviewCompletionScreen
        correct={s.correctCount}
        wrong={s.wrongCount}
        sessionMeta={s.sessionMeta}
        onAgain={() => void s.reload()}
        onBack={onBack}
        completionContext="mistake_fix"
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card variant="flat" padding="md" className="border border-slate-200/90 max-w-lg mx-auto w-full">
        <p className="text-caption font-semibold text-primary-800">Fix mistakes · 2–3 minutes</p>
        <ol className="mt-2 space-y-2 text-body-sm text-ink-secondary list-decimal pl-4">
          <li>See what you wrote or heard wrong</li>
          <li>Repair it in a short interaction</li>
          <li>Get a clear model and why it matters</li>
          <li>Retry once, then we log the win</li>
        </ol>
      </Card>
      {!s.loading && s.total === 0 && (backendLoading || backendLoops.length > 0) ? (
        <BackendMistakeLoops loops={backendLoops} loading={backendLoading} error={backendError} />
      ) : (
        <ReviewSessionView
          title="Fix mistakes"
          subtitle="Fast repair from your real slips — not generic drills."
          onBack={onBack}
          loading={s.loading}
          seeding={s.seeding}
          index={s.index}
          current={s.current}
          feedback={s.feedback}
          total={s.total}
          loadDemo={() => void s.loadDemo()}
          telemetry={s.telemetry}
          submitCard={s.submitCard}
        />
      )}
    </div>
  )
}
