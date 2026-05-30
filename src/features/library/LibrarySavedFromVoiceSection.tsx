'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ApiSavedTrainingItem } from '@/lib/api/apiTypes'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { conversationClient } from '@/lib/api/conversationClient'
import { practiceHrefForSavedItem, reviewQueueHref } from '@/lib/training/savedTrainingPracticeLinks'
import { playAppSound } from '@/lib/interaction/appSounds'

function tagLabel(tag: string | null): string {
  if (!tag) return 'Training'
  const map: Record<string, string> = {
    library: 'Library',
    coach_follow_up: 'Coach',
    review_queue: 'Review',
    speaking_drill: 'Speaking',
    pronunciation_drill: 'Pronunciation',
    rhythm_drill: 'Rhythm',
    phrasing_upgrade: 'Phrasing',
    general: 'Training',
  }
  return map[tag] ?? tag
}

/**
 * Server-backed queue from Speak Live voice reports — survives recap and powers drills.
 */
export function LibrarySavedFromVoiceSection() {
  const [items, setItems] = useState<ApiSavedTrainingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isFeature1ChatBackendEnabled()) return
    let cancelled = false
    setLoading(true)
    void conversationClient
      .listSavedTrainingItems({ limit: 40 })
      .then((r) => {
        if (!cancelled) setItems(r.items ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Could not load saved training items.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!isFeature1ChatBackendEnabled()) return null

  return (
    <section className="mt-8">
      <h2 className="text-caption font-bold text-ink-tertiary uppercase tracking-wide mb-2">From Speak Live</h2>
      <p className="text-body-sm text-ink-secondary leading-snug mb-3">
        Items you saved from voice coaching — each opens a targeted practice loop (voice, read-aloud, or coach).
      </p>
      {loading ? <p className="text-caption text-ink-tertiary">Loading…</p> : null}
      {error ? <p className="text-caption text-rose-600">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <p className="text-caption text-ink-tertiary">Nothing here yet. Finish a Speak Live session and save drills from the voice report.</p>
      ) : null}
      <ul className="space-y-2 list-none p-0 m-0">
        {items.map((it) => (
          <li key={it.id}>
            <div className="rounded-2xl border border-slate-200/90 bg-surface-elevated p-3.5 shadow-sm">
              <p className="text-caption font-semibold text-primary-700">{tagLabel(it.tagCategory)}</p>
              <p className="text-body-sm font-semibold text-ink-primary mt-0.5">{it.title}</p>
              <p className="text-caption text-ink-secondary mt-1 leading-snug line-clamp-2">
                {(it.learnerOriginalSentence ?? it.content).slice(0, 220)}
                {it.improvedSentence ? ` → ${it.improvedSentence.slice(0, 120)}` : ''}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link
                  href={practiceHrefForSavedItem(it)}
                  onClick={() => playAppSound('tap')}
                  className="inline-flex min-h-touch items-center rounded-lg bg-primary-600 text-white text-caption font-semibold px-3 py-2"
                >
                  Practice
                </Link>
                {it.tagCategory === 'review_queue' ? (
                  <Link
                    href={reviewQueueHref()}
                    className="inline-flex min-h-touch items-center rounded-lg border border-slate-200 text-caption font-semibold px-3 py-2"
                  >
                    Review hub
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
