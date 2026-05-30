'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Headphones } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  getScenarioListeningTrack,
  pickVariation,
  trackCategoryLine,
  trackEstimatedMinutes,
  type ListeningLevelBand,
} from '@/lib/listening-mode/scenarioListeningTracks'
import { APP_LISTENING_MODE } from '@/lib/routing/appRoutes'
import { listeningModeSessionHref } from '@/lib/routing/appRoutes'
import { getScenarioCatalogEntry } from '@/lib/practice/scenarioCatalog'
import { isDevToolsEnabledClient } from '@/lib/dev-tools/devToolsAccess'

export function ListeningTrackSetupScreen() {
  const sp = useSearchParams()
  const trackId = sp.get('track')?.trim() ?? ''
  const fromScenarioId = sp.get('from')?.trim() ?? ''
  const levelPreset = sp.get('level')?.trim().toUpperCase() ?? ''

  const track = useMemo(() => (trackId ? getScenarioListeningTrack(trackId) : undefined), [trackId])
  const [level, setLevel] = useState<ListeningLevelBand>('A2')
  const [variationId, setVariationId] = useState<string | null>(null)

  useEffect(() => {
    if (levelPreset === 'A1' || levelPreset === 'A2' || levelPreset === 'B1') setLevel(levelPreset)
  }, [levelPreset])

  const variation = useMemo(() => (track ? pickVariation(track, variationId) : null), [track, variationId])
  const scenarioEntry = useMemo(
    () => (fromScenarioId ? getScenarioCatalogEntry(fromScenarioId) : undefined),
    [fromScenarioId],
  )

  if (!track || !variation) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <p className="text-body-sm text-ink-secondary">This listening track was not found.</p>
        <Link
          href={APP_LISTENING_MODE}
          className="mt-4 inline-flex min-h-touch items-center gap-2 text-body-sm font-semibold text-primary-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Listening
        </Link>
      </div>
    )
  }

  const mins = trackEstimatedMinutes(track, variation.id)
  const sessionHref = listeningModeSessionHref({
    packId: variation.packId,
    level,
    fromTrack: track.id,
    variation: variation.id,
    fromScenario: fromScenarioId || null,
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/20">
      <div className="mx-auto max-w-lg px-4 pb-28 pt-5">
        <Link
          href={APP_LISTENING_MODE}
          className="inline-flex min-h-touch items-center gap-1 text-caption font-semibold text-ink-secondary hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Listening
        </Link>

        <header className="mt-6 flex gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-2xl ring-1 ring-teal-200/70"
            aria-hidden
          >
            {track.visualEmoji}
          </span>
          <div className="min-w-0">
            <p className="text-caption font-bold uppercase tracking-[0.14em] text-teal-900/75">Scenario track</p>
            <h1 className="mt-1 text-title font-bold tracking-tight text-ink-primary">{track.title}</h1>
            <p className="mt-1 text-body-sm text-ink-secondary">{trackCategoryLine(track)}</p>
          </div>
        </header>

        {scenarioEntry ? (
          <p className="mt-4 rounded-xl border border-primary-100/90 bg-primary-50/35 px-4 py-3 text-body-sm text-ink-primary">
            <span className="font-semibold text-primary-900">Warm-up for </span>
            {scenarioEntry.title}
          </p>
        ) : null}

        <Card variant="elevated" padding="lg" className="mt-6 border border-slate-200/80">
          <div className="flex items-center gap-2 text-caption font-semibold text-ink-secondary">
            <Headphones className="h-4 w-4 text-primary-600" aria-hidden />
            Level
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {track.levelsSupported.map((lv) => (
              <button
                key={lv}
                type="button"
                onClick={() => setLevel(lv)}
                className={`rounded-full px-3.5 py-1.5 text-caption font-semibold transition ${
                  level === lv
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'border border-slate-200/90 bg-surface-muted text-ink-primary hover:bg-slate-100/90'
                }`}
              >
                {lv}
              </button>
            ))}
          </div>

          {track.variations.length > 1 ? (
            <>
              <p className="mt-6 text-caption font-semibold text-ink-secondary">Focus</p>
              <div className="mt-2 flex flex-col gap-2">
                {track.variations.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariationId(v.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-body-sm font-medium transition ${
                      variation.id === v.id
                        ? 'border-primary-300 bg-primary-50/50 text-ink-primary'
                        : 'border-slate-200/90 bg-surface-elevated text-ink-secondary hover:border-slate-300'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-6 border-t border-slate-200/80 pt-5">
            <p className="text-caption font-semibold text-ink-secondary">What to expect</p>
            <p className="mt-2 text-body-sm leading-relaxed text-ink-primary">{variation.expectationEn}</p>
            <p className="mt-3 text-caption text-ink-tertiary">
              About {mins} min · tags: {track.skillFocusTags.join(', ')}
            </p>
          </div>

          <div className="mt-6">
            <Link
              href={sessionHref}
              className="inline-flex min-h-touch w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-body font-semibold text-white shadow-md shadow-primary-900/12 transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 sm:w-auto sm:min-w-[12rem]"
            >
              Start first drill set
            </Link>
          </div>

          {isDevToolsEnabledClient() ? (
            <details className="mt-4 rounded-xl border border-amber-200/70 bg-amber-50/40 px-3 py-2 text-left">
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide text-amber-950">
                Dev · track resolution
              </summary>
              <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-all text-[10px] text-amber-950">
                {JSON.stringify(
                  { trackId, fromScenarioId, level, variationId: variation.id, packId: variation.packId, sessionHref },
                  null,
                  2,
                )}
              </pre>
            </details>
          ) : null}
        </Card>
      </div>
    </div>
  )
}
