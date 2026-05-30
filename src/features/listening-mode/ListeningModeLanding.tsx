'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ChevronLeft, History, LayoutGrid } from 'lucide-react'
import { APP_TALK_ACTIVITY, APP_TALK_HUB } from '@/lib/routing/appRoutes'
import { readListeningProfile } from '@/lib/listening-mode/listeningProfileStorage'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import type { ListeningLevel } from '@/lib/listening-mode/schema'
import { buildListeningProgressSummary } from '@/lib/listening-mode/listeningProgressSummary'
import { listeningLandingTracks } from '@/lib/listening-mode/listeningLandingContent'
import {
  buildListeningFocusRecommendationCards,
  buildListeningRecommendationContext,
} from '@/lib/listening-mode/listeningPersonalizedRecommendations'
import { ListeningLandingHero } from '@/features/listening-mode/components/ListeningLandingHero'
import { ListeningFocusRecommendCard } from '@/features/listening-mode/components/ListeningFocusRecommendationCard'
import { ListeningTrackCard } from '@/features/listening-mode/components/ListeningTrackCard'
import { ListeningSkillFocusSection } from '@/features/listening-mode/components/ListeningSkillFocusSection'
import { ListeningProgressStrip } from '@/features/listening-mode/components/ListeningProgressStrip'
import { isDevToolsEnabledClient } from '@/lib/dev-tools/devToolsAccess'

export function ListeningModeLanding() {
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)
  const [level, setLevel] = useState<ListeningLevel>('A2')
  const profile = useMemo(() => readListeningProfile(userId), [userId])
  const recContext = useMemo(() => buildListeningRecommendationContext(profile, level), [profile, level])
  const focusCards = useMemo(() => buildListeningFocusRecommendationCards(recContext, 3), [recContext])
  const progress = useMemo(() => buildListeningProgressSummary(profile), [profile])
  const tracks = useMemo(() => listeningLandingTracks(), [])
  const lastSessionId = profile.sessionIds[0] ?? null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/20">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-5 sm:max-w-2xl">
        <Link
          href={APP_TALK_HUB}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-primary-700"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Talk
        </Link>

        <div className="mt-5 space-y-8">
          <ListeningLandingHero level={level} onLevelChange={setLevel} />

          <section aria-label="Personalized listening recommendations">
            <h2 className="text-caption font-bold uppercase tracking-[0.14em] text-ink-secondary">For you</h2>
            <p className="mt-1 max-w-xl text-body-sm text-ink-secondary">
              Ranked from your last listens, weak spots, and practice signals — short drills, real Dutch.
            </p>
            <ul className="mt-4 space-y-4">
              {focusCards.map((card, i) => (
                <li key={card.id}>
                  <ListeningFocusRecommendCard
                    card={card}
                    level={level}
                    lastSessionId={lastSessionId}
                    variant={i === 0 ? 'hero' : 'compact'}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Recommended listening tracks">
            <h2 className="text-caption font-bold uppercase tracking-[0.14em] text-ink-secondary">Recommended tracks</h2>
            <p className="mt-1 max-w-xl text-body-sm text-ink-secondary">
              Scenario-first audio — the kind of Dutch you overhear on platforms, at counters, and on the phone.
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {tracks.map((t) => (
                <li key={t.trackId}>
                  <ListeningTrackCard track={t} level={level} />
                </li>
              ))}
            </ul>
          </section>

          <ListeningSkillFocusSection level={level} />

          <ListeningProgressStrip summary={progress} />

          <div className="mt-8 border-t border-slate-200/70 pt-6">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Continue elsewhere</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link
                href={`${APP_TALK_ACTIVITY}?tab=listening`}
                className="inline-flex min-h-touch items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-[14px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-900/[0.02] transition hover:border-teal-200/90 hover:bg-teal-50/40"
              >
                <History className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                Session archive
              </Link>
              <Link
                href={APP_TALK_ACTIVITY}
                className="inline-flex min-h-touch items-center justify-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-[14px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-900/[0.02] transition hover:bg-slate-50/90"
              >
                <LayoutGrid className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
                All activity
              </Link>
            </div>
            <p className="mt-3 text-center text-caption text-ink-tertiary">
              Reopen coach reports and see listening history alongside Speak and chat.
            </p>
          </div>

          <p className="mt-8 text-center text-caption text-ink-tertiary">
            High-quality browser Dutch — same voice engine as previews across FluentCopilot.
          </p>

          {isDevToolsEnabledClient() ? (
            <details className="mt-6 rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 text-left shadow-sm ring-1 ring-amber-900/5">
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-[0.14em] text-amber-950">
                Dev · listening profile snapshot
              </summary>
              <p className="mt-2 text-[11px] leading-relaxed text-amber-950/90">
                Local-only stress model (not sent to production users). Use to verify personalization and clip pick-up.
              </p>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-white/80 p-2 text-[10px] leading-snug text-amber-950 ring-1 ring-amber-100">
                {JSON.stringify(
                  {
                    selectedLevel: level,
                    dimensionStress: profile.dimensionStress,
                    recentSessionIds: profile.sessionIds.slice(0, 8),
                    focusCardIds: focusCards.map((c) => c.id),
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  )
}
