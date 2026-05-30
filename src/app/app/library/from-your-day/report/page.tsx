'use client'

import { useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { LOCAL_ANONYMOUS_LEARNER_ID } from '@/lib/storage/storageKeys'
import { APP_LIBRARY_FROM_YOUR_DAY, APP_LIBRARY_HUB, fromYourDayPackSessionHref } from '@/lib/routing/appRoutes'
import { getPersonalizedPracticeHistoryEntry } from '@/lib/quick-capture/personalizedPracticeHistory'
import { playAppSound } from '@/lib/interaction/appSounds'

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-900/[0.02]">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h2>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="text-[13px] text-slate-500">Nothing recorded for this section.</p>
  }
  return (
    <ul className="list-disc space-y-1.5 pl-4 text-[14px] leading-relaxed text-slate-800">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  )
}

export default function PersonalizedPracticeReportPage() {
  const sp = useSearchParams()
  const packId = sp.get('packId')?.trim() ?? ''
  const userId = useAuthStore((s) => s.user?.id ?? LOCAL_ANONYMOUS_LEARNER_ID)

  const entry = useMemo(() => {
    if (!packId) return null
    return getPersonalizedPracticeHistoryEntry(userId, packId)
  }, [packId, userId])

  const r = entry?.report
  const completionPct =
    r && typeof r.completionPct === 'number'
      ? r.completionPct
      : r
        ? Math.min(100, Math.round((r.stats.stepsCompleted / Math.max(1, r.stats.stepsTotal)) * 100))
        : null
  const reopenYmd = entry?.localDateYmd ?? r?.localDateYmd ?? ''
  const reopen = packId && reopenYmd ? fromYourDayPackSessionHref(packId, reopenYmd) : ''

  return (
    <div className="mx-auto min-h-[100dvh] max-w-lg bg-[#fafaf7] px-4 pb-16 pt-6 text-[#0F172A]">
      <Link
        href={APP_LIBRARY_HUB}
        onClick={() => playAppSound('tap')}
        className="inline-flex min-h-touch items-center gap-1 text-[13px] font-semibold text-[#7c3aed] underline-offset-2 hover:underline"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Library
      </Link>

      <header className="mt-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Personalized practice</p>
        <h1 className="text-[1.4rem] font-bold tracking-tight">{r?.title ?? 'Session report'}</h1>
        {entry ? (
          <p className="text-[13px] text-slate-600">
            {new Date(entry.endedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            {entry.completed ? ' · Completed' : ' · Partial'}
            {entry.xpAwarded > 0 ? ` · +${entry.xpAwarded} XP` : null}
            {completionPct != null ? ` · ${completionPct}% beats` : null}
            {r?.flowKind ? ` · ${r.flowKind === 'interactive' ? 'Interactive pack' : 'Checklist pack'}` : null}
          </p>
        ) : (
          <p className="text-[13px] text-slate-600">This report opens from History after you finish a pack.</p>
        )}
      </header>

      {!packId ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-[14px] text-slate-600">
          Missing pack. Open{' '}
          <Link href={APP_LIBRARY_FROM_YOUR_DAY} className="font-semibold text-[#7c3aed] underline-offset-2 hover:underline">
            From your day
          </Link>{' '}
          and complete a practice pack.
        </p>
      ) : !entry || !r ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-[14px] text-slate-600">
          No saved report for this pack on this device. If you finished it elsewhere, open the report there — or check{' '}
          <Link href="/app/history" className="font-semibold text-[#7c3aed] underline-offset-2 hover:underline">
            History
          </Link>
          .
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {r.nextRecommendation ? (
            <p className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-[14px] leading-snug text-slate-800">
              <span className="font-semibold text-emerald-950">Next recommendation: </span>
              {r.nextRecommendation}
            </p>
          ) : null}

          {r.themeSummary ? (
            <p className="rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-[14px] leading-snug text-slate-800">
              <span className="font-semibold text-slate-900">Themes: </span>
              {r.themeSummary}
            </p>
          ) : null}

          <Section title="What you practiced">
            <BulletList items={r.fromToday.bullets} />
          </Section>
          <Section title="What you completed">
            <BulletList items={r.completedWork?.bullets?.length ? r.completedWork.bullets : [`${r.stats.stepsCompleted}/${r.stats.stepsTotal} steps for credit.`]} />
          </Section>
          <Section title="What was repaired">
            <BulletList items={r.repaired.bullets} />
          </Section>
          <Section title="What was learned">
            <BulletList items={r.learned.bullets} />
          </Section>
          <Section title="Strongest next step">
            <BulletList items={r.nextPractice.bullets} />
          </Section>
          <Section title="Saved items (Library status)">
            <BulletList items={r.libraryCaptures?.bullets?.length ? r.libraryCaptures.bullets : ['No capture lines were stored for this summary.']} />
          </Section>
          <Section title="Long-term saves">
            <BulletList items={r.savedLongTerm.bullets} />
          </Section>

          <p className="text-center text-[12px] text-slate-500">
            Pack mode: <span className="font-semibold text-slate-700">{r.practicePackMode.replace(/_/g, ' ')}</span> · Steps{' '}
            {r.stats.stepsCompleted}/{r.stats.stepsTotal} · Captures {r.stats.captureCount}
          </p>

          <div className="flex flex-col gap-2">
            {reopen ? (
              <Link
                href={reopen}
                onClick={() => playAppSound('tap')}
                className="flex min-h-touch w-full items-center justify-center rounded-2xl bg-[#7c3aed] px-4 py-3.5 text-[15px] font-bold text-white shadow-md"
              >
                Reopen this pack
              </Link>
            ) : null}
            <Link
              href={`${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(r.localDateYmd)}`}
              onClick={() => playAppSound('tap')}
              className="flex min-h-touch w-full items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-900 shadow-sm"
            >
              Back to From your day
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
