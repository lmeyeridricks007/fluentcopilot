'use client'

import { Suspense } from 'react'
import { TalkActivityPage } from '@/features/practice-hub/TalkActivityPage'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function Page() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TalkActivityPage />
    </Suspense>
  )
}
