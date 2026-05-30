'use client'

import { Suspense } from 'react'
import { TrainStationChatPage } from '@/features/feature1-chat'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TrainStationChatPage />
    </Suspense>
  )
}
