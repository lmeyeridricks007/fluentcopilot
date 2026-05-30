'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { MoonStar } from 'lucide-react'
import { APP_LIBRARY_FROM_YOUR_DAY } from '@/lib/routing/appRoutes'
import { playAppSound } from '@/lib/interaction/appSounds'
import { getClientTimeZone } from '@/lib/hooks/useProgression'

const DISMISS_KEY = 'fy_evening_nudge_dismissed_ymd'

function localHour(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date())
  const h = parts.find((p) => p.type === 'hour')?.value
  return h ? parseInt(h, 10) : 12
}

function ymdInTz(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Optional calm evening strip when captures are ready (local 17:00–22:59). */
export function FromYourDayEveningBanner(props: { readyCount: number; backend: boolean }) {
  const tz = useMemo(() => getClientTimeZone(), [])
  const ymd = useMemo(() => ymdInTz(tz), [tz])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (typeof sessionStorage === 'undefined') return
      const v = sessionStorage.getItem(DISMISS_KEY)
      setDismissed(v === ymd)
    } catch {
      setDismissed(false)
    }
  }, [ymd])

  const hour = localHour(tz)
  const inEveningWindow = hour >= 17 && hour <= 22
  const show = props.backend && props.readyCount >= 1 && inEveningWindow && !dismissed

  if (!show) return null

  const href = `${APP_LIBRARY_FROM_YOUR_DAY}?date=${encodeURIComponent(ymd)}`

  return (
    <div className="rounded-2xl border border-indigo-200/70 bg-gradient-to-r from-indigo-950/[0.04] via-slate-50 to-violet-50/50 px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
          <MoonStar className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-900/80">From your day</p>
          <p className="mt-1 text-[14px] font-semibold leading-snug text-slate-900">
            Practice what happened today
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-600">
            {props.readyCount === 1
              ? 'One save is ready for a short, calm loop.'
              : `${props.readyCount} saves are ready — a gentle pack, no cramming.`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={href}
              onClick={() => playAppSound('tap')}
              className="inline-flex min-h-touch items-center rounded-xl bg-primary-600 px-3 py-2 text-[12px] font-bold text-white shadow-sm hover:bg-primary-700"
            >
              Turn this into practice
            </Link>
            <button
              type="button"
              className="text-[12px] font-semibold text-slate-500 underline-offset-2 hover:underline"
              onClick={() => {
                try {
                  sessionStorage.setItem(DISMISS_KEY, ymd)
                } catch {
                  /* ignore */
                }
                setDismissed(true)
                playAppSound('tap')
              }}
            >
              Not tonight
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
