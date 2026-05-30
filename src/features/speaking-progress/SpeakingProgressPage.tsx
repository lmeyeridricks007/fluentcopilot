'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, LineChart } from 'lucide-react'
import { clsx } from 'clsx'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { fetchSpeakingProgression } from '@/lib/speaking/speakingProgressClient'
import type { ProgressTrend, ProgressTrust } from '@/lib/speaking/speakingProgressTypes'

function trustLabel(t: ProgressTrust): string {
  if (t === 'needs_more_data') return 'Needs more data — a few more voice clips will make this view meaningful.'
  if (t === 'limited') return 'Limited confidence — trends are directional, not precise.'
  return 'Moderate confidence — enough clips for a coarse read; still not lab-grade.'
}

function trendPill(t: ProgressTrend): string {
  if (t === 'improving') return 'Improving'
  if (t === 'needs_more_data') return 'Needs more data'
  if (t === 'unclear') return 'Mixed / unclear'
  return 'Steady'
}

function trendClass(t: ProgressTrend): string {
  if (t === 'improving') return 'bg-emerald-100 text-emerald-950'
  if (t === 'needs_more_data') return 'bg-slate-100 text-slate-700'
  if (t === 'unclear') return 'bg-amber-50 text-amber-950'
  return 'bg-violet-100 text-sky-950'
}

export function SpeakingProgressPage() {
  const enabled = isFeature1ChatBackendEnabled()
  const q = useQuery({
    queryKey: ['speaking', 'progression'],
    queryFn: ({ signal }) => fetchSpeakingProgression({ signal }),
    enabled,
  })

  if (!enabled) {
    return (
      <div className="max-w-lg mx-auto w-full px-4 py-8">
        <Link href="/app/talk" className="text-caption font-semibold text-primary-700 inline-flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Back to Talk
        </Link>
        <p className="mt-6 text-body-sm text-ink-secondary leading-relaxed">
          Speaking progression needs the practice backend. Enable Feature 1 chat API and set{' '}
          <code className="text-caption bg-slate-100 px-1 rounded">NEXT_PUBLIC_API_BASE_URL</code>.
        </p>
      </div>
    )
  }

  const summary = q.data?.summary
  const storeEnabled = q.data?.enabled

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-6 pb-16">
      <Link
        href="/app/talk"
        className="text-caption font-semibold text-primary-700 inline-flex items-center gap-1 min-h-touch"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Back to Talk
      </Link>

      <header className="mt-5 flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <LineChart className="w-5 h-5 text-primary-700" aria-hidden />
        </div>
        <div>
          <h1 className="text-title font-bold text-ink-primary tracking-tight">How your Dutch is sounding over time</h1>
          <p className="text-body-sm text-ink-secondary mt-1 leading-relaxed">
            Coarse trends from your recorded clips — not a fine-grained scorecard.
          </p>
        </div>
      </header>

      {q.isLoading ? (
        <p className="mt-8 text-caption text-ink-tertiary">Loading progression…</p>
      ) : q.isError ? (
        <p className="mt-8 text-body-sm text-red-800">{q.error instanceof Error ? q.error.message : 'Could not load.'}</p>
      ) : !storeEnabled ? (
        <div className="mt-8 rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-body-sm text-amber-950">
          Progression storage is off on the server. Ask your admin to set{' '}
          <code className="text-caption bg-white/80 px-1 rounded">SPEAKING_PROGRESS_ENABLED=1</code> or{' '}
          <code className="text-caption bg-white/80 px-1 rounded">SPEAKING_PROGRESS_STORE_PATH</code>.
        </div>
      ) : summary ? (
        <div className="mt-8 space-y-8">
          <section className="rounded-2xl border border-slate-200/90 bg-surface-elevated/90 px-4 py-3">
            <p className="text-caption font-semibold text-ink-tertiary uppercase tracking-wide">Data confidence</p>
            <p className="text-body-sm text-ink-primary mt-2 leading-relaxed">{trustLabel(summary.trust)}</p>
            <p className="text-caption text-ink-tertiary mt-2">
              Sample: <span className="font-bold text-ink-secondary">{summary.sampleSize}</span> clips in history
            </p>
          </section>

          <section>
            <h2 className="text-body-sm font-bold text-ink-primary">Trends (broad buckets)</h2>
            <ul className="mt-3 space-y-3">
              {(
                [
                  ['Pronunciation', summary.pronunciation],
                  ['Rhythm', summary.rhythm],
                  ['Naturalness', summary.naturalness],
                ] as const
              ).map(([label, block]) => (
                <li key={label} className="rounded-xl border border-slate-200/80 bg-white/90 px-3 py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-ink-primary">{label}</span>
                    <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', trendClass(block.trend))}>
                      {trendPill(block.trend)}
                    </span>
                  </div>
                  <p className="text-caption text-ink-secondary mt-2 leading-relaxed">{block.note}</p>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-body-sm font-bold text-ink-primary">“Dutch sounding” notes</h2>
            <p className="text-caption text-ink-tertiary mt-1">Coach language only — not a numeric native-ness meter.</p>
            <div className="mt-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-3">
              <span className={clsx('text-[10px] font-bold uppercase px-2 py-0.5 rounded-full', trendClass(summary.dutchSounding.trend))}>
                {trendPill(summary.dutchSounding.trend)}
              </span>
              <p className="text-caption text-ink-secondary mt-2 leading-relaxed">{summary.dutchSounding.note}</p>
              {summary.dutchSounding.recentExamples.length > 0 ? (
                <ul className="mt-2 text-caption text-ink-primary space-y-1 list-disc pl-4">
                  {summary.dutchSounding.recentExamples.map((ex, i) => (
                    <li key={`${i}-${ex.slice(0, 24)}`}>{ex}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="text-body-sm font-bold text-ink-primary">Improving areas</h2>
            {summary.improvingAreas.length === 0 ? (
              <p className="text-caption text-ink-tertiary mt-2">Nothing stands out as “improving” yet — keep logging clips.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-body-sm text-ink-primary list-disc pl-4">
                {summary.improvingAreas.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-body-sm font-bold text-ink-primary">Repeated weak spots</h2>
            {summary.repeatedWeakAreas.length === 0 && summary.commonWeakWords.length === 0 ? (
              <p className="text-caption text-ink-tertiary mt-2">No repeated tokens yet — great, or not enough data.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-body-sm text-ink-primary">
                {summary.repeatedWeakAreas.map((x) => (
                  <li key={x} className="border-l-2 border-amber-300/80 pl-3">
                    {x}
                  </li>
                ))}
              </ul>
            )}
            {summary.commonWeakWords.length > 0 ? (
              <p className="text-caption text-ink-tertiary mt-3">
                Top tokens: {summary.commonWeakWords.map((w) => `${w.word} (${w.count})`).join(' · ')}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-primary-200/80 bg-primary-50/40 px-4 py-4">
            <h2 className="text-body-sm font-bold text-primary-950">Recommended next</h2>
            <p className="text-body-sm text-ink-primary mt-2 leading-relaxed">{summary.recommendedNextTrack}</p>
          </section>
        </div>
      ) : null}
    </div>
  )
}
