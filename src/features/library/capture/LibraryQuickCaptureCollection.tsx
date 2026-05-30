'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { clsx } from 'clsx'
import { isFeature1ChatBackendEnabled } from '@/lib/api/apiConfig'
import { quickCaptureClient, type QuickCaptureItem } from '@/lib/api/quickCaptureClient'
import { useQuickCaptureOfflineStore } from '@/store/quickCaptureOfflineStore'
import { CaptureItemCard } from './CaptureItemCard'
import {
  CAPTURE_BUCKETS,
  CAPTURE_TYPE_FILTERS,
  CONTEXT_QUICK_FILTERS,
  itemMatchesBucket,
  itemMatchesContextFilter,
  itemMatchesDate,
  itemMatchesType,
  recentDateOptions,
  type CaptureBucketId,
} from './captureLibraryBuckets'
import type { QuickCaptureApiStatus, QuickCaptureApiType } from '@/lib/api/quickCaptureClient'
import { playAppSound } from '@/lib/interaction/appSounds'
import { APP_LIBRARY_FROM_YOUR_DAY } from '@/lib/routing/appRoutes'
import { isCaptureEligibleForFromYourDayHub } from '@/features/quick-capture/fromYourDayCaptureEligibility'
import { Sparkles } from 'lucide-react'

function mergeCaptures(apiItems: QuickCaptureItem[], offlineItems: QuickCaptureItem[]): QuickCaptureItem[] {
  const byId = new Map<string, QuickCaptureItem>()
  for (const o of offlineItems) byId.set(o.id, o)
  for (const a of apiItems) byId.set(a.id, a)
  return Array.from(byId.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

export function LibraryQuickCaptureCollection() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const offlineCaptures = useQuickCaptureOfflineStore((s) => s.captures)
  const offlineSetStatus = useQuickCaptureOfflineStore((s) => s.setCaptureStatus)

  const bucket = (searchParams.get('bucket') as CaptureBucketId | null) ?? 'all'
  const typeFilter = (searchParams.get('type') as QuickCaptureApiType | 'all' | null) ?? 'all'
  const dateFilter = (searchParams.get('date') as string | null) ?? 'all'
  const contextFilter = (searchParams.get('ctx') as string | null) ?? 'all'

  const [items, setItems] = useState<QuickCaptureItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const setQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '' || v === 'all') p.delete(k)
        else p.set(k, v)
      }
      const q = p.toString()
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const backend = isFeature1ChatBackendEnabled()
    let api: QuickCaptureItem[] = []
    if (backend) {
      try {
        const r = await quickCaptureClient.list()
        api = r.items ?? []
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not load captures')
      }
    }
    setItems(mergeCaptures(api, offlineCaptures))
    setLoading(false)
  }, [offlineCaptures])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const b: CaptureBucketId = CAPTURE_BUCKETS.some((x) => x.id === bucket) ? bucket : 'all'
    return items.filter(
      (it) =>
        itemMatchesBucket(it, b) &&
        itemMatchesType(it, typeFilter) &&
        itemMatchesDate(it, dateFilter) &&
        itemMatchesContextFilter(it, contextFilter),
    )
  }, [items, bucket, typeFilter, dateFilter, contextFilter])

  const filtersHideAllCaptures = items.length > 0 && filtered.length === 0

  const patchStatus = useCallback(
    async (id: string, status: QuickCaptureApiStatus) => {
      setBusyId(id)
      try {
        if (isFeature1ChatBackendEnabled()) {
          await quickCaptureClient.patchCapture(id, status)
        }
        offlineSetStatus(id, status)
        await refresh()
      } finally {
        setBusyId(null)
      }
    },
    [offlineSetStatus, refresh],
  )

  const dateOptions = useMemo(() => recentDateOptions(14), [])

  const todayYmd = quickCaptureClient.localDateYmd()
  const readyTodayCount = useMemo(
    () => items.filter((it) => it.localCaptureDate === todayYmd && isCaptureEligibleForFromYourDayHub(it)).length,
    [items, todayYmd],
  )

  return (
    <div className="space-y-5">
      {readyTodayCount > 0 ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 to-white p-4 shadow-sm ring-1 ring-emerald-100/50">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-caption font-bold uppercase tracking-wide text-emerald-900">Ready to practice</p>
              <p className="mt-1 text-body-sm font-semibold text-ink-primary">
                {readyTodayCount} moment{readyTodayCount === 1 ? '' : 's'} from today
              </p>
              <p className="mt-0.5 text-caption text-ink-secondary leading-snug">
                One calm pack — threaded by theme, not a long list.
              </p>
              {filtersHideAllCaptures ? (
                <p className="mt-1 text-caption font-medium text-amber-900/90">
                  Tip: filters below may be hiding your moments — tap Clear all filters if the feed looks empty.
                </p>
              ) : null}
              <Link
                href={`${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(todayYmd)}`}
                onClick={() => playAppSound('tap')}
                className="mt-3 inline-flex min-h-touch items-center rounded-xl bg-primary-600 px-4 py-2.5 text-caption font-bold text-white shadow-sm hover:bg-primary-700"
              >
                Practice what happened today
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/80 p-4 ring-1 ring-indigo-100/60 space-y-3">
        <div>
          <p className="text-body-sm font-semibold text-ink-primary">Saved from your life</p>
          <p className="mt-1 text-caption text-ink-secondary leading-relaxed">
            Little moments you can reopen anytime — nothing heavy, nothing to file away like homework.
          </p>
        </div>
        {readyTodayCount === 0 ? (
          <Link
            href={`${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(todayYmd)}`}
            onClick={() => playAppSound('tap')}
            className="inline-flex min-h-touch items-center rounded-xl bg-primary-600 px-3 py-2 text-caption font-bold text-white shadow-sm hover:bg-primary-700"
          >
            From your day
          </Link>
        ) : (
          <p className="text-caption text-ink-tertiary">
            When you are ready, use the card above — it is the main way into today&apos;s practice.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Views</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-thin">
          {CAPTURE_BUCKETS.map((b) => {
            const selected = bucket === b.id
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  playAppSound('nav_tab')
                  setQuery({ bucket: b.id === 'all' ? null : b.id })
                }}
                className={clsx(
                  'shrink-0 rounded-full border px-3 py-2 text-caption font-semibold transition-colors min-h-touch',
                  selected
                    ? 'border-primary-300 bg-primary-50 text-primary-950 shadow-sm'
                    : 'border-slate-200/90 bg-white text-ink-secondary hover:border-slate-300',
                )}
              >
                {b.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Type</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm text-ink-primary min-h-touch"
            value={typeFilter}
            onChange={(e) => {
              playAppSound('tap')
              setQuery({ type: e.target.value === 'all' ? null : e.target.value })
            }}
          >
            {CAPTURE_TYPE_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Date</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm text-ink-primary min-h-touch"
            value={dateFilter}
            onChange={(e) => {
              playAppSound('tap')
              setQuery({ date: e.target.value === 'all' ? null : e.target.value })
            }}
          >
            {dateOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Where you were</span>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body-sm text-ink-primary min-h-touch"
            value={contextFilter}
            onChange={(e) => {
              playAppSound('tap')
              setQuery({ ctx: e.target.value === 'all' ? null : e.target.value })
            }}
          >
            {CONTEXT_QUICK_FILTERS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2.5 text-caption text-amber-950">{loadError}</div>
      ) : null}

      {filtersHideAllCaptures ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50/90 px-3 py-3 text-caption text-sky-950 space-y-2">
          <p className="font-semibold text-body-sm text-ink-primary">Filters are hiding your moments</p>
          <p className="text-ink-secondary leading-relaxed">
            You still have {items.length} capture{items.length === 1 ? '' : 's'} loaded — try clearing Views / Type / Date / Where you were.
          </p>
          <button
            type="button"
            onClick={() => {
              playAppSound('tap')
              setQuery({ bucket: null, type: null, date: null, ctx: null })
            }}
            className="inline-flex min-h-touch items-center rounded-xl bg-primary-600 px-3 py-2 text-caption font-bold text-white shadow-sm hover:bg-primary-700"
          >
            Clear all filters
          </button>
        </div>
      ) : null}

      {loading ? (
        <ul className="space-y-3 list-none p-0 m-0">
          {[1, 2, 3].map((k) => (
            <li key={k} className="h-36 animate-pulse rounded-2xl bg-slate-100/90" />
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
          <p className="text-body-sm font-semibold text-ink-primary">Nothing in this view</p>
          <p className="mt-1 text-caption text-ink-secondary leading-relaxed">
            Try another filter, or capture something small from your day — a word, a sign, a voice note.
          </p>
        </div>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {filtered.map((it) => (
            <li key={it.id}>
              <CaptureItemCard
                item={it}
                busyId={busyId}
                onArchive={(id) => void patchStatus(id, 'archived')}
                onSaveLongTerm={(id) => void patchStatus(id, 'saved_long_term')}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
