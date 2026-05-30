'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { LessonDiscoveryPage } from '@/features/lessons/LessonDiscoveryPage'
import {
  LibraryCapturedSection,
  LibraryPlacesSection,
  LibraryQuickCapturePromo,
  LibrarySavedSection,
} from '@/features/library/LibraryPersonalBank'
import { useQuickCaptureOptional } from '@/components/capture/QuickCaptureContext'
import { playAppSound } from '@/lib/interaction/appSounds'

export type LibrarySegment = 'saved' | 'captured' | 'places' | 'lessons'

const SEGMENTS: { id: LibrarySegment; label: string }[] = [
  { id: 'saved', label: 'Saved' },
  { id: 'captured', label: 'Collection' },
  { id: 'places', label: 'Places' },
  { id: 'lessons', label: 'Lessons' },
]

export function LibraryHubPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const capture = useQuickCaptureOptional()

  const segment: LibrarySegment = useMemo(() => {
    const t = searchParams.get('tab') as LibrarySegment | null
    if (t === 'captured' || t === 'places' || t === 'lessons') return t
    return 'saved'
  }, [searchParams])

  const setSegment = useCallback(
    (next: LibrarySegment) => {
      playAppSound('nav_tab')
      const p = new URLSearchParams(searchParams.toString())
      if (next === 'saved') p.delete('tab')
      else p.set('tab', next)
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  return (
    <div className="pb-8 max-w-lg mx-auto w-full">
      <header className="px-4 pt-6 pb-3 space-y-2">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Library</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          A quiet shelf for Dutch that matters to you — saved from your life, ready when you want to practice.
        </p>
      </header>

      <div className="px-4 pb-4">
        <LibraryQuickCapturePromo onOpen={() => capture?.open()} />
      </div>

      <div className="px-4 pb-4">
        <div
          role="tablist"
          aria-label="Library sections"
          className="flex rounded-full border border-slate-200/90 bg-surface-muted/80 p-0.5 w-full overflow-x-auto"
        >
          {SEGMENTS.map(({ id, label }) => {
            const selected = segment === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSegment(id)}
                className={clsx(
                  'relative flex-1 min-w-[4.5rem] min-h-touch rounded-full px-2 text-center text-body-sm font-semibold transition-colors shrink-0',
                  selected ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
                )}
              >
                {selected ? (
                  <span
                    className="absolute inset-0 rounded-full bg-surface-elevated shadow-sm border border-slate-200/60"
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-[1]">{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 pb-6">
        {segment === 'saved' ? <LibrarySavedSection /> : null}
        {segment === 'captured' ? <LibraryCapturedSection /> : null}
        {segment === 'places' ? <LibraryPlacesSection /> : null}
        {segment === 'lessons' ? (
          <div className="pt-1">
            <p className="text-caption text-ink-secondary mb-3 leading-snug">
              Support rails for grammar and path — your daily engine stays in Talk.
            </p>
            <LessonDiscoveryPage variant="library" embedded />
          </div>
        ) : null}
      </div>

      {segment !== 'lessons' ? (
        <div className="px-4 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSegment('lessons')}
            className="text-body-sm font-semibold text-primary-700 hover:underline min-h-touch py-2"
          >
            Open full lesson library →
          </button>
        </div>
      ) : null}
    </div>
  )
}
