'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { track, ANALYTICS_EVENTS } from '@/lib/analytics'
import { trackWeakAreaShownOnce } from '../weakAreaShownAnalytics'
import { usePracticeHubViewModel } from '../usePracticeHubViewModel'
import { WeakAreaCard } from '../components/WeakAreaCard'
import { IMPROVE_CTA } from './improveCtas'

export function ImproveWeakDrillPage({ rawWeakAreaId }: { rawWeakAreaId: string }) {
  const vm = usePracticeHubViewModel()
  const area = useMemo(() => {
    const id = (() => {
      try {
        return decodeURIComponent(rawWeakAreaId)
      } catch {
        return rawWeakAreaId
      }
    })()
    return vm.weakAreas.find((w) => w.id === id) ?? null
  }, [vm.weakAreas, rawWeakAreaId])

  useEffect(() => {
    if (!area) return
    trackWeakAreaShownOnce({
      weak_area_id: area.id,
      weak_area_label: area.label,
      surface: 'improve_weak_drill',
      action_count: area.actions?.length ?? (area.href ? 1 : 0),
    })
    track(ANALYTICS_EVENTS.weak_area_drill_viewed, {
      weak_area_id: area.id,
      weak_area_label: area.label,
      surface: 'improve_weak_drill',
    })
  }, [area])

  if (!area) {
    return (
      <div className="px-4 py-8 pb-24 max-w-lg mx-auto w-full space-y-4">
        <Link
          href="/app/practice?mode=improve"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-700 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {IMPROVE_CTA.seePracticeHub}
        </Link>
        <p className="text-body-sm text-ink-secondary leading-relaxed">
          This focus isn’t available anymore — it may have cleared after new practice signals.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24 max-w-lg mx-auto w-full space-y-5">
      <Link
        href="/app/practice?mode=improve"
        className="inline-flex items-center gap-1 text-body-sm font-medium text-primary-700 min-h-touch -ml-1"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Improve
      </Link>
      <header className="space-y-1">
        <h1 className="text-title font-bold text-ink-primary tracking-tight">Your focus</h1>
        <p className="text-body-sm text-ink-secondary leading-snug">
          Fuller context and actions for this pattern — still grounded in real practice signals.
        </p>
      </header>
      <WeakAreaCard area={area} suppressWeakAreaShown />
    </div>
  )
}
