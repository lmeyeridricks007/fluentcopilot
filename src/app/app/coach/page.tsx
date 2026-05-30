'use client'

import { Suspense } from 'react'
import { CoachHubPage } from '@/features/coach/CoachHubPage'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CoachHubPage />
    </Suspense>
  )
}
