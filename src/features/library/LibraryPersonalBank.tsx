'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { MapPin, MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { usePersonalLibraryStore } from '@/store/personalLibraryStore'
import { APP_LIBRARY_FROM_YOUR_DAY, APP_TALK_HUB } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import { LibrarySavedFromVoiceSection } from '@/features/library/LibrarySavedFromVoiceSection'
import { LibraryQuickCaptureCollection } from '@/features/library/capture/LibraryQuickCaptureCollection'
import type { SavedPlaceItem } from '@/mocks/personalLibrarySeed'

function RowCard({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-surface-elevated p-3.5 shadow-sm">
      <p className="text-body-sm font-semibold text-ink-primary">{title}</p>
      {subtitle ? <p className="text-caption text-ink-secondary mt-1 leading-snug">{subtitle}</p> : null}
      <div className="flex flex-wrap gap-2 mt-3">{actions}</div>
    </div>
  )
}

export function LibrarySavedSection() {
  const words = usePersonalLibraryStore((s) => s.words)
  const phrases = usePersonalLibraryStore((s) => s.phrases)

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-ink-secondary leading-snug">
        Your personal Dutch bank — hear it, say it, then drop it into Talk.
      </p>
      <section>
        <h2 className="text-caption font-bold text-ink-tertiary uppercase tracking-wide mb-2">Saved words</h2>
        <ul className="space-y-2 list-none p-0 m-0">
          {words.map((w) => (
            <li key={w.id}>
              <RowCard
                title={w.nl}
                subtitle={[
                  w.en,
                  w.exampleNl ? `“${w.exampleNl}”` : '',
                  w.sourceScenarioId === 'train-station' ? 'From Train station chat' : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
                actions={
                  <>
                    <Button size="sm" variant="secondary" type="button" disabled>
                      Hear
                    </Button>
                    <Link
                      href={`${APP_TALK_HUB}?focusWord=${encodeURIComponent(w.nl)}`}
                      className="inline-flex min-h-touch items-center rounded-lg bg-primary-600 text-white text-caption font-semibold px-3 py-2"
                      onClick={() => playAppSound('tap')}
                    >
                      Practice in chat
                    </Link>
                    <Link
                      href="/app/practice/voice"
                      className="inline-flex min-h-touch items-center rounded-lg border border-slate-200 text-caption font-semibold px-3 py-2"
                    >
                      Speaking
                    </Link>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </section>
      <LibrarySavedFromVoiceSection />
      <section>
        <h2 className="text-caption font-bold text-ink-tertiary uppercase tracking-wide mb-2">Useful phrases</h2>
        <ul className="space-y-2 list-none p-0 m-0">
          {phrases.map((p) => (
            <li key={p.id}>
              <RowCard
                title={p.nl}
                subtitle={[p.en, p.context].filter(Boolean).join(' · ')}
                actions={
                  <>
                    <Button size="sm" variant="secondary" type="button" disabled>
                      Hear
                    </Button>
                    <Link
                      href={APP_TALK_HUB}
                      className="inline-flex min-h-touch items-center rounded-lg bg-primary-600 text-white text-caption font-semibold px-3 py-2"
                    >
                      Use in chat
                    </Link>
                  </>
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function LibraryCapturedSection() {
  return <LibraryQuickCaptureCollection />
}

function placeScenarioHref(kind: SavedPlaceItem['kind']): string {
  switch (kind) {
    case 'train_station':
      return '/app/practice/scenarios?category=transport'
    case 'supermarket':
      return '/app/practice/scenarios?category=food'
    case 'doctor':
      return '/app/practice/scenarios?category=health'
    case 'gemeente':
      return '/app/practice/scenarios?category=municipality'
    case 'cafe':
      return '/app/practice/scenarios?category=social'
    case 'work':
      return '/app/practice/scenarios?category=work'
    case 'housing':
      return '/app/practice/scenarios?category=municipality'
    default:
      return '/app/practice/scenarios'
  }
}

export function LibraryPlacesSection() {
  const places = usePersonalLibraryStore((s) => s.places)

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-ink-secondary leading-snug">
        Places you actually go — jump into phrases and scenes for that context.
      </p>
      <ul className="space-y-2 list-none p-0 m-0">
        {places.map((pl) => (
          <li key={pl.id}>
            <RowCard
              title={pl.label}
              subtitle={`${pl.kind.replace('_', ' ')} · saved ${pl.savedAt}`}
              actions={
                <>
                  <Link
                    href={placeScenarioHref(pl.kind)}
                    className="inline-flex min-h-touch items-center gap-1 rounded-lg bg-primary-600 text-white text-caption font-semibold px-3 py-2"
                  >
                    <MapPin className="w-3.5 h-3.5" aria-hidden />
                    Scenario pack
                  </Link>
                  <Link
                    href="/app/context-prompts"
                    className="inline-flex min-h-touch items-center rounded-lg border border-slate-200 text-caption font-semibold px-3 py-2"
                  >
                    Quick phrases
                  </Link>
                  <Link
                    href={APP_TALK_HUB}
                    className="inline-flex min-h-touch items-center rounded-lg border border-slate-200 text-caption font-semibold px-3 py-2"
                  >
                    <MessageCircle className="w-3.5 h-3.5 inline mr-1" aria-hidden />
                    Start chat
                  </Link>
                </>
              }
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LibraryQuickCapturePromo({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          playAppSound('primary_action')
          onOpen()
        }}
        className="w-full rounded-2xl border border-dashed border-primary-300/80 bg-primary-50/40 px-4 py-4 text-left min-h-touch hover:bg-primary-50/70 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-primary-800">
            <Sparkles className="w-5 h-5" aria-hidden />
          </span>
          <div>
            <p className="text-body-sm font-bold text-ink-primary">Save a moment</p>
            <p className="text-caption text-ink-secondary mt-0.5">
              A word, a line, a place, a photo, a voice note — useful in real life, not buried in notes.
            </p>
          </div>
        </div>
      </button>
      <Link
        href={APP_LIBRARY_FROM_YOUR_DAY}
        onClick={() => playAppSound('tap')}
        className="block w-full py-3 text-center text-body-sm font-semibold text-primary-800 underline-offset-2 hover:underline min-h-touch"
      >
        From your day
      </Link>
    </div>
  )
}
