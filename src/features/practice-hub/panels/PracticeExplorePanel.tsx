'use client'

import Link from 'next/link'
import { BookOpen, Mic, Headphones, MessageSquare } from 'lucide-react'
import { PremiumBadge } from '@/features/entitlements/PremiumBadge'
import type { PracticeHubViewModel } from '../types'
import { practiceHubNormalizeHref } from '../practiceHubHrefUtils'
import { SectionHeader } from '../components/SectionHeader'
import { ScenarioCategoryCard } from '../components/ScenarioCategoryCard'
import { SkillTrackCard } from '../components/SkillTrackCard'
import { RecommendationCard } from '../components/RecommendationCard'
import { APP_LISTENING_MODE, APP_READ_ALOUD } from '@/lib/routing/appRoutes'

type Props = {
  vm: PracticeHubViewModel
  voicePremium: boolean
  tracksPremium: boolean
}

/** Browse, modalities, tracks — intentional discovery, not the default. */
export function PracticeExplorePanel({ vm, voicePremium, tracksPremium }: Props) {
  const deduped = vm.recommendations.filter(
    (r, i, arr) =>
      arr.findIndex((x) => practiceHubNormalizeHref(x.href) === practiceHubNormalizeHref(r.href)) === i
  )

  return (
    <div className="space-y-8 motion-safe:animate-learn-segment-crossfade">
      <section aria-label="Practice modalities">
        <SectionHeader title="How to practice" subtitle="Message, speak, listen, read aloud — same coach" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/app/practice/scenarios"
            className="min-h-touch rounded-xl border border-slate-200 bg-surface-elevated p-3 flex flex-col items-center justify-center gap-1 text-center hover:bg-surface-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <MessageSquare className="w-5 h-5 text-primary-600" aria-hidden />
            <span className="text-caption font-medium text-ink-primary leading-tight">Scenarios</span>
          </Link>
          <Link
            href="/app/practice/voice"
            className="min-h-touch rounded-xl border border-slate-200 bg-surface-elevated p-3 flex flex-col items-center justify-center gap-1 text-center hover:bg-surface-muted transition-colors relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            {voicePremium ? (
              <span className="absolute top-1.5 right-1.5">
                <PremiumBadge label="Premium" />
              </span>
            ) : null}
            <Mic className="w-5 h-5 text-primary-600" aria-hidden />
            <span className="text-caption font-medium text-ink-primary leading-tight">Voice</span>
          </Link>
          <Link
            href={APP_LISTENING_MODE}
            className="min-h-touch rounded-xl border border-teal-200/70 bg-gradient-to-b from-teal-50/40 to-surface-elevated p-3 flex flex-col items-center justify-center gap-0.5 text-center hover:border-teal-300/80 hover:from-teal-50/60 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <Headphones className="w-5 h-5 text-teal-800" aria-hidden />
            <span className="text-caption font-semibold text-ink-primary leading-tight">Listening</span>
            <span className="text-[10px] font-medium leading-tight text-teal-900/70">Real Dutch audio</span>
          </Link>
          <Link
            href={APP_READ_ALOUD}
            className="min-h-touch rounded-xl border border-primary-200/90 bg-primary-50/50 p-3 flex flex-col items-center justify-center gap-1 text-center hover:bg-primary-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500"
          >
            <BookOpen className="w-5 h-5 text-primary-700" aria-hidden />
            <span className="text-caption font-medium text-ink-primary leading-tight">Read aloud</span>
          </Link>
        </div>
      </section>

      <section aria-label="Browse by situation">
        <SectionHeader
          title="Browse by situation"
          subtitle="Real-life scenes in the Netherlands"
          action={
            <Link
              href="/app/practice/scenarios"
              className="text-caption font-semibold text-primary-700 hover:underline whitespace-nowrap"
            >
              Explore library
            </Link>
          }
        />
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
          {vm.categories.map((c) => (
            <ScenarioCategoryCard key={c.id} cat={c} />
          ))}
        </div>
      </section>

      <section aria-label="Skill tracks">
        <SectionHeader
          title="Skill tracks"
          subtitle="Support rails — they never replace your Talk thread"
          action={
            <span className="inline-flex items-center gap-2">
              {tracksPremium ? <PremiumBadge label="Premium" /> : null}
              <Link
                href="/app/practice/tracks"
                className="text-caption font-semibold text-primary-700 hover:underline whitespace-nowrap"
              >
                See all tracks
              </Link>
            </span>
          }
        />
        <div className="space-y-2">
          {vm.skillTracks.map((t) => (
            <SkillTrackCard key={t.id} track={t} />
          ))}
        </div>
      </section>

      {deduped.length > 0 ? (
        <section aria-label="Recommended scenarios">
          <SectionHeader
            title="Recommended for you"
            subtitle="Optional picks from your patterns"
          />
          <div className="space-y-2">
            {deduped.map((r) => (
              <RecommendationCard key={r.id} rec={r} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
