'use client'

import { Suspense } from 'react'
import { PracticeHubPage } from '@/features/practice-hub'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PracticeHubPage surface="talk" />
    </Suspense>
  )
}
