'use client'

/**
 * From your day — personalized practice from Quick Captures.
 * Route: `/app/library/from-your-day`
 * Query: `?date=YYYY-MM-DD` (hub + session), `?pack=&date=` (active session checklist).
 */
import { Suspense } from 'react'
import { FromYourDaySessionPage } from '@/features/quick-capture/FromYourDaySessionPage'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <FromYourDaySessionPage />
    </Suspense>
  )
}
