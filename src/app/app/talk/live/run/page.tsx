'use client'

import { Suspense } from 'react'
import { SpeakLiveRunView } from '@/features/speak-live'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SpeakLiveRunView />
    </Suspense>
  )
}
